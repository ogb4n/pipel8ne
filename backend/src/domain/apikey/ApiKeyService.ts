import { createHash, randomBytes } from "crypto";
import { IApiKeyRepository } from "./IApiKeyRepository.js";
import { ApiKey } from "./ApiKey.js";

/** Vue publique d'une clé API : le hash de la clé n'est pas inclus. */
export type PublicApiKey = Omit<ApiKey, "keyHash">;

export class ApiKeyService {
  constructor(private readonly apiKeyRepository: IApiKeyRepository) {}

  /**
   * Génère une nouvelle clé API brute, la hache en SHA-256 et la persiste.
   * La clé brute est retournée une seule fois — elle ne sera plus jamais récupérable.
   */
  async generateApiKey(userId: string, name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `pk_live_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 16);

    const apiKey = await this.apiKeyRepository.create({ userId, name, keyHash, prefix });
    return { apiKey, rawKey };
  }

  /** Liste toutes les clés API d'un utilisateur (sans le hash de la clé). */
  async listApiKeys(userId: string): Promise<PublicApiKey[]> {
    const keys = await this.apiKeyRepository.findAllByUserId(userId);
    return keys.map(({ keyHash: _h, ...rest }) => rest);
  }

  /** Révoque une clé API (la marque comme non valide sans la supprimer). */
  async revokeApiKey(id: string, userId: string): Promise<PublicApiKey | null> {
    const key = await this.apiKeyRepository.revoke(id, userId);
    if (!key) return null;
    const { keyHash: _h, ...rest } = key;
    return rest;
  }

  /** Supprime définitivement une clé API. */
  async deleteApiKey(id: string, userId: string): Promise<boolean> {
    return this.apiKeyRepository.delete(id, userId);
  }

  /**
   * Authentifie une requête à partir d'une clé brute.
   * Hache la clé, cherche le hash en base, vérifie qu'elle n'est pas révoquée,
   * met à jour lastUsedAt et retourne l'entité — ou null si invalide.
   */
  async authenticateByRawKey(rawKey: string): Promise<ApiKey | null> {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey || apiKey.isRevoked) return null;

    await this.apiKeyRepository.updateLastUsed(apiKey.id);
    return apiKey;
  }
}
