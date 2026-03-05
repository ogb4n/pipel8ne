export interface RefreshToken {
  id: string;
  tokenHash: string; // SHA-256 of the raw JWT refresh token
  userId: string; // references User.id
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}
