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
import type { TriggerNode } from "../nodes/TriggerNode";
import type { ShellCommandNode } from "../nodes/ShellCommandNode";
import type { DockerNode } from "../nodes/DockerNode";
import type { GitNode } from "../nodes/GitNode";
import type { TestNode } from "../nodes/TestNode";
import type { BuildNode } from "../nodes/BuildNode";
import type { DeployNode } from "../nodes/DeployNode";
import type { NotificationNode } from "../nodes/NotificationNode";
import type { ConditionNode } from "../nodes/ConditionNode";

export interface INodeVisitor {
  visitTrigger(node: TriggerNode): void;
  visitShellCommand(node: ShellCommandNode): void;
  visitDocker(node: DockerNode): void;
  visitGit(node: GitNode): void;
  visitTest(node: TestNode): void;
  visitBuild(node: BuildNode): void;
  visitDeploy(node: DeployNode): void;
  visitNotification(node: NotificationNode): void;
  visitCondition(node: ConditionNode): void;
}
