# Plan : Moteur CI/CD — pipel8ne

> Audit du codebase existant + feuille de route complète pour transformer pipel8ne en un moteur CI/CD de type n8n.
> Établi le 6 mars 2026.

---

## 1. État des lieux — ce qui existe déjà

### Backend ✅

| Domaine | Couverture |
|---------|-----------|
| **Auth** | Complète — register, login, refresh, logout. JWT (`@fastify/jwt`), hachage argon2, refresh token persisté avec hash SHA-256, TTL 7j avec index MongoDB TTL |
| **Users** | List, get by ID, delete. `updateById` implémenté en infra mais **sans route HTTP exposée** |
| **Projects** | CRUD complet — public/privé, ownership, `ForbiddenError` si non-propriétaire |
| **Graphs / Pipelines** | CRUD complet — sauvegarde du graph React Flow (nodes, edges, viewport). Secrets de nœuds chiffrés AES-256-GCM |
| **Infrastructure** | MongoDB/Mongoose, JWT, `SecretsService` AES-256-GCM, architecture hexagonale respectée |
| **API** | Schémas JSON Fastify + Swagger opérationnels |

### Webapp ✅

| Feature | Couverture |
|---------|-----------|
| Auth | Login / register, `AuthContext` avec persistance localStorage, refresh automatique sur 401 |
| Projets | Liste, création, suppression |
| Pipelines | Liste, création, suppression |
| Éditeur | React Flow complet — drag & drop, connexion entre nœuds, sauvegarde, minimap, dark mode |
| Navigation | Routing imbriqué `/projects/:id/pipelines/:id`, protected routes |

---

## 2. Ce qui manque entièrement

### 2.1 Core CI/CD — bloquant

| # | Manquant | Détail |
|---|----------|--------|
| 1 | **Types de nœuds** | Les nœuds sont 100 % génériques (`label`, `params`). Aucun catalogue de steps CI/CD (git-checkout, docker-build, run-script…) |
| 2 | **Moteur d'exécution** | Aucune entité `PipelineRun` / `StepRun`, aucune state machine, aucun runner |
| 3 | **Infrastructure Docker** | Aucune intégration dockerode / Docker Socket, aucune gestion de containers |
| 4 | **Logs temps réel** | Aucun WebSocket / SSE, aucun stockage de logs par step/run |
| 5 | **Triggers** | Aucun (manuel, webhook GitHub/GitLab, cron, API REST) |
| 6 | **API des runs** | Zéro route pour déclencher, historiser ou annuler un run |

### 2.2 Frontend manquant

| # | Manquant |
|---|----------|
| 7 | Panneau de configuration de nœud — aucun formulaire par type, aucun éditeur env/secrets |
| 8 | UI Runs — aucune page d'historique, aucun log live, aucun bouton "Run Pipeline" |
| 9 | UI Triggers — aucune configuration de trigger par pipeline |

### 2.3 Secondaire

| # | Manquant |
|---|----------|
| 10 | Route `PUT /api/users/:id` — `updateById` existe en repo mais n'est pas exposé |
| 11 | Secrets au niveau projet (actuellement uniquement par nœud dans le graph) |
| 12 | Intégration Git réelle (OAuth GitHub/GitLab, clone, informations de commit dans les runs) |
| 13 | RBAC / équipes (ownership `ownerId` simple, pas de partage de projet) |
| 14 | Notifications de fin de run (Slack, email, webhook callback) |
| 15 | Artefacts de build (stockage, téléchargement) |
| 16 | Overlay statut d'exécution par nœud dans l'éditeur graphe |

---

## 3. Décisions d'architecture

