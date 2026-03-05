import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshTokenDocument extends Document {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

// Auto-delete documents ~1h after expiresAt
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const RefreshTokenModel = mongoose.model<IRefreshTokenDocument>(
  "RefreshToken",
  RefreshTokenSchema,
);
