import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type GitAction = "clone" | "checkout" | "pull" | "fetch" | "tag" | "push";

/**
 * Type-specific parameters for a GitNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface GitNodeParams {
  action: GitAction;
  /** Repository URL (HTTPS or SSH). */
  repositoryUrl?: string;
  /** Branch, tag, or commit SHA to checkout. */
  ref?: string;
  /** Local directory to clone into (relative to workspace root). */
  directory?: string;
  /** Whether to checkout submodules. */
  recurseSubmodules?: boolean;
  /** Clone depth (shallow clone). 0 means full history. */
  depth?: number;
  /** Tag name to create (for 'tag' action). */
  tagName?: string;
  /** Tag message (for annotated tags). */
  tagMessage?: string;
  /** Remote name to push to (for 'push' action). */
  remote?: string;
}

/** Performs Git operations: clone, checkout, pull, tag, push, etc. */
export class GitNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly gitParams: GitNodeParams,
  ) {
    super(id, "git", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitGit(this);
  }
}
