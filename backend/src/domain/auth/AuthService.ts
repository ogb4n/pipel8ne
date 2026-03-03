import argon2 from "argon2";
import { IUserRepository } from "../user/IUserRepository";
import { User } from "../user/User";

export type PublicUser = Omit<User, "passwordHash">;

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Inscrit un nouvel utilisateur en hachant son mot de passe.
   * Lève une erreur si l'email est déjà utilisé.
   */
  async register(data: { email: string; password: string; name?: string }): Promise<PublicUser> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new AuthError("EMAIL_IN_USE", "Cet email est déjà utilisé");

    const passwordHash = await argon2.hash(data.password);
    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    return this.toPublicUser(user);
  }

  /**
   * Vérifie les identifiants et retourne l'utilisateur public si valides.
   * Lève une erreur si les identifiants sont incorrects.
   */
  async validateCredentials(email: string, password: string): Promise<PublicUser> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AuthError("INVALID_CREDENTIALS", "Identifiants incorrects");

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new AuthError("INVALID_CREDENTIALS", "Identifiants incorrects");

    return this.toPublicUser(user);
  }

  private toPublicUser(user: User): PublicUser {
    const { passwordHash: _omitted, ...publicUser } = user;
    return publicUser;
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
