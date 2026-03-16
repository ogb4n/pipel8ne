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
const STAGE_CARD_WIDTH = 240;
const JOB_H_GAP = 80; // horizontal gap between job cards in stage view

// ── Pipeline view converters (stageCard nodes) ───────────────────────────────

/** Convert a Stage → simple RF card node for the pipeline-level canvas */
function stageToRFCardNode(stage: Stage): RFNode {
  return {
    id: stage.id,
    type: "stageCard",
    position: stage.position,
    data: {
      name: stage.name,
      jobCount: stage.jobs.length,
    } as unknown as Record<string, unknown>,
  };
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

/** RF pipeline-view nodes + edges → Stage[] + stageEdges.
 *  Job data is sourced from existingStages since stageCard nodes only carry name/jobCount. */
function rfPipelineViewToStages(
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
  existingStages: Stage[],
): { stages: Stage[]; stageEdges: GraphEdge[] } {
  const stageCardIds = new Set(rfNodes.filter((n) => n.type === "stageCard").map((n) => n.id));
  const stageById = Object.fromEntries(existingStages.map((s) => [s.id, s]));

  const toBackendEdge = (e: RFEdge): GraphEdge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type ?? "stageEdge",
    condition: (e.data as { condition?: "on_success" | "always" | "on_failure" } | undefined)
      ?.condition,
    waypoint: (e.data as { waypoint?: { x: number; y: number } } | undefined)?.waypoint,
  });

  const stageEdges: GraphEdge[] = rfEdges
    .filter((e) => stageCardIds.has(e.source) && stageCardIds.has(e.target))
    .map(toBackendEdge);

  const stages: Stage[] = rfNodes
    .filter((n) => n.type === "stageCard")
    .map((n) => {
      const d = n.data as { name?: string };
      const existing = stageById[n.id];
      return {
        id: n.id,
        name: d.name ?? existing?.name ?? "stage",
        position: n.position,
        jobs: existing?.jobs ?? [],
        jobEdges: existing?.jobEdges ?? [],
      };
    });

  return { stages, stageEdges };
}

// ── Stage view converters (flat jobCard nodes) ────────────────────────────────

/** Convert Stage.jobs → flat RF jobCard nodes for the stage-level canvas */
function stageJobsToRFNodes(stage: Stage): RFNode[] {
  return stage.jobs.map((job, i) => ({
    id: job.id,
    type: "jobCard",
    position: job.position ?? { x: 80 + i * (JOB_CARD_WIDTH + JOB_H_GAP), y: 100 },
    style: { width: JOB_CARD_WIDTH, height: JOB_CARD_HEIGHT },
    data: {
      name: job.name,
      runsOn: job.runsOn,
      steps: job.steps,
      stepEdges: job.stepEdges,
    } as unknown as Record<string, unknown>,
  }));
}

/** RF stage-view nodes + edges → { jobs, jobEdges } for one stage */
function rfJobNodesToJobs(rfNodes: RFNode[], rfEdges: RFEdge[]): { jobs: Job[]; jobEdges: GraphEdge[] } {
  const jobIds = new Set(rfNodes.filter((n) => n.type === "jobCard").map((n) => n.id));

  const toBackendEdge = (e: RFEdge): GraphEdge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type ?? "jobEdge",
    waypoint: (e.data as { waypoint?: { x: number; y: number } } | undefined)?.waypoint,
  });

  const jobEdges: GraphEdge[] = rfEdges
    .filter((e) => jobIds.has(e.source) && jobIds.has(e.target))
    .map(toBackendEdge);

  const jobs: Job[] = rfNodes
    .filter((n) => n.type === "jobCard")
    .map((n) => {
      const d = n.data as {
        name?: string;
        runsOn?: string;
        steps?: GraphNode[];
        stepEdges?: GraphEdge[];
      };
      return {
        id: n.id,
        name: d.name ?? "job",
        runsOn: d.runsOn ?? "ubuntu-latest",
        steps: d.steps ?? [],
        stepEdges: d.stepEdges ?? [],
        position: n.position,
      };
    });

  return { jobs, jobEdges };
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

