import { Stage } from "./Stage.js";
import { Edge } from "./Edge.js";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Graph {
  id: string;
  projectId: string; // references Project.id
  name: string;
  viewport: Viewport;
  /** Stages composing the pipeline. Each stage groups parallel jobs. */
  stages: Stage[];
  /** Edges between stages — source/target are stage IDs, define execution order. */
  stageEdges: Edge[];
}
