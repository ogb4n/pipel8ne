import argon2 from "argon2";
import { IUserRepository } from "../user/IUserRepository";
import { ITokenService } from "./ITokenService";
import { PublicUser } from "../user/PublicUser";
import { User } from "../user/User";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
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

    return this.buildTokens(user);
  }

  /**
   * Vérifie les identifiants et retourne les tokens JWT si valides.
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AuthError("INVALID_CREDENTIALS", "Identifiants incorrects");

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new AuthError("INVALID_CREDENTIALS", "Identifiants incorrects");

    return this.buildTokens(user);
  }

  /**
   * Renouvelle un access token depuis un refresh token valide.
   */
  refresh(refreshToken: string): { accessToken: string } {
    const decoded = this.tokenService.verifyRefresh(refreshToken);
    // On re-signe avec sub uniquement — on n'a pas l'email dans le refresh token
    return { accessToken: this.tokenService.signAccess({ sub: decoded.sub, email: "" }) };
  }

  private buildTokens(user: User): AuthTokens {
    const publicUser = toPublicUser(user);
    return {
      accessToken: this.tokenService.signAccess({ sub: user.id, email: user.email }),
      refreshToken: this.tokenService.signRefresh({ sub: user.id }),
      user: publicUser,
    };
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