type LegacyGraph = Omit<Graph, "stages" | "stageEdges"> & {
  stages?: Stage[];
  stageEdges?: GraphEdge[];
  jobs?: Job[];
  jobEdges?: GraphEdge[];
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

function normalizeLegacyGraph(raw: LegacyGraph): Graph {
  if (raw.stages && raw.stages.length > 0) return raw as Graph;
  const legacyJobs: Job[] = (raw as { jobs?: Job[] }).jobs ?? [];
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

  // ── Navigation state ────────────────────────────────────────────────────────
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  /** Snapshot of pipeline-view nodes/edges while drilling into a stage */
  const pipelineCanvasNodesRef = useRef<RFNode[]>([]);
  const pipelineCanvasEdgesRef = useRef<RFEdge[]>([]);

  const {
    getIntersectingNodes,
    updateNodeData: updateRFNodeData,
    getNodes,
    getEdges,
    fitView,
  } = useReactFlow();

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !pipelineId) return;
    setStatus("loading");
    api.pipelines
      .getById(projectId, pipelineId)
      .then((raw) => {
        const p = normalizeLegacyGraph(raw as LegacyGraph);
        setPipeline(p);
        // Pipeline view: one stageCard node per stage, stageEdges only
        const rfNodes = p.stages.map(stageToRFCardNode);
        const rfEdges: RFEdge[] = p.stageEdges.map(stageEdgeToRF);
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

  // ── Navigation: enter a stage canvas ────────────────────────────────────────
  const enterStage = useCallback(
    (stageId: string) => {
      const stage = pipeline?.stages.find((s) => s.id === stageId);
      if (!stage) return;

      // Snapshot current pipeline canvas
      pipelineCanvasNodesRef.current = getNodes();
      pipelineCanvasEdgesRef.current = getEdges();

      // Build stage-view canvas
      const jobNodes = stageJobsToRFNodes(stage);
      const jobEdges: RFEdge[] = (stage.jobEdges ?? []).map(jobEdgeToRF);

      setNodes(jobNodes);
      setEdges(jobEdges);
      setActiveStageId(stageId);
      setOpenDrawerJobId(null);

      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    },
    [pipeline, getNodes, getEdges, setNodes, setEdges, fitView],
  );

  // ── Navigation: exit stage, return to pipeline canvas ───────────────────────
  const exitStage = useCallback(() => {
    if (!activeStageId) return;

    // Read job canvas → update pipeline state
    const currentJobNodes = getNodes();
    const currentJobEdges = getEdges();
    const { jobs, jobEdges } = rfJobNodesToJobs(currentJobNodes, currentJobEdges);

    setPipeline((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stages: prev.stages.map((s) =>
          s.id === activeStageId ? { ...s, jobs, jobEdges } : s,
        ),
      };
    });

    // Restore pipeline canvas, refreshing the jobCount badge on the exited stage card
    const updatedJobCount = jobs.length;
    const restoredNodes = pipelineCanvasNodesRef.current.map((n) =>
      n.id === activeStageId
        ? { ...n, data: { ...(n.data as Record<string, unknown>), jobCount: updatedJobCount } }
        : n,
    );

    setNodes(restoredNodes);
    setEdges(pipelineCanvasEdgesRef.current);
    setActiveStageId(null);
    setOpenDrawerJobId(null);

    setTimeout(() => {
      fitView({ padding: 0.15, duration: 300 });
    }, 50);
  }, [activeStageId, getNodes, getEdges, setPipeline, setNodes, setEdges, fitView]);

  // ── Helper: get current full pipeline state from whichever canvas is active ─
  const getCurrentStagesAndEdges = useCallback((): {
    stages: Stage[];
    stageEdges: GraphEdge[];
  } => {
    if (activeStageId) {
      const { jobs, jobEdges } = rfJobNodesToJobs(getNodes(), getEdges());
      const allStages = (pipeline?.stages ?? []).map((s) =>
        s.id === activeStageId ? { ...s, jobs, jobEdges } : s,
      );
      return rfPipelineViewToStages(
        pipelineCanvasNodesRef.current,
        pipelineCanvasEdgesRef.current,
        allStages,
      );
    }
    return rfPipelineViewToStages(nodes, edges, pipeline?.stages ?? []);
  }, [activeStageId, nodes, edges, pipeline, getNodes, getEdges]);

  // ── onConnect ────────────────────────────────────────────────────────────────
  const onConnect: OnConnect = useCallback(
    (connection) => {
      const edgeType = activeStageId ? "jobEdge" : "stageEdge";
      const data = edgeType === "stageEdge" ? { condition: "on_success" } : {};
      setEdges((eds) => addEdge({ ...connection, type: edgeType, data }, eds));
    },
    [setEdges, activeStageId],
  );

  // ── Drag handlers (legacy reparenting — no-op for new stageCard/jobCard types) ─
  const dragOverStageRef = useRef<string | null>(null);
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

  const onNodeDragStop = useCallback(
    (_event: ReactMouseEvent, draggedNode: RFNode) => {
      if (draggedNode.type === "stageGroup") return;
      if (draggedNode.type !== "jobGroup") return;

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

  // ── addStep ──────────────────────────────────────────────────────────────────
  const addStep = useCallback(
    (type: NodeType, data: NodeData, jobId?: string) => {
      const targetJobId =
        jobId ?? nodes.find((n) => n.type === "jobGroup" || n.type === "jobCard")?.id;
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

  // ── addJob ───────────────────────────────────────────────────────────────────
  /** Add a new job. Only works when inside a stage (activeStageId set). */
  const addJob = useCallback(
    (_stageId?: string, name?: string, runsOn?: string) => {
      if (!activeStageId) {
        console.warn("addJob: must be in stage view (drill into a stage first).");
        return;
      }
      const id = `job-${Date.now()}`;
      const existingJobs = nodes.filter((n) => n.type === "jobCard");
      const jobCount = existingJobs.length;
      const jobName = name ?? `job-${jobCount + 1}`;

      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "jobCard",
          position: { x: 80 + jobCount * (JOB_CARD_WIDTH + JOB_H_GAP), y: 100 },
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
    [activeStageId, nodes, setNodes],
  );

  // ── addStage ─────────────────────────────────────────────────────────────────
  const addStage = useCallback(
    (name?: string) => {
      const id = `stage-${Date.now()}`;
      const existingStages = nodes.filter((n) => n.type === "stageCard");
      const stageCount = existingStages.length;
      const stageName = name ?? `stage-${stageCount + 1}`;

      // Find the last stage (no outgoing stageEdge)
      const stageIds = new Set(existingStages.map((n) => n.id));
      const sourcedIds = new Set(
        edges.filter((e) => stageIds.has(e.source) && stageIds.has(e.target)).map((e) => e.source),
      );
      const lastStage =
        existingStages.find((n) => !sourcedIds.has(n.id)) ?? existingStages[stageCount - 1];

      const newPos = { x: 80 + stageCount * (STAGE_CARD_WIDTH + 80), y: 80 };

      // Keep pipeline domain state in sync
      setPipeline((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stages: [
            ...prev.stages,
            { id, name: stageName, jobs: [], position: newPos },
          ],
        };
      });

      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "stageCard",
          position: newPos,
          data: { name: stageName, jobCount: 0 } as unknown as Record<string, unknown>,
        },
      ]);

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
    [nodes, edges, setNodes, setEdges, setPipeline],
  );

  // ── save ─────────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("saving");
    setError(null);
    try {
      const { stages, stageEdges } = getCurrentStagesAndEdges();
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
  }, [projectId, pipelineId, viewport, getCurrentStagesAndEdges]);

  // ── exportToYaml ─────────────────────────────────────────────────────────────
  const exportToYaml = useCallback(
    (format: "github" | "gitlab" | "azure" = "github") => {
      const { stages, stageEdges } = getCurrentStagesAndEdges();
      const stageOrder = topoSortStages(stages, stageEdges);

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
    [getCurrentStagesAndEdges, pipeline],
  );

  // ── deletePipeline ───────────────────────────────────────────────────────────
  const deletePipeline = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("deleting");
    setError(null);
    await api.pipelines.delete(projectId, pipelineId);
  }, [projectId, pipelineId]);

  // ── Node selection & drawer ──────────────────────────────────────────────────
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
    activeStageId,
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
    enterStage,
    exitStage,
    setViewport,
  };
};
