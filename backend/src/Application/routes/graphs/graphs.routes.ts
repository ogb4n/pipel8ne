/**
 * Routes Pipeline — gestion des pipelines associés à un projet.
 * Toutes les routes sont protégées par JWT.
 * L'autorisation est gérée par GraphService (couche domaine).
 */
import { FastifyInstance, FastifyReply } from "fastify";
import { NotFoundError, ForbiddenError, ValidationError } from "../../../domain/errors.js";
import type { TriggerType } from "../../../domain/graph/nodes/TriggerNode.js";
import type { GitProvider } from "../../../domain/gitconnection/GitConnection.js";
import { PipelineImporter, type SupportedProvider } from "../../../domain/graph/PipelineImporter.js";
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
  status: "draft" | "active";
  trigger?: { triggerType: TriggerType; branches?: string[]; schedule?: string; tags?: string[] };
  viewport: { x: number; y: number; zoom: number };
  stages: Array<{
    id: string;
    name: string;
    runsOn: string;
    jobs: Array<{
      id: string;
      name: string;
      steps: Array<{
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
    }>;
    position: { x: number; y: number };
  }>;
  stageEdges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    waypoint?: { x: number; y: number };
  }>;
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
      } catch (err: unknown) {
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
          { viewport: { x: 0, y: 0, zoom: 1 }, stages: [], stageEdges: [] },
          request.user.sub,
        );
        return reply.status(201).send(pipeline);
      } catch (err: unknown) {
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
      } catch (err: unknown) {
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
        const { status, trigger, viewport, stages, stageEdges } = request.body;
        return await app.graphService.update(
          request.params.pipelineId,
          request.params.projectId,
          { status, trigger, viewport, stages: stages as any, stageEdges },
          request.user.sub,
        );
      } catch (err: unknown) {
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
      } catch (err: unknown) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * POST /api/projects/:projectId/pipelines/import-from-repo
   *
   * Scanne le repo Git lié au projet, parse les fichiers CI/CD trouvés
   * et les importe comme pipelines (sans doublon sur le nom).
   */
  app.post<{ Params: ProjectParams }>(
    "/api/projects/:projectId/pipelines/import-from-repo",
    {
      schema: {
        tags: ["pipelines"],
        summary: "Import pipelines from the linked Git repository",
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: "array", items: pipelineSchema },
          400: notFoundSchema,
          403: notFoundSchema,
          404: notFoundSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const userId = request.user.sub;

        const project = await app.projectService.getById(projectId);
        if (project.ownerId !== userId)
          return reply.status(403).send({ message: "Accès interdit" });

        if (!project.gitRepository)
          return reply.status(400).send({ message: "Ce projet n'a pas de repo Git lié" });

        const { provider, fullName } = project.gitRepository;

        // Fetch CI files from the git provider
        const files = await app.gitConnectionService.listPipelineFiles(
          provider as GitProvider,
          fullName,
          userId,
        );

        if (files.length === 0) return reply.status(200).send([]);

        // Get existing pipeline names to avoid duplicates
        const existing = await app.graphService.listByProject(projectId, userId);
        const existingNames = new Set(existing.map((p) => p.name));

        const created = [];
        for (const file of files) {
          if (existingNames.has(file.name)) continue;

          const graphData = PipelineImporter.import(
            file.name,
            file.content,
            provider as SupportedProvider,
            projectId,
          );
          if (!graphData) continue;

          const pipeline = await app.graphService.create(
            projectId,
            file.name,
            {
              viewport: graphData.viewport,
              trigger: graphData.trigger,
              stages: graphData.stages,
              stageEdges: graphData.stageEdges,
            },
            userId,
          );
          created.push(pipeline);
        }

        return reply.status(200).send(created);
      } catch (err: unknown) {
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
      } catch (err: unknown) {
        return handleDomainError(err, reply);
      }
    },
  );
}
