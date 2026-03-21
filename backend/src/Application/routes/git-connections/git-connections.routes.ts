/**
 * Routes Git Connections — OAuth GitHub/GitLab + listing repos.
 * Toutes les routes sont protégées par JWT.
 */
import { FastifyInstance, FastifyReply } from "fastify";
import { NotFoundError, ForbiddenError } from "../../../domain/errors.js";
import {
  gitConnectionSchema,
  gitConnectionListSchema,
  oauthCallbackBodySchema,
  oauthConfigSchema,
  gitRepositoryListSchema,
  errorSchema,
} from "./git-connections.schemas.js";

function handleDomainError(err: unknown, reply: FastifyReply) {
  if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
  if (err instanceof ForbiddenError) return reply.status(403).send({ message: err.message });
  throw err;
}

interface OAuthCallbackBody {
  provider: "github" | "gitlab";
  code: string;
}

interface ConnectionParams {
  id: string;
}

interface ReposByProviderParams {
  provider: "github" | "gitlab";
}

export default async function gitConnectionRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /**
   * GET /api/git-connections/oauth/config
   * Retourne les URLs d'autorisation OAuth pour chaque provider activé.
   * Le frontend redirige l'utilisateur vers ces URLs.
   */
  app.get(
    "/api/git-connections/oauth/config",
    {
      schema: {
        tags: ["git-connections"],
        summary: "Retourne les URLs OAuth pour chaque provider configuré",
        security: [{ bearerAuth: [] }],
        response: { 200: oauthConfigSchema },
      },
    },
    async (request) => {
      const githubClientId = process.env.GITHUB_CLIENT_ID;
      const gitlabClientId = process.env.GITLAB_CLIENT_ID;
      const gitlabBaseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
      const oauthCallbackUrl = `${frontendUrl}/oauth/callback`;

      const githubState = Buffer.from(JSON.stringify({ provider: "github" })).toString("base64");
      const gitlabState = Buffer.from(JSON.stringify({ provider: "gitlab" })).toString("base64");

      return {
        github: {
          enabled: !!githubClientId,
          authUrl: githubClientId
            ? `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(oauthCallbackUrl)}&scope=repo,read:user&state=${githubState}`
            : "",
        },
        gitlab: {
          enabled: !!gitlabClientId,
          authUrl: gitlabClientId
            ? `${gitlabBaseUrl}/oauth/authorize?client_id=${gitlabClientId}&redirect_uri=${encodeURIComponent(process.env.GITLAB_REDIRECT_URI ?? oauthCallbackUrl)}&response_type=code&scope=read_user+read_api+read_repository&state=${gitlabState}`
            : "",
        },
      };
    },
  );

  /**
   * POST /api/git-connections/oauth/callback
   * Échange le code OAuth reçu du frontend et crée/met à jour la connexion.
   */
  app.post<{ Body: OAuthCallbackBody }>(
    "/api/git-connections/oauth/callback",
    {
      schema: {
        tags: ["git-connections"],
        summary: "Échange un code OAuth et crée la connexion Git",
        security: [{ bearerAuth: [] }],
        body: oauthCallbackBodySchema,
        response: { 201: gitConnectionSchema, 200: gitConnectionSchema, 400: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const connection = await app.gitConnectionService.connectOAuth(
          request.user.sub,
          request.body.provider,
          request.body.code,
        );
        return reply.status(201).send(connection);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("OAuth")) {
          return reply.status(400).send({ message: err.message });
        }
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * GET /api/git-connections
   * Liste les connexions Git de l'utilisateur connecté.
   */
  app.get(
    "/api/git-connections",
    {
      schema: {
        tags: ["git-connections"],
        summary: "Liste les connexions Git de l'utilisateur connecté",
        security: [{ bearerAuth: [] }],
        response: { 200: gitConnectionListSchema },
      },
    },
    async (request) => {
      return app.gitConnectionService.listForUser(request.user.sub);
    },
  );

  /**
   * DELETE /api/git-connections/:id
   * Supprime une connexion Git.
   */
  app.delete<{ Params: ConnectionParams }>(
    "/api/git-connections/:id",
    {
      schema: {
        tags: ["git-connections"],
        summary: "Supprime une connexion Git",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 204: { type: "null" }, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        await app.gitConnectionService.disconnect(request.params.id, request.user.sub);
        return reply.status(204).send();
      } catch (err: unknown) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * GET /api/git-connections/:id/repos
   * Récupère les repos accessibles via une connexion Git spécifique.
   */
  app.get<{ Params: ConnectionParams }>(
    "/api/git-connections/:id/repos",
    {
      schema: {
        tags: ["git-connections"],
        summary: "Liste les repos accessibles via une connexion Git",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 200: gitRepositoryListSchema, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        return await app.gitConnectionService.listRepositories(request.params.id, request.user.sub);
      } catch (err: unknown) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * GET /api/git-connections/repos/:provider
   * Raccourci : récupère les repos pour un provider donné sans connaître l'ID de connexion.
   */
  app.get<{ Params: ReposByProviderParams }>(
    "/api/git-connections/repos/:provider",
    {
      schema: {
        tags: ["git-connections"],
        summary: "Liste les repos pour un provider (GitHub ou GitLab)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            provider: { type: "string", enum: ["github", "gitlab"] },
          },
        },
        response: { 200: gitRepositoryListSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        return await app.gitConnectionService.listRepositoriesByProvider(
          request.user.sub,
          request.params.provider,
        );
      } catch (err: unknown) {
        return handleDomainError(err, reply);
      }
    },
  );
}
