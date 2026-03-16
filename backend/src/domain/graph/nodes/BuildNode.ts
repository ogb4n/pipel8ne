import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type BuildTool =
  | "npm"
  | "yarn"
  | "pnpm"
  | "maven"
  | "gradle"
  | "cargo"
  | "go"
  | "dotnet"
  | "make"
  | "cmake"
  | "custom";

/**
 * Type-specific parameters for a BuildNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface BuildNodeParams {
  tool: BuildTool;
  /** The build script / target to run (e.g. 'build', 'release', 'compile'). */
  target?: string;
  /** Command override — used when tool === 'custom'. */
  command?: string;
  /** Working directory relative to workspace root. */
  workingDirectory?: string;
  /** Additional environment variables for the build. */
  environmentVariables?: Record<string, string>;
  /** Output directory / file to treat as the build artifact. */
  outputPath?: string;
  /** Node.js / SDK version to use (resolved by the agent's toolchain manager). */
  runtimeVersion?: string;
}

/** Compiles or packages the project using the configured build tool. */
export class BuildNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly buildParams: BuildNodeParams,
  ) {
    super(id, "build", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitBuild(this);
  }
}
