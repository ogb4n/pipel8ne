import { ApiKey } from "../../../Domain/apikey/ApiKey.js";
import { IApiKeyRepository } from "../../../Domain/apikey/IApiKeyRepository.js";
import { ApiKeyModel } from "../models/ApiKeyModel.js";

export class ApiKeyRepository implements IApiKeyRepository {
  /** Mappe un document Mongoose vers l'entité domaine ApiKey. */
  private toApiKey(doc: InstanceType<typeof ApiKeyModel>): ApiKey {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      name: doc.name,
      keyHash: doc.keyHash,
      prefix: doc.prefix,
      isRevoked: doc.isRevoked,
      lastUsedAt: doc.lastUsedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(data: {
    userId: string;
    name: string;
    keyHash: string;
    prefix: string;
  }): Promise<ApiKey> {
    const doc = await ApiKeyModel.create(data);
    return this.toApiKey(doc);
  }

  async findAllByUserId(userId: string): Promise<ApiKey[]> {
    const docs = await ApiKeyModel.find({ userId });
    return docs.map((doc) => this.toApiKey(doc));
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const doc = await ApiKeyModel.findOne({ keyHash });
    return doc ? this.toApiKey(doc) : null;
  }

  async revoke(id: string, userId: string): Promise<ApiKey | null> {
    const doc = await ApiKeyModel.findOneAndUpdate(
      { _id: id, userId },
      { isRevoked: true },
      { new: true },
    );
    return doc ? this.toApiKey(doc) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await ApiKeyModel.deleteOne({ _id: id, userId });
    return result.deletedCount === 1;
  }

  async updateLastUsed(id: string): Promise<void> {
    await ApiKeyModel.updateOne({ _id: id }, { lastUsedAt: new Date() });
  }
}
