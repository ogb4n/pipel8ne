import { useCallback, useEffect, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type Node as RFNode,
  type Edge as RFEdge,
} from "@xyflow/react";
import { api } from "../Api/client";
import type { Graph, GraphNode, GraphEdge, NodeType, NodeData, Viewport } from "../Api/types";

/** Convert backend GraphNode → React Flow Node */
const toRFNode = (n: GraphNode): RFNode => ({
  id: n.id,
  type: n.type,
  position: { x: n.positionX, y: n.positionY },
  // React Flow custom nodes receive the whole data object
  data: n.data as unknown as Record<string, unknown>,
});

/** Convert React Flow Node → backend GraphNode (preserve existing data) */
const toBackendNode = (rfNode: RFNode, existing?: GraphNode): GraphNode => ({
  id: rfNode.id,
  type: (rfNode.type ?? "shell_command") as NodeType,
  positionX: rfNode.position.x,
  positionY: rfNode.position.y,
  data: (rfNode.data as unknown as NodeData) ??
    existing?.data ?? {
      label: rfNode.id,
      description: "",
      params: { baseParameters: {} },
      env: {},
      secrets: {},
    },
});

const toRFEdge = (e: GraphEdge): RFEdge => ({
  id: e.id,
  source: e.source,
  target: e.target,
  type: e.type,
});

/**
 * usePipeline — isole tout le state et les I/O API de la vue PageGraph.
 */
export const usePipeline = (projectId?: string, pipelineId?: string) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [pipeline, setPipeline] = useState<Graph | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "deleting">("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // Load
  useEffect(() => {
    if (!projectId || !pipelineId) return;
    setStatus("loading");
    api.pipelines
      .getById(projectId, pipelineId)
      .then((p) => {
        setPipeline(p);
        setNodes(p.nodes.map(toRFNode));
        setEdges(p.edges.map((n) => toRFEdge(n)));
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

  const addNode = useCallback(
    (type: NodeType, data: NodeData) => {
      const id = `node-${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position: { x: Math.random() * 300 + 80, y: Math.random() * 200 + 80 },
          data: data as unknown as Record<string, unknown>,
        },
      ]);
    },
    [setNodes],
  );

  const save = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("saving");
    setError(null);
    try {
      const backendNodes = nodes.map((rfNode) =>
        toBackendNode(
          rfNode,
          pipeline?.nodes.find((n) => n.id === rfNode.id),
        ),
      );
      const backendEdges: GraphEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type ?? "default",
      }));
      const result = await api.pipelines.update(projectId, pipelineId, {
        viewport,
        nodes: backendNodes,
        edges: backendEdges,
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

  const deletePipeline = useCallback(async () => {
    if (!projectId || !pipelineId) return;
    setStatus("deleting");
    setError(null);
    await api.pipelines.delete(projectId, pipelineId);
    // caller handles navigation
  }, [projectId, pipelineId]);

  return {
    pipeline,
    nodes,
    edges,
    status,
    error,
    savedOk,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    save,
    deletePipeline,
    setViewport,
  };
};
