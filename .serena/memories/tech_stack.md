# Tech Stack — pipel8ne

## Backend
| Concern | Library / Tool | Version |
|---|---|---|
| Runtime | Node.js (ESM, `"type": "module"`) | ≥18 |
| Language | TypeScript | ^5.0 |
| HTTP framework | Fastify | ^5.0 |
| Auth | @fastify/jwt | ^10.0 |
| Static serving | @fastify/static | ^8.0 |
| API docs | @fastify/swagger + @fastify/swagger-ui | ^9 / ^5 |
| Database | MongoDB via Mongoose | ^8.0 |
| Password hashing | argon2 | ^0.44 |
| Env vars | dotenv | ^16 |
| Logging | pino (built-in Fastify) + pino-pretty (dev) | - |
| DI | Manual constructor injection + fastify-plugin | ^5.0 |
| Dev runner | tsx watch | ^4.0 |
| Build | tsc (Node16 module, ES2022 target) | - |

## Frontend
| Concern | Library / Tool | Version |
|---|---|---|
| Language | TypeScript | ^5.9 |
| Framework | React | ^19 |
| Bundler | Vite | ^7.3 |
| Routing | React Router DOM | ^7.13 |
| UI styling | Tailwind CSS | ^4 |
| Graph canvas | @xyflow/react | ^12.10 |
| Testing | Vitest + React Testing Library + jsdom | latest |

## Infrastructure / DevOps
- **Database**: MongoDB 7 (Docker in dev, `docker-compose.dev.yml`)
- **Dev proxy**: Vite dev server proxies `/api` → `localhost:3000`
- **Production**: Docker multi-service (`docker-compose.yml`) + single `Dockerfile`
- **API testing**: Bruno collections in `bruno/`

## TypeScript Configuration (backend)
- `module: Node16`, `moduleResolution: node16` — requires `.js` extensions in imports (ESM)
- `target: ES2022`, `strict: true`, `esModuleInterop: true`
