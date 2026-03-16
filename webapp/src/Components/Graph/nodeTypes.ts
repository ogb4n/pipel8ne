import StageLaneNode from "./nodes/StageLaneNode";
import JobCardNode from "./nodes/JobCardNode";
import StageCardNode from "./nodes/StageCardNode";

export const nodeTypes = {
  stageGroup: StageLaneNode,  // legacy — kept for backward compat
  jobGroup: JobCardNode,       // legacy — kept for backward compat
  stageCard: StageCardNode,   // pipeline view: stage as a simple card
  jobCard: JobCardNode,        // stage view: job as a flat card
};
