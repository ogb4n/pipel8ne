import mongoose, { Schema, Document } from "mongoose";

export interface ICredentialDocument extends Document {
  userId: string;
  provider: string;
  label: string;
  encryptedValue: string;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema = new Schema<ICredentialDocument>(
  {
    userId: { type: String, required: true, index: true },
    provider: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    encryptedValue: { type: String, required: true },
  },
  { timestamps: true },
);

export const CredentialModel = mongoose.model<ICredentialDocument>("Credential", CredentialSchema);
