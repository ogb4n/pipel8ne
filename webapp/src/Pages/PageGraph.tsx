import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Viewport as RFViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { usePipeline } from "../hooks/usePipeline";
import { nodeTypes } from "../Components/Graph/nodeTypes";
import NodePalette from "../Components/Graph/NodePalette";
import type { NodeType, NodeData } from "../Api/types";

const PageGraph: React.FC = () => {
    const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
    const navigate = useNavigate();

    const {
        pipeline, nodes, edges, status, error, savedOk,
        onNodesChange, onEdgesChange, onConnect,
        addNode, save, deletePipeline, setViewport,
    } = usePipeline(projectId, pipelineId);

    const handleDelete = async () => {
        if (!window.confirm("Supprimer cette pipeline ? Cette action est irréversible.")) return;
        await deletePipeline();
        void navigate(`/projects/${projectId}/pipelines`);
    };

    if (status === "loading") return (
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

                <NodePalette onAdd={(type: NodeType, data: NodeData) => addNode(type, data)} />

                <div className="ml-auto flex items-center gap-3">
                    {error && <span className="text-sm text-red-500">{error}</span>}
                    {savedOk && <span className="text-sm text-green-500">Sauvegardé ✓</span>}
                    <button
                        onClick={() => { void handleDelete(); }}
                        disabled={status === "deleting"}
                        className="px-4 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 text-sm font-medium transition"
                    >
                        {status === "deleting" ? "..." : "Supprimer"}
                    </button>
                    <button
                        onClick={() => { void save(); }}
                        disabled={status === "saving"}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition"
                    >
                        {status === "saving" ? "..." : "Sauvegarder"}
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onMoveEnd={(_: unknown, vp: RFViewport) => setViewport(vp)}
                    fitView
                    colorMode="system"
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

