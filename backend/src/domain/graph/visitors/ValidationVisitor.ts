/**
 * ValidationVisitor
 *
 * Traverses a list of `BaseNode` instances and collects semantic errors
 * (missing required fields, bad combinations, structural constraints, …).
 *
 * Usage:
 *   const visitor = new ValidationVisitor();
 *   nodes.forEach(n => n.accept(visitor));
 *   if (!visitor.isValid()) throw new ValidationError(visitor.getErrors());
 */
import type { INodeVisitor } from "./INodeVisitor.js";
import type { TriggerNode } from "../nodes/TriggerNode.js";
import type { ShellCommandNode } from "../nodes/ShellCommandNode.js";
import type { DockerNode } from "../nodes/DockerNode.js";
import type { GitNode } from "../nodes/GitNode.js";
import type { TestNode } from "../nodes/TestNode.js";
import type { BuildNode } from "../nodes/BuildNode.js";
import type { DeployNode } from "../nodes/DeployNode.js";
import type { NotificationNode } from "../nodes/NotificationNode.js";
import type { ConditionNode } from "../nodes/ConditionNode.js";
import type { InvokableNode } from "../nodes/InvokableNode.js";
import type { Stage } from "../Stage.js";
import type { Edge } from "../Edge.js";
import type { JobGuardCondition } from "../Job.js";

export class ValidationVisitor implements INodeVisitor {
  private readonly _errors: string[] = [];
  private triggerCount = 0;
  private readonly invokableLinks: Array<{ sourceNodeId: string; targetJobId: string }> = [];

  /** All validation errors accumulated during traversal. */
  getErrors(): readonly string[] {
    return this._errors;
  }

  isValid(): boolean {
    return this._errors.length === 0;
  }

  /**
   * Call this after visiting all nodes to enforce graph-level constraints
   * (e.g. exactly one trigger).
   */
  validateGraphConstraints(): void {
    if (this.triggerCount === 0) {
      this._errors.push("Graph must contain at least one Trigger node.");
    }
    if (this.triggerCount > 1) {
      this._errors.push(`Graph must contain exactly one Trigger node, found ${this.triggerCount}.`);
    }
  }

