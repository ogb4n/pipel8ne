import mongoose from "mongoose";

const isDev = process.env.NODE_ENV === "development";

/**
 * Connexion MongoDB via Mongoose.
 * L'URI est fournie via la variable d'environnement DATABASE_URL.
 */
export async function connectDatabase(): Promise<void> {
  const uri = process.env.DATABASE_URL ?? "mongodb://localhost:27017/pipel8ne";
  await mongoose.connect(uri, { dbName: "pipel8ne" });
  if (isDev) {
    mongoose.set("debug", true);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
