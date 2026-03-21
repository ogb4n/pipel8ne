import mongoose, { Schema, Document } from "mongoose";

export interface IGitRepositorySubdoc {
  cloneUrl: string;
  fullName: string;
  defaultBranch: string;
  provider: string;
}

export interface IProjectDocument extends Document {
  name: string;
  path: string;
  provider: string;
  visibility: "private" | "public";
  ownerId: string;
  gitRepository?: IGitRepositorySubdoc;
  createdAt: Date;
  updatedAt: Date; // domain lastModified
}

const GitRepositorySubSchema = new Schema(
  {
    cloneUrl: { type: String, required: true },
    fullName: { type: String, required: true },
    defaultBranch: { type: String, required: true },
    provider: { type: String, required: true },
  },
  { _id: false },
);

const ProjectSchema = new Schema<IProjectDocument>(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["private", "public"], required: true, default: "private" },
    ownerId: { type: String, required: true, index: true },
    gitRepository: { type: GitRepositorySubSchema, default: undefined },
  },
  { timestamps: true },
);

export const ProjectModel = mongoose.model<IProjectDocument>("Project", ProjectSchema);
