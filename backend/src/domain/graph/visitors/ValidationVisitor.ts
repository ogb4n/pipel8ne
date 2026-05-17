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
import type { GitNode } from "../nodes/GitNode.js";
import type { NotificationNode } from "../nodes/NotificationNode.js";
import type { TriggerNode } from "../nodes/TriggerNode.js";

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

  visitTrigger(node: TriggerNode): void {
    this.require(node.id, "triggerParams.triggerType", node.triggerParams?.triggerType);

    const { triggerType, schedule, branches } = node.triggerParams ?? {};
    if (triggerType === "schedule" && !schedule) {
      this._errors.push(`Node "${node.id}": "triggerParams.schedule" is required for schedule trigger.`);
    }
    if ((triggerType === "push" || triggerType === "pull_request") && !branches?.length) {
      this._errors.push(`Node "${node.id}": "triggerParams.branches" should not be empty for ${triggerType} trigger.`);
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

  visitNotification(node: NotificationNode): void {
    this.require(node.id, "notificationParams.channel", node.notificationParams?.channel);
    this.require(node.id, "notificationParams.notifyOn", node.notificationParams?.notifyOn);
    this.require(node.id, "notificationParams.message", node.notificationParams?.message);
  }

}
