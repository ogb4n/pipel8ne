# État du projet — pipel8ne

> Snapshot de l'état d'avancement au 19 mars 2026.
> Ce document sert de référence avant de démarrer une nouvelle feature.

---

## Vue d'ensemble

pipel8ne est un **créateur de pipeline CI/CD visuel** — l'utilisateur dessine ses pipelines par glisser-déposer sur un canvas (React Flow), les organise en Stages → Jobs → Steps, et les exporte en YAML (GitHub Actions, GitLab CI, Azure DevOps).

**Stade actuel : MVP fonctionnel** — éditeur + gestion utilisateurs + projets + pipelines persistés.

---

## Ce qui est implémenté et fonctionnel

### Backend

#### Authentification ✅

- Register / Login / Logout / Refresh token
- JWT access token (court) + refresh token persisté haché SHA-256 avec TTL 7j
- Hachage argon2, index TTL MongoDB automatique
- Premier utilisateur inscrit → admin automatiquement

#### Gestion des utilisateurs ✅

- CRUD complet (list, get by ID, create, update, delete)
- Rôles : `admin` / `user`
- Routes `/api/users/*` protégées par adminGuard

#### Projets ✅

- CRUD complet
- Visibilité `public` / `private`
- Ownership + contrôle d'accès (ForbiddenError)
- Projets publics lisibles par tous

#### Pipelines (Graphs) ✅

- CRUD complet — sauvegarde complète du graph React Flow
- Modèle 3 niveaux : **Stage → Job → Step** (GraphNode)
- `stageEdges` avec conditions (`on_success` / `on_failure` / `always`)
- `jobEdges` intra-stage
- Secrets de nodes chiffrés AES-256-GCM
- Plan d'exécution (dry-run) via `getExecutionPlan()`
- Validation via Visitor pattern (`ValidationVisitor`)
- Pattern Visitor étendu (`ExecutionPlanVisitor`)

#### Credentials & API Keys ✅

- Secrets utilisateur chiffrés AES-256-GCM
- Valeur brute jamais retournée après création
- API keys avec `rawKey` retourné une seule fois

#### Admin & Paramètres ✅

- `SystemSettings` persisté en MongoDB
- Toggle registration enable/disable
- Guard admin (`adminGuard` plugin)

#### Infrastructure ✅

- Architecture hexagonale respectée
- Mongoose + MongoDB
- `SecretsService` AES-256-GCM
- `JwtTokenService`
- `SystemSettingsService`
- Swagger UI en mode dev (`/docs`)

### Frontend

#### Auth ✅

- Login / Register
- `AuthContext` avec persistance localStorage
- Refresh automatique sur 401 avec queue anti-race
- Redirection vers `/login` si session expirée

#### Projets ✅

- Liste, création, suppression
- Visibilité public/privé

#### Pipelines ✅

- Liste par projet, création, suppression

#### Éditeur de pipeline — PageGraph ✅

- Canvas React Flow
- Drag & drop nodes et connexions
- Navigation 3 niveaux (pipeline → stage → job via drawer)
- `StepDrawer` — panel latéral pour éditer jobs et steps
- `NodeConfigPanel` — configuration par type de node
- `NodePalette` — palette de sélection des types de steps
- Sauvegarde via l'API REST
- Export YAML (GitHub Actions / GitLab CI / Azure DevOps)
- MiniMap, breadcrumb navigation, dark mode

#### Paramètres ✅

- `PageSettings` — section admin avec gestion utilisateurs
- Toggle registration (admin uniquement)
- Gestion des credentials

#### UI générale ✅

- Dark mode (détection système + toggle)
- `ProtectedRoute` pour les pages authentifiées
- Navigation principale avec branding `pipel8ne`

---

## Ce qui manque — roadmap

### Priorité haute — Core CI/CD (bloquant pour la vision)

