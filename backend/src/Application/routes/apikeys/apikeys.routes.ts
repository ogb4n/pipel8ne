/**
 * Routes API Key — gestion des clés API par utilisateur.
 * Toutes les routes sont protégées par JWT ou clé API.
 * Le keyHash n'est jamais exposé dans les réponses.
 */
import { FastifyInstance, FastifyReply } from "fastify";
import { NotFoundError, ForbiddenError } from "../../../Domain/errors.js";
import {
  apiKeySchema,
  apiKeyListSchema,
  createApiKeyBodySchema,
  createApiKeyResponseSchema,
  apiKeyParamsSchema,
  notFoundSchema,
} from "./apikeys.schemas.js";

function handleDomainError(err: unknown, reply: FastifyReply) {
  if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
  if (err instanceof ForbiddenError) return reply.status(403).send({ message: err.message });
  throw err;
}

interface ApiKeyParams {
  id: string;
}

interface CreateApiKeyBody {
  name: string;
}

export async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /** GET /api/api-keys — liste les clés API de l'utilisateur connecté */
  app.get(
    "/api/api-keys",
    {
      schema: {
        tags: ["api-keys"],
        summary: "Liste les clés API de l'utilisateur connecté",
        security: [{ bearerAuth: [] }],
        response: { 200: apiKeyListSchema },
      },
    },
    async (request) => {
      return app.apiKeyService.listApiKeys(request.user.sub);
    },
  );

  /** POST /api/api-keys — crée une nouvelle clé API */
  app.post<{ Body: CreateApiKeyBody }>(
    "/api/api-keys",
    {
      schema: {
        tags: ["api-keys"],
        summary: "Crée une nouvelle clé API (la clé brute est retournée une seule fois)",
        security: [{ bearerAuth: [] }],
        body: createApiKeyBodySchema,
        response: { 201: createApiKeyResponseSchema },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { name } = request.body;

      const { apiKey, rawKey } = await app.apiKeyService.generateApiKey(userId, name);
      const { keyHash: _k, ...publicApiKey } = apiKey;
      return reply.code(201).send({ ...publicApiKey, rawKey });
    },
  );

  /** DELETE /api/api-keys/:id — supprime définitivement une clé API */
  app.delete<{ Params: ApiKeyParams }>(
    "/api/api-keys/:id",
    {
      schema: {
        tags: ["api-keys"],
        summary: "Supprime définitivement une clé API",
        security: [{ bearerAuth: [] }],
        params: apiKeyParamsSchema,
        response: { 204: { type: "null" }, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        const deleted = await app.apiKeyService.deleteApiKey(request.params.id, request.user.sub);
        if (!deleted) return reply.status(404).send({ message: "Clé API introuvable" });
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** POST /api/api-keys/:id/revoke — révoque une clé API (sans la supprimer) */
  app.post<{ Params: ApiKeyParams }>(
    "/api/api-keys/:id/revoke",
    {
      schema: {
        tags: ["api-keys"],
        summary: "Révoque une clé API (la marque comme invalide sans la supprimer)",
        security: [{ bearerAuth: [] }],
        params: apiKeyParamsSchema,
        response: { 200: apiKeySchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        const key = await app.apiKeyService.revokeApiKey(request.params.id, request.user.sub);
        if (!key) return reply.status(404).send({ message: "Clé API introuvable" });
        return reply.status(200).send(key);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
}
