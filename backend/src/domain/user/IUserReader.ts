import { User } from "./User.js";
import { PublicUser } from "./PublicUser.js";

/**
 * Port minimal pour la lecture des utilisateurs.
 * Utilisé par AuthService — évite de dépendre de UserService (une classe concrète)
 * ou de l'intégralité de IUserRepository.
 */
export interface IUserReader {
  findByEmail(email: string): Promise<User | null>;
  getById(id: string): Promise<PublicUser | null>;
  createUser(data: { email: string; name?: string; passwordHash: string }): Promise<User>;
}
