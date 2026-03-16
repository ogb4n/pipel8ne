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
 * A job groups a set of steps that run on the same runner.
 * stepEdges define execution order within the job.
 */
const jobSchema = {
  type: "object",
  required: ["id", "name", "runsOn", "steps", "stepEdges", "position"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    runsOn: { type: "string" },
    steps: { type: "array", items: nodeSchema },
    stepEdges: { type: "array", items: edgeSchema },
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

export const pipelineSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    projectId: { type: "string" },
    name: { type: "string" },
    viewport: viewportSchema,
    jobs: { type: "array", items: jobSchema },
    jobEdges: { type: "array", items: edgeSchema },
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
  required: ["viewport", "jobs", "jobEdges"],
  properties: {
    viewport: viewportSchema,
    jobs: { type: "array", items: jobSchema },
    jobEdges: { type: "array", items: edgeSchema },
  },
  additionalProperties: false,
} as const;

export const notFoundSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;
