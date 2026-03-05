/**
 * Sous-ensemble minimal de l'API @fastify/jwt dont JwtTokenService a besoin.
 * Permet d'instancier JwtTokenService sans dépendre de FastifyInstance.
 */
export interface IJwtSigner {
  sign(payload: object, options?: { expiresIn?: string }): string;
  verify<T>(token: string): T;
}