| Sujet | Décision |
|-------|----------|
| Exécution des steps | **Docker containers** via dockerode |
| Triggers supportés | **Les 4** : manuel (UI), webhook GitHub/GitLab, cron, API REST |
| Logs streaming | **WebSocket** (`@fastify/websocket`) + stockage en base (tableau de lignes par `StepRun`) |
| Ordonnancement | Topological sort du DAG de nœuds → exécution séquentielle ou parallèle des steps sans dépendance |
| Priorité MVP | UI Runs + Logs live (implique Phases 1, 4, 6 d'abord) |
| Sécurité | Hors scope pour l'instant |

---

## 4. Plan d'implémentation — 10 phases

L'ordre respecte la règle **Domain → Infrastructure → Application** de l'architecture hexagonale.

---

### Phase 1 — Domain : Run Engine

> Aucune dépendance externe. Peut démarrer immédiatement.

```
domain/run/
├── RunStatus.ts              ← type RunStatus = "pending" | "queued" | "running" | "success" | "failure" | "cancelled"
├── PipelineRun.ts            ← interface PipelineRun { id, pipelineId, projectId, status, triggeredBy, triggerType, startedAt, finishedAt?, commitSha? }
├── StepRun.ts                ← interface StepRun { id, runId, nodeId, nodeName, status, startedAt, finishedAt?, exitCode?, logs: string[] }
├── IPipelineRunRepository.ts ← create, findById, findByPipelineId, updateStatus, cancel
├── IStepRunRepository.ts     ← create, findByRunId, updateStatus, appendLog
└── PipelineRunService.ts     ← trigger(), cancel(), getHistory(), getDetail()
```

**Erreurs domaine à ajouter dans `domain/errors.ts` :**
- `RunAlreadyRunningError`
- `RunNotCancellableError`

---

### Phase 2 — Domain : Node Types + Triggers

> Peut démarrer en parallèle avec la Phase 1.

```
domain/nodeType/
├── NodeTypeDefinition.ts  ← interface NodeTypeDefinition { id, label, icon, description, image, paramSchema }
└── NodeTypeRegistry.ts    ← catalogue statique : git-checkout, docker-build, run-script, docker-compose, notify-slack, condition, delay

domain/trigger/
├── Trigger.ts             ← interface Trigger { id, pipelineId, type: TriggerType, config, isActive, createdAt }
├── TriggerType.ts         ← type TriggerType = "manual" | "webhook" | "cron" | "api"
├── ITriggerRepository.ts  ← create, findById, findByPipelineId, update, delete
└── TriggerService.ts      ← create, list, delete, activate, deactivate
```

**Config par type de trigger :**
- `webhook`: `{ secret: string, events: string[] }` — HMAC vérifié côté infra
- `cron`: `{ expression: string, timezone?: string }`
- `api`: `{ apiKeyHash: string }` — clé rotative

---

### Phase 3 — Infrastructure : Docker Executor

> Dépend de la Phase 1 (ports `IStepExecutor`).

```
domain/run/IStepExecutor.ts                   ← port : executeStep(stepRun, node, secrets): AsyncIterable<LogLine>

infrastructure/executor/
├── DockerExecutor.ts                          ← implements IStepExecutor via dockerode
│   ├── pull image (si absente)
│   ├── createContainer avec env vars + secrets + limites (timeout, mémoire, CPU)
│   ├── start + stream stdout/stderr → logs
│   └── collect exit code → status success|failure

infrastructure/queue/
└── RunQueue.ts                                ← BullMQ ou in-memory queue (configurable)
    ├── enqueue(pipelineRunId)
    ├── processRun(): topological sort DAG → exécute steps dans l'ordre
    └── gestion des états intermédiaires + annulation
```

**Dépendances npm à ajouter :**
```
dockerode @types/dockerode bullmq
```

---

### Phase 4 — Infrastructure : Modèles + Repositories

> Peut démarrer en parallèle avec la Phase 3.

```
infrastructure/database/
├── models/
│   ├── PipelineRunModel.ts   ← tous les champs PipelineRun + index sur pipelineId + status
│   ├── StepRunModel.ts       ← tous les champs StepRun + index sur runId + logs: [String]
│   └── TriggerModel.ts       ← tous les champs Trigger + index sur pipelineId
└── repositories/
    ├── PipelineRunRepository.ts  ← implements IPipelineRunRepository
    ├── StepRunRepository.ts      ← implements IStepRunRepository (appendLog via $push)
    └── TriggerRepository.ts      ← implements ITriggerRepository
```

---

### Phase 5 — Infrastructure : Logs WebSocket + Triggers

> Dépend de la Phase 4.

```
infrastructure/websocket/
└── LogStreamHandler.ts       ← watch MongoDB change stream sur StepRun.logs → push via WS

infrastructure/triggers/
├── WebhookHandler.ts         ← vérification HMAC (GitHub header X-Hub-Signature-256), map push/PR → PipelineRunService.trigger()
└── CronScheduler.ts          ← node-cron, charge les triggers cron actifs depuis la DB au démarrage, reschedule sur update
```

**Dépendances npm à ajouter :**
```
@fastify/websocket node-cron @types/node-cron
```

---

### Phase 6 — Application : Run API + Trigger API

> Dépend des Phases 3, 4, 5.

#### Routes Runs — `/api/projects/:projectId/pipelines/:pipelineId/runs`

| Méthode | Path | Description |
|---------|------|-------------|
| `POST` | `/` | Déclencher un run (trigger manuel ou API) |
| `GET` | `/` | Historique des runs (paginé : `?page&limit`) |
| `GET` | `/:runId` | Détail run + liste des StepRuns |
| `POST` | `/:runId/cancel` | Annuler un run en cours |
| `WS` | `/:runId/logs` | Stream logs temps réel |

#### Routes Triggers — `/api/projects/:projectId/pipelines/:pipelineId/triggers`

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/` | Liste les triggers du pipeline |
| `POST` | `/` | Créer un trigger |
| `PATCH` | `/:triggerId` | Mettre à jour / activer / désactiver |
| `DELETE` | `/:triggerId` | Supprimer |

#### Route Webhook publique (hors auth JWT)

| Méthode | Path | Description |
|---------|------|-------------|
| `POST` | `/api/webhooks/:triggerId` | Point d'entrée GitHub/GitLab, vérification HMAC |

#### DI — `container.ts`

Ajouter :
```typescript
const dockerExecutor     = new DockerExecutor();
const runQueue           = new RunQueue(dockerExecutor, stepRunRepository);
const pipelineRunService = new PipelineRunService(pipelineRunRepository, stepRunRepository, runQueue, graphService);
const triggerService     = new TriggerService(triggerRepository);

app.decorate("pipelineRunService", pipelineRunService);
app.decorate("triggerService", triggerService);
```

---

### Phase 7 — Application : Node Types API

> Peut démarrer en parallèle avec la Phase 6 (catalogue statique, pas de DB).

```
Application/routes/nodeTypes/
├── nodeTypes.routes.ts   ← GET /api/node-types → liste le catalogue
└── nodeTypes.schemas.ts  ← nodeTypeSchema: id, label, icon, description, paramSchema
```

---

### Phase 8 — Frontend : Éditeur enrichi

> Dépend de la Phase 7 (catalogue de types).

- **Type picker** au "Add Node" — remplace le nœud générique par une liste de types avec icônes
- **Panneau latéral de config** — sélectionner un nœud ouvre un formulaire dynamique :
  - Champs générés depuis `paramSchema` du type
  - Éditeur de variables d'environnement (clé / valeur)
  - Éditeur de secrets (clé / valeur masquée)
- **Overlay statut** sur chaque nœud — icône coloriée selon le dernier `StepRun` associé
- **Bouton "Run Pipeline"** dans la toolbar de `PageGraph.tsx` → `POST .../runs` → redirect vers le run
- Polling ou WS pour mettre à jour les overlays en temps réel pendant un run

---

### Phase 9 — Frontend : UI Runs *(MVP prioritaire)*

> Dépend de la Phase 6 (Run API).

**Nouvelles pages :**

```
webapp/src/Pages/
├── PageRuns.tsx        ← /projects/:projectId/pipelines/:pipelineId/runs
│   ├── Tableau historique : id, status, triggerType, triggeredBy, startedAt, durée
│   ├── Badge coloré par status (pending/running/success/failure/cancelled)
│   └── Lien vers le détail
└── PageRunDetail.tsx   ← /projects/:projectId/pipelines/:pipelineId/runs/:runId
    ├── En-tête : statut global, timestamps, déclencheur
    ├── Timeline des StepRuns avec statuts individuels
    └── Terminal scrollable connecté au WebSocket de logs (auto-scroll, copy)
```

**Modifications `App.tsx` :**
- Ajouter les deux routes
- Redirection automatique vers le run après déclenchement depuis `PageGraph`

**Modifications `Api/client.ts` et `Api/types.ts` :**
- `PipelineRun`, `StepRun`, `TriggerType` types
- `api.runs.trigger()`, `api.runs.list()`, `api.runs.getById()`, `api.runs.cancel()`
- Hook WebSocket `useRunLogs(runId)`

---

### Phase 10 — Frontend : UI Triggers

> Dépend de la Phase 6 (Trigger API).

- Onglet "Triggers" dans la vue pipeline (à côté de l'éditeur)
- **Formulaire par type :**
  - `manual` — rien à configurer, juste activer
  - `webhook` — affiche l'URL générée + champ secret, bouton "Régénérer"
  - `cron` — input expression cron + timezone + prévisualisation "Prochain déclenchement dans…"
  - `api` — affiche la clé API, bouton "Rotation de clé"
- Liste des triggers actifs avec toggle activer/désactiver

---

## 5. Tableau récapitulatif des fichiers

### À créer

| Chemin | Phase |
|--------|-------|
| `backend/src/domain/run/` (5 fichiers) | 1 |
| `backend/src/domain/nodeType/` (2 fichiers) | 2 |
| `backend/src/domain/trigger/` (4 fichiers) | 2 |
| `backend/src/infrastructure/executor/DockerExecutor.ts` | 3 |
| `backend/src/infrastructure/queue/RunQueue.ts` | 3 |
| `backend/src/infrastructure/database/models/PipelineRunModel.ts` | 4 |
| `backend/src/infrastructure/database/models/StepRunModel.ts` | 4 |
| `backend/src/infrastructure/database/models/TriggerModel.ts` | 4 |
| `backend/src/infrastructure/database/repositories/PipelineRunRepository.ts` | 4 |
| `backend/src/infrastructure/database/repositories/StepRunRepository.ts` | 4 |
| `backend/src/infrastructure/database/repositories/TriggerRepository.ts` | 4 |
| `backend/src/infrastructure/websocket/LogStreamHandler.ts` | 5 |
| `backend/src/infrastructure/triggers/WebhookHandler.ts` | 5 |
| `backend/src/infrastructure/triggers/CronScheduler.ts` | 5 |
| `backend/src/Application/routes/runs/runs.routes.ts` | 6 |
| `backend/src/Application/routes/runs/runs.schemas.ts` | 6 |
| `backend/src/Application/routes/triggers/triggers.routes.ts` | 6 |
| `backend/src/Application/routes/triggers/triggers.schemas.ts` | 6 |
| `backend/src/Application/routes/webhooks/webhooks.routes.ts` | 6 |
| `backend/src/Application/routes/nodeTypes/nodeTypes.routes.ts` | 7 |
| `backend/src/Application/routes/nodeTypes/nodeTypes.schemas.ts` | 7 |
| `webapp/src/Pages/PageRuns.tsx` | 9 |
| `webapp/src/Pages/PageRunDetail.tsx` | 9 |
| `webapp/src/Pages/PageTriggers.tsx` | 10 |

### À modifier

| Chemin | Phase | Changement |
|--------|-------|-----------|
| `backend/src/domain/errors.ts` | 1 | `RunAlreadyRunningError`, `RunNotCancellableError` |
| `backend/src/Application/plugins/container.ts` | 6 | Instancier + décorer les nouveaux services |
| `backend/src/Application/routes/index.ts` | 6 | Enregistrer les nouvelles routes |
| `backend/src/index.ts` | 5 | Enregistrer le plugin WebSocket + démarrer le CronScheduler |
| `webapp/src/App.tsx` | 9 | Ajouter les routes runs + triggers |
| `webapp/src/Api/client.ts` | 9 | Méthodes runs, triggers, hook WS |
| `webapp/src/Api/types.ts` | 9 | `PipelineRun`, `StepRun`, `Trigger`, `NodeTypeDefinition` |
| `webapp/src/Pages/PageGraph.tsx` | 8 | Bouton Run, panneau config nœud, overlays statut |

---

## 6. Dépendances npm à ajouter

### Backend

```bash
# Phase 3
npm install --save dockerode bullmq
npm install --save-dev @types/dockerode

# Phase 5
npm install --save @fastify/websocket node-cron
npm install --save-dev @types/node-cron
```

### Webapp

```bash
# Phase 9
npm install --save reconnecting-websocket
```
