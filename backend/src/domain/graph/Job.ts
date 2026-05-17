import { Node } from "./Node.js";
import { Edge } from "./Edge.js";

/**
 * A Job groups a set of steps (nodes) within a Stage.
 * All jobs in a stage run in parallel; steps within a job run sequentially
 * (order is defined by the array position).
 */
export interface Job {
  id: string;
  name: string;
  /** Runner label for this job, e.g. "ubuntu-latest", "self-hosted" */
  runsOn: string;
  /** The steps (nodes) belonging to this job, executed in array order */
  steps: Node[];
  /** Dependencies between steps within this job */
  stepEdges?: Edge[];
}
