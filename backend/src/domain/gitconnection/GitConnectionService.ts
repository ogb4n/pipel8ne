import { IGitConnectionRepository } from "./IGitConnectionRepository.js";
import { IGitPlatformAdapter, GitRepository } from "./IGitPlatformAdapter.js";
import { ISecretsService } from "../graph/ISecretsService.js";
import { GitProvider, PublicGitConnection } from "./GitConnection.js";
import { ForbiddenError, NotFoundError } from "../errors.js";

export class GitConnectionService {
  private readonly adapters: Map<GitProvider, IGitPlatformAdapter>;

  constructor(
    private readonly gitConnectionRepository: IGitConnectionRepository,
    private readonly secretsService: ISecretsService,
    adapters: IGitPlatformAdapter[],
  ) {
    this.adapters = new Map(adapters.map((a) => [a.provider, a]));
  }

  private getAdapter(provider: GitProvider): IGitPlatformAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new NotFoundError(`Provider "${provider}" non supporté`);
    return adapter;
  }

  private toPublic(conn: {
    id: string;
    userId: string;
    provider: GitProvider;
    providerUsername: string;
    avatarUrl: string | null;
    encryptedAccessToken: string;
    createdAt: Date;
    updatedAt: Date;
  }): PublicGitConnection {
    const { encryptedAccessToken: _t, ...rest } = conn;
    return rest;
  }

  /** Liste les connexions Git de l'utilisateur (sans le token). */
  async listForUser(userId: string): Promise<PublicGitConnection[]> {
    const connections = await this.gitConnectionRepository.findAllByUserId(userId);
    return connections.map((c) => this.toPublic(c));
  }

  /**
   * Complète le flow OAuth : échange le code → récupère le profil → stocke la connexion.
   * Si l'utilisateur a déjà une connexion pour ce provider, elle est mise à jour.
   */
  async connectOAuth(
    userId: string,
    provider: GitProvider,
    code: string,
  ): Promise<PublicGitConnection> {
    const adapter = this.getAdapter(provider);

    const accessToken = await adapter.exchangeCodeForToken(code);
    const profile = await adapter.getUserProfile(accessToken);
    const encryptedAccessToken = this.secretsService.encrypt(accessToken);

    // Upsert : mise à jour si connexion existante, création sinon
    const existing = await this.gitConnectionRepository.findByUserAndProvider(userId, provider);

    if (existing) {
      const updated = await this.gitConnectionRepository.updateById(existing.id, {
        providerUsername: profile.username,
        avatarUrl: profile.avatarUrl,
        encryptedAccessToken,
      });
      return this.toPublic(updated!);
    }

    const created = await this.gitConnectionRepository.create({
      userId,
      provider,
      providerUsername: profile.username,
      avatarUrl: profile.avatarUrl,
      encryptedAccessToken,
    });
    return this.toPublic(created);
  }

  /** Supprime une connexion Git après vérification de propriété. */
  async disconnect(id: string, requestingUserId: string): Promise<void> {
    const conn = await this.gitConnectionRepository.findById(id);
    if (!conn) throw new NotFoundError("Connexion Git introuvable");
    if (conn.userId !== requestingUserId) throw new ForbiddenError("Accès interdit");
    await this.gitConnectionRepository.delete(id);
  }

  /** Récupère les repositories de la plateforme via le token stocké. */
  async listRepositories(connectionId: string, requestingUserId: string): Promise<GitRepository[]> {
    const conn = await this.gitConnectionRepository.findById(connectionId);
    if (!conn) throw new NotFoundError("Connexion Git introuvable");
    if (conn.userId !== requestingUserId) throw new ForbiddenError("Accès interdit");

    const accessToken = this.secretsService.decrypt(conn.encryptedAccessToken);
    const adapter = this.getAdapter(conn.provider);
    return adapter.listRepositories(accessToken);
  }

  /** Récupère les repos pour un provider donné (raccourci). */
  async listRepositoriesByProvider(
    userId: string,
    provider: GitProvider,
  ): Promise<GitRepository[]> {
    const conn = await this.gitConnectionRepository.findByUserAndProvider(userId, provider);
    if (!conn) throw new NotFoundError(`Aucune connexion ${provider} trouvée`);

    const accessToken = this.secretsService.decrypt(conn.encryptedAccessToken);
    const adapter = this.getAdapter(provider);
    return adapter.listRepositories(accessToken);
  }
}
