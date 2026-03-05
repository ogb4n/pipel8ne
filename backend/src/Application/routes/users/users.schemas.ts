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
