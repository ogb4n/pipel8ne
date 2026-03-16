/**
 * Routes Credential — gestion des credentials de plateforme par utilisateur.
 * Toutes les routes sont protégées par JWT.
 * Les valeurs sensibles ne transitent jamais en clair dans les réponses.
 */
import { FastifyInstance, FastifyReply } from "fastify";
import { NotFoundError, ForbiddenError } from "../../../Domain/errors.js";
import {
  credentialSchema,
  credentialListSchema,
  createCredentialBodySchema,
  updateCredentialBodySchema,
  notFoundSchema,
} from "./credentials.schemas.js";

function handleDomainError(err: unknown, reply: FastifyReply) {
  if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
  if (err instanceof ForbiddenError) return reply.status(403).send({ message: err.message });
  throw err;
}

interface CredentialParams {
  id: string;
}

interface CreateCredentialBody {
  provider: string;
  label: string;
  value: string;
}

interface UpdateCredentialBody {
  label?: string;
  value?: string;
}

export default async function credentialRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /** GET /api/credentials — liste les credentials de l'utilisateur connecté */
  app.get(
    "/api/credentials",
    {
      schema: {
        tags: ["credentials"],
        summary: "Liste les credentials de l'utilisateur connecté",
        security: [{ bearerAuth: [] }],
        response: { 200: credentialListSchema },
      },
    },
    async (request) => {
      return app.credentialService.listForUser(request.user.sub);
    },
  );

  /** POST /api/credentials — crée un credential (la valeur est chiffrée avant stockage) */
  app.post<{ Body: CreateCredentialBody }>(
    "/api/credentials",
    {
      schema: {
        tags: ["credentials"],
        summary: "Crée un credential chiffré pour une plateforme",
        security: [{ bearerAuth: [] }],
        body: createCredentialBodySchema,
        response: { 201: credentialSchema },
      },
    },
    async (request, reply) => {
      try {
        const credential = await app.credentialService.create(request.user.sub, request.body);
        return reply.status(201).send(credential);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** PUT /api/credentials/:id — met à jour le libellé et/ou la valeur */
  app.put<{ Params: CredentialParams; Body: UpdateCredentialBody }>(
    "/api/credentials/:id",
    {
      schema: {
        tags: ["credentials"],
        summary: "Met à jour un credential (libellé et/ou valeur)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        body: updateCredentialBodySchema,
        response: { 200: credentialSchema, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        return await app.credentialService.update(
          request.params.id,
          request.user.sub,
          request.body,
        );
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** DELETE /api/credentials/:id — supprime un credential */
  app.delete<{ Params: CredentialParams }>(
    "/api/credentials/:id",
    {
      schema: {
        tags: ["credentials"],
        summary: "Supprime un credential",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 204: { type: "null" }, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        await app.credentialService.delete(request.params.id, request.user.sub);
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
}
