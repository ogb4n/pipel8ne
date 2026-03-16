import { Job } from "./Job.js";
export interface Stage {
  id: string;
  name: string;
  /** Jobs belonging to this stage — always run in parallel */
  jobs: Job[];
  /** Canvas position of the stage group node */
  position: { x: number; y: number };
}
