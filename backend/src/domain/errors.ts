/**
 * Erreurs domaine typées.
 * Levées par les services — la couche Application les traduit en codes HTTP.
 */

export class NotFoundError extends Error {
  readonly type = "NotFoundError" as const;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  readonly type = "ForbiddenError" as const;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  readonly type = "ValidationError" as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
