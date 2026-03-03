import { FastifyInstance } from "fastify";
import { UserService } from "../../../domain/user/UserService";
import { UserRepository } from "../../../infrastructure/database/repositories/UserRepository";
import { userSchema, userListSchema, notFoundSchema } from "./users.schemas";

export default async function userRoutes(app: FastifyInstance) {
  const userService = new UserService(new UserRepository());

  // Toutes les routes de ce scope sont protégées par JWT
  app.addHook("onRequest", app.authenticate);

  // GET /api/users
  app.get(
    "/api/users",
    {
      schema: {
        tags: ["users"],
        summary: "Liste tous les utilisateurs",
        security: [{ bearerAuth: [] }],
        response: { 200: userListSchema },
      },
    },
    async () => userService.getAll(),
  );

  // GET /api/users/:id
  app.get<{ Params: { id: string } }>(
    "/api/users/:id",
    {
      schema: {
        tags: ["users"],
        summary: "Récupère un utilisateur par ID",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 200: userSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const user = await userService.getById(request.params.id);
      if (!user) return reply.status(404).send({ message: "Utilisateur introuvable" });
      return user;
    },
  );

  // DELETE /api/users/:id
  app.delete<{ Params: { id: string } }>(
    "/api/users/:id",
    {
      schema: {
        tags: ["users"],
        summary: "Supprime un utilisateur",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 204: { type: "null" } },
      },
    },
    async (request, reply) => {
      await userService.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
