# API Reference

All endpoints are prefixed with `/api`. All routes except auth endpoints require a valid JWT Bearer token.

A Swagger UI is available at `http://localhost:3000/docs` when running in development mode (`NODE_ENV=development`).

---

## Authentication

### POST /api/auth/register
Create a new account.

**Body**
```json
{ "email": "user@example.com", "password": "secret", "name": "Alice" }
```

**Response 201**
```json
{ "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

---

### POST /api/auth/login
Authenticate and receive tokens.

**Body**
```json
{ "email": "user@example.com", "password": "secret" }
```

**Response 200**
```json
{ "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

---

### POST /api/auth/refresh
Exchange a refresh token for a new access token.

**Body**
```json
{ "refreshToken": "..." }
```

**Response 200**
```json
{ "accessToken": "...", "refreshToken": "..." }
```

---

### POST /api/auth/logout
Invalidate the refresh token.

**Body**
```json
{ "refreshToken": "..." }
```

**Response 200** `{ "message": "Logged out" }`

---

### GET /api/auth/registration-status
Check if new user registration is enabled.

**Response 200** `{ "registrationEnabled": true }`

---

## Projects

### GET /api/projects
List all projects visible to the authenticated user.

### GET /api/projects/public
List all public projects.

### GET /api/projects/mine
List projects owned by the authenticated user.

### GET /api/projects/:id
Get a project by ID.

### POST /api/projects
Create a project.

**Body**
```json
{
  "name": "my-project",
  "path": "org/repo",
  "provider": "github",
  "visibility": "private"
}
```

**Response 201** — created project object.

### PATCH /api/projects/:id
Update a project. All fields optional.

**Body**
```json
{
  "name": "new-name",
  "path": "org/new-repo",
  "provider": "gitlab",
  "visibility": "public"
}
```

### DELETE /api/projects/:id
Delete a project. **204** on success.

---

## Pipelines

Pipelines are scoped to a project.

### GET /api/projects/:projectId/pipelines
List all pipelines for a project.

### POST /api/projects/:projectId/pipelines
Create a pipeline.

**Body**
```json
{ "name": "build-and-deploy" }
```

**Response 201** — created pipeline (Graph) object.

### GET /api/projects/:projectId/pipelines/:pipelineId
Get a pipeline by ID.

### PUT /api/projects/:projectId/pipelines/:pipelineId
Save the full pipeline state (stages, jobs, steps).

**Body**
```json
{
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "stages": [ ... ],
  "stageEdges": [ ... ]
}
```

**Response 200** — updated pipeline object.

### GET /api/projects/:projectId/pipelines/:pipelineId/execution-plan
Compute the execution order without running anything (dry-run). Returns a topologically sorted list of stages and jobs.

**Response 200** — array of execution plan objects.

### DELETE /api/projects/:projectId/pipelines/:pipelineId
Delete a pipeline. **204** on success.

---

## Credentials

Stored credentials are encrypted at rest (AES-256-GCM). The raw value is never returned after creation.

### GET /api/credentials
List credentials for the authenticated user (values redacted).

### POST /api/credentials
Store a new credential.

**Body**
```json
{
  "provider": "github",
  "label": "my-github-token",
  "value": "ghp_..."
}
```

### PUT /api/credentials/:id
Update a credential's label or value.

### DELETE /api/credentials/:id
Delete a credential. **204** on success.

---

## API Keys

### GET /api/api-keys
List API keys for the authenticated user.

### POST /api/api-keys
Create an API key. The `rawKey` field is only returned once.

**Body**
```json
{ "name": "ci-bot" }
```

**Response 201**
```json
{
  "id": "...",
  "name": "ci-bot",
  "prefix": "p8n_...",
  "rawKey": "p8n_...",
  "isRevoked": false,
  ...
}
```

### POST /api/api-keys/:id/revoke
Revoke an API key (marks it as revoked, does not delete).

### DELETE /api/api-keys/:id
Permanently delete an API key.

---

## Users

### GET /api/users/me
Get the authenticated user's profile.

### GET /api/users
List all users. **Admin only.**

### POST /api/users
Create a user. **Admin only.**

**Body**
```json
{
  "email": "user@example.com",
  "password": "secret",
  "name": "Bob",
  "role": "user"
}
```

### PATCH /api/users/:id
Update a user's role. **Admin only.**

**Body**
```json
{ "role": "admin" }
```

### DELETE /api/users/:id
Delete a user. **Admin only.**

---

## Admin

### GET /api/admin/settings
Get global settings. **Admin only.**

**Response 200** `{ "registrationEnabled": true }`

### PATCH /api/admin/settings
Update global settings. **Admin only.**

**Body**
```json
{ "registrationEnabled": false }
```

---

## HTTP status codes

| Code | Meaning                                         |
|---|---|
| 200  | OK                                              |
| 201  | Created                                         |
| 204  | No content (successful delete)                  |
| 400  | Validation error                                |
| 401  | Unauthenticated (missing or invalid token)      |
| 403  | Forbidden (authenticated but not authorized)    |
| 404  | Resource not found                              |
| 500  | Unexpected server error                         |
