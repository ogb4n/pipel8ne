/**
 * Routes Pipeline — gestion des pipelines associés à un projet.
 * Toutes les routes sont protégées par JWT.
 * L'autorisation est gérée par GraphService (couche domaine).
 */
import { FastifyInstance, FastifyReply } from "fastify";
import { NotFoundError, ForbiddenError, ValidationError } from "../../../Domain/errors.js";
import {
  pipelineSchema,
  createPipelineBodySchema,
  updatePipelineBodySchema,
  notFoundSchema,
} from "./graphs.schemas.js";

interface ProjectParams {
  projectId: string;
}

interface PipelineParams {
  projectId: string;
  pipelineId: string;
}

interface CreatePipelineBody {
  name: string;
}

interface UpdatePipelineBody {
  viewport: { x: number; y: number; zoom: number };
  nodes: Array<{
    id: string;
    type: string;
    positionX: number;
    positionY: number;
    data: {
      label: string;
      description: string;
      params: { baseParameters: Record<string, unknown> };
      env: Record<string, unknown>;
      secrets: Record<string, string>;
    };
  }>;
  edges: Array<{ id: string; source: string; target: string; type: string }>;
}

function handleDomainError(err: unknown, reply: FastifyReply) {
  if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
  if (err instanceof ForbiddenError) return reply.status(403).send({ message: err.message });
  if (err instanceof ValidationError) return reply.status(400).send({ message: err.message });
  throw err;
}

export default async function pipelineRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /** GET /api/projects/:projectId/pipelines */
  app.get<{ Params: ProjectParams }>(
    "/api/projects/:projectId/pipelines",
    {
      schema: {
        tags: ["pipelines"],
        summary: "List all pipelines for a project",
        security: [{ bearerAuth: [] }],
        response: { 200: { type: "array", items: pipelineSchema }, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        return await app.graphService.listByProject(request.params.projectId, request.user.sub);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** POST /api/projects/:projectId/pipelines */
  app.post<{ Params: ProjectParams; Body: CreatePipelineBody }>(
    "/api/projects/:projectId/pipelines",
    {
      schema: {
        tags: ["pipelines"],
        summary: "Create a pipeline for a project",
        security: [{ bearerAuth: [] }],
        body: createPipelineBodySchema,
        response: { 201: pipelineSchema, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        const pipeline = await app.graphService.create(
          request.params.projectId,
          request.body.name,
          { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [] },
          request.user.sub,
        );
        return reply.status(201).send(pipeline);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** GET /api/projects/:projectId/pipelines/:pipelineId */
  app.get<{ Params: PipelineParams }>(
    "/api/projects/:projectId/pipelines/:pipelineId",
    {
      schema: {
        tags: ["pipelines"],
        summary: "Get a pipeline by id",
        security: [{ bearerAuth: [] }],
        response: { 200: pipelineSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        return await app.graphService.getById(
          request.params.pipelineId,
          request.params.projectId,
          request.user.sub,
        );
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** PUT /api/projects/:projectId/pipelines/:pipelineId */
  app.put<{ Params: PipelineParams; Body: UpdatePipelineBody }>(
    "/api/projects/:projectId/pipelines/:pipelineId",
    {
      schema: {
        tags: ["pipelines"],
        summary: "Update (save) a pipeline",
        security: [{ bearerAuth: [] }],
        body: updatePipelineBodySchema,
        response: { 200: pipelineSchema, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        const { viewport, nodes, edges } = request.body;
        return await app.graphService.update(
          request.params.pipelineId,
          request.params.projectId,
          { viewport, nodes, edges },
          request.user.sub,
        );
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** GET /api/projects/:projectId/pipelines/:pipelineId/execution-plan
   *
   * Dry-run: returns the ordered execution plan without saving or running anything.
   * Useful for previewing what a pipeline will do before triggering it.
   */
  app.get<{ Params: PipelineParams }>(
    "/api/projects/:projectId/pipelines/:pipelineId/execution-plan",
    {
      schema: {
        tags: ["pipelines"],
        summary: "Get the execution plan (dry-run) for a pipeline",
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: "array", items: { type: "object" } },
          400: notFoundSchema,
          404: notFoundSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const plan = await app.graphService.getExecutionPlan(
          request.params.pipelineId,
          request.params.projectId,
          request.user.sub,
        );
        return reply.status(200).send(plan);
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** DELETE /api/projects/:projectId/pipelines/:pipelineId */
  app.delete<{ Params: PipelineParams }>(
    "/api/projects/:projectId/pipelines/:pipelineId",
    {
      schema: {
        tags: ["pipelines"],
        summary: "Delete a pipeline",
        security: [{ bearerAuth: [] }],
        response: { 204: { type: "null" }, 403: notFoundSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      try {
        await app.graphService.delete(
          request.params.pipelineId,
          request.params.projectId,
          request.user.sub,
        );
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
}
