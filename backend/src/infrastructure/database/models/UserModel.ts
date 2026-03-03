import mongoose, { Schema, Document } from "mongoose";

/**
 * Document Mongoose pour la collection "users".
 * Les timestamps (createdAt / updatedAt) sont gérés automatiquement par Mongoose.
 */
export interface IUserDocument extends Document {
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, default: null, trim: true },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUserDocument>("User", UserSchema);
