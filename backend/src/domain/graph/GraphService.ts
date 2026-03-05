import { IGraphRepository } from "./IGraphRepository.js";
import { Graph, Viewport } from "./Graph.js";
import { Node } from "./Node.js";
import { Edge } from "./Edge.js";

export class GraphService {
  constructor(private readonly graphRepository: IGraphRepository) {}

  listByProject(projectId: string): Promise<Graph[]> {
    return this.graphRepository.findAllByProjectId(projectId);
  }

  getById(id: string): Promise<Graph | null> {
    return this.graphRepository.findById(id);
  }

  create(
    projectId: string,
    name: string,
    data: { viewport: Viewport; nodes: Node[]; edges: Edge[] },
  ): Promise<Graph> {
    return this.graphRepository.create(projectId, name, data);
  }

  update(id: string, data: { viewport: Viewport; nodes: Node[]; edges: Edge[] }): Promise<Graph> {
    return this.graphRepository.update(id, data);
  }

  delete(id: string): Promise<void> {
    return this.graphRepository.delete(id);
  }
}
