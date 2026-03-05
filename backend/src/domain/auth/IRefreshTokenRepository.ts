import { RefreshToken } from "./RefreshToken.js";

export interface IRefreshTokenRepository {
  create(data: { tokenHash: string; userId: string; expiresAt: Date }): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
}
