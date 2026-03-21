/** Vue publique d'une connexion Git. */
export const gitConnectionSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    provider: { type: "string", enum: ["github", "gitlab"] },
    providerUsername: { type: "string" },
    avatarUrl: { type: ["string", "null"] },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
} as const;

export const gitConnectionListSchema = {
  type: "array",
  items: gitConnectionSchema,
} as const;

/** Body POST /api/git-connections/oauth/callback */
export const oauthCallbackBodySchema = {
  type: "object",
  required: ["provider", "code"],
  properties: {
    provider: {
      type: "string",
      enum: ["github", "gitlab"],
      description: "Plateforme Git cible",
    },
    code: {
      type: "string",
      minLength: 1,
      description: "Code OAuth reçu dans le callback",
    },
  },
  additionalProperties: false,
} as const;

/** Réponse OAuth config (URL d'autorisation) */
export const oauthConfigSchema = {
  type: "object",
  properties: {
    github: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        authUrl: { type: "string" },
      },
    },
    gitlab: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        authUrl: { type: "string" },
      },
    },
  },
} as const;

/** Repository Git */
export const gitRepositorySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    fullName: { type: "string" },
    description: { type: ["string", "null"] },
    url: { type: "string" },
    cloneUrl: { type: "string" },
    defaultBranch: { type: "string" },
    isPrivate: { type: "boolean" },
    updatedAt: { type: "string" },
  },
} as const;

export const gitRepositoryListSchema = {
  type: "array",
  items: gitRepositorySchema,
} as const;

export const errorSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const;
