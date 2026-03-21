# Conventions & pratiques du projet — pipel8ne

> Document de référence unique. Toute contribution au projet doit respecter les règles décrites ici.
> Pour l'architecture technique détaillée, voir [architecture.md](./architecture.md).
> Pour l'ajout de features, voir [contributing.md](./contributing.md).

---

## 1. Vision du projet

**pipel8ne** est un créateur de pipeline CI/CD visuel — pense n8n, mais pour les workflows CI/CD.
L'utilisateur construit ses pipelines par glisser-déposer sur un canvas, les organise en **Stages → Jobs → Steps**, et peut les exporter en YAML pour GitHub Actions, GitLab CI ou Azure DevOps.

### Identité visuelle & branding

- Nom stylisé : `pipel<b>8</b>ne` (le `8` mis en valeur — rappelle l'infini, le cycle, le pipeline)
- Palette : **violet profond** pour les stages (`#4c1d95`), **indigo/bleu** pour les jobs, neutres pour les steps
- Design system : Tailwind CSS, dark mode natif (détection système + toggle manuel)
- Style : compact, professionnel, inspiré des outils CI/CD (Jenkins, GitLab CI, n8n)

---

## 2. Stack technique

### Backend

| Technologie    | Rôle                             |
| -------------- | -------------------------------- |
| Node.js 18+    | Runtime                          |
| Fastify        | Framework HTTP                   |
| TypeScript     | Langage                          |
| MongoDB 7      | Base de données                  |
| Mongoose       | ODM                              |
| `@fastify/jwt` | Authentification JWT             |
| argon2         | Hachage des mots de passe        |
| AES-256-GCM    | Chiffrement des secrets au repos |

### Frontend

| Technologie  | Rôle                                                  |
| ------------ | ----------------------------------------------------- |
| React 19     | Framework UI                                          |
| TypeScript   | Langage                                               |
| Vite         | Build tool / Dev server                               |
| Tailwind CSS | Styling                                               |
| React Flow   | Canvas pipeline (drag & drop, edges, nodes)           |
| `@dnd-kit`   | Drag-and-drop pour les listes de steps dans le drawer |

### Infrastructure

- **Docker** + Docker Compose pour le dev et la production
- **MongoDB** seul en dev via `docker-compose.dev.yml`

---

## 3. Architecture hexagonale — règles absolues

Le backend suit une **architecture hexagonale (Ports & Adapters)** stricte. C'est la règle n°1 du projet.

```
Application → Domain ← Infrastructure
```

### Loi des dépendances

| Couche         | Peut importer                    | Ne peut pas importer           |
| -------------- | -------------------------------- | ------------------------------ |
| Domain         | Rien d'externe                   | Fastify, Mongoose, JWT, crypto |
| Infrastructure | Domain uniquement                | Fastify, routes                |
| Application    | Domain + Infrastructure (via DI) | Mongoose directement           |

### Règles à retenir

- **Aucune logique métier dans les routes Fastify** — les handlers appellent un service et traduisent les erreurs en HTTP.
- **Aucun import Mongoose dans le Domain** — les entités sont des interfaces TypeScript pures.
- **Aucun code HTTP dans le Domain** — les erreurs domaine n'ont pas de `statusCode`.
- **Le Domain ne connaît pas Infrastructure** — il déclare des ports (interfaces), l'Infrastructure les implémente.

---

## 4. Conventions de nommage

### Fichiers

| Type             | Convention              | Exemple                                     |
| ---------------- | ----------------------- | ------------------------------------------- |
| Entité domaine   | PascalCase              | `User.ts`, `Graph.ts`, `Stage.ts`           |
| Interface port   | `I` + PascalCase        | `IUserRepository.ts`, `IGraphRepository.ts` |
| Service domaine  | `<Entity>Service.ts`    | `UserService.ts`, `GraphService.ts`         |
| Modèle Mongoose  | `<Entity>Model.ts`      | `UserModel.ts`, `GraphModel.ts`             |
| Repository infra | `<Entity>Repository.ts` | `UserRepository.ts`                         |
| Routes HTTP      | `<feature>.routes.ts`   | `users.routes.ts`, `graphs.routes.ts`       |
| Schemas JSON     | `<feature>.schemas.ts`  | `users.schemas.ts`                          |
| Composant React  | PascalCase              | `PageGraph.tsx`, `JobCardNode.tsx`          |
| Hook React       | camelCase préfixé `use` | `usePipeline.ts`                            |
| Contexte React   | PascalCase + `Context`  | `AuthContext.tsx`, `ThemeContext.tsx`       |

### Symboles TypeScript

| Type               | Convention           | Exemple                                     |
| ------------------ | -------------------- | ------------------------------------------- |
| Interface          | PascalCase           | `User`, `Graph`, `Job`                      |
| Interface port     | `I` + PascalCase     | `IUserRepository`                           |
| Classes            | PascalCase           | `UserService`, `UserRepository`             |
| Fonctions/méthodes | camelCase            | `findById`, `updateStatus`                  |
| Constantes         | SCREAMING_SNAKE_CASE | `JOB_CARD_WIDTH`, `STAGE_CARD_HEIGHT`       |
| Types union        | PascalCase           | `NodeType`, `RunStatus`, `TriggerType`      |
| Énumérations       | PascalCase           | `provider: "github" \| "gitlab" \| "azure"` |

---

## 5. Conventions Domain

### Entités

Les entités sont des **interfaces TypeScript pures** — jamais des classes décorées ORM.

```typescript
// ✅ Correct
export interface Stage {
  id: string;          // toujours string (ObjectId sérialisé)
  name: string;
  jobs: Job[];
  jobEdges: Edge[];
  position: { x: number; y: number };
  createdAt: Date;     // toujours Date, jamais string
}

// ❌ Incorrect — classe avec décorateurs
@Schema()
export class Stage { ... }
```

### Champ `id`

- Toujours `string`, jamais `ObjectId` ou autre type Mongoose.
- Correspond à l'`ObjectId` MongoDB sérialisé en `toString()`.

### Dates

- Toujours typées `Date`, jamais `string`.
- La sérialisation JSON est gérée par Fastify (serializer) ou le client fetch.

### Ports (interfaces de repository)

- Préfixés par `I` : `IUserRepository`, `IGraphRepository`.
- Déclarés dans le Domain, jamais dans l'Infrastructure.
- Méthodes standard : `findAll`, `findById`, `create`, `updateById`, `delete`.

```typescript
export interface IGraphRepository {
  findByProjectId(projectId: string): Promise<Graph[]>;
  findById(id: string): Promise<Graph | null>;
  create(data: CreateGraphInput): Promise<Graph>;
  update(id: string, data: UpdateGraphInput): Promise<Graph | null>;
  delete(id: string): Promise<void>;
}
```

### Services domaine

- Injection de dépendances via le **constructeur** (DI manuelle, pas de framework).
- Injectent des **ports** (interfaces), jamais des implémentations concrètes.
- Lèvent des **erreurs domaine typées** déclarées dans `domain/errors.ts` ou dans le fichier du service.

```typescript
export class GraphService {
  constructor(
    private readonly graphRepository: IGraphRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  async getById(id: string, requesterId: string): Promise<Graph> {
    const graph = await this.graphRepository.findById(id);
    if (!graph) throw new NotFoundError("Pipeline not found");
    // logique métier...
    return graph;
  }
}
```

### Erreurs domaine

- Déclarées dans `backend/src/domain/errors.ts` (erreurs communes) ou dans le fichier du service (erreurs spécifiques).
- Étendent `Error` avec un champ `readonly type` ou `readonly code`.
- **Jamais de statusCode HTTP dans une erreur domaine.**
- La traduction erreur → HTTP se fait dans les handlers de routes.

```typescript
// domain/errors.ts — erreurs communes
export class NotFoundError extends Error {
  readonly type = "NotFoundError" as const;
}
export class ForbiddenError extends Error {
  readonly type = "ForbiddenError" as const;
}
export class ValidationError extends Error {
  readonly type = "ValidationError" as const;
}
export class RegistrationDisabledError extends Error {
  readonly type = "RegistrationDisabledError" as const;
}

// Dans un service — erreur spécifique avec code
export class AuthError extends Error {
  constructor(
    public readonly code: "EMAIL_IN_USE" | "INVALID_CREDENTIALS",
    message: string,
  ) {
    super(message);
  }
}
```

### Pattern Visitor

Les opérations transversales sur le graphe (validation, plan d'exécution) utilisent le **pattern Visitor** :

- `ValidationVisitor` — vérifie les contraintes du graphe (ex : exactement 1 TriggerNode)
- `ExecutionPlanVisitor` — calcule l'ordre d'exécution topologique des stages/jobs

Déclarer les nouveaux visitors dans `domain/graph/visitors/`.

---

## 6. Conventions Infrastructure

### Modèles Mongoose

- Interface `IXxxDocument extends Document` + schéma Mongoose séparés.
- **Aucune logique métier** dans les modèles — structure de la collection uniquement.
- Utiliser `timestamps: true` pour `createdAt`/`updatedAt` automatiques.

```typescript
interface IGraphDocument extends Document {
  projectId: Types.ObjectId;
  name: string;
  stages: IStageSubDoc[];
  // ...
  createdAt: Date;
  updatedAt: Date;
}
```

### Repositories

- Implémentent le port du Domain : `class GraphRepository implements IGraphRepository`.
- Contiennent un mapper privé `toXxx(doc)` — seul point de conversion Mongoose → type Domain.
- **Aucun type Mongoose ne doit fuiter** hors du repository.
- La plomberie MongoDB (`.lean()`, `.findByIdAndUpdate()`, `.populate()`) est confinée ici.

```typescript
export class GraphRepository implements IGraphRepository {
  private toGraph(doc: IGraphDocument): Graph {
    return {
      id: doc._id.toString(),
      projectId: doc.projectId.toString(),
      name: doc.name,
      stages: doc.stages.map(this.toStage.bind(this)),
      stageEdges: doc.stageEdges ?? [],
      viewport: doc.viewport ?? { x: 0, y: 0, zoom: 1 },
    };
  }

  async findById(id: string): Promise<Graph | null> {
    const doc = await GraphModel.findById(id);
    return doc ? this.toGraph(doc) : null;
  }
}
```

### Chiffrement des secrets

- Les secrets des nodes sont chiffrés/déchiffrés via `SecretsService` (AES-256-GCM).
- Le chiffrement se fait **dans le repository** — jamais dans le service Domain.
- La clé est dans `SECRETS_ENCRYPTION_KEY` (32 bytes / 64 hex chars).
- La valeur brute n'est **jamais retournée** après création.

---

## 7. Conventions Application (Fastify)

### Handlers de routes

- **Thin handlers** : validation → appel service → traduction d'erreur → réponse.
- Pas de logique métier dans les handlers.
- Toujours traduire les erreurs domaine via `instanceof` :

```typescript
export default async function graphRoutes(app: FastifyInstance) {
  app.get("/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const graph = await app.graphService.getById(request.params.id, request.user.sub);
      return reply.send(graph);
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message });
      if (err instanceof ForbiddenError) return reply.status(403).send({ error: err.message });
      throw err; // laisser Fastify gérer les erreurs inattendues
    }
  });
}
```

### Schemas JSON

- Toujours définir des schémas pour les bodies, params, querystrings et responses.
- Utiliser `additionalProperties: false` sur les request bodies.
- Les schemas servent à la validation ET à la documentation Swagger.

```typescript
export const createPipelineSchema = {
  body: {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1 },
    },
  },
} as const;
```

### Conteneur DI (`plugins/container.ts`)

- Chaque service est instancié ici et exposé via `app.decorate()`.
- Toujours déclarer les types dans `declare module "fastify" { interface FastifyInstance { ... } }`.

```typescript
app.decorate("graphService", new GraphService(graphRepository, projectRepository));

declare module "fastify" {
  interface FastifyInstance {
    graphService: GraphService;
  }
}
```

### Ordre d'enregistrement des plugins (index.ts)

L'ordre est **strict** et ne doit pas être modifié :

1. `connectDatabase()` — MongoDB doit être prêt
2. `swaggerPlugin` — collecte les schémas, doit précéder les routes
3. `jwtPlugin` — `app.authenticate` doit exister avant les routes
4. `adminGuardPlugin` — `app.assertAdmin` dépend de JWT
5. `containerPlugin` — `app.<service>` doit exister avant les routes
6. `registerRoutes(app)` — toutes les routes features
7. `staticPlugin` — SPA fallback en dernier (catchall)

---

## 8. Conventions Frontend

### Structure des pages

- Toute page vit dans `webapp/src/Pages/PageXxx.tsx`.
- Si elle requiert une auth, elle est wrappée dans `<ProtectedRoute>` dans `App.tsx`.
- Routing géré dans `App.tsx` uniquement.

### Client API (`Api/client.ts`)

- Wrapper typé autour de `fetch` — pas d'axios.
- Toutes les fonctions API sont regroupées par feature : `api.projects`, `api.pipelines`, etc.
- Le refresh token automatique sur 401 est déjà implémenté via une queue — **ne pas gérer le refresh ailleurs**.
- Les tokens sont stockés dans `localStorage` (`accessToken`, `refreshToken`).

```typescript
// ✅ Ajouter une nouvelle fonction API
export const api = {
  // ...
  runs: {
    trigger: (projectId: string, pipelineId: string) => apiFetch<Run>(`/api/projects/${projectId}/pipelines/${pipelineId}/runs`, { method: "POST" }),
    list: (projectId: string, pipelineId: string) => apiFetch<Run[]>(`/api/projects/${projectId}/pipelines/${pipelineId}/runs`),
  },
};
```

### Types (`Api/types.ts`)

- Tous les types partagés entre pages et composants vivent ici.
- Les types **mirrorent exactement** les types domaine Backend.
- Pour un nouveau type de node, ajouter le discriminant dans `NodeType` ET l'interface de params typés.

```typescript
export type NodeType = "trigger" | "shell_command" | "docker" | "git" | "test" | "build" | "deploy" | "notification" | "condition" | "monNouveau"; // ajouter ici

export interface MonNouveauNodeParams {
  specificField: string;
}
```

### Hook `usePipeline`

- **Hook central** — toute la logique du canvas React Flow vit ici.
- Gère la conversion bidirectionnelle : Domain ↔ React Flow nodes/edges.
- Gère les 3 niveaux de canvas : Pipeline (stages) → Stage (jobs) → Job (steps via drawer).
- **Ne pas appeler `useReactFlow()` dans les composants** — passer par le hook ou le contexte `GraphActionsContext`.

### Composants Graph

- Les nodes React Flow vivent dans `Components/Graph/nodes/`.
- Chaque node doit être enregistré dans `Components/Graph/nodeTypes.ts`.
- Sa config (label, icône, params par défaut) doit être dans `Components/Graph/nodeConfig.ts`.
- Son panneau de configuration doit être dans `Components/Graph/NodeConfigPanel.tsx`.

### Conventions de style (Tailwind)

| Élément           | Classes de référence                              |
| ----------------- | ------------------------------------------------- |
| Stage (lane)      | `bg-violet-950/20 border-violet-700`              |
| Job (card)        | `bg-indigo-950/30 border-indigo-600`              |
| Step (node)       | `bg-slate-800 border-slate-600`                   |
| Edge stage→stage  | stroke violet `#7c3aed`, épaisseur 2.5px          |
| Edge job→job      | stroke bleu `#3b82f6`, dashed, épaisseur 1px      |
| Boutons primaires | `bg-violet-600 hover:bg-violet-500`               |
| Dark mode         | Classes `dark:` — toujours prévoir les deux modes |

---

## 9. Modèle de données — Pipeline

### Hiérarchie

```
Pipeline (Graph)
└── Stage[]            ← groupes parallèles, reliés par stageEdges
    └── Job[]          ← exécution parallèle dans la stage (ou séquentielle via jobEdges)
        └── Step[]     ← GraphNode, séquence ordonnée d'opérations
```

### Types de steps (GraphNode)

| Type            | Description                                              |
| --------------- | -------------------------------------------------------- |
| `trigger`       | Déclencheur (push, PR, cron, manuel, tag)                |
| `shell_command` | Script shell (bash, sh, zsh, powershell, cmd)            |
| `docker`        | Opérations Docker (build, run, push, pull, compose)      |
| `git`           | Opérations Git (clone, checkout, pull, fetch, tag, push) |
| `test`          | Tests (jest, vitest, pytest, go_test, cargo_test…)       |
| `build`         | Build d'artefacts (npm, yarn, maven, gradle, cargo, go…) |
| `deploy`        | Déploiement (kubernetes, aws_ecs, aws_lambda, ssh…)      |
| `notification`  | Notification (slack, teams, email, discord…)             |
| `condition`     | Branche conditionnelle                                   |

### Edges et conditions

Les `stageEdges` supportent une condition d'exécution :

- `on_success` (défaut) — stage suivante seulement si la courante a réussi
- `on_failure` — stage suivante seulement si la courante a échoué
- `always` — toujours exécuter la stage suivante

### Export YAML

| Plateforme     | Fichier               | Particularités                                                 |
| -------------- | --------------------- | -------------------------------------------------------------- |
| GitHub Actions | `pipeline.yml`        | jobs au même niveau avec `needs:`, pas de stages natives       |
| GitLab CI      | `.gitlab-ci.yml`      | `stages:` + chaque job porte `stage:`, `needs:` intra-stage    |
| Azure DevOps   | `azure-pipelines.yml` | `stages:` → `jobs:` → `steps:` hiérarchie native, `dependsOn:` |

---

## 10. Sécurité — règles obligatoires

### Authentification

- JWT short-lived (`accessToken` ~15min) + Refresh token long-lived (7 jours, stocké haché en SHA-256).
- `adminGuard` plugin pour protéger toutes les routes admin.
- `app.authenticate` preHandler sur toutes les routes nécessitant une auth.

### Contrôle d'accès

- Vérifier l'ownership sur tout accès projet/pipeline : `project.ownerId !== requesterId` → `ForbiddenError`.
- Les projets publics sont lisibles par tous, éditables uniquement par le propriétaire.
- Les admins ont accès à toutes les routes `/api/admin/*` et `/api/users/*`.

### Secrets & chiffrement

- Les credentials utilisateur sont chiffrés AES-256-GCM (`SecretsService`).
- Les secrets de nodes dans les pipelines sont chiffrés au repos (dans le `GraphRepository`).
- `SECRETS_ENCRYPTION_KEY` doit faire exactement 32 bytes (64 chars hex) — validé au démarrage.
- **Ne jamais retourner la valeur raw d'un secret après création.**

### Validation des inputs

- Tout input HTTP est validé par JSON Schema (Fastify) — jamais par code applicatif seul.
- `additionalProperties: false` sur tous les bodies de requête.
- Pas de concaténation de strings utilisateur dans des requêtes MongoDB (pas d'injection).

### Hachage

- Mots de passe : argon2 (jamais SHA1, MD5, bcrypt déprécié).
- Refresh tokens stockés : SHA-256 du token, jamais le token brut.

---

## 11. Conventions Git & commits

### Prefixes de commit (Conventional Commits)

| Prefix      | Quand                                                |
| ----------- | ---------------------------------------------------- |
| `feat:`     | Nouvelle feature                                     |
| `fix:`      | Correction de bug                                    |
| `refactor:` | Changement de code sans modification de comportement |
| `docs:`     | Documentation uniquement                             |
| `chore:`    | Outillage, dépendances, config                       |
| `test:`     | Tests                                                |

### Exemples

```
feat: add stage execution conditions (on_success/on_failure/always)
fix: refresh token queue race condition on concurrent 401
refactor: extract YAML export into dedicated utility
docs: update pipeline-concepts for 3-level hierarchy
chore: bump react-flow to 12.x
```

---

## 12. Ordre d'implémentation d'une feature

Toujours suivre l'ordre **Domain → Infrastructure → Application → Frontend** :

1. **Domain** — entité + port (interface repository) + erreurs domaine
2. **Domain** — service avec logique métier
3. **Infrastructure** — modèle Mongoose + repository
4. **Application** — wiring DI dans `container.ts`
5. **Application** — schemas JSON + routes Fastify
6. **Frontend** — types dans `Api/types.ts`
7. **Frontend** — fonctions API dans `Api/client.ts`
8. **Frontend** — hook(s) ou composant(s)
9. **Frontend** — page ou intégration dans page existante

---

## 13. Maintenance de la documentation

Quand tu modifies quelque chose, mettre à jour le doc correspondant :

| Zone modifiée                                | Doc à mettre à jour                 |
| -------------------------------------------- | ----------------------------------- |
| Endpoints API (ajout/modif/suppression)      | `docs/api.md`                       |
| Architecture ou structure des couches        | `docs/architecture.md`              |
| Modèle de données pipeline ou types de nodes | `docs/pipeline-concepts.md`         |
| Setup dev, variables d'env, Docker           | `docs/development.md` + `README.md` |
| Déploiement ou config production             | `docs/deployment.md`                |
| Conventions ou pratiques                     | `docs/conventions.md` (ce fichier)  |
| Plan de feature                              | `plans/<feature>-plan.md`           |
