import { UserModel } from "../models/UserModel.js";
import { User } from "../../../Domain/user/User.js";
import { IUserRepository } from "../../../Domain/user/IUserRepository.js";

/**
 * Implémentation Mongoose du port IUserRepository.
 * Toute la plomberie MongoDB est confinée ici — le Domain n'y touche pas.
 */
export class UserRepository implements IUserRepository {
  /** Mappe un document Mongoose vers le type domain User (avec passwordHash). */
  private toUser(doc: InstanceType<typeof UserModel>): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name ?? null,
      passwordHash: doc.passwordHash,
      role: doc.role ?? "user",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findAll(): Promise<User[]> {
    const docs = await UserModel.find();
    return docs.map((doc) => this.toUser(doc));
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    return doc ? this.toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() });
    return doc ? this.toUser(doc) : null;
  }

  async create(data: {
    email: string;
    name?: string;
    passwordHash: string;
    role?: "admin" | "user";
  }): Promise<User> {
    const doc = await UserModel.create(data);
    return this.toUser(doc);
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }

  async updateById(
    id: string,
    data: Partial<Pick<User, "name" | "passwordHash" | "role">>,
  ): Promise<User | null> {
    const doc = await UserModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? this.toUser(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
  }
}
