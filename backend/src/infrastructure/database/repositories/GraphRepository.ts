import { GraphModel } from "../models/GraphModel.js";
import { Graph, Viewport } from "../../../Domain/graph/Graph.js";
import { Node } from "../../../Domain/graph/Node.js";
import { Edge } from "../../../Domain/graph/Edge.js";
import { IGraphRepository } from "../../../Domain/graph/IGraphRepository.js";
import { ISecretsService } from "../../../Domain/graph/ISecretsService.js";

export class GraphRepository implements IGraphRepository {
  constructor(private readonly secretsService: ISecretsService) {}
  private toGraph(doc: InstanceType<typeof GraphModel>): Graph {
    return {
      id: doc._id.toString(),
      projectId: doc.projectId,
      name: doc.name,
      viewport: {
        x: doc.viewport.x,
        y: doc.viewport.y,
        zoom: doc.viewport.zoom,
      },
      nodes: doc.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        positionX: n.positionX,
        positionY: n.positionY,
        data: {
          label: n.data.label,
          description: n.data.description,
          params: {
            baseParameters: (n.data.params?.baseParameters as Record<string, unknown>) ?? {},
          },
          env: (n.data.env as Record<string, unknown>) ?? {},
          secrets: Object.fromEntries(
            Array.from(n.data.secrets.entries()).map(([k, v]) => [
              k,
              this.secretsService.decrypt(v),
            ]),
          ),
        },
      })),
      edges: doc.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };
  }

  private encryptNode(node: Node): Node {
    return {
      ...node,
      data: {
        ...node.data,
        secrets: Object.fromEntries(
          Object.entries(node.data.secrets).map(([k, v]) => [k, this.secretsService.encrypt(v)]),
        ),
      },
    };
  }

  async findAllByProjectId(projectId: string): Promise<Graph[]> {
    const docs = await GraphModel.find({ projectId });
    return docs.map((doc) => this.toGraph(doc));
  }

  async findById(id: string): Promise<Graph | null> {
    const doc = await GraphModel.findById(id);
    return doc ? this.toGraph(doc) : null;
  }

  async create(
    projectId: string,
    name: string,
    data: { viewport: Viewport; nodes: Node[]; edges: Edge[] },
  ): Promise<Graph> {
    const encryptedNodes = data.nodes.map((n) => this.encryptNode(n));
    const doc = new GraphModel({
      projectId,
      name,
      viewport: data.viewport,
      nodes: encryptedNodes,
      edges: data.edges,
    });
    await doc.save();
    return this.toGraph(doc);
  }

  async update(
    id: string,
    data: { viewport: Viewport; nodes: Node[]; edges: Edge[] },
  ): Promise<Graph> {
    const encryptedNodes = data.nodes.map((n) => this.encryptNode(n));
    const doc = await GraphModel.findByIdAndUpdate(
      id,
      { viewport: data.viewport, nodes: encryptedNodes, edges: data.edges },
      { new: true },
    );
    if (!doc) throw new Error(`Pipeline not found for id=${id}`);
    return this.toGraph(doc);
  }

  async delete(id: string): Promise<void> {
    await GraphModel.findByIdAndDelete(id);
  }
}
