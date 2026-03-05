import { Graph, Viewport } from "./Graph.js";
import { Node } from "./Node.js";
import { Edge } from "./Edge.js";

export interface IGraphRepository {
  findAllByProjectId(projectId: string): Promise<Graph[]>;
  findById(id: string): Promise<Graph | null>;
  create(
    projectId: string,
    name: string,
    data: { viewport: Viewport; nodes: Node[]; edges: Edge[] },
  ): Promise<Graph>;
  update(id: string, data: { viewport: Viewport; nodes: Node[]; edges: Edge[] }): Promise<Graph>;
  delete(id: string): Promise<void>;
}
