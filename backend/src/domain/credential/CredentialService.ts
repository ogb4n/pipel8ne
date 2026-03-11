import { ICredentialRepository } from "./ICredentialRepository.js";
import { ISecretsService } from "../graph/ISecretsService.js";
import { Credential } from "./Credential.js";
import { ForbiddenError, NotFoundError } from "../errors.js";

/** Vue publique d'un credential : la valeur chiffrée n'est pas incluse. */
export type PublicCredential = Omit<Credential, "encryptedValue">;

export class CredentialService {
  constructor(
    private readonly credentialRepository: ICredentialRepository,
    private readonly secretsService: ISecretsService,
  ) {}

  /** Liste tous les credentials d'un utilisateur (sans la valeur sensible). */
  async listForUser(userId: string): Promise<PublicCredential[]> {
    const credentials = await this.credentialRepository.findAllByUserId(userId);
    return credentials.map(({ encryptedValue: _v, ...rest }) => rest);
  }

  /** Crée un credential en chiffrant la valeur avant persistance. */
  async create(
    userId: string,
    data: { provider: string; label: string; value: string },
  ): Promise<PublicCredential> {
    const encryptedValue = this.secretsService.encrypt(data.value);
    const credential = await this.credentialRepository.create({
      userId,
      provider: data.provider,
      label: data.label,
      encryptedValue,
    });
    const { encryptedValue: _v, ...rest } = credential;
    return rest;
  }

  /** Met à jour le libellé et/ou la valeur d'un credential. */
  async update(
    id: string,
    requestingUserId: string,
    data: { label?: string; value?: string },
  ): Promise<PublicCredential> {
    const existing = await this.credentialRepository.findById(id);
    if (!existing) throw new NotFoundError("Credential introuvable");
    if (existing.userId !== requestingUserId) throw new ForbiddenError("Accès interdit");

    const patch: Partial<Pick<Credential, "label" | "encryptedValue">> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.value !== undefined) patch.encryptedValue = this.secretsService.encrypt(data.value);

    const updated = await this.credentialRepository.updateById(id, patch);
    if (!updated) throw new NotFoundError("Credential introuvable");
    const { encryptedValue: _v, ...rest } = updated;
    return rest;
  }

  /** Supprime un credential après vérification de propriété. */
  async delete(id: string, requestingUserId: string): Promise<void> {
    const existing = await this.credentialRepository.findById(id);
    if (!existing) throw new NotFoundError("Credential introuvable");
    if (existing.userId !== requestingUserId) throw new ForbiddenError("Accès interdit");
    await this.credentialRepository.delete(id);
  }

  /**
   * Retourne la valeur déchiffrée d'un credential.
   * Réservé à l'usage interne (moteur d'exécution) — ne jamais exposer via l'API publique.
   */
  async getDecryptedValue(id: string, requestingUserId: string): Promise<string> {
    const credential = await this.credentialRepository.findById(id);
    if (!credential) throw new NotFoundError("Credential introuvable");
    if (credential.userId !== requestingUserId) throw new ForbiddenError("Accès interdit");
    return this.secretsService.decrypt(credential.encryptedValue);
  }
}
