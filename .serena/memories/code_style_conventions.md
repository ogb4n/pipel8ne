# Code Style & Conventions — pipel8ne

## Language & Module System
- **TypeScript strict mode** (`strict: true`) everywhere.
- Backend: **ESM native** (`"type": "module"` in package.json), `module: Node16`.
  - **All Domain imports must use `.js` extensions** (e.g. `import { User } from "./User.js"`).
- Frontend: standard ESM via Vite (no extension needed).

## Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Domain entity (interface) | `PascalCase.ts` | `User.ts`, `Graph.ts` |
| Repository port | `I<Name>Repository.ts` | `IUserRepository.ts` |
| Other port/interface | `I<Name>.ts` | `ITokenService.ts` |
| Domain service | `<Name>Service.ts` | `UserService.ts` |
| Infra repository | `<Name>Repository.ts` | `UserRepository.ts` |
| Mongoose model | `<Name>Model.ts` | `UserModel.ts` |
| Route handler file | `<feature>.routes.ts` | `auth.routes.ts` |
| JSON Schema file | `<feature>.schemas.ts` | `auth.schemas.ts` |
| Domain subdirectories | `lowercase/` | `domain/user/`, `domain/graph/` |
| Classes | `PascalCase` | `class AuthService` |
| Interfaces | `PascalCase` (I prefix) | `interface IUserRepository` |
| React components | `PascalCase` | `CicdNodeCard.tsx` |
| React pages | `Page<Name>.tsx` | `PageProjects.tsx` |
| React hooks | `use<Name>.ts` | `usePipeline.ts` |

## Domain Coding Rules
- Entities: **TypeScript interfaces only**, no ORM decorators.
- `id` field: always `string`.
- Dates: always `Date`, not `string`.
- Services: **constructor injection** with `private readonly` ports.
- Errors: extend `Error`, add `readonly type` or `readonly code`. No HTTP codes.

## Infrastructure Coding Rules
- Repositories: `class Xxx implements IXxx`. Private `toXxx(doc)` mapper.
- Mongoose models: define `IXxxDocument extends Document` + `mongoose.Schema`. No business logic.

## Application Coding Rules
- Handlers: call service method → catch domain errors via `instanceof` → map to HTTP code.
- JSON Schemas: `additionalProperties: false` on all request bodies.
- DI: services are `app.decorate()`'d via `container.ts`; never instantiated inside routes.

## React / Frontend Conventions
- Functional components with hooks only (no class components).
- State management via React Context (`AuthContext`, `ThemeContext`).
- Dark/light theme persisted in `localStorage`.
- Graph editor uses `@xyflow/react` with custom node types in `Components/Graph/`.

## Absolute Rules (from ARCHITECTURE.md)
- Domain NEVER imports Fastify, Mongoose, argon2, or any concrete implementation.
- HTTP handlers NEVER contain business logic.
- Domain errors NEVER contain HTTP status codes.
- Every repository MUST have a private `toXxx()` mapper.
- `additionalProperties: false` on ALL JSON Schema bodies.
- Services injected via constructor, never instantiated in routes.
- New services exposed via `app.decorate()` in `container.ts` only.
- Backend Domain imports use `.js` extensions (ESM).
