/**
 * Entité domaine représentant une connexion OAuth à une plateforme Git.
 * Un utilisateur peut avoir plusieurs connexions (ex: un GitHub perso + un GitLab pro).
 * Le token d'accès est chiffré au repos — ne jamais l'exposer via l'API publique.
 */

export type GitProvider = "github" | "gitlab";

export interface GitConnection {
  id: string;
  userId: string;
  provider: GitProvider;
  /** Nom d'utilisateur ou identifiant sur la plateforme. */
  providerUsername: string;
  /** URL de l'avatar sur la plateforme (optionnel). */
  avatarUrl: string | null;
  /** Token d'accès chiffré (AES-256-GCM). Ne jamais renvoyer en clair. */
  encryptedAccessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Vue publique d'une connexion Git — sans le token chiffré. */
export type PublicGitConnection = Omit<GitConnection, "encryptedAccessToken">;
