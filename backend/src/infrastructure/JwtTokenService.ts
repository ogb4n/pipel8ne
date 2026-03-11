import { ITokenService } from "../Domain/auth/ITokenService.js";
import { IJwtSigner } from "./IJwtSigner.js";
import { REFRESH_TOKEN_TTL } from "../Domain/auth/auth.constants.js";

/**
 * Implémentation de ITokenService via @fastify/jwt.
 * Reçoit uniquement le signer JWT, pas la FastifyInstance entière.
 */
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwt: IJwtSigner) {}

  signAccess(payload: { sub: string; email: string; role: "admin" | "user" }): string {
    return this.jwt.sign(payload, { expiresIn: "15m" });
  }

  signRefresh(payload: { sub: string }): string {
    return this.jwt.sign(payload, { expiresIn: REFRESH_TOKEN_TTL });
  }

  verifyRefresh(token: string): { sub: string } {
    return this.jwt.verify<{ sub: string }>(token);
  }
}
