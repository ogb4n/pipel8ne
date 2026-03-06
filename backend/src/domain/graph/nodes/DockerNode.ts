import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type DockerAction = "build" | "run" | "push" | "pull" | "compose_up" | "compose_down";

/**
 * Type-specific parameters for a DockerNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface DockerNodeParams {
  action: DockerAction;
  /** Docker image reference (e.g. 'nginx:alpine', 'ghcr.io/org/app:latest'). */
  image?: string;
  /** Path to Dockerfile, required for 'build' action. */
  dockerfile?: string;
  /** Build context path relative to the workspace root. */
  buildContext?: string;
  /** Additional build args passed with --build-arg. */
  buildArgs?: Record<string, string>;
  /** Image tags to apply (for 'build'). */
  tags?: string[];
  /** Registry to push to (for 'push'). */
  registry?: string;
  /** Command to run inside the container (for 'run'). */
  command?: string;
  /** Port bindings  "host:container" pairs (for 'run'). */
  ports?: string[];
  /** Volume mounts "host:container" pairs (for 'run'). */
  volumes?: string[];
  /** Path to docker-compose.yml (for compose actions). */
  composeFile?: string;
}

/** Builds, pushes, pulls, or runs Docker containers and compose stacks. */
export class DockerNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly dockerParams: DockerNodeParams,
  ) {
    super(id, "docker", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitDocker(this);
  }
}
