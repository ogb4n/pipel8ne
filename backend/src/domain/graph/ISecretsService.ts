/**
 * Port sortant pour le chiffrement/déchiffrement des secrets des nœuds.
 * Le domain définit le contrat — l'infrastructure l'implémente (AES-256-GCM, KMS, etc.)
 */
export interface ISecretsService {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}
