/**
 * Schémas JSON utilisés par les routes Project (Fastify / OpenAPI).
 */

export const projectSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    path: { type: "string" },
    provider: { type: "string" },
    visibility: { type: "string", enum: ["private", "public"] },
    ownerId: { type: "string" },
    lastModified: { type: "string" },
  },
} as const;

export const projectListSchema = {
  type: "array",
  items: projectSchema,
} as const;

export const createProjectBodySchema = {
  type: "object",
  required: ["name", "path", "provider"],
  properties: {
    name: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    provider: { type: "string", minLength: 1 },
    visibility: { type: "string", enum: ["private", "public"] },
  },
  additionalProperties: false,
} as const;

export const updateProjectBodySchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    provider: { type: "string", minLength: 1 },
    visibility: { type: "string", enum: ["private", "public"] },
  },
  additionalProperties: false,
} as const;

export const notFoundSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;
