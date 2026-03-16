# Task Completion Checklist — pipel8ne

## After implementing a backend feature

1. **Architecture compliance**
   - Domain layer has no imports from Fastify, Mongoose, argon2, or any infra lib.
   - All new domain interfaces use `.js` extensions in imports (ESM).
   - Repository has a private `toXxx()` mapper — no Mongoose types leaking into Domain.
   - Handlers contain zero business logic.
   - New service is wired via `app.decorate()` in `container.ts`.

2. **Schema validation**
   - All request bodies in JSON Schemas have `additionalProperties: false`.
   - `response` schemas defined for relevant HTTP codes.

3. **Error handling**
   - Domain errors (e.g. `NotFoundError`, `ForbiddenError`) are caught in handlers and translated to appropriate HTTP codes via `instanceof`.

4. **Route registration**
   - New route module registered in `Application/routes/index.ts`.

5. **Build check**
   ```powershell
   cd backend ; npm run build
   ```
   - Must compile without TypeScript errors.

6. **Dev server check**
   ```powershell
   cd backend ; npm run dev
   ```
   - Server starts cleanly, no runtime errors.

7. **Manual API test**
   - Test endpoints using Bruno collections in `bruno/` or Swagger UI at `http://localhost:3000/docs`.

## After implementing a frontend feature

1. **Build check**
   ```powershell
   cd webapp ; npm run build
   ```
   - Must pass TypeScript check + Vite build.

2. **Tests** (if applicable)
   ```powershell
   cd webapp ; npm test
   ```

3. **Dev server**
   ```powershell
   cd webapp ; npm run dev
   ```
   - Verify feature works end-to-end via browser.

## No linting/formatting scripts configured yet
- No ESLint, no Prettier scripts in package.json at time of onboarding (March 2026).
- If added in the future, run them before committing.
- Current branch: `dev` (default: `main`), repo: `ogb4n/pipel8ne`.
