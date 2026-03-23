import { Stage } from "./Stage.js";
import { Edge } from "./Edge.js";
import type { TriggerNodeParams } from "./nodes/TriggerNode.js";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Graph {
  id: string;
  projectId: string; // references Project.id
  name: string;
  /** draft = work in progress, no validation enforced. active = fully validated. */
  status: "draft" | "active";
  /** Pipeline-level trigger configuration (push, PR, schedule, manual, tag). */
  trigger?: TriggerNodeParams;
  viewport: Viewport;
  /** Stages composing the pipeline. Each stage groups parallel jobs. */
  stages: Stage[];
  /** Edges between stages — source/target are stage IDs, define execution order. */
  stageEdges: Edge[];
}
