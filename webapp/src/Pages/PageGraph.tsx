import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type OnConnect,
    type Node as RFNode,
    type Edge as RFEdge,
    type Viewport as RFViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../Api/client";
import { GraphNode, GraphEdge, Graph, Viewport } from "../Api/types";

/** Convert backend GraphNode → React Flow Node */
function toRFNode(n: GraphNode): RFNode {
    return {
        id: n.id,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: { label: n.data.label },
    };
}

/** Convert backend GraphEdge → React Flow Edge */
function toRFEdge(e: GraphEdge): RFEdge {
    return { id: e.id, source: e.source, target: e.target, type: e.type };
}

/** Convert React Flow Node → backend GraphNode (preserve existing data) */
function toBackendNode(rfNode: RFNode, existing: GraphNode | undefined): GraphNode {
    return {
        id: rfNode.id,
        type: rfNode.type ?? "default",
        positionX: rfNode.position.x,
        positionY: rfNode.position.y,
        data: existing?.data ?? {
            label: String(rfNode.data?.label ?? rfNode.id),
            description: "",
            params: { baseParameters: {} },
            env: {},
            secrets: {},
        },
    };
}

const PageGraph: React.FC = () => {
    const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
    const navigate = useNavigate();

    const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
    const [pipeline, setPipeline] = useState<Graph | null>(null);
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedOk, setSavedOk] = useState(false);

    useEffect(() => {
        if (!projectId || !pipelineId) return;
        api.pipelines.getById(projectId, pipelineId)
            .then((p) => {
                setPipeline(p);
                setNodes(p.nodes.map(toRFNode));
                setEdges(p.edges.map(toRFEdge));
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Erreur de chargement");
            })
            .finally(() => setLoading(false));
    }, [projectId, pipelineId]);

    const onConnect: OnConnect = useCallback(
        (connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges],
    );

    const handleSave = async () => {
        if (!projectId || !pipelineId) return;
        setSaving(true);
        setError(null);
        try {
            const backendNodes = nodes.map((rfNode) => {
                const existing = pipeline?.nodes.find((n) => n.id === rfNode.id);
                return toBackendNode(rfNode, existing);
            });
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
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!projectId || !pipelineId) return;
        if (!window.confirm("Supprimer cette pipeline ? Cette action est irréversible.")) return;
        setDeleting(true);
        setError(null);
        try {
            await api.pipelines.delete(projectId, pipelineId);
            void navigate(`/projects/${projectId}/pipelines`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de suppression");
            setDeleting(false);
        }
    };

    const handleAddNode = () => {
        const id = `node-${Date.now()}`;
        setNodes((nds) => [
            ...nds,
            {
                id,
                type: "default",
                position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
                data: { label: "Nouveau nœud" },
            },
        ]);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-gray-500">
            Chargement...
        </div>
    );

    if (error && !pipeline) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
            <p className="text-red-500">{error}</p>
            <Link to={`/projects/${projectId}/pipelines`} className="text-indigo-600 hover:underline text-sm">
                ← Retour aux pipelines
            </Link>
        </div>
    );

    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <Link
                    to={`/projects/${projectId}/pipelines`}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                >
                    ← Pipelines
                </Link>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {pipeline?.name ?? "Pipeline"}
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                    onClick={handleAddNode}
                    className="text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    + Nœud
                </button>
                <div className="ml-auto flex items-center gap-3">
                    {error && <span className="text-sm text-red-500">{error}</span>}
                    {savedOk && <span className="text-sm text-green-500">Sauvegardé ✓</span>}
                    <button
                        onClick={() => { void handleDelete(); }}
                        disabled={deleting}
                        className="px-4 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 text-sm font-medium transition"
                    >
                        {deleting ? "..." : "Supprimer"}
                    </button>
                    <button
                        onClick={() => { void handleSave(); }}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition"
                    >
                        {saving ? "..." : "Sauvegarder"}
                    </button>
                </div>
            </div>

            {/* React Flow canvas */}
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    colorMode="system"
                    onMoveEnd={(_: unknown, vp: RFViewport) => setViewport(vp)}
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </div>
    );
};

export default PageGraph;
