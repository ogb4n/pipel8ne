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

const edgeSchema = {
  type: "object",
  required: ["id", "source", "target", "type"],
  properties: {
    id: { type: "string" },
    source: { type: "string" },
    target: { type: "string" },
    type: { type: "string" },
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
    nodes: { type: "array", items: nodeSchema },
    edges: { type: "array", items: edgeSchema },
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
  required: ["viewport", "nodes", "edges"],
  properties: {
    viewport: viewportSchema,
    nodes: { type: "array", items: nodeSchema },
    edges: { type: "array", items: edgeSchema },
  },
  additionalProperties: false,
} as const;

export const notFoundSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;
