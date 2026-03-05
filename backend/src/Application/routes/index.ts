import { FastifyInstance } from "fastify";
import healthRoutes from "./health/health.routes";
import userRoutes from "./users/users.routes";
import authRoutes from "./auth/auth.routes";
import projectRoutes from "./projects/projects.routes";
import graphRoutes from "./graphs/graphs.routes";

/**
 * Enregistre toutes les routes de l'API.
 * Ajoute ici les futurs modules de routes.
 */
export default async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(projectRoutes);
  await app.register(graphRoutes);
}
