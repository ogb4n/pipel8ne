# Architecture

## Overview

pipel8ne is a full-stack web application split into two independently runnable parts:

```
pipel8ne/
├── backend/   — Fastify REST API (Node.js + TypeScript)
└── webapp/    — React SPA (Vite + TypeScript)
```

The backend serves both the API and the compiled frontend as static files in production. In development, the Vite dev server proxies API calls to the backend.

---

## Backend — Hexagonal Architecture

The backend follows a strict hexagonal architecture (Ports & Adapters) with three layers:

```
src/
├── Domain/          — Pure business logic, no external dependencies
├── Infrastructure/  — Concrete implementations (MongoDB, JWT, crypto)
└── Application/     — HTTP adapter (Fastify routes, plugins, schemas)
```

**Dependency rule:** dependencies always point inward.

```
Application → Domain ← Infrastructure
```

- **Domain** knows nothing about Fastify, Mongoose, or any framework.
- **Infrastructure** implements ports defined by the Domain.
- **Application** wires everything together and handles HTTP.

### Domain layer

Contains all business logic. Organized by feature:

```
Domain/
├── auth/
├── graph/         — Pipeline, Stage, Job, Node entities + services
├── project/
├── credential/
├── apikey/
└── errors.ts      — Shared domain errors (NotFoundError, ForbiddenError…)
```

Each feature contains:
- `Entity.ts` — TypeScript interface (never a class with decorators)
- `IEntityRepository.ts` — Outgoing port (repository contract)
- `EntityService.ts` — Business logic, injected with port interfaces

Domain errors never carry HTTP status codes.

### Infrastructure layer

Implements the Domain ports using concrete technologies:

```
Infrastructure/
├── database/
│   ├── client.ts                  — MongoDB connection
│   ├── models/                    — Mongoose schemas
│   └── repositories/              — IRepository implementations
├── JwtTokenService.ts
└── SecretsService.ts              — AES-256-GCM encryption for stored secrets
```

Each repository has a private mapper `toEntity(doc)` that converts Mongoose documents to Domain types. No Mongoose types leak outside this layer.

### Application layer

HTTP adapter only — no business logic.

```
Application/
├── plugins/
│   ├── container.ts   — DI container: wires repositories + services, exposes via app.decorate()
│   ├── jwt.ts         — JWT plugin + app.authenticate hook
│   ├── swagger.ts     — OpenAPI docs (dev only)
│   ├── static.ts      — Static files + SPA fallback
│   └── adminGuard.ts  — Role-based access control
└── routes/
    └── <feature>/
        ├── <feature>.routes.ts   — Fastify handlers
        └── <feature>.schemas.ts  — JSON Schema (validation + Swagger)
```

Handlers translate domain errors to HTTP status codes via `instanceof` checks. All request validation is done by JSON Schema, not by service code.

### Startup order

Plugin registration order in `index.ts` is strict:

1. `connectDatabase()` — MongoDB must be ready before anything else
2. `swaggerPlugin` — collects route schemas, must register before routes
3. `jwtPlugin` — `app.authenticate` must exist before routes
4. `containerPlugin` — `app.<service>` must exist before routes
5. `registerRoutes(app)` — all feature routes
6. `staticPlugin` — SPA fallback must be last (catchall)

---

## Frontend — React SPA

```
webapp/src/
├── Api/
│   ├── client.ts      — Typed fetch wrapper with JWT refresh logic
│   └── types.ts       — Shared TypeScript types (mirrors backend domain)
├── Components/
│   ├── Graph/         — Pipeline editor (nodes, edges, panels, breadcrumb)
│   └── ...            — Shared UI components
├── Context/
│   ├── AuthContext.tsx — Auth state + token management
│   └── ThemeContext.tsx — Dark/light mode
├── hooks/
│   └── usePipeline.ts  — Core hook managing the graph editor state
├── Pages/
│   ├── PageProjects.tsx
│   ├── PagePipelines.tsx
│   ├── PageGraph.tsx    — Pipeline editor page
│   ├── PageLogin.tsx
│   └── PageSettings.tsx
└── App.tsx             — Router + nav + auth guard
```

### API client

`Api/client.ts` is a thin typed wrapper around `fetch`. It handles:
- Attaching `Authorization: Bearer` headers from localStorage
- Automatic token refresh on 401 (with a queue to avoid concurrent refresh races)
- Redirecting to `/login` when the session is fully expired

### Pipeline editor

The graph editor is built on [React Flow](https://reactflow.dev/). The main complexity lives in `usePipeline.ts`, which manages:

- Three canvas levels: **pipeline view** (stages) → **stage view** (jobs) → **job view** (steps)
- Canvas snapshots when drilling in/out of a level
- YAML export (GitHub Actions, GitLab CI, Azure DevOps)
- Persistence via the REST API

See [pipeline-concepts.md](./pipeline-concepts.md) for details on the data model.

---

## Data flow (save a pipeline)

```
User edits graph
  → usePipeline collects nodes/edges from ReactFlow
  → converts to Domain model (stages + stageEdges)
  → PUT /api/projects/:projectId/pipelines/:pipelineId
  → Fastify validates body (JSON Schema)
  → GraphService.update() applies business rules
  → GraphRepository.update() persists to MongoDB
  → returns updated Graph
  → usePipeline updates local state
```
