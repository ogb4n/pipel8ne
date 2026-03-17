import { GraphModel } from "../models/GraphModel.js";
import { Graph, Viewport } from "../../../Domain/graph/Graph.js";
import { Stage } from "../../../Domain/graph/Stage.js";
import { Job } from "../../../Domain/graph/Job.js";
import { Node } from "../../../Domain/graph/Node.js";
import { Edge } from "../../../Domain/graph/Edge.js";
import { IGraphRepository } from "../../../Domain/graph/IGraphRepository.js";
import { ISecretsService } from "../../../Domain/graph/ISecretsService.js";

export class GraphRepository implements IGraphRepository {
  constructor(private readonly secretsService: ISecretsService) {}

  // ── Mapping helpers ────────────────────────────────────────────────────────

  private mapEdge(e: {
    id: string;
    source: string;
    target: string;
    type: string;
    condition?: "on_success" | "always" | "on_failure";
    waypoint?: { x: number; y: number };
  }): Edge {
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      ...(e.condition ? { condition: e.condition } : {}),
      ...(e.waypoint ? { waypoint: { x: e.waypoint.x, y: e.waypoint.y } } : {}),
    };
  }

  private decryptNode(n: {
    id: string;
    type: string;
    positionX: number;
    positionY: number;
    data: {
      label: string;
      description: string;
      params: { baseParameters: Record<string, unknown> };
      env: Record<string, unknown>;
      secrets: Map<string, string>;
    };
  }): Node {
    return {
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
          Array.from(n.data.secrets.entries()).map(([k, v]) => [k, this.secretsService.decrypt(v)]),
        ),
      },
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
      stages: (doc.stages ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        position: { x: s.position.x, y: s.position.y },
        jobs: s.jobs.map((j) => ({
          id: j.id,
          name: j.name,
          runsOn: j.runsOn ?? "ubuntu-latest",
          ...(j.condition
            ? {
                condition: {
                  conditions: (j.condition.conditions ?? []).map((c) => ({
                    leftOperand: c.leftOperand,
                    operator: c.operator,
                    ...(c.rightOperand !== undefined ? { rightOperand: c.rightOperand } : {}),
                  })),
                  logicalOperator: j.condition.logicalOperator,
                },
              }
            : {}),
          steps: j.steps.map((n) => this.decryptNode(n)),
          stepEdges: j.stepEdges.map((e) => this.mapEdge(e)),
        })),
      })),
      stageEdges: (doc.stageEdges ?? []).map((e) => this.mapEdge(e)),
    };
  }

  private encryptJob(job: Job): Job {
    return {
      ...job,
      ...(job.condition
        ? {
            condition: {
              conditions: job.condition.conditions.map((c) => ({
                leftOperand: c.leftOperand,
                operator: c.operator,
                ...(c.rightOperand !== undefined ? { rightOperand: c.rightOperand } : {}),
              })),
              logicalOperator: job.condition.logicalOperator,
            },
          }
        : {}),
      steps: job.steps.map((n) => this.encryptNode(n)),
    };
  }

  private encryptStage(stage: Stage): Stage {
    return {
      ...stage,
      jobs: stage.jobs.map((j) => this.encryptJob(j)),
    };
  }

  // ── Repository methods ─────────────────────────────────────────────────────

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
    data: { viewport: Viewport; stages: Stage[]; stageEdges: Edge[] },
  ): Promise<Graph> {
    const encryptedStages = data.stages.map((s) => this.encryptStage(s));
    const doc = new GraphModel({
      projectId,
      name,
      viewport: data.viewport,
      stages: encryptedStages,
      stageEdges: data.stageEdges,
    });
    await doc.save();
    return this.toGraph(doc);
  }

  async update(
    id: string,
    data: { viewport: Viewport; stages: Stage[]; stageEdges: Edge[] },
  ): Promise<Graph> {
    const encryptedStages = data.stages.map((s) => this.encryptStage(s));
    const doc = await GraphModel.findByIdAndUpdate(
      id,
      { viewport: data.viewport, stages: encryptedStages, stageEdges: data.stageEdges },
      { new: true },
    );
    if (!doc) throw new Error(`Pipeline not found for id=${id}`);
    return this.toGraph(doc);
  }

  async delete(id: string): Promise<void> {
    await GraphModel.findByIdAndDelete(id);
  }
}
