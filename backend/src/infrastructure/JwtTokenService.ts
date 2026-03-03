import { FastifyInstance } from "fastify";
import { ITokenService } from "../domain/auth/ITokenService";

/**
 * Implémentation de ITokenService via @fastify/jwt.
 * Confinée dans l'infrastructure — le domain n'y touche pas.
 */
export class JwtTokenService implements ITokenService {
  constructor(private readonly app: FastifyInstance) {}

  signAccess(payload: { sub: string; email: string }): string {
    return this.app.jwt.sign(payload, { expiresIn: "15m" });
  }

  signRefresh(payload: { sub: string }): string {
    return this.app.jwt.sign(payload, { expiresIn: "7d" });
  }

  verifyRefresh(token: string): { sub: string } {
    return this.app.jwt.verify<{ sub: string }>(token);
  }
}
