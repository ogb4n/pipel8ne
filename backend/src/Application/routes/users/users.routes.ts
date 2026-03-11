import argon2 from "argon2";
import { FastifyInstance } from "fastify";
import {
  userSchema,
  userListSchema,
  notFoundSchema,
  patchUserBodySchema,
  createUserBodySchema,
} from "./users.schemas.js";

export default async function userRoutes(app: FastifyInstance) {
  // Toutes les routes de ce scope sont protégées par JWT
  app.addHook("onRequest", app.authenticate);

  // GET /api/users/me — utilisateur courant
  app.get(
    "/api/users/me",
    {
      schema: {
        tags: ["users"],
        summary: "Récupère le profil de l'utilisateur connecté",
        security: [{ bearerAuth: [] }],
        response: { 200: userSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const user = await app.userService.getById(request.user.sub);
      if (!user) return reply.status(404).send({ message: "Utilisateur introuvable" });
      return user;
    },
  );

  // GET /api/users — admin uniquement
  app.get(
    "/api/users",
    {
      onRequest: [app.adminGuard],
      schema: {
        tags: ["users"],
        summary: "Liste tous les utilisateurs (admin)",
        security: [{ bearerAuth: [] }],
        response: { 200: userListSchema },
      },
    },
    async () => app.userService.getAll(),
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
      const user = await app.userService.getById(request.params.id);
      if (!user) return reply.status(404).send({ message: "Utilisateur introuvable" });
      return user;
    },
  );

  // PATCH /api/users/:id — admin uniquement (mise à jour du rôle)
  app.patch<{ Params: { id: string }; Body: { role: "admin" | "user" } }>(
    "/api/users/:id",
    {
      onRequest: [app.adminGuard],
      schema: {
        tags: ["users"],
        summary: "Met à jour le rôle d'un utilisateur (admin)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        body: patchUserBodySchema,
        response: { 200: userSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const user = await app.userService.updateById(request.params.id, { role: request.body.role });
      if (!user) return reply.status(404).send({ message: "Utilisateur introuvable" });
      return user;
    },
  );

  // POST /api/users — admin uniquement (création directe)
  app.post<{ Body: { email: string; password: string; name?: string; role?: "admin" | "user" } }>(
    "/api/users",
    {
      onRequest: [app.adminGuard],
      schema: {
        tags: ["users"],
        summary: "Crée un utilisateur directement (admin)",
        security: [{ bearerAuth: [] }],
        body: createUserBodySchema,
        response: {
          201: userSchema,
          409: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name, role } = request.body;
      const existing = await app.userService.findByEmail(email);
      if (existing)
        return reply.status(409).send({ message: "Un utilisateur avec cet email existe déjà." });
      const passwordHash = await argon2.hash(password);
      const user = await app.userService.createUser({
        email,
        name,
        passwordHash,
        role: role ?? "user",
      });
      return reply.status(201).send(user);
    },
  );

  // DELETE /api/users/:id — admin uniquement
  app.delete<{ Params: { id: string } }>(
    "/api/users/:id",
    {
      onRequest: [app.adminGuard],
      schema: {
        tags: ["users"],
        summary: "Supprime un utilisateur (admin)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 204: { type: "null" } },
      },
    },
    async (request, reply) => {
      await app.userService.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
