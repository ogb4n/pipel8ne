import argon2 from "argon2";
import crypto from "crypto";
import { IUserRepository } from "../user/IUserRepository.js";
import { ITokenService } from "./ITokenService.js";
import { IRefreshTokenRepository } from "./IRefreshTokenRepository.js";
import { PublicUser } from "../user/PublicUser.js";
import { User } from "../user/User.js";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  /**
   * Inscrit un nouvel utilisateur et retourne ses tokens JWT.
   */
  async register(data: { email: string; password: string; name?: string }): Promise<AuthTokens> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new AuthError("EMAIL_IN_USE", "Cet email est déjà utilisé");

    const passwordHash = await argon2.hash(data.password);
    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    return this.buildAndStoreTokens(user);
  }

  /**
   * Vérifie les identifiants et retourne les tokens JWT si valides.
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AuthError("INVALID_CREDENTIALS", "Identifiants incorrects");

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new AuthError("INVALID_CREDENTIALS", "Identifiants incorrects");

    return this.buildAndStoreTokens(user);
  }

  /**
   * Renouvelle un access token et un refresh token (rotation).
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify JWT signature
    const decoded = this.tokenService.verifyRefresh(refreshToken);
    // 2. Check token exists and is not revoked in DB
    const stored = await this.refreshTokenRepository.findByTokenHash(this.hashToken(refreshToken));
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new AuthError("INVALID_CREDENTIALS", "Refresh token invalide ou révoqué");
    }
    // 3. Rotate: revoke old, issue new
    await this.refreshTokenRepository.revokeByTokenHash(this.hashToken(refreshToken));
    const newRefreshToken = this.tokenService.signRefresh({ sub: decoded.sub });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({
      tokenHash: this.hashToken(newRefreshToken),
      userId: decoded.sub,
      expiresAt,
    });
    const accessToken = this.tokenService.signAccess({ sub: decoded.sub, email: "" });
    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Révoque le refresh token (déconnexion).
   */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.revokeByTokenHash(this.hashToken(refreshToken));
  }

  private async buildAndStoreTokens(user: User): Promise<AuthTokens> {
    const tokens = this.buildTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.refreshTokenRepository.create({
      tokenHash: this.hashToken(tokens.refreshToken),
      userId: user.id,
      expiresAt,
    });
    return tokens;
  }

  private buildTokens(user: User): AuthTokens {
    const publicUser = toPublicUser(user);
    return {
      accessToken: this.tokenService.signAccess({ sub: user.id, email: user.email }),
      refreshToken: this.tokenService.signRefresh({ sub: user.id }),
      user: publicUser,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export class AuthError extends Error {
  constructor(
    public readonly code: "EMAIL_IN_USE" | "INVALID_CREDENTIALS",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omitted, ...publicUser } = user;
  return publicUser;
}
