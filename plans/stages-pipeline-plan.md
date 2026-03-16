# Plan: Stages — Modèle 3 niveaux (Stage → Job → Step)

<!-- UPDATED: Q1+Q2 answered -->

La pipeline passe du modèle 2 niveaux actuel (`Job → Step`) à 3 niveaux (`Stage → Job → Step`).
Les stages représentent des **groupes de jobs s'exécutant en parallèle**, reliés par des `stageEdges`.
Un stage contient N jobs qui tournent en parallèle ; le stage suivant ne démarre qu'une fois tous ses jobs terminés.

Export YAML ciblé par plateforme (GitHub Actions / GitLab CI / Azure DevOps).
Pas de migration des pipelines existants (prototype).

## Open questions (en attente)

- [ ] Q1 : Dans une stage, les jobs sont-ils toujours **parallèles** (option A) ou peut-on aussi avoir des dépendances entre jobs d'une même stage (option B — `jobEdges` intra-stage) ?
- [ ] Q2 : `runs-on` uniquement au niveau **job**, ou ajout d'un runner par défaut au niveau **stage** héritable par ses jobs ?

---

## Phases

### Phase 1 : Domaine backend — types Stage + mise à jour Graph

**Objectif :** Introduire le concept de Stage dans le domain layer.

**Fichiers à créer/modifier :**

- Créer `backend/src/Domain/graph/Stage.ts`
- Modifier `backend/src/Domain/graph/Graph.ts`
- Modifier `backend/src/Domain/graph/IGraphRepository.ts`
- Modifier `backend/src/Domain/graph/GraphService.ts`

**Steps :**

1. Créer `Stage.ts` : `{ id, name, jobs: Job[], position: { x, y } }` — pas de `stageEdge` sur Job, les dépendances inter-stages sont portées par `Graph.stageEdges`
2. Mettre à jour `Graph.ts` : remplacer `jobs: Job[]` + `jobEdges: Edge[]` par `stages: Stage[]` + `stageEdges: Edge[]`
3. Mettre à jour `IGraphRepository.ts` : remplacer `{ jobs, jobEdges }` par `{ stages, stageEdges }` dans `create` et `update`
4. Mettre à jour `GraphService.ts` : `validateJobs` → itère stages → jobs → steps ; `getExecutionPlan` idem ; signatures `create`/`update`

---

### Phase 2 : Infrastructure — repository + routes HTTP

**Objectif :** Adapter la persistence (pas de migration, le modèle existant est ignoré).

**Fichiers à modifier :**

- `backend/src/Infrastructure/database/GraphRepository.ts` (ou équivalent)
- `backend/src/Application/routes/graphs/` (routes HTTP)

**Steps :**

1. Adapter `create` et `update` du repository pour écrire `stages` + `stageEdges`
2. `findById` / `findAllByProjectId` : si le document retourné contient `jobs[]` legacy, retourner tel quel (le frontend gère la normalisation)
3. Adapter les routes HTTP — body `{ viewport, stages, stageEdges }`

---

### Phase 3 : Types frontend + converters RF

**Objectif :** Mettre à jour `Api/types.ts` et refactorer les converters RF ↔ domain dans `usePipeline.ts`.

**Fichiers à modifier :**

- `webapp/src/Api/types.ts`
- `webapp/src/hooks/usePipeline.ts`

**Steps :**

1. Ajouter `Stage` dans `types.ts` : `{ id, name, jobs: Job[], position: { x, y } }`
2. Mettre à jour `Graph` : `stages: Stage[]` + `stageEdges: GraphEdge[]`
3. `stageToRFNodes` : génère stage group node + job group nodes (parentId = stage) + step nodes (parentId = job)
4. `rfToStages` : collecte les 3 niveaux depuis les RF nodes
5. `normalizeLegacyGraph` : wrap `jobs[]` dans `stages: [{ id: "stage-default", name: "default", jobs: [...] }]`
6. `addStage` : ajoute une stage vide ; `addJob(stageId)` : ajoute un job dans la stage cible
7. Adapter `save` et `exportToYaml`
8. Adapter les helpers `findJobAtPos`, `getAbsolutePos` pour 3 niveaux de nesting
9. Adapter `onNodeDragStart/Drag/Stop` : reparentage step ↔ job, job ↔ stage

---

### Phase 4 : Composants React Flow

**Objectif :** Créer `StageGroupNode`, adapter `JobGroupNode`.

**Fichiers à créer/modifier :**

- Créer `webapp/src/Components/Graph/nodes/StageGroupNode.tsx`
- Modifier `webapp/src/Components/Graph/nodeTypes.ts`
- Modifier `webapp/src/Components/Graph/nodes/JobGroupNode.tsx`

**Steps :**

1. `StageGroupNode` : header nom éditable, `NodeResizer`, handles source/target gauche/droite, drop-zone "Glisser des jobs ici", highlight drag-over
2. Identité visuelle distincte : stages en violet profond (`#4c1d95`), jobs en indigo, steps inchangés
3. `JobGroupNode` : les handles gauche/droite restent (pour jobEdges intra-stage si Q1=B, ou désactivés si Q1=A)
4. Enregistrer `stageGroup` dans `nodeTypes.ts`

---

### Phase 5 : PageGraph — toolbar et UX

**Objectif :** Adapter la toolbar pour `Add Stage` / `Add Job`.

**Fichiers à modifier :**

- `webapp/src/Pages/PageGraph.tsx`

**Steps :**

1. Remplacer `Add Job` par `Add Stage` + `Add Job` (le job demande dans quelle stage le placer, défaut : première stage)
2. `onNodeDragStart/Drag/Stop` : câbler les nouveaux handlers du hook
3. Sélecteur de format d'export dans la toolbar (GitHub Actions / GitLab CI / Azure DevOps)

---

### Phase 6 : YAML export multi-plateforme

**Objectif :** Générer un YAML correct pour chaque plateforme cible.

**Fichiers à modifier :**

- `webapp/src/hooks/usePipeline.ts` (fonction `exportToYaml`)

**Steps :**

1. **GitHub Actions** : pas de concept de stage natif — les jobs d'une stage se retrouvent tous au même niveau avec `needs:` cross-stage ; les jobs d'une même stage n'ont pas de `needs:` entre eux (parallèles)
2. **GitLab CI** : `stages: [init, test, deploy]` + chaque job porte `stage: <name>` ; dépendances via `needs:` ou simplement par ordre de stage
3. **Azure DevOps** : `stages:` → `jobs:` → `steps:` hiérarchie native, `dependsOn:` sur les stages
4. Sélecteur de format passé en paramètre à `exportToYaml`
