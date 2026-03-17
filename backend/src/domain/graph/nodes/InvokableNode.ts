import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export interface InvokableNodeParams {
  /** Target job id to invoke. Must belong to the same pipeline. */
  targetJobId: string;
}

/** Invokes another job from the same pipeline. */
export class InvokableNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly invokableParams: InvokableNodeParams,
  ) {
    super(id, "invokable", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitInvokable(this);
  }
}
