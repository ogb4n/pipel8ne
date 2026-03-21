import mongoose, { Schema, Document } from "mongoose";

export interface IGitConnectionDocument extends Document {
  userId: string;
  provider: "github" | "gitlab";
  providerUsername: string;
  avatarUrl: string | null;
  encryptedAccessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const GitConnectionSchema = new Schema<IGitConnectionDocument>(
  {
    userId: { type: String, required: true, index: true },
    provider: { type: String, required: true, enum: ["github", "gitlab"] },
    providerUsername: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    encryptedAccessToken: { type: String, required: true },
  },
  { timestamps: true },
);

// Un seul compte par provider par utilisateur
GitConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const GitConnectionModel = mongoose.model<IGitConnectionDocument>(
  "GitConnection",
  GitConnectionSchema,
);
