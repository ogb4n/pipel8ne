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
    waypoint: { type: WaypointSchema, default: undefined },
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
    steps: { type: [NodeSchema], default: [] },
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
  waypoint?: { x: number; y: number };
};

type JobDoc = {
  id: string;
  name: string;
  runsOn: string;
  steps: NodeDoc[];
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
  status: "draft" | "active";
  trigger?: Record<string, unknown>;
  viewport: { x: number; y: number; zoom: number };
  stages: StageDoc[];
  /** Edges between stages — source/target are stage IDs, define execution order. */
  stageEdges: EdgeDoc[];
}

const GraphSchema = new Schema<IGraphDocument>(
  {
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true, default: "Pipeline" },
    status: { type: String, enum: ["draft", "active"], default: "draft" },
    trigger: { type: Schema.Types.Mixed, default: undefined },
    viewport: { type: ViewportSchema, required: true, default: () => ({ x: 0, y: 0, zoom: 1 }) },
    stages: { type: [StageSchema], default: [] },
    stageEdges: { type: [EdgeSchema], default: [] },
  },
  { timestamps: true },
);

export const GraphModel = mongoose.model<IGraphDocument>("Graph", GraphSchema);
