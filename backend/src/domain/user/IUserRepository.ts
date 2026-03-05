import { User } from "./User";

/**
 * Port (interface) du repository User.
 * Le Domain ne connaît que ce contrat — jamais Mongoose directement.
 */
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name?: string; passwordHash: string }): Promise<User>;
  updateById(id: string, data: Partial<Pick<User, "name" | "passwordHash">>): Promise<User | null>;
  delete(id: string): Promise<void>;
}
