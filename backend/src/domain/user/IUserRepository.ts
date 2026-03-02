import { User } from "./User";

/**
 * Port (interface) du repository User.
 * Le Domain ne connaît que ce contrat — jamais TypeORM directement.
 */
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  create(data: { email: string; name?: string }): Promise<User>;
  delete(id: number): Promise<void>;
}
