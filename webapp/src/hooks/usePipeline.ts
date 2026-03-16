import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type OnConnect,
  type Node as RFNode,
  type Edge as RFEdge,
} from "@xyflow/react";
import { api } from "../Api/client";
import type {
  Graph,
  Stage,
  Job,
  GraphNode,
  GraphEdge,
  NodeType,
  NodeData,
  Viewport,
} from "../Api/types";

// ── Constants ────────────────────────────────────────────────────────────────

const JOB_CARD_WIDTH = 280;
const JOB_CARD_HEIGHT = 100;
const JOB_HEADER_HEIGHT = 52; // stage header height before first job
const JOB_GAP = 16;
const STAGE_DEFAULT_WIDTH = 320;
const STAGE_DEFAULT_HEIGHT = 200;

// ── RF <-> Domain converters ─────────────────────────────────────────────────

/** Convert a single Stage → RF stage lane node + RF job card nodes (steps stored in job data, not on canvas) */
function stageToRFNodes(stage: Stage): RFNode[] {
  const neededStageHeight =
    stage.jobs.length > 0
      ? JOB_HEADER_HEIGHT + stage.jobs.length * (JOB_CARD_HEIGHT + JOB_GAP) + 16
      : STAGE_DEFAULT_HEIGHT;
  const stageHeight = Math.max(STAGE_DEFAULT_HEIGHT, neededStageHeight);

  const stageNode: RFNode = {
    id: stage.id,
    type: "stageGroup",
    position: stage.position,
    style: { width: STAGE_DEFAULT_WIDTH, height: stageHeight },
    data: { name: stage.name } as unknown as Record<string, unknown>,
  };
  const jobNodes: RFNode[] = stage.jobs.map((job, jobIndex) => ({
    id: job.id,
    type: "jobGroup",
    position: { x: 20, y: JOB_HEADER_HEIGHT + jobIndex * (JOB_CARD_HEIGHT + JOB_GAP) },
    parentId: stage.id,
    style: { width: JOB_CARD_WIDTH, height: JOB_CARD_HEIGHT },
    data: {
      name: job.name,
      runsOn: job.runsOn,
      steps: job.steps,
      stepEdges: job.stepEdges,
    } as unknown as Record<string, unknown>,
  }));
  // Stage node must come before its children in the array
  return [stageNode, ...jobNodes];
}

function stageEdgeToRF(e: GraphEdge): RFEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "stageEdge",
    data: { condition: e.condition ?? "on_success" },
  };
}

function jobEdgeToRF(e: GraphEdge): RFEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "jobEdge",
    data: {},
  };
}

// ── Reparenting helpers ───────────────────────────────────────────────────────

/** Convert RF nodes + RF edges → Stage[] + stageEdges[]. Steps are read from job node data. */
function rfToStages(
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
  _existingStages: Stage[],
): { stages: Stage[]; stageEdges: GraphEdge[] } {
  const stageIds = new Set(rfNodes.filter((n) => n.type === "stageGroup").map((n) => n.id));
  const jobIds = new Set(rfNodes.filter((n) => n.type === "jobGroup").map((n) => n.id));

  const toBackendEdge = (e: RFEdge): GraphEdge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type ?? "stageEdge",
    condition: (e.data as { condition?: "on_success" | "always" | "on_failure" } | undefined)
      ?.condition,
    waypoint: (e.data as { waypoint?: { x: number; y: number } } | undefined)?.waypoint,
  });

  // stageEdges: RF edges where both source and target are stage group ids
  const stageEdges: GraphEdge[] = rfEdges
    .filter((e) => stageIds.has(e.source) && stageIds.has(e.target))
    .map(toBackendEdge);

  // jobEdges: RF edges where both source and target are job group ids
  const allJobEdges: GraphEdge[] = rfEdges
    .filter((e) => jobIds.has(e.source) && jobIds.has(e.target))
    .map(toBackendEdge);

  const stages: Stage[] = rfNodes
    .filter((n) => n.type === "stageGroup")
    .map((stageNode) => {
      const data = stageNode.data as { name?: string };
      const jobNodes = rfNodes.filter((n) => n.type === "jobGroup" && n.parentId === stageNode.id);
      const jobNodeIds = new Set(jobNodes.map((j) => j.id));
      return {
        id: stageNode.id,
        name: data.name ?? "stage",
        position: stageNode.position,
        jobEdges: allJobEdges.filter((e) => jobNodeIds.has(e.source)),
        jobs: jobNodes.map((jobNode) => {
          const jobData = jobNode.data as {
            name?: string;
            runsOn?: string;
            steps?: GraphNode[];
            stepEdges?: GraphEdge[];
          };
          return {
            id: jobNode.id,
            name: jobData.name ?? "job",
            runsOn: jobData.runsOn ?? "ubuntu-latest",
            steps: jobData.steps ?? [],
            stepEdges: jobData.stepEdges ?? [],
          };
        }),
      };
    });

  return { stages, stageEdges };
}

