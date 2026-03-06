import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

/** Which event starts the pipeline. */
export type TriggerType = "push" | "pull_request" | "schedule" | "manual" | "tag";

/**
 * Type-specific parameters for a TriggerNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface TriggerNodeParams {
  triggerType: TriggerType;
  /** Branch name patterns to watch (for push / pull_request). Supports glob. */
  branches?: string[];
  /** Cron expression (UTC) used when triggerType === 'schedule'. */
  schedule?: string;
  /** Tag patterns to watch (for tag trigger). */
  tags?: string[];
}

/**
 * Entry point of every pipeline.
 * A valid graph must contain exactly one TriggerNode.
 */
export class TriggerNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly triggerParams: TriggerNodeParams,
  ) {
    super(id, "trigger", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitTrigger(this);
  }
}
