import { RefreshTokenModel } from "../models/RefreshTokenModel.js";
import { RefreshToken } from "../../../Domain/auth/RefreshToken.js";
import { IRefreshTokenRepository } from "../../../Domain/auth/IRefreshTokenRepository.js";

export class RefreshTokenRepository implements IRefreshTokenRepository {
  private toRefreshToken(doc: InstanceType<typeof RefreshTokenModel>): RefreshToken {
    return {
      id: doc._id.toString(),
      tokenHash: doc.tokenHash,
      userId: doc.userId,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      isRevoked: doc.isRevoked,
    };
  }

  async create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    const doc = await RefreshTokenModel.create({ ...data, isRevoked: false });
    return this.toRefreshToken(doc);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash });
    return doc ? this.toRefreshToken(doc) : null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await RefreshTokenModel.updateOne({ tokenHash }, { isRevoked: true });
  }

  async revokeAllByUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ userId }, { isRevoked: true });
  }
}
