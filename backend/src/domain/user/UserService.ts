import { User } from "./User";
import { IUserRepository } from "./IUserRepository";

/**
 * Service domaine User — contient les cas d'usage métier.
 * Dépend uniquement du port IUserRepository, pas de Mongoose.
 */
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  getAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  getById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  create(data: { email: string; name?: string }): Promise<User> {
    return this.userRepository.create(data);
  }

  delete(id: string): Promise<void> {
    return this.userRepository.delete(id);
  }
}
