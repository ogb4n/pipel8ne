import { IGraphRepository } from "./IGraphRepository.js";
import { IProjectRepository } from "../project/IProjectRepository.js";
import { Graph, Viewport } from "./Graph.js";
import { Node } from "./Node.js";
import { Edge } from "./Edge.js";
import { NotFoundError, ForbiddenError } from "../errors.js";

export class GraphService {
  constructor(
    private readonly graphRepository: IGraphRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  /** List pipelines of a project. Private projects are only visible to their owner. */
  async listByProject(projectId: string, requesterId: string): Promise<Graph[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.visibility === "private" && project.ownerId !== requesterId)
      throw new NotFoundError("Project not found");
    return this.graphRepository.findAllByProjectId(projectId);
  }

  /** Get a single pipeline. Private projects are only visible to their owner. */
  async getById(pipelineId: string, projectId: string, requesterId: string): Promise<Graph> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.visibility === "private" && project.ownerId !== requesterId)
      throw new NotFoundError("Project not found");
    const pipeline = await this.graphRepository.findById(pipelineId);
    if (!pipeline || pipeline.projectId !== projectId)
      throw new NotFoundError("Pipeline not found");
    return pipeline;
  }

  /** Create a pipeline. Only the project owner can create pipelines. */
  async create(
    projectId: string,
    name: string,
    data: { viewport: Viewport; nodes: Node[]; edges: Edge[] },
    requesterId: string,
  ): Promise<Graph> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    return this.graphRepository.create(projectId, name, data);
  }

  /** Update a pipeline. Only the project owner can update pipelines. */
  async update(
    pipelineId: string,
    projectId: string,
    data: { viewport: Viewport; nodes: Node[]; edges: Edge[] },
    requesterId: string,
  ): Promise<Graph> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    const pipeline = await this.graphRepository.findById(pipelineId);
    if (!pipeline || pipeline.projectId !== projectId)
      throw new NotFoundError("Pipeline not found");
    return this.graphRepository.update(pipelineId, data);
  }

  /** Delete a pipeline. Only the project owner can delete pipelines. */
  async delete(pipelineId: string, projectId: string, requesterId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    const pipeline = await this.graphRepository.findById(pipelineId);
    if (!pipeline || pipeline.projectId !== projectId)
      throw new NotFoundError("Pipeline not found");
    await this.graphRepository.delete(pipelineId);
  }
}