// ── YAML export helpers ──────────────────────────────────────────────────────

function topoSortStages(stages: Stage[], stageEdges: GraphEdge[]): Stage[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  for (const s of stages) {
    inDegree[s.id] = 0;
    adj[s.id] = [];
  }
  for (const e of stageEdges) {
    adj[e.source].push(e.target);
    inDegree[e.target]++;
  }
  const queue = stages.filter((s) => inDegree[s.id] === 0).map((s) => s.id);
  const result: Stage[] = [];
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(stageById[id]);
    for (const neighborId of adj[id]) {
      inDegree[neighborId]--;
      if (inDegree[neighborId] === 0) queue.push(neighborId);
    }
  }
  for (const s of stages) if (!result.find((r) => r.id === s.id)) result.push(s);
  return result;
}

const yamlValue = (val: unknown, indent: number): string => {
  const pad = "  ".repeat(indent);
  if (val === null || val === undefined) return "~";
  if (typeof val === "boolean") return val.toString();
  if (typeof val === "number") return val.toString();
  if (typeof val === "string") {
    if (
      val === "" ||
      val.includes("\n") ||
      val.includes(":") ||
      val.includes("#") ||
      val.includes('"') ||
      /^[\d\s]/.test(val)
    ) {
      return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    }
    return val;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    return "\n" + val.map((v) => `${pad}- ${yamlValue(v, indent + 1)}`).join("\n");
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    );
    if (entries.length === 0) return "{}";
    return (
      "\n" +
      entries
        .map(([k, v]) => {
          const s = yamlValue(v, indent + 1);
          return s.startsWith("\n") ? `${pad}${k}:${s}` : `${pad}${k}: ${s}`;
        })
        .join("\n")
    );
  }
  return String(val);
};

const buildJobNeedsMap = (stage: Stage): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const je of stage.jobEdges ?? []) {
    const srcJob = stage.jobs.find((j) => j.id === je.source);
    if (srcJob) {
      if (!map[je.target]) map[je.target] = [];
      map[je.target].push(srcJob.name);
    }
  }
  return map;
};

const buildStepDepsMap = (job: Job): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  job.stepEdges.forEach((e) => {
    if (!map[e.target]) map[e.target] = [];
    const depStep = job.steps.find((s) => s.id === e.source);
    if (depStep) map[e.target].push(depStep.data.label);
  });
  return map;
};

const renderStep = (
  step: GraphNode,
  stepDepsMap: Record<string, string[]>,
): Record<string, unknown> => {
  const entry: Record<string, unknown> = { id: step.id, name: step.data.label, type: step.type };
  if (step.data.description) entry.description = step.data.description;
  const stepDeps = stepDepsMap[step.id];
  if (stepDeps?.length) entry.depends_on = stepDeps;
  const baseParams = step.data.params?.baseParameters ?? {};
  if (Object.keys(baseParams).length > 0) entry.params = baseParams;
  if (Object.keys(step.data.env ?? {}).length > 0) entry.env = step.data.env;
  const secretKeys = Object.keys(step.data.secrets ?? {});
  if (secretKeys.length > 0) entry.secrets = secretKeys;
  return entry;
};

// ── Legacy flat-graph detection ───────────────────────────────────────────────
// Documents saved before the Stage refactor may have jobs[] or flat nodes/edges at root.
// We auto-wrap them into the stages model so they remain editable.

