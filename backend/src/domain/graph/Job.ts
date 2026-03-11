import { Node } from "./Node.js";
import { Edge } from "./Edge.js";

/**
 * A Job groups a set of steps (nodes) that all run on the same runner.
 * All steps within a job are executed before moving to the next job.
 * Dependencies between jobs are expressed via `Graph.jobEdges`.
 */
export interface Job {
  id: string;
  name: string;
  /** Free-form runner label, e.g. "ubuntu-latest", "self-hosted", "windows-2022" */
  runsOn: string;
  /** The steps (nodes) belonging to this job */
  steps: Node[];
  /** Edges between steps within this job (defines step execution order) */
  stepEdges: Edge[];
  /** Position of the job group node on the React Flow canvas */
  position: { x: number; y: number };
}
