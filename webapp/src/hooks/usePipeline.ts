import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type Node as RFNode,
  type Edge as RFEdge,
} from "@xyflow/react";
import { api } from "../Api/client";
import type { Graph, Job, GraphNode, GraphEdge, NodeType, NodeData, Viewport } from "../Api/types";

// ── Constants ────────────────────────────────────────────────────────────────

const JOB_DEFAULT_WIDTH = 440;
const JOB_DEFAULT_HEIGHT = 340;

// ── RF <-> Domain converters ─────────────────────────────────────────────────

/** Convert a single Job → RF group node + RF child nodes for its steps */
function jobToRFNodes(job: Job): RFNode[] {
  const groupNode: RFNode = {
    id: job.id,
    type: "jobGroup",
    position: job.position,
    style: { width: JOB_DEFAULT_WIDTH, height: JOB_DEFAULT_HEIGHT },
    data: { name: job.name, runsOn: job.runsOn } as unknown as Record<string, unknown>,
  };
  const stepNodes: RFNode[] = job.steps.map((step) => ({
    id: step.id,
    type: step.type,
    position: { x: step.positionX, y: step.positionY },
    parentId: job.id,
    // No extent: "parent" — nodes can be dragged freely across jobs
    data: step.data as unknown as Record<string, unknown>,
  }));
  // Group node must come before its children in the array
  return [groupNode, ...stepNodes];
}

function toRFEdge(e: GraphEdge): RFEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "reroute",
    data: e.waypoint ? { waypoint: e.waypoint } : {},
  };
}

// ── Reparenting helpers ───────────────────────────────────────────────────────

/** Get the absolute canvas position of a node (accounts for parentId offset). */
function getAbsolutePos(node: RFNode, allNodes: RFNode[]): { x: number; y: number } {
  if (!node.parentId) return node.position;
  const parent = allNodes.find((n) => n.id === node.parentId);
  if (!parent) return node.position;
  const parentAbs = getAbsolutePos(parent, allNodes);
  return { x: parentAbs.x + node.position.x, y: parentAbs.y + node.position.y };
}

/**
 * Find the job group that contains the given absolute position.
 * Returns the group node, or null if none.
 */
function findJobAtPos(absPos: { x: number; y: number }, allNodes: RFNode[]): RFNode | null {
  const groups = allNodes.filter((n) => n.type === "jobGroup");
  for (const g of groups) {
    const w = typeof g.style?.width === "number" ? g.style.width : JOB_DEFAULT_WIDTH;
    const h = typeof g.style?.height === "number" ? g.style.height : JOB_DEFAULT_HEIGHT;
    if (
      absPos.x >= g.position.x &&
      absPos.x <= g.position.x + w &&
      absPos.y >= g.position.y &&
      absPos.y <= g.position.y + h
    ) {
      return g;
    }
  }
  return null;
}

/** Convert RF nodes + RF edges → Job[] + jobEdges[] */
function rfToJobs(
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
  existingJobs: Job[],
): { jobs: Job[]; jobEdges: GraphEdge[] } {
  const groupIds = new Set(rfNodes.filter((n) => n.type === "jobGroup").map((n) => n.id));

  const toBackendEdge = (e: RFEdge): GraphEdge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "reroute",
    waypoint: (e.data as { waypoint?: { x: number; y: number } } | undefined)?.waypoint,
  });

  // jobEdges: RF edges where both source and target are job group ids
  const jobEdges: GraphEdge[] = rfEdges
    .filter((e) => groupIds.has(e.source) && groupIds.has(e.target))
    .map(toBackendEdge);

  // stepEdges per job: RF edges between non-group nodes grouped by source node's parent
  const stepEdgesMap: Record<string, GraphEdge[]> = {};
  for (const e of rfEdges) {
    if (groupIds.has(e.source) || groupIds.has(e.target)) continue;
    const sourceNode = rfNodes.find((n) => n.id === e.source);
    const jobId = sourceNode?.parentId;
    if (!jobId) continue;
    if (!stepEdgesMap[jobId]) stepEdgesMap[jobId] = [];
    stepEdgesMap[jobId].push(toBackendEdge(e));
  }

  const jobs: Job[] = rfNodes
    .filter((n) => n.type === "jobGroup")
    .map((groupNode) => {
      const existingJob = existingJobs.find((j) => j.id === groupNode.id);
      const stepRFNodes = rfNodes.filter((n) => n.parentId === groupNode.id);
      const data = groupNode.data as { name?: string; runsOn?: string };
      return {
        id: groupNode.id,
        name: data.name ?? existingJob?.name ?? "job",
        runsOn: data.runsOn ?? existingJob?.runsOn ?? "ubuntu-latest",
        position: groupNode.position,
        steps: stepRFNodes.map((n): GraphNode => {
          const existing = existingJob?.steps.find((s) => s.id === n.id);
          return {
            id: n.id,
            type: (n.type ?? "shell_command") as NodeType,
            positionX: n.position.x,
            positionY: n.position.y,
            data: (n.data as unknown as NodeData) ??
              existing?.data ?? {
                label: n.id,
                description: "",
                params: { baseParameters: {} },
                env: {},
                secrets: {},
              },
          };
        }),
        stepEdges: stepEdgesMap[groupNode.id] ?? [],
      };
    });

  return { jobs, jobEdges };
}

