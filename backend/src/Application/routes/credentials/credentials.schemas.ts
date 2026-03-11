/**
 * Schémas JSON utilisés par les routes Credential (Fastify / OpenAPI).
 * La valeur sensible (token, clé…) n'apparaît jamais dans les réponses.
 */

/** Représentation publique d'un credential (sans la valeur chiffrée). */
export const credentialSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    provider: { type: "string" },
    label: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
} as const;

export const credentialListSchema = {
  type: "array",
  items: credentialSchema,
} as const;

export const createCredentialBodySchema = {
  type: "object",
  required: ["provider", "label", "value"],
  properties: {
    provider: {
      type: "string",
      minLength: 1,
      description: "Identifiant de la plateforme (ex: github, gitlab, dockerhub)",
    },
    label: {
      type: "string",
      minLength: 1,
      description: "Libellé lisible (ex: Mon token GitHub perso)",
    },
    value: {
      type: "string",
      minLength: 1,
      description: "Valeur secrète en clair — sera chiffrée avant stockage",
    },
  },
  additionalProperties: false,
} as const;

export const updateCredentialBodySchema = {
  type: "object",
  properties: {
    label: { type: "string", minLength: 1 },
    value: {
      type: "string",
      minLength: 1,
      description: "Nouvelle valeur secrète en clair — sera chiffrée avant stockage",
    },
  },
  additionalProperties: false,
} as const;

export const notFoundSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const;
