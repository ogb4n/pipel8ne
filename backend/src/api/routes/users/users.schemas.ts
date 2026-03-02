/**
 * Schémas JSON utilisés par les routes User (Fastify / OpenAPI).
 * Centralisés ici pour éviter la duplication entre routes et doc Swagger.
 */

export const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    email: { type: "string" },
    name: { type: "string", nullable: true },
    createdAt: { type: "string" },
  },
} as const;

export const userListSchema = {
  type: "array",
  items: userSchema,
} as const;

export const createUserBodySchema = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", format: "email" },
    name: { type: "string" },
  },
} as const;

export const notFoundSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;
