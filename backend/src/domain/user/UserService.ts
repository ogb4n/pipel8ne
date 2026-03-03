import { User } from "./User";
import { PublicUser } from "./PublicUser";
import { IUserRepository } from "./IUserRepository";

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omitted, ...pub } = user;
  return pub;
}

/**
 * Service domaine User.
 * Retourne des PublicUser (sans passwordHash) — la sécurité est dans le domain,
 * pas dans la sérialisation HTTP.
 */
export class UserService {
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
}
