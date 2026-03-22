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
import type { ShellCommandNode } from "../nodes/ShellCommandNode.js";
import type { DockerNode } from "../nodes/DockerNode.js";
import type { GitNode } from "../nodes/GitNode.js";
import type { TestNode } from "../nodes/TestNode.js";
import type { BuildNode } from "../nodes/BuildNode.js";
import type { DeployNode } from "../nodes/DeployNode.js";
import type { NotificationNode } from "../nodes/NotificationNode.js";

export class ValidationVisitor implements INodeVisitor {
  private readonly _errors: string[] = [];

  /** All validation errors accumulated during traversal. */
  getErrors(): readonly string[] {
    return this._errors;
  }

  isValid(): boolean {
    return this._errors.length === 0;
  }

  /**
   * Call this after visiting all nodes to enforce graph-level constraints.
   */
  validateGraphConstraints(): void {
    // Trigger is now validated at pipeline level in GraphService, not here.
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private require(nodeId: string, field: string, value: unknown): void {
    if (value === undefined || value === null || value === "") {
      this._errors.push(`Node "${nodeId}": "${field}" is required.`);
    }
  }

  // ── visit methods ────────────────────────────────────────────────────────────

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

}
