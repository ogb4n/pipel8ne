import { UserModel } from "../models/UserModel";
import { User } from "../../../domain/user/User";
import { IUserRepository } from "../../../domain/user/IUserRepository";

/**
 * Implémentation Mongoose du port IUserRepository.
 * Toute la plomberie MongoDB est confinée ici — le Domain n'y touche pas.
 */
export class UserRepository implements IUserRepository {
  private toUser(doc: InstanceType<typeof UserModel>): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findAll(): Promise<User[]> {
    const docs = await UserModel.find().lean(false);
    return docs.map((doc) => this.toUser(doc));
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    return doc ? this.toUser(doc) : null;
  }

  async create(data: { email: string; name?: string }): Promise<User> {
    const doc = await UserModel.create(data);
    return this.toUser(doc);
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
  }
}
