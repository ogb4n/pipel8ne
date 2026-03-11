import argon2 from "argon2";
import crypto from "crypto";
import { IUserReader } from "../user/IUserReader.js";
import { ITokenService } from "./ITokenService.js";
import { IRefreshTokenRepository } from "./IRefreshTokenRepository.js";
import { PublicUser, toPublicUser } from "../user/PublicUser.js";
import { User } from "../user/User.js";
import { REFRESH_TOKEN_TTL_MS } from "./auth.constants.js";
import { RegistrationDisabledError } from "../errors.js";
import { ISystemSettingsService } from "../settings/ISystemSettingsService.js";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export class AuthService {
  constructor(
    private readonly userService: IUserReader,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly systemSettingsService: ISystemSettingsService,
  ) {}

  /**
   * Inscrit un nouvel utilisateur et retourne ses tokens JWT.
   */
  async register(data: { email: string; password: string; name?: string }): Promise<AuthTokens> {
    const settings = await this.systemSettingsService.getSettings();
    if (!settings.registrationEnabled) {
      throw new RegistrationDisabledError();
    }

    const existing = await this.userService.findByEmail(data.email);
    if (existing) throw new AuthError("EMAIL_IN_USE", "Cet email est déjà utilisé");

    const userCount = await this.userService.count();
    const role: "admin" | "user" = userCount === 0 ? "admin" : "user";

    const passwordHash = await argon2.hash(data.password);
    const user = await this.userService.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      role,
    });

    return this.buildAndStoreTokens(user);
  }

  /**
   * Vérifie les identifiants et retourne les tokens JWT si valides.
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userService.findByEmail(email);
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
    const user = await this.userService.getById(decoded.sub);
    if (!user) throw new AuthError("INVALID_CREDENTIALS", "Utilisateur introuvable");
    const newRefreshToken = this.tokenService.signRefresh({ sub: decoded.sub });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.refreshTokenRepository.create({
      tokenHash: this.hashToken(newRefreshToken),
      userId: decoded.sub,
      expiresAt,
    });
    const accessToken = this.tokenService.signAccess({
      sub: decoded.sub,
      email: user.email,
      role: user.role,
    });
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
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS); // 7 days
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
      accessToken: this.tokenService.signAccess({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
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
