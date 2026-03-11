# Architecture — pipel8ne Backend

> Source of truth: `ARCHITECTURE.md` at repo root. This is a summary for quick reference.

## Pattern: Hexagonal Architecture (Ports & Adapters)

### Dependency Flow
```
Application → Domain ← Infrastructure
```
- **Domain**: Pure business logic. Zero external imports (no Fastify, Mongoose, JWT…).
- **Infrastructure**: Implements Domain ports (interfaces). Contains Mongoose, JWT, crypto.
- **Application**: HTTP adapter (Fastify). Wires services to endpoints. Zero business logic.

---

## Domain Layer (`backend/src/Domain/`)

### Entities
- Defined as **pure TypeScript interfaces** (never ORM-decorated classes).
- `id` is always `string` (serialized MongoDB ObjectId).
- Dates are `Date`, not `string`.

### Ports (Repository interfaces)
- Prefixed with `I`: `IUserRepository`, `IProjectRepository`, `IGraphRepository`…
- Defined in Domain; implemented in Infrastructure.

### Services
- Constructor-injected with ports (interfaces), never concrete classes.
- Contain all business rules; throw typed domain errors.

### Domain Errors (`Domain/errors.ts`)
- `NotFoundError` (type = "NotFoundError")
- `ForbiddenError` (type = "ForbiddenError")
- `AuthError` (code = "EMAIL_IN_USE" | "INVALID_CREDENTIALS") — in `AuthService.ts`
- **Never contain HTTP status codes.**

---

## Infrastructure Layer (`backend/src/Infrastructure/`)

### Repositories
- `class XxxRepository implements IXxxRepository`
- Private mapper `toXxx(doc)`: Mongoose document → Domain type
- All MongoDB plumbing (`.lean()`, `.findByIdAndUpdate()`) stays here.

### Services
- `JwtTokenService` implements `ITokenService` via `@fastify/jwt`
- `SecretsService` implements `ISecretsService` — AES-256-GCM encryption

---

## Application Layer (`backend/src/Application/`)

### DI Container (`plugins/container.ts`)
- **Single point** where concrete repos and services are instantiated.
- Uses `fastify-plugin` (`fp`) so decorators are visible across the full app scope.
- Exposes services via `app.decorate("xxxService", ...)`.
- Type declarations in `declare module "fastify" { interface FastifyInstance { ... } }`.

### Plugin Registration Order (index.ts)
1. `connectDatabase()` — MongoDB first
2. `swaggerPlugin` — before routes
3. `jwtPlugin` — before routes (`app.authenticate` must exist)
4. `containerPlugin` — before routes (`app.<service>` must exist)
5. `registerRoutes(app)` — API routes
6. `staticPlugin` — LAST (SPA fallback catch-all)

### Routes
- One folder per feature: `auth/`, `graphs/`, `projects/`, `users/`, `health/`
- Two files per feature: `<feature>.routes.ts` + `<feature>.schemas.ts`
- Handlers: call `app.<feature>Service`, translate domain errors to HTTP via `instanceof`.
- **No business logic in handlers.**

### Schemas (`<feature>.schemas.ts`)
- JSON Schema for Fastify-AJV validation + Swagger docs
- Always include `body`, `response`, `params`/`querystring` as needed
- `additionalProperties: false` on all request bodies

---

## New Feature Checklist (Domain → Infra → App)
1. `Domain/<feature>/<Entity>.ts` — interface
2. `Domain/<feature>/I<Entity>Repository.ts` — port
3. `Domain/<feature>/<Entity>Service.ts` — business logic
4. `Infrastructure/database/models/<Entity>Model.ts` — Mongoose schema
5. `Infrastructure/database/repositories/<Entity>Repository.ts` — implements port
6. `Application/plugins/container.ts` — instantiate + `app.decorate()`
7. `Application/routes/<feature>/<feature>.schemas.ts` — JSON schemas
8. `Application/routes/<feature>/<feature>.routes.ts` — handlers
9. `Application/routes/index.ts` — register route module
