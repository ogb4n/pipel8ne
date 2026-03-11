/**
 * Schémas JSON utilisés par les routes API Key (Fastify / OpenAPI).
 * Le hash de la clé (keyHash) n'apparaît jamais dans les réponses.
 */

/** Représentation publique d'une clé API (sans le keyHash). */
export const apiKeySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    name: { type: "string" },
    prefix: { type: "string" },
    isRevoked: { type: "boolean" },
    lastUsedAt: { type: "string", nullable: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
} as const;

export const apiKeyListSchema = {
  type: "array",
  items: apiKeySchema,
} as const;

/** Réponse à la création : inclut rawKey (affiché une seule fois). */
export const createApiKeyResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    name: { type: "string" },
    prefix: { type: "string" },
    isRevoked: { type: "boolean" },
    lastUsedAt: { type: "string", nullable: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    rawKey: {
      type: "string",
      description: "Clé brute — affichée une seule fois, à stocker immédiatement",
    },
  },
} as const;

export const createApiKeyBodySchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: {
      type: "string",
      minLength: 1,
      description: "Libellé lisible pour cette clé API (ex: CI/CD token)",
    },
  },
  additionalProperties: false,
} as const;

export const apiKeyParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
} as const;

export const notFoundSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const;
