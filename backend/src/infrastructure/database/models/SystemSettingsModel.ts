import mongoose, { Schema, Document } from "mongoose";

/**
 * Document Mongoose pour le singleton "system settings".
 * Un seul document avec key === "global" est attendu.
 */
export interface ISystemSettingsDocument extends Document {
  key: string;
  registrationEnabled: boolean;
}

const SystemSettingsSchema = new Schema<ISystemSettingsDocument>({
  key: { type: String, required: true, unique: true, default: "global" },
  registrationEnabled: { type: Boolean, default: true },
});

export const SystemSettingsModel = mongoose.model<ISystemSettingsDocument>(
  "SystemSettings",
  SystemSettingsSchema,
);
