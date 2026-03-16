/**
 * Entité domaine représentant une clé API associée à un utilisateur.
 * Le hash (SHA-256) de la clé brute est stocké — la clé brute n'est
 * jamais persistée et n'est retournée au client qu'une seule fois, à la création.
 */
export interface ApiKey {
  id: string;
  /** Identifiant de l'utilisateur propriétaire. */
  userId: string;
  /** Libellé lisible par l'humain, p. ex. "CI/CD token". */
  name: string;
  /** SHA-256 de la clé brute — ne jamais exposer via l'API publique. */
  keyHash: string;
  /** Préfixe affichable dans l'UI (16 premiers caractères de la clé brute). */
  prefix: string;
  isRevoked: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
