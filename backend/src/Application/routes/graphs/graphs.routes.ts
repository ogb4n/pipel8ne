/**
 * Routes Pipeline — gestion des pipelines associés à un projet.
 * Un projet peut avoir plusieurs pipelines.
 * Toutes les routes sont protégées par JWT et opèrent sous le préfixe
 * /api/projects/:projectId/pipelines.
 */
import { FastifyInstance } from "fastify";
import {
  pipelineSchema,
  createPipelineBodySchema,
  updatePipelineBodySchema,
  notFoundSchema,
} from "./graphs.schemas";

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

export default async function pipelineRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  /** GET /api/projects/:projectId/pipelines — liste toutes les pipelines du projet */
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
      const { projectId } = request.params;
      const project = await app.projectService.getById(projectId);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      if (project.visibility === "private" && project.ownerId !== request.user.sub)
        return reply.status(404).send({ message: "Project not found" });
      return app.graphService.listByProject(projectId);
    },
  );

  /** POST /api/projects/:projectId/pipelines — crée une nouvelle pipeline */
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
      const { projectId } = request.params;
      const project = await app.projectService.getById(projectId);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      if (project.ownerId !== request.user.sub)
        return reply.status(403).send({ message: "Forbidden" });
      const pipeline = await app.graphService.create(projectId, request.body.name, {
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [],
        edges: [],
      });
      return reply.status(201).send(pipeline);
    },
  );

  /** GET /api/projects/:projectId/pipelines/:pipelineId — retourne une pipeline */
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
      const { projectId, pipelineId } = request.params;
      const project = await app.projectService.getById(projectId);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      if (project.visibility === "private" && project.ownerId !== request.user.sub)
        return reply.status(404).send({ message: "Project not found" });
      const pipeline = await app.graphService.getById(pipelineId);
      if (!pipeline || pipeline.projectId !== projectId)
        return reply.status(404).send({ message: "Pipeline not found" });
      return pipeline;
    },
  );

  /** PUT /api/projects/:projectId/pipelines/:pipelineId — sauvegarde le graphe */
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
      const { projectId, pipelineId } = request.params;
      const project = await app.projectService.getById(projectId);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      if (project.ownerId !== request.user.sub)
        return reply.status(403).send({ message: "Forbidden" });
      const pipeline = await app.graphService.getById(pipelineId);
      if (!pipeline || pipeline.projectId !== projectId)
        return reply.status(404).send({ message: "Pipeline not found" });
      const { viewport, nodes, edges } = request.body;
      return app.graphService.update(pipelineId, { viewport, nodes, edges });
    },
  );

  /** DELETE /api/projects/:projectId/pipelines/:pipelineId — supprime une pipeline */
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
      const { projectId, pipelineId } = request.params;
      const project = await app.projectService.getById(projectId);
      if (!project) return reply.status(404).send({ message: "Project not found" });
      if (project.ownerId !== request.user.sub)
        return reply.status(403).send({ message: "Forbidden" });
      const pipeline = await app.graphService.getById(pipelineId);
      if (!pipeline || pipeline.projectId !== projectId)
        return reply.status(404).send({ message: "Pipeline not found" });
      await app.graphService.delete(pipelineId);
      return reply.status(204).send();
    },
  );
}
