import { FastifyInstance } from "fastify";
import { AuthService, AuthError } from "../../../domain/auth/AuthService";
import { UserRepository } from "../../../infrastructure/database/repositories/UserRepository";
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  authResponseSchema,
  refreshResponseSchema,
  errorSchema,
} from "./auth.schemas";

export default async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(new UserRepository());

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
        const user = await authService.register(request.body);
        const payload = { sub: user.id, email: user.email };
        const accessToken  = app.jwt.sign(payload, { expiresIn: "15m" });
        const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });
        return reply.status(201).send({ accessToken, refreshToken, user });
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
        const user = await authService.validateCredentials(
          request.body.email,
          request.body.password,
        );
        const payload = { sub: user.id, email: user.email };
        const accessToken  = app.jwt.sign(payload, { expiresIn: "15m" });
        const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });
        return reply.status(200).send({ accessToken, refreshToken, user });
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
        const decoded = app.jwt.verify<{ sub: string }>(request.body.refreshToken);
        const accessToken = app.jwt.sign(
          { sub: decoded.sub },
          { expiresIn: "15m" },
        );
        return reply.status(200).send({ accessToken });
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
