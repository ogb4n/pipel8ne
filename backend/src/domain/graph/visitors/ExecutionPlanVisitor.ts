/**
 * ExecutionPlanVisitor
 *
 * Builds a human-readable, ordered execution plan from a list of `BaseNode`
 * instances. Useful for logging, pipeline preview in the UI, and dry-run mode.
 *
 * Usage:
 *   const visitor = new ExecutionPlanVisitor();
 *   nodes.forEach(n => n.accept(visitor));
 *   const plan = visitor.getPlan();   // ExecutionStep[]
 *   const summary = visitor.getSummary();  // string
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

export class ExecutionPlanVisitor implements INodeVisitor {
  private readonly steps: ExecutionStep[] = [];

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

  /** The ordered list of steps that will be executed. */
  getPlan(): readonly ExecutionStep[] {
    return this.steps;
  }

  /** A compact multi-line text summary suitable for logging. */
  getSummary(): string {
    return this.steps
      .map((s) => `[${s.order}] (${s.nodeType}) ${s.label} — ${s.description}`)
      .join("\n");
  }

  // ── visit methods ────────────────────────────────────────────────────────────

  visitTrigger(node: TriggerNode): void {
    const p = node.triggerParams ?? {};
    let detail: string;
    switch (p.triggerType) {
      case "push":
        detail = `on push to: ${(p.branches ?? ["*"]).join(", ")}`;
        break;
      case "pull_request":
        detail = `on pull request targeting: ${(p.branches ?? ["*"]).join(", ")}`;
        break;
      case "schedule":
        detail = `on schedule: ${p.schedule ?? "?"}`;
        break;
      case "tag":
        detail = `on tag matching: ${(p.tags ?? ["*"]).join(", ")}`;
        break;
      case "manual":
        detail = "manual trigger";
        break;
      default:
        detail = "unknown trigger";
    }
    this.addStep(node.id, node.type, node.data.label, `Pipeline starts — ${detail}`);
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

  visitDocker(node: DockerNode): void {
    const p = node.dockerParams ?? {};
    let detail: string;
    switch (p.action) {
      case "build":
        detail = `Build image from ${p.dockerfile ?? "Dockerfile"} (tags: ${(p.tags ?? []).join(", ") || "none"})`;
        break;
      case "push":
        detail = `Push image to ${p.registry ?? "registry"}`;
        break;
      case "pull":
        detail = `Pull image ${p.image ?? "?"}`;
        break;
      case "run":
        detail = `Run container from ${p.image ?? "?"} — cmd: ${p.command ?? "(default)"}`;
        break;
      case "compose_up":
        detail = `docker compose up (${p.composeFile ?? "docker-compose.yml"})`;
        break;
      case "compose_down":
        detail = `docker compose down (${p.composeFile ?? "docker-compose.yml"})`;
        break;
      default:
        detail = `docker ${p.action}`;
    }
    this.addStep(node.id, node.type, node.data.label, detail, Object.keys(node.data.secrets ?? {}));
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

  visitTest(node: TestNode): void {
    const p = node.testParams ?? {};
    const runner = p.runner === "custom" ? (p.command ?? "custom") : p.runner;
    const coverage =
      p.coverageThreshold !== undefined ? ` (coverage ≥ ${p.coverageThreshold}%)` : "";
    this.addStep(
      node.id,
      node.type,
      node.data.label,
      `Run tests with ${runner}${p.testPattern ? ` matching "${p.testPattern}"` : ""}${coverage}`,
    );
  }

  visitBuild(node: BuildNode): void {
    const p = node.buildParams ?? {};
    const tool = p.tool === "custom" ? (p.command ?? "custom") : p.tool;
    const target = p.target ? ` (target: ${p.target})` : "";
    this.addStep(
      node.id,
      node.type,
      node.data.label,
      `Build with ${tool}${target}${p.outputPath ? ` → ${p.outputPath}` : ""}`,
    );
  }

  visitDeploy(node: DeployNode): void {
    const p = node.deployParams ?? {};
    let detail: string;
    switch (p.target) {
      case "kubernetes":
        detail = `Deploy to Kubernetes (ns: ${p.namespace ?? "default"}, manifests: ${p.manifestPath ?? "?"})`;
        break;
      case "ssh":
        detail = `Deploy via SSH to ${p.sshUser ?? "?"}@${p.sshHost ?? "?"} → ${p.remotePath ?? "?"}`;
        break;
      default:
        detail = `Deploy to ${p.target} — env: ${p.environment ?? "?"}`;
    }
    if (p.rolloutStrategy) detail += ` [${p.rolloutStrategy}]`;
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

  visitCondition(node: ConditionNode): void {
    const p = node.conditionParams ?? {};
    const condCount = p.conditions?.length ?? 0;
    this.addStep(
      node.id,
      node.type,
      node.data.label,
      `Branch on ${condCount} condition(s) [${p.logicalOperator ?? "AND"}] → true: [${(p.trueBranchNodeIds ?? []).join(", ")}] / false: [${(p.falseBranchNodeIds ?? []).join(", ") || "stop"}]`,
    );
  }
}
