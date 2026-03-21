import { GitConnection, GitProvider } from "../../../domain/gitconnection/GitConnection.js";
import { IGitConnectionRepository } from "../../../domain/gitconnection/IGitConnectionRepository.js";
import { GitConnectionModel } from "../models/GitConnectionModel.js";

export class GitConnectionRepository implements IGitConnectionRepository {
  private toGitConnection(doc: InstanceType<typeof GitConnectionModel>): GitConnection {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      provider: doc.provider as GitProvider,
      providerUsername: doc.providerUsername,
      avatarUrl: doc.avatarUrl,
      encryptedAccessToken: doc.encryptedAccessToken,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findAllByUserId(userId: string): Promise<GitConnection[]> {
    const docs = await GitConnectionModel.find({ userId });
    return docs.map((doc) => this.toGitConnection(doc));
  }

  async findById(id: string): Promise<GitConnection | null> {
    const doc = await GitConnectionModel.findById(id);
    return doc ? this.toGitConnection(doc) : null;
  }

  async findByUserAndProvider(
    userId: string,
    provider: GitProvider,
  ): Promise<GitConnection | null> {
    const doc = await GitConnectionModel.findOne({ userId, provider });
    return doc ? this.toGitConnection(doc) : null;
  }

  async create(data: {
    userId: string;
    provider: GitProvider;
    providerUsername: string;
    avatarUrl: string | null;
    encryptedAccessToken: string;
  }): Promise<GitConnection> {
    const doc = await GitConnectionModel.create(data);
    return this.toGitConnection(doc);
  }

  async updateById(
    id: string,
    data: Partial<Pick<GitConnection, "providerUsername" | "avatarUrl" | "encryptedAccessToken">>,
  ): Promise<GitConnection | null> {
    const doc = await GitConnectionModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? this.toGitConnection(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await GitConnectionModel.findByIdAndDelete(id);
  }
}
