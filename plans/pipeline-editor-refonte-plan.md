# Plan: Refonte Pipeline Editor

Refonte complète de l'éditeur de pipeline — canvas aplati left-to-right (swimlane + card nodes), steps sortis du canvas vers un drawer latéral, `runsOn` déplacé sur Job, edges typés avec conditions, stages collapsibles, architecture RF corrigée.

**Réponses aux questions ouvertes**

- Orientation : gauche → droite (stages côte à côte, flow left→right)
- Job→Job `depends_on` : implémenté en Phase 4
- Step drawer réordonnage : drag natif avec `@dnd-kit`
- MiniMap : restyle dans Phase 6

---

## Phases

1. **Phase 1: Modèle de données — runsOn sur Job**
   - **Objectif :** chaque Job définit son propre runner
   - **Fichiers/Fonctions :**
     - `backend/src/Domain/graph/Stage.ts`
     - `backend/src/Domain/graph/Job.ts`
     - `backend/src/Infrastructure/database/models/GraphModel.ts` (StageSchema/JobSchema)
     - `backend/src/Application/routes/graphs/graphs.schemas.ts`
     - `webapp/src/Api/types.ts`
     - `webapp/src/hooks/usePipeline.ts` (normalizeLegacyGraph, converters YAML)
   - **Steps :**
     1. Backend : retirer `runsOn` de `Stage`, ajouter à `Job` avec default `ubuntu-latest`
     2. Frontend `types.ts` : idem
     3. `normalizeLegacyGraph` : propager l'ancien `stage.runsOn` vers chaque job migré
     4. YAML export : utiliser `job.runsOn` pour `runs-on` / `tags` / `pool.vmImage`

2. **Phase 2: Architecture RF — ReactFlowProvider + useReactFlow**
   - **Objectif :** corriger l'erreur architecturale — le hook vit hors du provider RF
   - **Fichiers/Fonctions :**
     - `webapp/src/Pages/PageGraph.tsx` (wrapper + PageGraphInner)
     - `webapp/src/hooks/usePipeline.ts` (useReactFlow, supprimer helpers manuels)
   - **Steps :**
     1. Wrapper `PageGraph` dans `<ReactFlowProvider>`, extraire `PageGraphInner`
     2. `usePipeline` appelle `useReactFlow()` pour accéder à `getIntersectingNodes`, `updateNodeData`
     3. Supprimer `getAbsolutePos`, `findJobAtPos`, `findStageAtPos`
     4. Remplacer `setNodes(nds => nds.map(...dragOver...))` par `rf.updateNodeData()` ciblé

3. **Phase 3: Nouveau canvas — StageLaneNode + JobCardNode**
   - **Objectif :** 2-level canvas (lane horizontale + card), steps retirés du canvas
   - **Fichiers/Fonctions :**
     - `webapp/src/Components/Graph/nodes/StageLaneNode.tsx` (nouveau)
     - `webapp/src/Components/Graph/nodes/JobCardNode.tsx` (nouveau)
     - `webapp/src/Components/Graph/nodeTypes.ts`
     - `webapp/src/hooks/usePipeline.ts` (stageToRFNodes, rfToStages, addStage, addJob, addStep)
   - **Steps :**
     1. `StageLaneNode.tsx` : bande verticale haute, fond violet très transparent, header compact violet, collapsible
     2. `JobCardNode.tsx` : carte bleue avec name, runsOn, "N steps", handles L/R pour job→job
     3. Retirer `StageGroupNode` et `JobGroupNode` de nodeTypes, enregistrer les nouveaux
     4. `stageToRFNodes` : plus de step nodes — steps dans `jobCard.data.steps[]`
     5. `rfToStages` : steps lus depuis `jobCard.data.steps`
     6. `addStep(jobId, type)` remplace `addNode` pour ajouter un step dans la data du job

4. **Phase 4: Edges typés + dépendances job→job**
   - **Objectif :** stage→stage edge épaisse violet avec condition ; job→job fine pointillée bleue
   - **Fichiers/Fonctions :**
     - `webapp/src/Components/Graph/edges/StageEdge.tsx` (nouveau)
     - `webapp/src/Components/Graph/edges/JobEdge.tsx` (nouveau)
     - `webapp/src/Pages/PageGraph.tsx` (edgeTypes)
     - `webapp/src/hooks/usePipeline.ts` (stageEdges, jobEdges dans rfToStages + YAML)
     - `webapp/src/Api/types.ts` (condition sur GraphEdge)
   - **Steps :**
     1. `StageEdge.tsx` : stroke 2.5px violet, label condition cliquable (on success / always / on failure)
     2. `JobEdge.tsx` : stroke 1px bleu, dashed, label `needs`
     3. `GraphEdge.data` : ajouter `condition?: 'on_success' | 'always' | 'on_failure'`
     4. YAML export : `edge.data.condition` → `if:` (GitHub) / `when:` (GitLab) / `condition:` (Azure)
     5. `rfToStages` : capturer les job→job edges (`jobEdges`) par stage

5. **Phase 5: Drawer latéral Steps**
   - **Objectif :** clic sur un JobCard → drawer pour éditer job name, runsOn, steps réordonnables
   - **Fichiers/Fonctions :**
     - `webapp/src/Components/Graph/StepDrawer.tsx` (nouveau)
     - `webapp/src/Pages/PageGraph.tsx` (intégration drawer)
     - `webapp/src/hooks/usePipeline.ts` (addStep, deleteStep, reorderSteps)
   - **Steps :**
     1. Installer `@dnd-kit/core` et `@dnd-kit/sortable`
     2. `StepDrawer.tsx` : panel slide-in depuis la droite, job name + runsOn éditables, liste steps
     3. Steps drag natif via `@dnd-kit/sortable` — `SortableStepItem` horizontal
     4. Bouton `+ Ajouter un step` avec mini-selector de type
     5. Chaque step : type badge, nom éditable, expand config inline, bouton delete
     6. Mutation → `rf.updateNodeData(jobId, { steps: updatedSteps })`

6. **Phase 6: Ergonomie finale**
   - **Objectif :** stages collapsibles, toolbar flottante, fitView, MiniMap restyle
   - **Fichiers/Fonctions :**
     - `webapp/src/Components/Graph/nodes/StageLaneNode.tsx` (collapsed toggle)
     - `webapp/src/Pages/PageGraph.tsx` (toolbar flottante, fitView, MiniMap)
   - **Steps :**
     1. Click header → toggle `collapsed` dans data → node height = 48px, jobs cachés
     2. Retirer les boutons du toolbar header, les remplacer par un panel flottant (bas-gauche overlay)
     3. `fitView` automatique après setNodes au chargement (via `reactFlow.fitView()`)
     4. `<MiniMap>` : nodeColor par type (violet stages, bleu jobs), maskColor sombre, style cohérent
