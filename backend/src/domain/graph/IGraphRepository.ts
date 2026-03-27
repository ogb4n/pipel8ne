import { Graph, Viewport } from "./Graph.js";
import type { TriggerNodeParams } from "./nodes/TriggerNode.js";
import { Stage } from "./Stage.js";
import { Edge } from "./Edge.js";

export interface IGraphRepository {
  findAllByProjectId(projectId: string): Promise<Graph[]>;
  findById(id: string): Promise<Graph | null>;
  create(
    projectId: string,
    name: string,
    data: { viewport: Viewport; trigger?: TriggerNodeParams; stages: Stage[]; stageEdges: Edge[] },
  ): Promise<Graph>;
  update(
    id: string,
    data: { status: "draft" | "active"; trigger?: TriggerNodeParams; viewport: Viewport; stages: Stage[]; stageEdges: Edge[] },
  ): Promise<Graph>;
  delete(id: string): Promise<void>;
}
