# Plan: Admin Users Settings Panel

Add a "Utilisateurs" settings section visible only to admins. Covers role system (admin/user), user management (list, delete with confirmation, role toggle), and a persisted registration enable/disable toggle.

## Phases

### Phase 1: Add `role` to User domain & database

- **Objective:** Introduce `role: "admin" | "user"` on the User model.
- **Files/Functions to Modify/Create:**
  - `backend/src/Domain/user/User.ts` — add `role` field
  - `backend/src/Infrastructure/database/models/` — add `role` to Mongoose schema (default `"user"`)
  - `backend/src/Infrastructure/JwtTokenService.ts` — include `role` in JWT payload
  - `backend/src/Domain/auth/AuthService.ts` — pass `role` when building token payload
  - `webapp/src/Api/types.ts` — add `role` to frontend User type
  - `webapp/src/Context/AuthContext.tsx` — expose `isAdmin`
- **Steps:**
  1. Add `role: "admin" | "user"` to User interface and PublicUser type
  2. Update Mongoose schema with `role`, default `"user"`
  3. Include `role` in JWT payload
  4. Update AuthService login/register to pass role consistently
  5. Update frontend User type and AuthContext

### Phase 2: Admin middleware + user management routes + persisted registration toggle

- **Objective:** Admin-only guard; user PATCH (role update); SystemSettings in MongoDB for registration toggle.
- **Files/Functions to Modify/Create:**
  - `backend/src/Application/plugins/adminGuard.ts` (new)
  - `backend/src/Application/routes/users/index.ts` — apply adminGuard, add PATCH /api/users/:id for role update
  - `backend/src/Infrastructure/database/models/SystemSettings.ts` (new) — Mongoose model `{ registrationEnabled: Boolean }`
  - `backend/src/Infrastructure/SystemSettingsService.ts` (new) — get/set registrationEnabled from DB
  - `backend/src/Application/routes/admin/index.ts` (new) — GET/PATCH /api/admin/settings
  - `backend/src/Domain/auth/AuthService.ts` — check registrationEnabled at start of register()
  - `backend/src/Domain/errors.ts` — add RegistrationDisabledError
  - `backend/src/Application/routes/index.ts` — register admin routes
- **Steps:**
  1. Create adminGuard Fastify hook
  2. Apply adminGuard to user management routes; add PATCH for role update
  3. Create SystemSettings Mongoose model (singleton document)
  4. Create SystemSettingsService with getSettings/updateSettings
  5. Create admin settings routes
  6. Add RegistrationDisabledError and check in AuthService.register
  7. Register admin routes

### Phase 3: Frontend API client + Users settings section

- **Objective:** Add API calls and render the "Utilisateurs" section in PageSettings.tsx.
- **Files/Functions to Modify/Create:**
  - `webapp/src/Api/client.ts` — add getUsers, deleteUser, updateUser (role), getAdminSettings, updateAdminSettings
  - `webapp/src/Pages/PageSettings.tsx` — add "users" section gated by isAdmin
- **Steps:**
  1. Add admin/user API functions to client
  2. Add "users" to sidebar in PageSettings, visible only for admins
  3. Build Users UI: user table with role toggle and delete (confirmation modal), registration toggle

### Phase 4: First admin bootstrap

- **Objective:** First registered user automatically becomes admin.
- **Files/Functions to Modify/Create:**
  - `backend/src/Domain/user/IUserRepository.ts` — add countUsers()
  - `backend/src/Infrastructure/database/repositories/UserRepository.ts` — implement countUsers()
  - `backend/src/Domain/auth/AuthService.ts` — assign role "admin" if count is 0
- **Steps:**
  1. Add countUsers() to IUserRepository and implementation
  2. In AuthService.register, check count and assign role accordingly
