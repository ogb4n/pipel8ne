import { FastifyInstance } from "fastify";
import { AuthError } from "../../../domain/auth/AuthService";
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  authResponseSchema,
  refreshResponseSchema,
  errorSchema,
} from "./auth.schemas";

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post<{ Body: { email: string; password: string; name?: string } }>(
    "/api/auth/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Crée un compte utilisateur",
        body: registerBodySchema,
        response: { 201: authResponseSchema, 409: errorSchema, 400: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const result = await app.authService.register(request.body);
        return reply.status(201).send(result);
      } catch (err) {
        if (err instanceof AuthError && err.code === "EMAIL_IN_USE") {
          return reply.status(409).send({ message: err.message });
        }
        throw err;
      }
    },
  );

  // POST /api/auth/login
  app.post<{ Body: { email: string; password: string } }>(
    "/api/auth/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Authentifie un utilisateur et retourne des tokens JWT",
        body: loginBodySchema,
        response: { 200: authResponseSchema, 401: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const result = await app.authService.login(request.body.email, request.body.password);
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
          return reply.status(401).send({ message: err.message });
        }
        throw err;
      }
    },
  );

  // POST /api/auth/refresh
  app.post<{ Body: { refreshToken: string } }>(
    "/api/auth/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Renouvelle l'access token depuis un refresh token valide",
        body: refreshBodySchema,
        response: { 200: refreshResponseSchema, 401: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const result = await app.authService.refresh(request.body.refreshToken);
        return reply.status(200).send(result);
      } catch {
        return reply.status(401).send({ message: "Refresh token invalide ou expiré" });
      }
    },
  );

  // POST /api/auth/logout
  app.post(
    "/api/auth/logout",
    {
      schema: {
        tags: ["auth"],
        summary: "Déconnecte l'utilisateur (côté client, supprimez vos tokens)",
        response: { 200: { type: "object", properties: { message: { type: "string" } } } },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({ message: "Déconnecté avec succès" });
    },
  );
}
