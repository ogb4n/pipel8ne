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

const EdgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, required: true },
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

export interface IGraphDocument extends Document {
  projectId: string;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  nodes: Array<{
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
  }>;
  edges: Array<{ id: string; source: string; target: string; type: string }>;
}

const GraphSchema = new Schema<IGraphDocument>(
  {
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true, default: "Pipeline" },
    viewport: { type: ViewportSchema, required: true, default: () => ({ x: 0, y: 0, zoom: 1 }) },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
  },
  { timestamps: true },
);

export const GraphModel = mongoose.model<IGraphDocument>("Graph", GraphSchema);
