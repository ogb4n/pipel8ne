export const registerBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email:    { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
    name:     { type: "string" },
  },
  additionalProperties: false,
} as const;

export const loginBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email:    { type: "string", format: "email" },
    password: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const refreshBodySchema = {
  type: "object",
  required: ["refreshToken"],
  properties: {
    refreshToken: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const authResponseSchema = {
  type: "object",
  properties: {
    accessToken:  { type: "string" },
    refreshToken: { type: "string" },
    user: {
      type: "object",
      properties: {
        id:        { type: "string" },
        email:     { type: "string" },
        name:      { type: "string", nullable: true },
        createdAt: { type: "string" },
      },
    },
  },
} as const;

export const refreshResponseSchema = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
  },
} as const;

export const errorSchema = {
  type: "object",
  properties: { message: { type: "string" } },
} as const;
