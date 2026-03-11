# Project Structure — pipel8ne

## Overview
Full-stack CI/CD pipeline management application. Monorepo with a **Node.js/Fastify backend** and a **React/Vite frontend** (webapp).

## Root Layout
```
pipel8ne/
├── backend/          ← Fastify API server (Node.js + TypeScript, ESM)
├── webapp/           ← React 19 SPA (Vite 7 + TypeScript + Tailwind CSS 4)
├── bruno/            ← Bruno API client collections (REST testing)
├── plans/            ← Feature planning documents (Markdown)
├── docker-compose.dev.yml   ← Dev: MongoDB only (backend runs locally)
├── docker-compose.yml       ← Prod: full stack
└── Dockerfile               ← Production image
```

## Backend Structure (`backend/src/`)
Hexagonal architecture — 3 strict layers:

```
src/
├── index.ts                     ← Entry point, plugin registration order
├── Application/
│   ├── plugins/
│   │   ├── container.ts         ← DI container: instantiates all services/repos
│   │   ├── jwt.ts               ← @fastify/jwt + app.authenticate decorator
│   │   ├── swagger.ts           ← OpenAPI docs (dev only)
│   │   └── static.ts            ← Static files + SPA fallback (registered last)
│   └── routes/
│       ├── index.ts             ← Central route registration
│       ├── auth/                ← auth.routes.ts + auth.schemas.ts
│       ├── graphs/              ← graphs.routes.ts + graphs.schemas.ts
│       ├── health/              ← health.routes.ts
│       ├── projects/            ← projects.routes.ts + projects.schemas.ts
│       └── users/               ← users.routes.ts + users.schemas.ts
├── Domain/
│   ├── errors.ts                ← Generic domain errors (NotFoundError, ForbiddenError…)
│   ├── auth/
│   │   ├── AuthService.ts       ← login, register, logout, refresh logic
│   │   ├── auth.constants.ts
│   │   ├── IRefreshTokenRepository.ts
│   │   ├── ITokenService.ts
│   │   └── RefreshToken.ts
│   ├── graph/
│   │   ├── Graph.ts, Edge.ts, Node.ts, NodeData.ts, NodeParams.ts
│   │   ├── GraphService.ts
│   │   ├── IGraphRepository.ts
│   │   ├── ISecretsService.ts
│   │   ├── nodes/               ← BaseNode, BuildNode, ConditionNode, DeployNode,
│   │   │                           DockerNode, GitNode, NotificationNode,
│   │   │                           ShellCommandNode, TestNode, TriggerNode, NodeFactory
│   │   └── visitors/            ← INodeVisitor, ExecutionPlanVisitor, ValidationVisitor
│   ├── project/
│   │   ├── Project.ts
│   │   ├── IProjectRepository.ts
│   │   └── ProjectService.ts
│   └── user/
│       ├── User.ts, PublicUser.ts
│       ├── IUserRepository.ts, IUserReader.ts
│       └── UserService.ts
└── Infrastructure/
    ├── IJwtSigner.ts
    ├── JwtTokenService.ts       ← implements ITokenService via @fastify/jwt
    ├── SecretsService.ts        ← AES-256-GCM encryption, implements ISecretsService
    └── database/
        ├── client.ts            ← connectDatabase / disconnectDatabase
        ├── models/              ← GraphModel, ProjectModel, RefreshTokenModel, UserModel
        └── repositories/        ← GraphRepository, ProjectRepository,
                                    RefreshTokenRepository, UserRepository
```

## Frontend Structure (`webapp/src/`)
```
src/
├── App.tsx                     ← Root with React Router routes
├── main.tsx                    ← ReactDOM mount
├── Api/
│   ├── client.ts               ← fetch-based API client
│   └── types.ts                ← Shared API types
├── Components/
│   ├── Graph/
│   │   ├── GraphActionsContext.tsx  ← React context exposing selectNode to child nodes
│   │   ├── nodeConfig.ts            ← Node palette configuration (strategy pattern)
│   │   ├── NodeConfigPanel.tsx      ← Side panel for configuring a selected node
│   │   ├── NodePalette.tsx          ← Drag-and-drop node palette
│   │   ├── nodeTypes.ts             ← @xyflow/react node type mapping
│   │   └── nodes/CicdNodeCard.tsx   ← Custom node card with n8n-style hover toolbar
│   ├── ProtectedRoute.tsx      ← Auth guard HOC
│   └── ThemeToggle.tsx
├── Context/
│   ├── AuthContext.tsx          ← JWT auth state + login/logout
│   └── ThemeContext.tsx         ← dark/light mode with localStorage
├── hooks/
│   └── usePipeline.ts          ← All graph state: nodes, edges, selectedNodeId,
│                                  addNode, save, selectNode, updateNodeData…
└── Pages/
    ├── PageGraph.tsx            ← Graph editor — provides GraphActionsContext
    ├── PageLogin.tsx
    ├── PagePipelines.tsx
    ├── PageProjects.tsx
    └── ...
```

## Key Domain Features
- **auth**: Registration, login, logout, JWT refresh tokens
- **user**: CRUD user management
- **project**: Project management (owner, visibility)
- **graph**: CI/CD pipeline as a directed graph with typed nodes (Git, Build, Test, Deploy, Docker, Condition, Shell, Notification, Trigger) and visitors (validation, execution plan)

## Graph UI Features (as of March 2026)
- Node palette (drag/click to add nodes)
- `CicdNodeCard`: single component for all node types, n8n-style hover toolbar (⚙ Configure, 🗑 Delete)
- `NodeConfigPanel`: right-side panel (360px) with type-specific param forms, opens on node click or ⚙ button
- `GraphActionsContext`: shares `selectNode` callback from `PageGraph` down to `CicdNodeCard` without prop drilling
- `usePipeline` hook: exposes `selectedNodeId`, `selectNode`, `updateNodeData` in addition to standard RF state
