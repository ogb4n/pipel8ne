/**
 * Visitor interface — declares one visit method per concrete Node type.
 *
 * To add new behaviour (e.g. cost estimation, linting, execution) without
 * touching the node classes, create a new class that implements this interface.
 *
 * To add a new Node type, add a visitXxx() method here and implement it in
 * every existing visitor (the compiler will then point to every site that
 * needs updating).
 */
import type { ShellCommandNode } from "../nodes/ShellCommandNode";
import type { GitNode } from "../nodes/GitNode";
import type { NotificationNode } from "../nodes/NotificationNode";
import type { TriggerNode } from "../nodes/TriggerNode";

export interface INodeVisitor {
  visitTrigger(node: TriggerNode): void;
  visitShellCommand(node: ShellCommandNode): void;
  visitGit(node: GitNode): void;
  visitNotification(node: NotificationNode): void;
}
