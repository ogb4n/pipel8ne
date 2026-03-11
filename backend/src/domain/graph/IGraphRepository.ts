import { Graph, Viewport } from "./Graph.js";
import { Job } from "./Job.js";
import { Edge } from "./Edge.js";

export interface IGraphRepository {
  findAllByProjectId(projectId: string): Promise<Graph[]>;
  findById(id: string): Promise<Graph | null>;
  create(
    projectId: string,
    name: string,
    data: { viewport: Viewport; jobs: Job[]; jobEdges: Edge[] },
  ): Promise<Graph>;
  update(id: string, data: { viewport: Viewport; jobs: Job[]; jobEdges: Edge[] }): Promise<Graph>;
  delete(id: string): Promise<void>;
}