| #   | Feature                   | Description                                                    | Plan                  |
| --- | ------------------------- | -------------------------------------------------------------- | --------------------- |
| 1   | **Moteur d'exécution**    | Lancer un pipeline, suivre son état, stocker les résultats     | `cicd-engine-plan.md` |
| 2   | **UI Runs**               | Page historique des runs, statut live                          | `cicd-engine-plan.md` |
| 3   | **Logs temps réel**       | WebSocket/SSE pour streamer les logs de chaque step            | `cicd-engine-plan.md` |
| 4   | **Bouton "Run Pipeline"** | Déclencher manuellement un pipeline depuis l'UI                | `cicd-engine-plan.md` |
| 5   | **Overlay statut**        | Affichage du statut d'exécution sur chaque node dans l'éditeur | À planifier           |

### Priorité moyenne — Intégrations plateforme

| #   | Feature                | Description                                            |
| --- | ---------------------- | ------------------------------------------------------ |
| 6   | **Connexion Git**      | OAuth GitHub/GitLab/Azure DevOps                       |
| 7   | **Sync repo**          | Push pipeline YAML directement dans une branche        |
| 8   | **Import depuis repo** | Charger un workflow YAML existant dans l'éditeur       |
| 9   | **Webhooks**           | Réception d'événements plateforme (push, PR) → trigger |
| 10  | **Triggers cron**      | Déclencher un pipeline selon une expression cron       |

### Priorité basse — Améliorations

| #   | Feature                    | Description                                     |
| --- | -------------------------- | ----------------------------------------------- |
| 11  | **Notifications de run**   | Slack/email à la fin d'un run (success/failure) |
| 12  | **Artefacts de build**     | Stockage et téléchargement des artefacts        |
| 13  | **Partage de projet**      | Inviter d'autres utilisateurs (RBAC / équipes)  |
| 14  | **Plus de types de steps** | Étendre le catalogue de nodes                   |

---

## Modèle de données actuel (Domain)

### Graph (Pipeline)

```typescript
interface Graph {
  id: string;
  projectId: string;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  stages: Stage[];
  stageEdges: Edge[];
}
```

### Stage

```typescript
interface Stage {
  id: string;
  name: string;
  jobs: Job[];
  jobEdges: Edge[];
  position: { x: number; y: number };
}
```

### Job

```typescript
interface Job {
  id: string;
  name: string;
  runsOn: string; // ex: "ubuntu-latest"
  steps: GraphNode[];
  stepEdges: Edge[];
  position: { x: number; y: number };
}
```

### GraphNode (Step)

```typescript
interface GraphNode {
  id: string;
  type: NodeType;
  positionX: number;
  positionY: number;
  data: NodeData; // label, description, params, env, secrets
}
```

