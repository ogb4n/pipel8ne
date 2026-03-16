# Plan: Add Jobs to Graphs & Pipelines

Introduce a `Job` layer between `Graph` and `Node`. A Graph has `jobs[]` (each containing `steps[]` = the current nodes + internal edges) and `jobEdges[]` (ordering between jobs). All steps in a job execute before moving to the next job. Edges between jobs define execution order.

**Phases (5)**

1. **Phase 1: Domain — Job entity & Graph update**
   - **Objective:** Introduce `Job` interface, update `Graph`, `IGraphRepository`, `GraphService`, `ValidationVisitor`, `ExecutionPlanVisitor`
   - **Files:** `Domain/graph/Job.ts` (new), `Graph.ts`, `IGraphRepository.ts`, `GraphService.ts`, `visitors/ValidationVisitor.ts`, `visitors/ExecutionPlanVisitor.ts`

2. **Phase 2: Infrastructure — Mongoose schema & GraphRepository**
   - **Objective:** Add `JobSchema` to `GraphModel`, update `GraphRepository` to encrypt/decrypt per job steps
   - **Files:** `Infrastructure/database/models/GraphModel.ts`, `Infrastructure/database/repositories/GraphRepository.ts`

3. **Phase 3: API — Routes & body schemas**
   - **Objective:** Update Fastify route body/response schemas to reflect new `{ jobs[], jobEdges[] }` structure
   - **Files:** `Application/routes/graphs/index.ts` (or handler files)

4. **Phase 4: Frontend — Types, client, usePipeline hook, React Flow canvas**
   - **Objective:** `Job` type in `types.ts`, update `client.ts`, refactor `usePipeline.ts` (Group nodes), create `JobGroupNode.tsx`, add "Add Job" in `PageGraph.tsx`
   - **Files:** `Api/types.ts`, `Api/client.ts`, `hooks/usePipeline.ts`, `Pages/PageGraph.tsx`, `Components/Graph/nodes/JobGroupNode.tsx`, `Components/Graph/nodeTypes.ts`

5. **Phase 5: Backward compat & YAML export**
   - **Objective:** Detect legacy flat graphs (nodes without jobs), auto-wrap in default job. Update `exportToYaml` to GitHub-Actions-like format with `jobs:`.
   - **Files:** `hooks/usePipeline.ts`

**Design decisions:**

- `runsOn`: free string field on Job
- TriggerNode: remains a step inside any job; ValidationVisitor still enforces exactly 1 per graph
- `jobEdges[]`: same `Edge` interface, `source`/`target` = `job.id` — defines execution order
- All steps in a job execute sequentially (per existing node edges); jobs execute in topological order per `jobEdges`
