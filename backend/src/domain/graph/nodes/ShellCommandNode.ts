import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type Shell = "sh" | "bash" | "zsh" | "powershell" | "cmd";

/**
 * Type-specific parameters for a ShellCommandNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface ShellCommandNodeParams {
  /** The interpreter to use. Defaults to 'bash'. */
  shell: Shell;
  /** Inline script or path to a script file inside the workspace. */
  script: string;
  /** Working directory relative to the workspace root. */
  workingDirectory?: string;
  /** Environment variables injected only for this step (non-sensitive). */
  environmentVariables?: Record<string, string>;
  /** If true, a non-zero exit code does NOT fail the pipeline. */
  continueOnError?: boolean;
  /** Step timeout in seconds. */
  timeoutSeconds?: number;
}

/** Runs an arbitrary shell script in the pipeline agent. */
export class ShellCommandNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly shellParams: ShellCommandNodeParams,
  ) {
    super(id, "shell_command", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitShellCommand(this);
  }
}
