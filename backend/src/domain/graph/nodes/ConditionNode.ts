import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "matches_regex"
  | "is_empty"
  | "is_not_empty";

export interface Condition {
  /** Left-hand side — supports template variables: {{env.MY_VAR}}, {{output.step_id.exitCode}}. */
  leftOperand: string;
  operator: ConditionOperator;
  /** Right-hand side (not required for unary operators like is_empty). */
  rightOperand?: string;
}

/**
 * Type-specific parameters for a ConditionNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface ConditionNodeParams {
  /** All conditions must be true for the "true" branch to be taken. */
  conditions: Condition[];
  /** How multiple conditions are combined. */
  logicalOperator: "AND" | "OR";
  /**
   * IDs of nodes to execute when the condition evaluates to true.
   * The graph engine uses these to route execution.
   */
  trueBranchNodeIds: string[];
  /**
   * IDs of nodes to execute when the condition evaluates to false.
   * May be empty (pipeline simply stops the branch).
   */
  falseBranchNodeIds: string[];
}

/** Branches the pipeline based on runtime conditions (env vars, step outputs, etc.). */
export class ConditionNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly conditionParams: ConditionNodeParams,
  ) {
    super(id, "condition", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitCondition(this);
  }
}