type LegacyGraph = Omit<Graph, "stages" | "stageEdges"> & {
  stages?: Stage[];
  stageEdges?: GraphEdge[];
  /** Legacy: jobs directly on graph (pre-stages format) */
  jobs?: Job[];
  jobEdges?: GraphEdge[];
  /** Legacy fields (pre-jobs format) */
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

function normalizeLegacyGraph(raw: LegacyGraph): Graph {
  if (raw.stages && raw.stages.length > 0) return raw as Graph;
  // legacy: had jobs[] directly
  const legacyJobs: Job[] = (raw as { jobs?: Job[] }).jobs ?? [];
  // legacy jobs may have had runsOn on themselves — preserve per job, fallback to 'ubuntu-latest'
  const legacyRunsOn =
    (legacyJobs[0] as (Job & { runsOn?: string }) | undefined)?.runsOn ?? "ubuntu-latest";
  const cleanedJobs: Job[] = legacyJobs.map((j) => ({
    ...j,
    runsOn: (j as Job & { runsOn?: string }).runsOn ?? legacyRunsOn,
  }));
  return {
    ...raw,
    stages:
      cleanedJobs.length > 0
        ? [
            {
              id: "stage-default",
              name: "default",
              jobs: cleanedJobs,
              position: { x: 80, y: 80 },
            },
          ]
        : [],
    stageEdges: [],
  } as Graph;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * usePipeline — isolates all state and API I/O from PageGraph.
 *
 * Data model:
 *   - RF Group nodes (type "jobGroup") represent Jobs
 *   - RF child nodes (parentId set to a job id) represent Steps
 *   - RF edges between group nodes are jobEdges (job dependencies)
 *   - RF edges between child nodes are stepEdges (step order within a job)
 */
export const usePipeline = (projectId?: string, pipelineId?: string) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [pipeline, setPipeline] = useState<Graph | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "deleting">("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openDrawerJobId, setOpenDrawerJobId] = useState<string | null>(null);

  const {
    getIntersectingNodes,
    updateNodeData: updateRFNodeData,
    getNodes,
    fitView,
  } = useReactFlow();

  // Load
  useEffect(() => {
    if (!projectId || !pipelineId) return;
    setStatus("loading");
    api.pipelines
      .getById(projectId, pipelineId)
      .then((raw) => {
        const p = normalizeLegacyGraph(raw as LegacyGraph);
        setPipeline(p);
        const rfNodes = p.stages.flatMap(stageToRFNodes);
        const rfEdges: RFEdge[] = [
          ...p.stageEdges.map(stageEdgeToRF),
          ...p.stages.flatMap((s) => (s.jobEdges ?? []).map(jobEdgeToRF)),
        ];
        setNodes(rfNodes);
        setEdges(rfEdges);
        setStatus("idle");
        setTimeout(() => {
          fitView({ padding: 0.15, duration: 400 });
        }, 50);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
        setStatus("idle");
      });
  }, [projectId, pipelineId]);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const currentNodes = getNodes();
      const sourceNode = currentNodes.find((n) => n.id === connection.source);
      const targetNode = currentNodes.find((n) => n.id === connection.target);
      const isJobEdge = sourceNode?.type === "jobGroup" && targetNode?.type === "jobGroup";
      const edgeType = isJobEdge ? "jobEdge" : "stageEdge";
      const data = isJobEdge ? {} : { condition: "on_success" };
      setEdges((eds) => addEdge({ ...connection, type: edgeType, data }, eds));
    },
    [setEdges, getNodes],
  );

  /**
   * On drag: highlight the parent group that the dragged node is currently hovering over.
   * Uses refs to avoid unnecessary setNodes calls when the hover target doesn't change.
   */
  const dragOverStageRef = useRef<string | null>(null);

  /** Position (relative to parent) captured at drag start — used to snap back on invalid drop. */
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const onNodeDragStart = useCallback((_event: ReactMouseEvent, draggedNode: RFNode) => {
    if (draggedNode.type === "stageGroup") return;
    dragStartPosRef.current = { ...draggedNode.position };
  }, []);

  const onNodeDrag = useCallback(
    (_event: ReactMouseEvent, draggedNode: RFNode) => {
      if (draggedNode.type === "stageGroup") return;
      if (draggedNode.type !== "jobGroup") return;

      const intersecting = getIntersectingNodes(draggedNode).filter((n) => n.type === "stageGroup");
      const newTargetStage = intersecting[0] ?? null;
      if (newTargetStage?.id !== dragOverStageRef.current) {
        if (dragOverStageRef.current)
          updateRFNodeData(dragOverStageRef.current, { dragOver: false });
        if (newTargetStage) updateRFNodeData(newTargetStage.id, { dragOver: true });
        dragOverStageRef.current = newTargetStage?.id ?? null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * On drag stop: reparent node to the appropriate parent (if changed), then clear drag-over highlights.
   */
  const onNodeDragStop = useCallback(
    (_event: ReactMouseEvent, draggedNode: RFNode) => {
      if (draggedNode.type === "stageGroup") return;
      if (draggedNode.type !== "jobGroup") return;

      // Clear drag-over highlight
      if (dragOverStageRef.current) {
        updateRFNodeData(dragOverStageRef.current, { dragOver: false });
        dragOverStageRef.current = null;
      }

      const intersecting = getIntersectingNodes(draggedNode);
      const targetStage = intersecting.find((n) => n.type === "stageGroup") ?? null;

      if (!targetStage) {
        const snapPos = dragStartPosRef.current;
        dragStartPosRef.current = null;
        if (snapPos)
          setNodes((nds) =>
            nds.map((n) => (n.id === draggedNode.id ? { ...n, position: snapPos } : n)),
          );
        return;
      }
      if (targetStage.id === draggedNode.parentId) {
        dragStartPosRef.current = null;
        return;
      }

      // Reparent: compute position relative to new stage
      const draggedAbsPos =
        (draggedNode as RFNode & { positionAbsolute?: { x: number; y: number } })
          .positionAbsolute ?? draggedNode.position;
      const relPos = {
        x: draggedAbsPos.x - targetStage.position.x,
        y: draggedAbsPos.y - targetStage.position.y,
      };
      setNodes((nds) =>
        nds.map((n) =>
          n.id === draggedNode.id ? { ...n, parentId: targetStage.id, position: relPos } : n,
        ),
      );
      dragStartPosRef.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setNodes],
  );

  /**
   * Add a new step to a specific job (or the first job if none specified).
   * Steps are stored in job node data (not as RF nodes on the canvas).
   */
  const addStep = useCallback(
    (type: NodeType, data: NodeData, jobId?: string) => {
      const targetJobId = jobId ?? nodes.find((n) => n.type === "jobGroup")?.id;
      if (!targetJobId) {
        console.warn("No job exists. Create a job first before adding steps.");
        return;
      }
      const newStep: GraphNode = {
        id: `step-${Date.now()}`,
        type,
        positionX: 0,
        positionY: 0,
        data,
      };
      const jobNode = nodes.find((n) => n.id === targetJobId);
      const currentSteps = (jobNode?.data as unknown as { steps?: GraphNode[] })?.steps ?? [];
      updateRFNodeData(targetJobId, { steps: [...currentSteps, newStep] });
    },
    [nodes, updateRFNodeData],
  );

  /**
   * Add a new empty Job (group node) inside the specified stage (or the first stage found).
   */
  const addJob = useCallback(
    (stageId?: string, name?: string, runsOn?: string) => {
      const id = `job-${Date.now()}`;
      const targetStageId = stageId ?? nodes.find((n) => n.type === "stageGroup")?.id;
      if (!targetStageId) {
        console.warn("No stage exists. Create a stage first.");
        return;
      }
      const jobsInStage = nodes.filter(
        (n) => n.type === "jobGroup" && n.parentId === targetStageId,
      ).length;
      const jobName = name ?? `job-${jobsInStage + 1}`;
      // Stack jobs vertically; expand the parent stage height to fit
      const newJobY = JOB_HEADER_HEIGHT + jobsInStage * (JOB_CARD_HEIGHT + JOB_GAP);
      const neededStageHeight = newJobY + JOB_CARD_HEIGHT + JOB_GAP + 16;
      setNodes((nds) => [
        ...nds.map((n) =>
          n.id === targetStageId
            ? {
                ...n,
                style: {
                  ...n.style,
                  height: Math.max(
                    typeof n.style?.height === "number" ? n.style.height : STAGE_DEFAULT_HEIGHT,
                    neededStageHeight,
                  ),
                },
              }
            : n,
        ),
        {
          id,
          type: "jobGroup",
          position: { x: 20, y: newJobY },
          parentId: targetStageId,
          style: { width: JOB_CARD_WIDTH, height: JOB_CARD_HEIGHT },
          data: {
            name: jobName,
            runsOn: runsOn ?? "ubuntu-latest",
            steps: [],
            stepEdges: [],
          } as unknown as Record<string, unknown>,
        },
      ]);
    },
    [setNodes, nodes],
  );

  /**
   * Add a new empty Stage (stage group node) to the canvas.
   */
  const addStage = useCallback(
    (name?: string) => {
      const id = `stage-${Date.now()}`;
      const existingStages = nodes.filter((n) => n.type === "stageGroup");
      const stageCount = existingStages.length;
      const stageName = name ?? `stage-${stageCount + 1}`;
      // Find the last stage in the chain (the one with no outgoing stageEdge to another stage)
      const stageIds = new Set(existingStages.map((n) => n.id));
      const sourcedIds = new Set(
        edges.filter((e) => stageIds.has(e.source) && stageIds.has(e.target)).map((e) => e.source),
      );
      const lastStage =
        existingStages.find((n) => !sourcedIds.has(n.id)) ?? existingStages[stageCount - 1];

      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "stageGroup",
          position: { x: 80 + stageCount * (STAGE_DEFAULT_WIDTH + 80), y: 80 },
          style: { width: STAGE_DEFAULT_WIDTH, height: STAGE_DEFAULT_HEIGHT },
          data: { name: stageName } as unknown as Record<string, unknown>,
        },
      ]);

      // Auto-link from the last stage to the new one
      if (lastStage) {
        setEdges((eds) => [
          ...eds,
          {
            id: `stage-edge-${lastStage.id}-${id}`,
            source: lastStage.id,
            target: id,
            type: "stageEdge",
            data: { condition: "on_success" },
          },
        ]);
      }
    },
    [setNodes, setEdges, nodes, edges],
  );

  const save = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("saving");
    setError(null);
    try {
      const { stages, stageEdges } = rfToStages(nodes, edges, pipeline?.stages ?? []);
      const result = await api.pipelines.update(projectId, pipelineId, {
        viewport,
        stages,
        stageEdges,
      });
      setPipeline(result);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setStatus("idle");
    }
  }, [projectId, pipelineId, nodes, edges, viewport, pipeline]);

  const exportToYaml = useCallback(
    (format: "github" | "gitlab" | "azure" = "github") => {
      const { stages, stageEdges } = rfToStages(nodes, edges, pipeline?.stages ?? []);
      const stageOrder = topoSortStages(stages, stageEdges);

      // Build map: targetStageId → condition from the incoming stage edge
      const stageConditionMap: Record<string, "on_success" | "always" | "on_failure"> = {};
      for (const edge of stageEdges) {
        stageConditionMap[edge.target] = edge.condition ?? "on_success";
      }

      let doc: Record<string, unknown>;

      if (format === "github") {
        const ghJobs: Record<string, unknown> = {};
        let prevStageJobNames: string[] = [];
        for (const stage of stageOrder) {
          const stageCondition = stageConditionMap[stage.id] ?? "on_success";
          const ghIf =
            stageCondition === "always"
              ? "always()"
              : stageCondition === "on_failure"
                ? "${{ failure() }}"
                : undefined;
          const jobNeedsMap = buildJobNeedsMap(stage);
          const currJobNames: string[] = [];
          for (const job of stage.jobs) {
            const stepDepsMap = buildStepDepsMap(job);
            const jobEntry: Record<string, unknown> = { "runs-on": job.runsOn };
            const intraNeeds = jobNeedsMap[job.id] ?? [];
            const crossNeeds =
              prevStageJobNames.length > 0 && intraNeeds.length === 0 ? prevStageJobNames : [];
            const needs = [...intraNeeds, ...crossNeeds];
            if (needs.length > 0) jobEntry.needs = needs;
            if (ghIf) jobEntry.if = ghIf;
            jobEntry.steps = job.steps.map((step) => renderStep(step, stepDepsMap));
            ghJobs[job.name] = jobEntry;
            currJobNames.push(job.name);
          }
          prevStageJobNames = currJobNames;
        }
        doc = { name: pipeline?.name ?? "pipeline", on: ["push"], jobs: ghJobs };
      } else if (format === "gitlab") {
        const stageNames = stageOrder.map((s) => s.name);
        const glJobs: Record<string, unknown> = {};
        for (const stage of stageOrder) {
          const stageCondition = stageConditionMap[stage.id] ?? "on_success";
          const glWhen =
            stageCondition === "always"
              ? "always"
              : stageCondition === "on_failure"
                ? "on_failure"
                : undefined;
          const jobNeedsMap = buildJobNeedsMap(stage);
          for (const job of stage.jobs) {
            const scripts = job.steps.flatMap((step) => {
              const params = step.data.params?.baseParameters ?? {};
              const script =
                (params as Record<string, unknown>).script ?? `# ${step.data.label} (${step.type})`;
              return typeof script === "string" ? [script] : [`# ${step.data.label}`];
            });
            const intraNeeds = jobNeedsMap[job.id] ?? [];
            const jobConfig: Record<string, unknown> = {
              stage: stage.name,
              tags: [job.runsOn],
              needs: intraNeeds,
              script: scripts.length > 0 ? scripts : ["echo done"],
            };
            if (glWhen) jobConfig.when = glWhen;
            glJobs[job.name] = jobConfig;
          }
        }
        doc = { stages: stageNames, ...glJobs };
      } else {
        // azure
        const azureStages = stageOrder.map((stage) => {
          const stageCondition = stageConditionMap[stage.id] ?? "on_success";
          const azCondition =
            stageCondition === "always"
              ? "always()"
              : stageCondition === "on_failure"
                ? "failed()"
                : undefined;
          const deps = stageEdges
            .filter((e) => e.target === stage.id)
            .map((e) => stages.find((s) => s.id === e.source)?.name)
            .filter(Boolean);
          const jobNeedsMap = buildJobNeedsMap(stage);
          const stageEntry: Record<string, unknown> = {
            stage: stage.name,
            dependsOn: deps.length > 0 ? deps : [],
            jobs: stage.jobs.map((job) => {
              const intraNeeds = jobNeedsMap[job.id] ?? [];
              const jobEntry: Record<string, unknown> = {
                job: job.name,
                pool: { vmImage: job.runsOn },
                steps: job.steps.map((step) => ({
                  script:
                    (step.data.params?.baseParameters as Record<string, unknown>)?.script ??
                    `echo # ${step.data.label}`,
                  displayName: step.data.label,
                })),
              };
              if (intraNeeds.length > 0) jobEntry.dependsOn = intraNeeds;
              return jobEntry;
            }),
          };
          if (azCondition) stageEntry.condition = azCondition;
          return stageEntry;
        });
        doc = { trigger: ["main"], stages: azureStages };
      }

      let yaml = "";
      for (const [k, v] of Object.entries(doc)) {
        const s = yamlValue(v, 1);
        yaml += s.startsWith("\n") ? `${k}:${s}\n` : `${k}: ${s}\n`;
      }

      const ext =
        format === "azure"
          ? "azure-pipelines.yml"
          : format === "gitlab"
            ? ".gitlab-ci.yml"
            : "pipeline.yml";
      const blob = new Blob([yaml], { type: "text/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [nodes, edges, pipeline],
  );

  const deletePipeline = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("deleting");
    setError(null);
    await api.pipelines.delete(projectId, pipelineId);
  }, [projectId, pipelineId]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const openJobDrawer = useCallback((jobId: string) => {
    setOpenDrawerJobId(jobId);
  }, []);

  const closeJobDrawer = useCallback(() => {
    setOpenDrawerJobId(null);
  }, []);

  const updateJob = useCallback(
    (
      jobId: string,
      patch: { name?: string; runsOn?: string; steps?: GraphNode[]; stepEdges?: GraphEdge[] },
    ) => {
      updateRFNodeData(jobId, patch);
    },
    [updateRFNodeData],
  );

  const updateNodeData = useCallback(
    (id: string, data: NodeData) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: data as unknown as Record<string, unknown> } : n,
        ),
      );
    },
    [setNodes],
  );

  return {
    pipeline,
    nodes,
    edges,
    status,
    error,
    savedOk,
    selectedNodeId,
    openDrawerJobId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    addStep,
    addStage,
    addJob,
    save,
    exportToYaml,
    deletePipeline,
    selectNode,
    openJobDrawer,
    closeJobDrawer,
    updateJob,
    updateNodeData,
    setViewport,
  };
};