// ── Legacy flat-graph detection ───────────────────────────────────────────────
// Documents saved before the Job refactor have nodes/edges at the root level.
// We auto-wrap them in a single "default" job so they remain editable.

type LegacyGraph = Omit<Graph, "jobs" | "jobEdges"> & {
  jobs?: Job[];
  jobEdges?: GraphEdge[];
  /** Legacy fields */
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

function normalizeLegacyGraph(raw: LegacyGraph): Graph {
  if (raw.jobs && raw.jobs.length > 0) {
    return raw as Graph;
  }
  const legacyNodes: GraphNode[] = raw.nodes ?? [];
  const legacyEdges: GraphEdge[] = raw.edges ?? [];
  return {
    id: raw.id,
    projectId: raw.projectId,
    name: raw.name,
    viewport: raw.viewport,
    jobs:
      legacyNodes.length > 0
        ? [
            {
              id: "job-default",
              name: "default",
              runsOn: "ubuntu-latest",
              position: { x: 80, y: 80 },
              steps: legacyNodes,
              stepEdges: legacyEdges,
            },
          ]
        : [],
    jobEdges: [],
  };
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

  // Load
  useEffect(() => {
    if (!projectId || !pipelineId) return;
    setStatus("loading");
    api.pipelines
      .getById(projectId, pipelineId)
      .then((raw) => {
        const p = normalizeLegacyGraph(raw as LegacyGraph);
        setPipeline(p);
        const rfNodes = p.jobs.flatMap(jobToRFNodes);
        const rfEdges: RFEdge[] = [
          ...p.jobs.flatMap((j) => j.stepEdges.map(toRFEdge)),
          ...p.jobEdges.map(toRFEdge),
        ];
        setNodes(rfNodes);
        setEdges(rfEdges);
        setStatus("idle");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
        setStatus("idle");
      });
  }, [projectId, pipelineId]);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  /**
   * On drag stop: if a step node was dropped onto a different job group,
   * reparent it (update parentId and convert position to relative coordinates).
   */
  const onNodeDragStop = useCallback(
    (_event: ReactMouseEvent, draggedNode: RFNode) => {
      // Only handle step nodes (not job group nodes)
      if (draggedNode.type === "jobGroup") return;

      setNodes((nds) => {
        const absPos = getAbsolutePos(draggedNode, nds);
        const targetJob = findJobAtPos(absPos, nds);

        // Not over any job — keep current parent (node stays where dropped)
        if (!targetJob) return nds;
        // Already in the right job — nothing to do
        if (targetJob.id === draggedNode.parentId) return nds;

        // Reparent: convert absolute position to relative to the new parent
        const relPos = {
          x: absPos.x - targetJob.position.x,
          y: absPos.y - targetJob.position.y,
        };

        return nds.map((n) =>
          n.id === draggedNode.id ? { ...n, parentId: targetJob.id, position: relPos } : n,
        );
      });
    },
    [setNodes],
  );

  /**
   * Add a new step node to a specific job (or the first job if none specified).
   */
  const addNode = useCallback(
    (type: NodeType, data: NodeData, jobId?: string) => {
      const id = `node-${Date.now()}`;
      const targetJobId = jobId ?? nodes.find((n) => n.type === "jobGroup")?.id;
      if (!targetJobId) {
        console.warn("No job exists. Create a job first before adding steps.");
        return;
      }
      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position: { x: 40 + Math.random() * 200, y: 60 + Math.random() * 100 },
          parentId: targetJobId,
          extent: "parent" as const,
          data: data as unknown as Record<string, unknown>,
        },
      ]);
    },
    [setNodes, nodes],
  );

  /**
   * Add a new empty Job (group node) to the canvas.
   */
  const addJob = useCallback(
    (name = "new-job", runsOn = "ubuntu-latest") => {
      const id = `job-${Date.now()}`;
      const jobCount = nodes.filter((n) => n.type === "jobGroup").length;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "jobGroup",
          position: { x: 80 + jobCount * 500, y: 80 },
          style: { width: JOB_DEFAULT_WIDTH, height: JOB_DEFAULT_HEIGHT },
          data: { name, runsOn } as unknown as Record<string, unknown>,
        },
      ]);
    },
    [setNodes, nodes],
  );

  const save = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("saving");
    setError(null);
    try {
      const { jobs, jobEdges } = rfToJobs(nodes, edges, pipeline?.jobs ?? []);
      const result = await api.pipelines.update(projectId, pipelineId, {
        viewport,
        jobs,
        jobEdges,
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

  const exportToYaml = useCallback(() => {
    const { jobs, jobEdges } = rfToJobs(nodes, edges, pipeline?.jobs ?? []);

    // Build job-level depends_on from jobEdges
    const jobDepsMap: Record<string, string[]> = {};
    jobEdges.forEach((e) => {
      if (!jobDepsMap[e.target]) jobDepsMap[e.target] = [];
      const depJob = jobs.find((j) => j.id === e.source);
      if (depJob) jobDepsMap[e.target].push(depJob.name);
    });

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

    const buildStepDepsMap = (job: Job): Record<string, string[]> => {
      const map: Record<string, string[]> = {};
      job.stepEdges.forEach((e) => {
        if (!map[e.target]) map[e.target] = [];
        const depStep = job.steps.find((s) => s.id === e.source);
        if (depStep) map[e.target].push(depStep.data.label);
      });
      return map;
    };

    const jobsYaml: Record<string, unknown> = {};
    for (const job of jobs) {
      const stepDepsMap = buildStepDepsMap(job);
      const jobEntry: Record<string, unknown> = { "runs-on": job.runsOn };
      const deps = jobDepsMap[job.id];
      if (deps?.length) jobEntry.needs = deps;
      jobEntry.steps = job.steps.map((step) => {
        const entry: Record<string, unknown> = {
          id: step.id,
          name: step.data.label,
          type: step.type,
        };
        if (step.data.description) entry.description = step.data.description;
        const stepDeps = stepDepsMap[step.id];
        if (stepDeps?.length) entry.depends_on = stepDeps;
        const baseParams = step.data.params?.baseParameters ?? {};
        if (Object.keys(baseParams).length > 0) entry.params = baseParams;
        if (Object.keys(step.data.env ?? {}).length > 0) entry.env = step.data.env;
        const secretKeys = Object.keys(step.data.secrets ?? {});
        if (secretKeys.length > 0) entry.secrets = secretKeys;
        return entry;
      });
      jobsYaml[job.name] = jobEntry;
    }

    const doc: Record<string, unknown> = {
      name: pipeline?.name ?? "pipeline",
      pipel8ne_version: "1.0",
      jobs: jobsYaml,
    };

    let yaml = "";
    for (const [k, v] of Object.entries(doc)) {
      const s = yamlValue(v, 1);
      yaml += s.startsWith("\n") ? `${k}:${s}\n` : `${k}: ${s}\n`;
    }

    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(pipeline?.name ?? "pipeline").replace(/\s+/g, "-").toLowerCase()}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges, pipeline]);

  const deletePipeline = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("deleting");
    setError(null);
    await api.pipelines.delete(projectId, pipelineId);
  }, [projectId, pipelineId]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

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
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    addNode,
    addJob,
    save,
    exportToYaml,
    deletePipeline,
    selectNode,
    updateNodeData,
    setViewport,
  };
};
