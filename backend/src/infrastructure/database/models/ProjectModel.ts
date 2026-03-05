import mongoose, { Schema, Document } from "mongoose";

export interface IProjectDocument extends Document {
  name: string;
  path: string;
  provider: string;
  visibility: "private" | "public";
  ownerId: string;
  createdAt: Date;
  updatedAt: Date; // domain lastModified
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["private", "public"], required: true, default: "private" },
    ownerId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const ProjectModel = mongoose.model<IProjectDocument>("Project", ProjectSchema);
