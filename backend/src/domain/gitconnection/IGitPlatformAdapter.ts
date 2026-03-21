import { GitProvider } from "./GitConnection.js";

/**
 * Représentation d'un repository Git récupéré depuis une plateforme.
 */
export interface GitRepository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  updatedAt: string;
}

/**
 * Profil utilisateur récupéré depuis la plateforme Git.
 */
export interface GitUserProfile {
  username: string;
  avatarUrl: string | null;
}

/**
 * Port sortant : adaptateur vers une plateforme Git (GitHub, GitLab…).
 * Implémenté dans la couche Infrastructure pour chaque provider.
 */
export interface IGitPlatformAdapter {
  readonly provider: GitProvider;

  /**
   * Échange un code OAuth contre un access token.
   */
  exchangeCodeForToken(code: string): Promise<string>;

  /**
   * Récupère le profil de l'utilisateur authentifié.
   */
  getUserProfile(accessToken: string): Promise<GitUserProfile>;

  /**
   * Récupère la liste des repositories accessibles par l'utilisateur.
   */
  listRepositories(accessToken: string): Promise<GitRepository[]>;
}
