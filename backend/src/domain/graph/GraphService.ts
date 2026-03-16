import { IGraphRepository } from "./IGraphRepository.js";
import { IProjectRepository } from "../project/IProjectRepository.js";
import { Graph, Viewport } from "./Graph.js";
import { Job } from "./Job.js";
import { Edge } from "./Edge.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../errors.js";
import { NodeFactory } from "./nodes/NodeFactory.js";
import { ValidationVisitor } from "./visitors/ValidationVisitor.js";
import { ExecutionPlanVisitor } from "./visitors/ExecutionPlanVisitor.js";
import type { JobExecutionPlan } from "./visitors/ExecutionPlanVisitor.js";

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
    data: { viewport: Viewport; jobs: Job[]; jobEdges: Edge[] },
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
    data: { viewport: Viewport; jobs: Job[]; jobEdges: Edge[] },
    requesterId: string,
  ): Promise<Graph> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    const pipeline = await this.graphRepository.findById(pipelineId);
    if (!pipeline || pipeline.projectId !== projectId)
      throw new NotFoundError("Pipeline not found");
    this.validateJobs(data.jobs);
    return this.graphRepository.update(pipelineId, data);
  }

  /**
   * Build a human-readable execution plan for a pipeline without saving it.
   * Returns a plan per job with ordered steps.
   */
  async getExecutionPlan(
    pipelineId: string,
    projectId: string,
    requesterId: string,
  ): Promise<readonly JobExecutionPlan[]> {
    const pipeline = await this.getById(pipelineId, projectId, requesterId);
    const plans: JobExecutionPlan[] = [];
    for (const job of pipeline.jobs) {
      const domainNodes = NodeFactory.fromDTOs(job.steps);
      const planner = new ExecutionPlanVisitor(job.id, job.name, job.runsOn);
      for (const node of domainNodes) node.accept(planner);
      plans.push(planner.getJobPlan());
    }
    return plans;
  }

  // ── private helpers ────────────────────────────────────────────────────────

  /**
   * Validate all jobs' steps using the Visitor pattern.
   * @throws {ValidationError} when any node has invalid configuration.
   */
  private validateJobs(jobs: Job[]): void {
    const allNodes = jobs.flatMap((j) => j.steps);
    const domainNodes = NodeFactory.fromDTOs(allNodes);
    const validator = new ValidationVisitor();
    for (const node of domainNodes) node.accept(validator);
    validator.validateGraphConstraints();
    if (!validator.isValid()) {
      throw new ValidationError(validator.getErrors().join("; "));
    }
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
