# Suggested Commands — pipel8ne

> System: Windows (PowerShell). Use `;` to chain commands, not `&&`.

## Development Startup (typical flow)

### 1. Start MongoDB (Docker)
```powershell
# From project root
docker compose -f docker-compose.dev.yml up -d
```

### 2. Start Backend
```powershell
cd backend
npm run dev
# Uses: cross-env NODE_ENV=development tsx watch src/index.ts
# Runs on: http://localhost:3000
# Swagger UI (dev): http://localhost:3000/docs
```

### 3. Start Frontend
```powershell
cd webapp
npm run dev
# Uses: vite
# Default: http://localhost:5173
# Proxies /api → http://localhost:3000
```

## Backend Commands (in `backend/`)
| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Run compiled production build |

## Frontend Commands (in `webapp/`)
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run tests with Vitest |

## Docker Commands (from root)
```powershell
# Dev (MongoDB only)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down

# Production (full stack)
docker compose up -d
docker compose down
```

## Git Utilities (PowerShell)
```powershell
git status
git log --oneline -10
git diff HEAD
Get-ChildItem -Recurse    # like ls -R
Select-String "pattern" -Path "**/*.ts"  # like grep
```

## Notes
- No linting or formatting scripts defined in package.json yet (no ESLint/Prettier config found)
- No test scripts in backend (no test framework configured yet)
- Backend dependency installation: `cd backend ; npm install`
- Frontend dependency installation: `cd webapp ; npm install`
