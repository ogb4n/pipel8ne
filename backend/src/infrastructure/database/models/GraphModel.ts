import mongoose, { Schema, Document } from "mongoose";

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const NodeParamsSchema = new Schema(
  { baseParameters: { type: Schema.Types.Mixed, default: {} } },
  { _id: false },
);

const NodeDataSchema = new Schema(
  {
    label: { type: String, required: true },
    description: { type: String, default: "" },
    params: { type: NodeParamsSchema, required: true },
    env: { type: Schema.Types.Mixed, default: {} },
    /**
     * Stored as encrypted strings (AES-256-GCM via SecretsService).
     * Encryption/decryption is handled in GraphRepository, not here.
     */
    secrets: { type: Map, of: String, default: {} },
  },
  { _id: false },
);

const NodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    positionX: { type: Number, required: true },
    positionY: { type: Number, required: true },
    data: { type: NodeDataSchema, required: true },
  },
  { _id: false },
);

const WaypointSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false },
);

const EdgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, required: true },
    condition: { type: String, enum: ["on_success", "always", "on_failure"], required: false },
    waypoint: { type: WaypointSchema, default: undefined },
  },
  { _id: false },
);

const GuardConditionSchema = new Schema(
  {
    leftOperand: { type: String, required: true },
    operator: { type: String, required: true },
    rightOperand: { type: String, required: false },
  },
  { _id: false },
);

const JobConditionSchema = new Schema(
  {
    conditions: { type: [GuardConditionSchema], default: [] },
    logicalOperator: { type: String, enum: ["AND", "OR"], default: "AND" },
  },
  { _id: false },
);

const PositionSchema = new Schema(
  {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

/**
 * JobSchema — groups a set of steps (nodes) within a Stage.
 * All jobs in a stage run in parallel; steps within a job run sequentially.
 */
const JobSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, default: "job" },
    runsOn: { type: String, required: true, default: "ubuntu-latest" },
    condition: { type: JobConditionSchema, required: false },
    steps: { type: [NodeSchema], default: [] },
    stepEdges: { type: [EdgeSchema], default: [] },
  },
  { _id: false },
);

/**
 * StageSchema — groups a set of jobs that run in parallel on the same runner.
 * stageEdges define execution order between stages.
 */
const StageSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, default: "stage" },
    jobs: { type: [JobSchema], default: [] },
    position: { type: PositionSchema, required: true, default: () => ({ x: 0, y: 0 }) },
  },
  { _id: false },
);

const ViewportSchema = new Schema(
  {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    zoom: { type: Number, required: true, default: 1 },
  },
  { _id: false },
);

// ── Root document ──────────────────────────────────────────────────────────────

type NodeDoc = {
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
};

type EdgeDoc = {
  id: string;
  source: string;
  target: string;
  type: string;
  condition?: "on_success" | "always" | "on_failure";
  waypoint?: { x: number; y: number };
};

type JobDoc = {
  id: string;
  name: string;
  runsOn: string;
  condition?: {
    conditions: Array<{
      leftOperand: string;
      operator: string;
      rightOperand?: string;
    }>;
    logicalOperator: "AND" | "OR";
  };
  steps: NodeDoc[];
  stepEdges: EdgeDoc[];
};

type StageDoc = {
  id: string;
  name: string;
  jobs: JobDoc[];
  position: { x: number; y: number };
};

export interface IGraphDocument extends Document {
  projectId: string;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  stages: StageDoc[];
  /** Edges between stages — source/target are stage IDs, define execution order. */
  stageEdges: EdgeDoc[];
}

const GraphSchema = new Schema<IGraphDocument>(
  {
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true, default: "Pipeline" },
    viewport: { type: ViewportSchema, required: true, default: () => ({ x: 0, y: 0, zoom: 1 }) },
    stages: { type: [StageSchema], default: [] },
    stageEdges: { type: [EdgeSchema], default: [] },
  },
  { timestamps: true },
);

export const GraphModel = mongoose.model<IGraphDocument>("Graph", GraphSchema);
