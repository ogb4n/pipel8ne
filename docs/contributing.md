# Contributing

## General principles

- Follow the existing architecture — see [architecture.md](./architecture.md).
- Keep the three backend layers strictly separated: Domain → Infrastructure → Application.
- No business logic in HTTP handlers. No framework imports in the Domain.
- When adding a feature, update the relevant documentation files in `docs/`.

---

## Adding a backend feature

Always follow this order: **Domain → Infrastructure → Application**.

### 1. Domain — entity + port

Create `backend/src/Domain/<feature>/`:

- `Entity.ts` — TypeScript interface, `id` as `string`, dates as `Date`
- `IEntityRepository.ts` — repository contract (port)
- `errors.ts` or add to `Domain/errors.ts` if the feature has specific domain errors

### 2. Domain — service

Create `backend/src/Domain/<feature>/EntityService.ts`:

- Constructor receives repository and other dependencies as `private readonly`
- Inject ports, never concrete implementations
- Raise domain errors, never HTTP errors

### 3. Infrastructure — Mongoose model

Create `backend/src/Infrastructure/database/models/EntityModel.ts`:

- Interface `IEntityDocument extends Document`
- Mongoose schema
- No business logic

### 4. Infrastructure — repository

Create `backend/src/Infrastructure/database/repositories/EntityRepository.ts`:

- `class EntityRepository implements IEntityRepository`
- Private `toEntity(doc)` mapper: Mongoose → Domain type
- MongoDB-specific code is confined here

### 5. Application — DI wiring

In `backend/src/Application/plugins/container.ts`:

- Instantiate the repository and service
- Add types to `declare module "fastify" { interface FastifyInstance { ... } }`
- Expose via `app.decorate("entityService", ...)`

### 6. Application — schemas

Create `backend/src/Application/routes/<feature>/<feature>.schemas.ts`:

- JSON Schema for bodies, params, querystrings, responses
- Always use `additionalProperties: false` on request bodies

### 7. Application — routes

Create `backend/src/Application/routes/<feature>/<feature>.routes.ts`:

- `export default async function featureRoutes(app: FastifyInstance)`
- Thin handlers: validate → call service → translate domain errors to HTTP status codes

Register in `backend/src/Application/routes/index.ts`:

```typescript
await app.register(featureRoutes);
```

---

## Adding a frontend page or feature

### New page

1. Create the component in `webapp/src/Pages/PageMyFeature.tsx`
2. Add the route in `webapp/src/App.tsx`
3. If auth is required, wrap with `<ProtectedRoute>`

### New API call

Add the method to the relevant section in `webapp/src/Api/client.ts` and add the corresponding type to `webapp/src/Api/types.ts`.

### New graph node type

1. Add the type discriminant to `NodeType` in `webapp/src/Api/types.ts`
2. Add the typed params interface
3. Create the node component in `webapp/src/Components/Graph/nodes/`
4. Register it in `webapp/src/Components/Graph/nodeTypes.ts`
5. Add the node config (label, default params) in `webapp/src/Components/Graph/nodeConfig.ts`
6. Add a config panel section in `webapp/src/Components/Graph/NodeConfigPanel.tsx`
7. Mirror the type on the backend: `backend/src/Domain/graph/nodes/`

---

## Keeping documentation up to date

When making changes, update the relevant docs:

| Changed area                        | Update                              |
| ----------------------------------- | ----------------------------------- |
| API endpoints (add/remove/modify)   | `docs/api.md`                       |
| Architecture or layer structure     | `docs/architecture.md`              |
| Pipeline data model or node types   | `docs/pipeline-concepts.md`         |
| Dev setup, env vars, Docker         | `docs/development.md` + `README.md` |
| Deployment or production config     | `docs/deployment.md`                |
| Conventions, naming, patterns       | `docs/conventions.md`               |
| Project state, roadmap, route table | `docs/project-state.md`             |

---

## Commit conventions

Use conventional commit prefixes:

| Prefix      | When                                |
| ----------- | ----------------------------------- |
| `feat:`     | New feature                         |
| `fix:`      | Bug fix                             |
| `refactor:` | Code change with no behavior change |
| `docs:`     | Documentation only                  |
| `chore:`    | Tooling, deps, config               |
| `test:`     | Tests                               |
