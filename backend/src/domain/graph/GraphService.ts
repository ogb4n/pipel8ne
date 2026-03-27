import { IGraphRepository } from "./IGraphRepository.js";
import { IProjectRepository } from "../project/IProjectRepository.js";
import { Graph, Viewport } from "./Graph.js";
import type { TriggerNodeParams } from "./nodes/TriggerNode.js";
import { Stage } from "./Stage.js";
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
    data: { viewport: Viewport; trigger?: TriggerNodeParams; stages: Stage[]; stageEdges: Edge[] },
    requesterId: string,
  ): Promise<Graph> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    return this.graphRepository.create(projectId, name, data);
  }

  /** Update a pipeline. Only the project owner can update pipelines.
   *  Draft pipelines skip node-level validation so incomplete work can be saved freely. */
  async update(
    pipelineId: string,
    projectId: string,
    data: { status: "draft" | "active"; trigger?: TriggerNodeParams; viewport: Viewport; stages: Stage[]; stageEdges: Edge[] },
    requesterId: string,
  ): Promise<Graph> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    const pipeline = await this.graphRepository.findById(pipelineId);
    if (!pipeline || pipeline.projectId !== projectId)
      throw new NotFoundError("Pipeline not found");
    this.validatePipeline(data.stages, data.stageEdges);
    if (data.status === "active") {
      this.validateTrigger(data.trigger);
      this.validateStages(data.stages);
    }
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
    for (const stage of pipeline.stages) {
      for (const job of stage.jobs) {
        const domainNodes = NodeFactory.fromDTOs(job.steps);
        const planner = new ExecutionPlanVisitor(job.id, job.name, job.runsOn);
        for (const node of domainNodes) node.accept(planner);
        plans.push(planner.getJobPlan());
      }
    }
    return plans;
  }

  // ── private helpers ────────────────────────────────────────────────────────

  /**
   * Validate pipeline-level trigger configuration.
   * @throws {ValidationError} when trigger is missing or incomplete.
   */
  private validateTrigger(trigger?: TriggerNodeParams): void {
    if (!trigger?.triggerType) {
      throw new ValidationError("Pipeline must have a trigger configured to be activated.");
    }
    if (trigger.triggerType === "schedule" && !trigger.schedule) {
      throw new ValidationError("Trigger: a cron schedule is required for schedule triggers.");
    }
    if (
      (trigger.triggerType === "push" || trigger.triggerType === "pull_request") &&
      !trigger.branches?.length
    ) {
      throw new ValidationError(
        `Trigger: at least one branch pattern is required for "${trigger.triggerType}" trigger.`,
      );
    }
  }

  /**
   * Validate all stages' jobs' steps using the Visitor pattern.
   * @throws {ValidationError} when any node has invalid configuration.
   */
  private validatePipeline(stages: Stage[], stageEdges: Edge[]): void {
    const allNodes = stages.flatMap((s) => s.jobs.flatMap((j) => j.steps));
    const domainNodes = NodeFactory.fromDTOs(allNodes);
    const validator = new ValidationVisitor();
    for (const node of domainNodes) node.accept(validator);
    validator.validatePipeline(stages, stageEdges);
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
