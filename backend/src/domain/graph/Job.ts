import { Node } from "./Node.js";
import { Edge } from "./Edge.js";
import type { Condition } from "./nodes/ConditionNode.js";

export interface JobGuardCondition {
  conditions: Condition[];
  logicalOperator: "AND" | "OR";
}

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
  /** Optional guard evaluated before running the job. */
  condition?: JobGuardCondition;
  /** The steps (nodes) belonging to this job, executed in array order */
  steps: Node[];
}
