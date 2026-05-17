/**
 * ExecutionPlanVisitor
 *
 * Builds a human-readable, ordered execution plan for one Job.
 * Instantiate one visitor per job, then iterate over the job's steps.
 *
 * Usage:
 *   const visitor = new ExecutionPlanVisitor(job.id, job.name, job.runsOn);
 *   job.steps.forEach(n => n.accept(visitor));
 *   const plan = visitor.getJobPlan();   // JobExecutionPlan
 */
import type { INodeVisitor } from "./INodeVisitor.js";
import type { ShellCommandNode } from "../nodes/ShellCommandNode.js";
import type { GitNode } from "../nodes/GitNode.js";
import type { NotificationNode } from "../nodes/NotificationNode.js";
import type { TriggerNode } from "../nodes/TriggerNode.js";

export interface ExecutionStep {
  order: number;
  nodeId: string;
  nodeType: string;
  label: string;
  /** Human-readable description of what this step will do. */
  description: string;
  /** Keys of secrets that will be injected at runtime. */
  requiredSecrets: string[];
}

export interface JobExecutionPlan {
  jobId: string;
  jobName: string;
  runsOn: string;
  steps: ExecutionStep[];
}

export class ExecutionPlanVisitor implements INodeVisitor {
  private readonly steps: ExecutionStep[] = [];

  constructor(
    private readonly jobId: string,
    private readonly jobName: string,
    private readonly runsOn: string,
  ) {}

  private addStep(
    nodeId: string,
    nodeType: string,
    label: string,
    description: string,
    requiredSecrets: string[] = [],
  ): void {
    this.steps.push({
      order: this.steps.length + 1,
      nodeId,
      nodeType,
      label,
      description,
      requiredSecrets,
    });
  }

  /** The full job execution plan including job metadata and ordered steps. */
  getJobPlan(): JobExecutionPlan {
    return {
      jobId: this.jobId,
      jobName: this.jobName,
      runsOn: this.runsOn,
      steps: [...this.steps],
    };
  }

  // ── visit methods ────────────────────────────────────────────────────────────

  visitTrigger(node: TriggerNode): void {
    const p = node.triggerParams;
    let detail = `Trigger: ${p.triggerType}`;
    if (p.branches?.length) detail += ` (branches: ${p.branches.join(", ")})`;
    if (p.schedule) detail += ` (cron: ${p.schedule})`;
    if (p.tags?.length) detail += ` (tags: ${p.tags.join(", ")})`;
    this.addStep(node.id, node.type, node.data.label, detail);
  }

  visitShellCommand(node: ShellCommandNode): void {
    const p = node.shellParams ?? {};
    const preview = (p.script ?? "").split("\n")[0].slice(0, 60);
    this.addStep(
      node.id,
      node.type,
      node.data.label,
      `Run ${p.shell ?? "bash"} script: "${preview}${p.script?.length > 60 ? "…" : ""}"`,
      Object.keys(node.data.secrets ?? {}),
    );
  }

  visitGit(node: GitNode): void {
    const p = node.gitParams ?? {};
    let detail: string;
    switch (p.action) {
      case "clone":
        detail = `Clone ${p.repositoryUrl ?? "?"} → ${p.directory ?? "."}${p.depth ? ` (depth=${p.depth})` : ""}`;
        break;
      case "checkout":
        detail = `Checkout ref: ${p.ref ?? "?"}`;
        break;
      case "pull":
        detail = `Pull latest changes (remote: ${p.remote ?? "origin"})`;
        break;
      case "tag":
        detail = `Create tag "${p.tagName ?? "?"}" — ${p.tagMessage ?? "(lightweight)"}`;
        break;
      case "push":
        detail = `Push to ${p.remote ?? "origin"}`;
        break;
      default:
        detail = `git ${p.action}`;
    }
    this.addStep(node.id, node.type, node.data.label, detail, Object.keys(node.data.secrets ?? {}));
  }
  
  visitNotification(node: NotificationNode): void {
    const p = node.notificationParams ?? {};
    this.addStep(
      node.id,
      node.type,
      node.data.label,
      `Send ${p.channel ?? "?"} notification (${p.notifyOn ?? "always"}): "${(p.message ?? "").slice(0, 80)}"`,
      Object.keys(node.data.secrets ?? {}),
    );
  }

}
