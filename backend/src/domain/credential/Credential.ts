/**
 * Entité domaine représentant un credential chiffré associé à un utilisateur.
 * La valeur brute (token, mot de passe, clé API…) n'est jamais exposée en dehors
 * de la couche Infrastructure ; seule la valeur chiffrée transite dans le domaine.
 */
export interface Credential {
  id: string;
  /** Identifiant de l'utilisateur propriétaire. */
  userId: string;
  /** Plateforme cible : "github", "gitlab", "dockerhub", "aws", etc. */
  provider: string;
  /** Libellé lisible par l'humain, p. ex. "Mon token GitHub perso". */
  label: string;
  /** Valeur chiffrée (AES-GCM). Ne jamais renvoyer en clair via l'API publique. */
  encryptedValue: string;
  createdAt: Date;
  updatedAt: Date;
}