  validatePipeline(stages: Stage[], stageEdges: Edge[]): void {
    this.validateGraphConstraints();
    this.validateStageEdgeConditions(stageEdges);

    const jobById = new Map<string, { stageId: string }>();
    const nodeToJobId = new Map<string, string>();

    for (const stage of stages) {
      for (const job of stage.jobs) {
        if (jobById.has(job.id)) {
          this._errors.push(`Job id "${job.id}" must be unique in the pipeline.`);
        }
        jobById.set(job.id, { stageId: stage.id });

        this.validateJobGuard(job.id, job.condition);
        this.validateStepEdges(job.id, job.stepEdges);

        for (const step of job.steps) {
          if (nodeToJobId.has(step.id)) {
            this._errors.push(`Step id "${step.id}" must be unique in the pipeline.`);
          }
          nodeToJobId.set(step.id, job.id);
        }
      }
    }

    this.validateInvokableLinks(jobById, nodeToJobId);
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private require(nodeId: string, field: string, value: unknown): void {
    if (value === undefined || value === null || value === "") {
      this._errors.push(`Node "${nodeId}": "${field}" is required.`);
    }
  }

  // ── visit methods ────────────────────────────────────────────────────────────

  visitTrigger(node: TriggerNode): void {
    this.triggerCount++;
    this.require(node.id, "triggerParams.triggerType", node.triggerParams?.triggerType);

    if (node.triggerParams?.triggerType === "schedule") {
      this.require(node.id, "triggerParams.schedule", node.triggerParams.schedule);
    }
    if (
      (node.triggerParams?.triggerType === "push" ||
        node.triggerParams?.triggerType === "pull_request") &&
      !node.triggerParams.branches?.length
    ) {
      this._errors.push(
        `Node "${node.id}": at least one branch pattern is required for "${node.triggerParams.triggerType}" trigger.`,
      );
    }
  }

  visitShellCommand(node: ShellCommandNode): void {
    this.require(node.id, "shellParams.shell", node.shellParams?.shell);
    this.require(node.id, "shellParams.script", node.shellParams?.script);

    if (node.shellParams?.timeoutSeconds !== undefined && node.shellParams.timeoutSeconds <= 0) {
      this._errors.push(
        `Node "${node.id}": "shellParams.timeoutSeconds" must be a positive number.`,
      );
    }
  }

  visitDocker(node: DockerNode): void {
    this.require(node.id, "dockerParams.action", node.dockerParams?.action);

    const action = node.dockerParams?.action;
    if (action === "build") {
      this.require(node.id, "dockerParams.dockerfile", node.dockerParams.dockerfile);
      this.require(node.id, "dockerParams.buildContext", node.dockerParams.buildContext);
    }
    if (action === "push" && !node.dockerParams?.registry) {
      this._errors.push(
        `Node "${node.id}": "dockerParams.registry" is required for "push" action.`,
      );
    }
    if ((action === "compose_up" || action === "compose_down") && !node.dockerParams?.composeFile) {
      this._errors.push(
        `Node "${node.id}": "dockerParams.composeFile" is required for "${action}" action.`,
      );
    }
  }

  visitGit(node: GitNode): void {
    this.require(node.id, "gitParams.action", node.gitParams?.action);

    const action = node.gitParams?.action;
    if (action === "clone") {
      this.require(node.id, "gitParams.repositoryUrl", node.gitParams?.repositoryUrl);
    }
    if (action === "tag") {
      this.require(node.id, "gitParams.tagName", node.gitParams?.tagName);
    }
  }

  visitTest(node: TestNode): void {
    this.require(node.id, "testParams.runner", node.testParams?.runner);

    if (node.testParams?.runner === "custom") {
      this.require(node.id, "testParams.command", node.testParams.command);
    }
    if (
      node.testParams?.coverageThreshold !== undefined &&
      (node.testParams.coverageThreshold < 0 || node.testParams.coverageThreshold > 100)
    ) {
      this._errors.push(
        `Node "${node.id}": "testParams.coverageThreshold" must be between 0 and 100.`,
      );
    }
  }

  visitBuild(node: BuildNode): void {
    this.require(node.id, "buildParams.tool", node.buildParams?.tool);

    if (node.buildParams?.tool === "custom") {
      this.require(node.id, "buildParams.command", node.buildParams.command);
    }
  }

  visitDeploy(node: DeployNode): void {
    this.require(node.id, "deployParams.target", node.deployParams?.target);
    this.require(node.id, "deployParams.environment", node.deployParams?.environment);

    const target = node.deployParams?.target;
    if (target === "ssh") {
      this.require(node.id, "deployParams.sshHost", node.deployParams.sshHost);
      this.require(node.id, "deployParams.sshUser", node.deployParams.sshUser);
      this.require(node.id, "deployParams.remotePath", node.deployParams.remotePath);
    }
    if (target === "kubernetes") {
      this.require(node.id, "deployParams.manifestPath", node.deployParams.manifestPath);
    }
  }

  visitNotification(node: NotificationNode): void {
    this.require(node.id, "notificationParams.channel", node.notificationParams?.channel);
    this.require(node.id, "notificationParams.notifyOn", node.notificationParams?.notifyOn);
    this.require(node.id, "notificationParams.message", node.notificationParams?.message);
  }

  visitCondition(node: ConditionNode): void {
    this._errors.push(
      `Node "${node.id}": step-level Condition nodes are not supported. Use stage edge conditions or job guards.`,
    );
  }

  visitInvokable(node: InvokableNode): void {
    this.require(node.id, "invokableParams.targetJobId", node.invokableParams?.targetJobId);
    if (node.invokableParams?.targetJobId) {
      this.invokableLinks.push({
        sourceNodeId: node.id,
        targetJobId: node.invokableParams.targetJobId,
      });
    }
  }

  private validateStageEdgeConditions(stageEdges: Edge[]): void {
    const valid = new Set(["on_success", "always", "on_failure"]);
    for (const edge of stageEdges) {
      if (edge.condition && !valid.has(edge.condition)) {
        this._errors.push(
          `Stage edge "${edge.id}": invalid condition "${edge.condition}". Allowed: on_success, always, on_failure.`,
        );
      }
    }
  }

  private validateStepEdges(jobId: string, stepEdges: Edge[]): void {
    for (const edge of stepEdges) {
      if (edge.condition !== undefined) {
        this._errors.push(
          `Job "${jobId}", step edge "${edge.id}": conditions are not allowed on step edges.`,
        );
      }
    }
  }

  private validateJobGuard(jobId: string, guard: JobGuardCondition | undefined): void {
    if (!guard) return;
    if (!guard.conditions?.length) {
      this._errors.push(`Job "${jobId}": condition guard must contain at least one condition.`);
      return;
    }
    if (guard.logicalOperator !== "AND" && guard.logicalOperator !== "OR") {
      this._errors.push(`Job "${jobId}": condition guard logicalOperator must be AND or OR.`);
    }
    guard.conditions.forEach((cond, i) => {
      if (!cond.leftOperand) {
        this._errors.push(`Job "${jobId}": guard condition[${i}].leftOperand is required.`);
      }
      if (!cond.operator) {
        this._errors.push(`Job "${jobId}": guard condition[${i}].operator is required.`);
      }
      if (
        cond.operator !== "is_empty" &&
        cond.operator !== "is_not_empty" &&
        (cond.rightOperand === undefined || cond.rightOperand === "")
      ) {
        this._errors.push(`Job "${jobId}": guard condition[${i}].rightOperand is required.`);
      }
    });
  }

  private validateInvokableLinks(
    jobById: Map<string, { stageId: string }>,
    nodeToJobId: Map<string, string>,
  ): void {
    const invocationGraph = new Map<string, Set<string>>();
    for (const jobId of jobById.keys()) invocationGraph.set(jobId, new Set<string>());

    for (const link of this.invokableLinks) {
      const sourceJobId = nodeToJobId.get(link.sourceNodeId);
      if (!sourceJobId) {
        this._errors.push(
          `Invokable node "${link.sourceNodeId}": source job could not be resolved.`,
        );
        continue;
      }
      if (!jobById.has(link.targetJobId)) {
        this._errors.push(
          `Invokable node "${link.sourceNodeId}": target job "${link.targetJobId}" does not exist in this pipeline.`,
        );
        continue;
      }
      if (sourceJobId === link.targetJobId) {
        this._errors.push(`Invokable node "${link.sourceNodeId}": self-invocation is not allowed.`);
        continue;
      }
      invocationGraph.get(sourceJobId)?.add(link.targetJobId);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (jobId: string): boolean => {
      if (visiting.has(jobId)) return true;
      if (visited.has(jobId)) return false;
      visiting.add(jobId);
      const neighbors = invocationGraph.get(jobId) ?? new Set<string>();
      for (const next of neighbors) {
        if (dfs(next)) return true;
      }
      visiting.delete(jobId);
      visited.add(jobId);
      return false;
    };

    for (const jobId of invocationGraph.keys()) {
      if (dfs(jobId)) {
        this._errors.push("Invokable job cycle detected. Invocation graph must be acyclic.");
        break;
      }
    }
  }
}
