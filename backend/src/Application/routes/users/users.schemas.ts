/**
 * Schémas JSON utilisés par les routes User (Fastify / OpenAPI).
 * Centralisés ici pour éviter la duplication entre routes et doc Swagger.
 * L'identifiant est désormais un string (ObjectId MongoDB sérialisé).
 */

export const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    name: { type: "string", nullable: true },
    role: { type: "string", enum: ["admin", "user"] },
    createdAt: { type: "string" },
  },
} as const;

export const userListSchema = {
  type: "array",
  items: userSchema,
} as const;

export const notFoundSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;

export const patchUserBodySchema = {
  type: "object",
  required: ["role"],
  properties: {
    role: { type: "string", enum: ["admin", "user"] },
  },
} as const;

export const createUserBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
    name: { type: "string" },
    role: { type: "string", enum: ["admin", "user"] },
  },
  additionalProperties: false,
} as const;
