# Plan: Integrate Pipeline Entities (Project, Graph, Node, Edge)

Integrate all pipeline domain entities (Project, Graph, Node, NodeData, NodeParams, Edge) into the existing Hexagonal/DDD architecture — domain ports & interfaces, Mongoose infrastructure adapters, and Fastify routes wired via the existing DI container.

**Decisions locked:**

- `secrets` in `NodeData` are encrypted at rest (AES-256-GCM via Node `crypto`)
- `Graph` lives in its own MongoDB collection (one-to-one with Project via `projectId`)
- Projects support `visibility: "private" | "public"` for multi-user sharing

---

## Phase 1: Domain Layer

**Objective:** Define all domain entity interfaces and outgoing ports (IRepository) + domain services for Project and Graph (which embeds Node, NodeData, NodeParams, Edge).

**Files to Create:**

- `domain/project/Project.ts`
- `domain/project/IProjectRepository.ts`
- `domain/project/ProjectService.ts`
- `domain/graph/NodeParams.ts`
- `domain/graph/NodeData.ts`
- `domain/graph/Node.ts`
- `domain/graph/Edge.ts`
- `domain/graph/Graph.ts`
- `domain/graph/IGraphRepository.ts`
- `domain/graph/GraphService.ts`

**Steps:**

1. Create `Project.ts` with fields: id, name, path, provider, visibility (private|public), ownerId, lastModified (Date)
2. Create `IProjectRepository.ts` — findAll, findAllPublic, findByOwner, findById, create, updateById, delete
3. Create `ProjectService.ts` delegating to the port
4. Create `NodeParams.ts` (baseParameters: Record<string, unknown>)
5. Create `NodeData.ts` (label, description, params, env, secrets — secrets are pre-encrypted strings)
6. Create `Node.ts` (id, type, positionX, positionY, data: NodeData)
7. Create `Edge.ts` (id, source, target, type)
8. Create `Graph.ts` (id, projectId, viewport: { x, y, zoom }, nodes, edges)
9. Create `IGraphRepository.ts` — findByProjectId, upsert, delete
10. Create `GraphService.ts`

---

## Phase 2: Infrastructure Layer

**Objective:** Implement Mongoose models and repository adapters, plus a `SecretsService` for AES-256-GCM encryption of node secrets — following the exact patterns of `UserModel`/`UserRepository`.

**Files to Create:**

- `infrastructure/database/models/ProjectModel.ts`
- `infrastructure/database/models/GraphModel.ts`
- `infrastructure/database/repositories/ProjectRepository.ts`
- `infrastructure/database/repositories/GraphRepository.ts`
- `infrastructure/SecretsService.ts`

**Steps:**

1. Create `SecretsService.ts` — encrypt/decrypt via `crypto.createCipheriv` (AES-256-GCM), key from `SECRETS_ENCRYPTION_KEY` env var
2. Create `ProjectModel.ts` — Mongoose schema, `timestamps: true` (updatedAt = lastModified), visibility enum
3. Create `GraphModel.ts` — nested schemas: NodeParamsSchema → NodeDataSchema → NodeSchema, EdgeSchema, ViewportSchema
4. Create `ProjectRepository.ts` with `toProject()` mapper
5. Create `GraphRepository.ts` with `toGraph()` mapper; encrypt secrets on write, decrypt on read via `SecretsService`

---

## Phase 3: Application Layer & DI Wiring

**Objective:** Add REST routes for projects and graphs, register services in the DI container, expose via Fastify decorators.

**Files to Create/Modify:**

- `Application/plugins/container.ts` — add projectService, graphService decorators + type augmentation
- `Application/routes/index.ts` — register project + graph routes
- `Application/routes/projects/projects.schemas.ts`
- `Application/routes/projects/projects.routes.ts`
- `Application/routes/graphs/graphs.schemas.ts`
- `Application/routes/graphs/graphs.routes.ts`

**Steps:**

1. Write JSON schemas for project and graph
2. Implement project routes (JWT protected): GET /api/projects, GET /api/projects/:id, POST /api/projects, PATCH /api/projects/:id, DELETE /api/projects/:id
3. Implement graph routes (JWT protected): GET /api/projects/:projectId/graph, PUT /api/projects/:projectId/graph
4. Augment FastifyInstance types in container.ts + wire new services
5. Register routes in routes/index.ts
