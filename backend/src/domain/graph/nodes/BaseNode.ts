import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";

/**
 * Abstract base class for all pipeline nodes.
 *
 * Every concrete node must implement `accept()` by calling the matching
 * `visitor.visitXxx(this)` method — this is the core of the Visitor pattern.
 * The double-dispatch guarantees the right overload is invoked even when nodes
 * are stored behind the `BaseNode` reference.
 */
export abstract class BaseNode {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly positionX: number,
    public readonly positionY: number,
    public readonly data: NodeData,
  ) {}

  /**
   * Entry point for the Visitor pattern.
   * Concrete subclasses call `visitor.visitXxx(this)`.
   */
  abstract accept(visitor: INodeVisitor): void;
}
