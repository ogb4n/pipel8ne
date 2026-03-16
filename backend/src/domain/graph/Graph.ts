import { Job } from "./Job.js";
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
  /** Jobs composing the pipeline. Each job groups a set of steps. */
  jobs: Job[];
  /** Edges between jobs — source/target are job IDs, define execution order. */
  jobEdges: Edge[];
}
