import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../../domain/user/User";

const isDev = process.env.NODE_ENV === "development";

/**
 * DataSource TypeORM — PostgreSQL (dev + prod).
 * En dev : synchronize = true  (auto-sync depuis les entités)
 * En prod : synchronize = false (migrations obligatoires)
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: isDev,
  logging: isDev,
  entities: [User],
  migrations: isDev
    ? ["src/infrastructure/database/migrations/*.ts"]
    : ["dist/infrastructure/database/migrations/*.js"],
});
