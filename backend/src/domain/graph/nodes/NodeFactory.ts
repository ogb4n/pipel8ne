/**
 * NodeFactory
 *
 * Converts a plain `Node` DTO (as received from the API or persisted in the
 * database) into the corresponding rich domain object that extends `BaseNode`.
 *
 * This is the single place that knows about the mapping between the `type`
 * string discriminator and the concrete class. Adding a new node type only
 * requires:
 *   1. Creating the concrete class in ./nodes/
 *   2. Adding the visit method to INodeVisitor + every existing visitor
 *   3. Adding a `case` here in NodeFactory
 */
import type { Node } from "../Node.js";
import { BaseNode } from "./BaseNode.js";
import { TriggerNode } from "./TriggerNode.js";
import type { TriggerNodeParams } from "./TriggerNode.js";
import { ShellCommandNode } from "./ShellCommandNode.js";
import type { ShellCommandNodeParams } from "./ShellCommandNode.js";
import { DockerNode } from "./DockerNode.js";
import type { DockerNodeParams } from "./DockerNode.js";
import { GitNode } from "./GitNode.js";
import type { GitNodeParams } from "./GitNode.js";
import { TestNode } from "./TestNode.js";
import type { TestNodeParams } from "./TestNode.js";
import { BuildNode } from "./BuildNode.js";
import type { BuildNodeParams } from "./BuildNode.js";
import { DeployNode } from "./DeployNode.js";
import type { DeployNodeParams } from "./DeployNode.js";
import { NotificationNode } from "./NotificationNode.js";
import type { NotificationNodeParams } from "./NotificationNode.js";
import { ConditionNode } from "./ConditionNode.js";
import type { ConditionNodeParams } from "./ConditionNode.js";

export class NodeFactory {
  /**
   * Build a typed domain node from a raw DTO.
   *
   * The type-specific parameters are expected to live in
   * `dto.data.params.baseParameters` and are cast to the appropriate typed
   * interface. Validation is left to `ValidationVisitor`.
   *
   * @throws {Error} when `dto.type` is not a recognised node type.
   */
  static fromDTO(dto: Node): BaseNode {
    const { id, positionX, positionY, data } = dto;
    const raw = data.params.baseParameters;

    switch (dto.type) {
      case "trigger":
        return new TriggerNode(id, positionX, positionY, data, raw as unknown as TriggerNodeParams);

      case "shell_command":
        return new ShellCommandNode(
          id,
          positionX,
          positionY,
          data,
          raw as unknown as ShellCommandNodeParams,
        );

      case "docker":
        return new DockerNode(id, positionX, positionY, data, raw as unknown as DockerNodeParams);

      case "git":
        return new GitNode(id, positionX, positionY, data, raw as unknown as GitNodeParams);

      case "test":
        return new TestNode(id, positionX, positionY, data, raw as unknown as TestNodeParams);

      case "build":
        return new BuildNode(id, positionX, positionY, data, raw as unknown as BuildNodeParams);

      case "deploy":
        return new DeployNode(id, positionX, positionY, data, raw as unknown as DeployNodeParams);

      case "notification":
        return new NotificationNode(
          id,
          positionX,
          positionY,
          data,
          raw as unknown as NotificationNodeParams,
        );

      case "condition":
        return new ConditionNode(
          id,
          positionX,
          positionY,
          data,
          raw as unknown as ConditionNodeParams,
        );

      default:
        throw new Error(`Unknown node type: "${dto.type}"`);
    }
  }

  /**
   * Convert a list of DTOs to domain nodes.
   * Unknown types are skipped with a console warning so that a single bad node
   * does not blow up the entire graph.
   */
  static fromDTOs(dtos: Node[]): BaseNode[] {
    const nodes: BaseNode[] = [];
    for (const dto of dtos) {
      try {
        nodes.push(NodeFactory.fromDTO(dto));
      } catch (err) {
        console.warn(`[NodeFactory] Skipping node "${dto.id}": ${(err as Error).message}`);
      }
    }
    return nodes;
  }
}