### Edge

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: { condition?: "on_success" | "on_failure" | "always" };
}
```

---

## Routes API actuelles

| Method | Route                                             | Auth        | Description               |
| ------ | ------------------------------------------------- | ----------- | ------------------------- |
| POST   | `/api/auth/register`                              | —           | Inscription               |
| POST   | `/api/auth/login`                                 | —           | Connexion                 |
| POST   | `/api/auth/refresh`                               | —           | Refresh token             |
| POST   | `/api/auth/logout`                                | —           | Déconnexion               |
| GET    | `/api/auth/registration-status`                   | —           | Toggle registration       |
| GET    | `/api/projects`                                   | JWT         | Tous les projets visibles |
| GET    | `/api/projects/public`                            | JWT         | Projets publics           |
| GET    | `/api/projects/mine`                              | JWT         | Mes projets               |
| GET    | `/api/projects/:id`                               | JWT         | Projet par ID             |
| POST   | `/api/projects`                                   | JWT         | Créer un projet           |
| PATCH  | `/api/projects/:id`                               | JWT         | Mettre à jour             |
| DELETE | `/api/projects/:id`                               | JWT         | Supprimer                 |
| GET    | `/api/projects/:pId/pipelines`                    | JWT         | Pipelines du projet       |
| POST   | `/api/projects/:pId/pipelines`                    | JWT         | Créer un pipeline         |
| GET    | `/api/projects/:pId/pipelines/:id`                | JWT         | Pipeline par ID           |
| PUT    | `/api/projects/:pId/pipelines/:id`                | JWT         | Sauvegarder le pipeline   |
| GET    | `/api/projects/:pId/pipelines/:id/execution-plan` | JWT         | Plan d'exécution          |
| DELETE | `/api/projects/:pId/pipelines/:id`                | JWT         | Supprimer                 |
| GET    | `/api/credentials`                                | JWT         | Mes credentials           |
| POST   | `/api/credentials`                                | JWT         | Créer un credential       |
| PUT    | `/api/credentials/:id`                            | JWT         | Mettre à jour             |
| DELETE | `/api/credentials/:id`                            | JWT         | Supprimer                 |
| GET    | `/api/api-keys`                                   | JWT         | Mes API keys              |
| POST   | `/api/api-keys`                                   | JWT         | Créer une API key         |
| DELETE | `/api/api-keys/:id`                               | JWT         | Révoquer                  |
| GET    | `/api/users`                                      | JWT + Admin | Tous les utilisateurs     |
| POST   | `/api/users`                                      | JWT + Admin | Créer un utilisateur      |
| GET    | `/api/users/:id`                                  | JWT + Admin | Utilisateur par ID        |
| PATCH  | `/api/users/:id`                                  | JWT + Admin | Mettre à jour             |
| DELETE | `/api/users/:id`                                  | JWT + Admin | Supprimer                 |
| GET    | `/api/admin/settings`                             | JWT + Admin | Paramètres système        |
| PATCH  | `/api/admin/settings`                             | JWT + Admin | Mettre à jour paramètres  |
| GET    | `/api/health`                                     | —           | Health check              |

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable                 | Obligatoire | Description                                   |
| ------------------------ | ----------- | --------------------------------------------- |
| `DATABASE_URL`           | Oui         | URL MongoDB                                   |
| `JWT_SECRET`             | Oui         | Secret JWT (64+ chars hex)                    |
| `SECRETS_ENCRYPTION_KEY` | Oui         | Clé AES-256 (32 bytes = 64 chars hex)         |
| `NODE_ENV`               | Non         | `development` active Swagger + logs détaillés |
| `PORT`                   | Non         | Port HTTP (défaut: 3000)                      |

### Frontend (`webapp/.env`)

| Variable            | Obligatoire | Description                                        |
| ------------------- | ----------- | -------------------------------------------------- |
| `VITE_API_BASE_URL` | Non         | URL du backend (défaut: proxy vers localhost:3000) |

---

## Commandes de développement

```bash
# Base de données seule (dev local)
docker compose -f docker-compose.dev.yml up -d

# Backend (watch mode)
cd backend && npm run dev

# Frontend (Vite dev server + proxy)
cd webapp && npm run dev

# Stack complète (production)
cd webapp && npm run build
docker compose up -d
```

---

## Plans disponibles

| Fichier                                     | Sujet                                            | Statut            |
| ------------------------------------------- | ------------------------------------------------ | ----------------- |
| `plans/integrate-pipeline-entities-plan.md` | Intégration entities pipeline dans l'archi hexa  | **Implémenté**    |
| `plans/admin-users-settings-plan.md`        | Panel admin, rôles, registration toggle          | **Implémenté**    |
| `plans/jobs-in-graphs-plan.md`              | Couche Job entre Graph et Node                   | **Implémenté**    |
| `plans/stages-pipeline-plan.md`             | Couche Stage (3 niveaux Stage→Job→Step)          | **Implémenté**    |
| `plans/pipeline-editor-refonte-plan.md`     | Refonte éditeur (StageLane, JobCard, StepDrawer) | **Implémenté**    |
| `plans/cicd-engine-plan.md`                 | Moteur d'exécution, runs, logs temps réel        | **À implémenter** |
