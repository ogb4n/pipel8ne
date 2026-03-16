import { User } from "./User.js";
import { PublicUser, toPublicUser } from "./PublicUser.js";
import { IUserRepository } from "./IUserRepository.js";
import { IUserReader } from "./IUserReader.js";

/**
 * Service domaine User.
 * Retourne des PublicUser (sans passwordHash) — la sécurité est dans le domain,
 * pas dans la sérialisation HTTP.
 */
export class UserService implements IUserReader {
  constructor(private readonly userRepository: IUserRepository) {}

  async getAll(): Promise<PublicUser[]> {
    return (await this.userRepository.findAll()).map(toPublicUser);
  }

  async getById(id: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findById(id);
    return user ? toPublicUser(user) : null;
  }

  delete(id: string): Promise<void> {
    return this.userRepository.delete(id);
  }

  /**
   * Used internally by AuthService — returns full User including passwordHash.
   * Not exposed as PublicUser because auth needs the hash for verification.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Creates a new user. Single point of user creation across the system.
   * Returns full User (with passwordHash) for the auth flow.
   */
  createUser(data: {
    email: string;
    name?: string;
    passwordHash: string;
    role?: "admin" | "user";
  }): Promise<User> {
    return this.userRepository.create(data);
  }

  /**
   * Returns the total number of users in the system.
   * Used by AuthService to determine if the first user should be admin.
   */
  count(): Promise<number> {
    return this.userRepository.count();
  }

  /**
   * Updates a user by ID. Used by admin routes to change role (or other fields).
   * Returns PublicUser or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<Pick<User, "name" | "passwordHash" | "role">>,
  ): Promise<PublicUser | null> {
    const user = await this.userRepository.updateById(id, data);
    return user ? toPublicUser(user) : null;
  }
}
