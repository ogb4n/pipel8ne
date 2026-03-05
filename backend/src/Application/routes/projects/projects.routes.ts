/**
 * Routes Project — exposition CRUD de la ressource Project via l'API REST.
 */
import { FastifyInstance, FastifyReply } from "fastify";
import { NotFoundError, ForbiddenError } from "../../../Domain/errors.js";
import {
  projectSchema,
  projectListSchema,
  createProjectBodySchema,
  updateProjectBodySchema,
  notFoundSchema,
} from "./projects.schemas.js";

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

function handleDomainError(err: unknown, reply: FastifyReply) {
  if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
  if (err instanceof ForbiddenError) return reply.status(403).send({ message: err.message });
  throw err;
}

export default async function projectRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /** GET /api/projects */
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

  /** POST /api/projects */
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

  /** GET /api/projects/public */
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

  /** GET /api/projects/mine */
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

  /** GET /api/projects/:id */
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

  /** PATCH /api/projects/:id */
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
      try {
        const project = await app.projectService.update(
          request.params.id,
          request.body,
          request.user.sub,
        );
        return project;
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** DELETE /api/projects/:id */
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
      try {
        await app.projectService.delete(request.params.id, request.user.sub);
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
}
