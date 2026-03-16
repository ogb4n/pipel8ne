/**
 * Port sortant pour la génération et la vérification de tokens.
 * Le domain définit le contrat, l'infrastructure l'implémente (JWT, etc.)
 */
export interface ITokenService {
  signAccess(payload: { sub: string; email: string; role: "admin" | "user" }): string;
  signRefresh(payload: { sub: string }): string;
  verifyRefresh(token: string): { sub: string };
}
