import { AppDataSource } from "../client";
import { User } from "../../../domain/user/User";
import { IUserRepository } from "../../../domain/user/IUserRepository";

/**
 * Implémentation TypeORM du port IUserRepository.
 * Toute la plomberie BDD est confinée ici — le Domain n'y touche pas.
 */
export class UserRepository implements IUserRepository {
  private readonly repo = AppDataSource.getRepository(User);

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async create(data: { email: string; name?: string }): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete({ id });
  }
}
