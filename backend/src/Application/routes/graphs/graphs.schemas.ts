/**
 * Schémas JSON utilisés par les routes Pipeline (Fastify / OpenAPI).
 */

const nodeParamsSchema = {
  type: "object",
  properties: {
    baseParameters: { type: "object", additionalProperties: true },
  },
} as const;

const nodeDataSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    description: { type: "string" },
    params: nodeParamsSchema,
    env: { type: "object", additionalProperties: true },
    secrets: { type: "object", additionalProperties: { type: "string" } },
  },
} as const;

const nodeSchema = {
  type: "object",
  required: ["id", "type", "positionX", "positionY", "data"],
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    positionX: { type: "number" },
    positionY: { type: "number" },
    data: nodeDataSchema,
  },
} as const;

const waypointSchema = {
  type: "object",
  properties: {
    x: { type: "number" },
    y: { type: "number" },
  },
} as const;

const edgeSchema = {
  type: "object",
  required: ["id", "source", "target", "type"],
  properties: {
    id: { type: "string" },
    source: { type: "string" },
    target: { type: "string" },
    type: { type: "string" },
    waypoint: waypointSchema,
  },
} as const;

const positionSchema = {
  type: "object",
  required: ["x", "y"],
  properties: {
    x: { type: "number" },
    y: { type: "number" },
  },
} as const;

/**
 * A job groups a set of steps within a stage.
 * All jobs in a stage run in parallel; steps within a job run sequentially.
 */
const jobSchema = {
  type: "object",
  required: ["id", "name", "runsOn", "steps"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    runsOn: { type: "string" },
    steps: { type: "array", items: nodeSchema },
  },
} as const;

/**
 * A stage groups a set of jobs that run in parallel on the same runner.
 * stageEdges define execution order between stages.
 */
const stageSchema = {
  type: "object",
  required: ["id", "name", "jobs", "position"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    jobs: { type: "array", items: jobSchema },
    position: positionSchema,
  },
} as const;

const viewportSchema = {
  type: "object",
  required: ["x", "y", "zoom"],
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    zoom: { type: "number" },
  },
} as const;

const triggerSchema = {
  type: "object",
  properties: {
    triggerType: { type: "string", enum: ["push", "pull_request", "schedule", "manual", "tag"] },
    branches: { type: "array", items: { type: "string" } },
    schedule: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
} as const;

export const pipelineSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    projectId: { type: "string" },
    name: { type: "string" },
    status: { type: "string", enum: ["draft", "active"] },
    trigger: triggerSchema,
    viewport: viewportSchema,
    stages: { type: "array", items: stageSchema },
    stageEdges: { type: "array", items: edgeSchema },
  },
} as const;

export const createPipelineBodySchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const updatePipelineBodySchema = {
  type: "object",
  required: ["status", "viewport", "stages", "stageEdges"],
  properties: {
    status: { type: "string", enum: ["draft", "active"] },
    trigger: triggerSchema,
    viewport: viewportSchema,
    stages: { type: "array", items: stageSchema },
    stageEdges: { type: "array", items: edgeSchema },
  },
  additionalProperties: false,
} as const;

export const notFoundSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;
