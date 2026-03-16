import mongoose, { Schema, Document } from "mongoose";

export interface IApiKeyDocument extends Document {
  userId: string;
  name: string;
  keyHash: string;
  prefix: string;
  isRevoked: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKeyDocument>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    isRevoked: { type: Boolean, required: true, default: false },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ApiKeyModel = mongoose.model<IApiKeyDocument>("ApiKey", ApiKeySchema);
