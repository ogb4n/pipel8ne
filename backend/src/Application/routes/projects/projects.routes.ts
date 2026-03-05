/**
 * Routes Project — exposition CRUD de la ressource Project via l'API REST.
 * Toutes les routes sont protégées par JWT ; l'identité du demandeur est
 * extraite de request.user.sub pour les opérations sensibles (création).
 */
import { FastifyInstance } from "fastify";
import {
  projectSchema,
  projectListSchema,
  createProjectBodySchema,
  updateProjectBodySchema,
  notFoundSchema,
} from "./projects.schemas";

interface ProjectParams {
  id: string;
}

interface CreateProjectBody {
  name: string;
  path: string;
  provider: string;
  visibility?: "private" | "public";
}

interface UpdateProjectBody {
  name?: string;
  path?: string;
  provider?: string;
  visibility?: "private" | "public";
}

export default async function projectRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /** GET /api/projects — retourne tous les projets */
  app.get(
    "/api/projects",
    {
      schema: {
        tags: ["projects"],
        summary: "Get all projects",
        security: [{ bearerAuth: [] }],
        response: { 200: projectListSchema },
      },
    },
    async () => app.projectService.getAll(),
  );

  /** POST /api/projects — crée un nouveau projet pour l'utilisateur authentifié */
  app.post<{ Body: CreateProjectBody }>(
    "/api/projects",
    {
      schema: {
        tags: ["projects"],
        summary: "Create a project",
        security: [{ bearerAuth: [] }],
        body: createProjectBodySchema,
        response: { 201: projectSchema },
      },
    },
    async (request, reply) => {
      const ownerId = request.user.sub;
      const { name, path, provider, visibility } = request.body;
      const project = await app.projectService.create({
        name,
        path,
        provider,
        visibility: visibility ?? "private",
        ownerId,
      });
      return reply.status(201).send(project);
    },
  );

  /** GET /api/projects/public — retourne les projets publics */
  app.get(
    "/api/projects/public",
    {
      schema: {
        tags: ["projects"],
        summary: "Get all public projects",
        security: [{ bearerAuth: [] }],
        response: { 200: projectListSchema },
      },
    },
    async () => app.projectService.getAllPublic(),
  );

  /** GET /api/projects/mine — retourne les projets de l'utilisateur authentifié */
  app.get(
    "/api/projects/mine",
    {
      schema: {
        tags: ["projects"],
        summary: "Get projects owned by the authenticated user",
        security: [{ bearerAuth: [] }],
        response: { 200: projectListSchema },
      },
    },
    async (request) => app.projectService.getByOwner(request.user.sub),
  );

  /** GET /api/projects/:id — retourne un projet par identifiant */
  app.get<{ Params: ProjectParams }>(
    "/api/projects/:id",
    {
      schema: {
        tags: ["projects"],
        summary: "Get a project by id",
        security: [{ bearerAuth: [] }],
        response: { 200: projectSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const project = await app.projectService.getById(request.params.id);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      return project;
    },
  );

  /** PATCH /api/projects/:id — met à jour un projet existant */
  app.patch<{ Params: ProjectParams; Body: UpdateProjectBody }>(
    "/api/projects/:id",
    {
      schema: {
        tags: ["projects"],
        summary: "Update a project",
        security: [{ bearerAuth: [] }],
        body: updateProjectBodySchema,
        response: { 200: projectSchema, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const existing = await app.projectService.getById(request.params.id);
      if (!existing) return reply.status(404).send({ message: "Project not found" });
      if (existing.ownerId !== request.user.sub)
        return reply.status(403).send({ message: "Forbidden" });
      const project = await app.projectService.update(request.params.id, request.body);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      return project;
    },
  );

  /** DELETE /api/projects/:id — supprime un projet (owner uniquement) */
  app.delete<{ Params: ProjectParams }>(
    "/api/projects/:id",
    {
      schema: {
        tags: ["projects"],
        summary: "Delete a project",
        security: [{ bearerAuth: [] }],
        response: { 204: { type: "null" }, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const existing = await app.projectService.getById(request.params.id);
      if (!existing) return reply.status(404).send({ message: "Project not found" });
      if (existing.ownerId !== request.user.sub)
        return reply.status(403).send({ message: "Forbidden" });
      await app.projectService.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
