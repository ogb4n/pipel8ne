import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    type Viewport as RFViewport,
    type Node as RFNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { usePipeline } from "../hooks/usePipeline";
import { nodeTypes } from "../Components/Graph/nodeTypes";
import NodePalette from "../Components/Graph/NodePalette";
import { NodeConfigPanel } from "../Components/Graph/NodeConfigPanel";
import { GraphActionsContext } from "../Components/Graph/GraphActionsContext";
import RerouteEdge from "../Components/Graph/RerouteEdge";
import type { NodeType, NodeData } from "../Api/types";

const edgeTypes = { reroute: RerouteEdge };
const defaultEdgeOptions = { type: "reroute" } as const;

const PageGraph: React.FC = () => {
    const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
    const navigate = useNavigate();

    const {
        pipeline, nodes, edges, status, error, savedOk,
        selectedNodeId, onNodesChange, onEdgesChange, onConnect, onNodeDragStop,
        addNode, addJob, save, exportToYaml, deletePipeline, selectNode, updateNodeData, setViewport,
    } = usePipeline(projectId, pipelineId);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId && n.type !== "jobGroup") ?? null;

    const handleDelete = async () => {
        if (!window.confirm("Supprimer cette pipeline ? Cette action est irréversible.")) return;
        await deletePipeline();
        void navigate(`/projects/${projectId}/pipelines`);
    };

    if (status === "loading") return (
        <div className="flex items-center gap-2 justify-center h-[calc(100vh-3rem)] text-zinc-400 dark:text-zinc-500 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Chargement...
        </div>
    );

    if (error && !pipeline) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-3rem)] gap-3">
            <p className="text-sm text-red-500">{error}</p>
            <Link to={`/projects/${projectId}/pipelines`} className="text-xs text-accent-500 hover:text-accent-400 transition-colors">
                ← Retour aux pipelines
            </Link>
        </div>
    );

    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 3rem)" }}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-0 h-11 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <Link
                    to={`/projects/${projectId}/pipelines`}
                    className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                    Pipelines
                </Link>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 dark:text-zinc-700">
                    <path d="m9 18 6-6-6-6" />
                </svg>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                    {pipeline?.name ?? "Pipeline"}
                </span>

                <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                <NodePalette onAdd={(type: NodeType, data: NodeData) => addNode(type, data)} />

                {/* Add Job button */}
                <button
                    onClick={() => addJob()}
                    title="Ajouter un nouveau job"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400/60 text-xs font-medium transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M12 8v8M8 12h8" />
                    </svg>
                    Add Job
                </button>

                <div className="ml-auto flex items-center gap-2">
                    {error && <span className="text-xs text-red-500">{error}</span>}
                    {savedOk && (
                        <span className="text-xs text-emerald-500 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Sauvegardé
                        </span>
                    )}
                    <button
                        onClick={() => { void handleDelete(); }}
                        disabled={status === "deleting"}
                        className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900/50 disabled:opacity-50 text-xs font-medium transition-colors"
                    >
                        {status === "deleting" ? "Suppression..." : "Supprimer"}
                    </button>
                    <button
                        onClick={exportToYaml}
                        title="Exporter en YAML"
                        className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export YAML
                    </button>
                    <button
                        onClick={() => { void save(); }}
                        disabled={status === "saving"}
                        className="px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                    >
                        {status === "saving" ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
                <GraphActionsContext.Provider value={{ selectNode }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={(_: React.MouseEvent, node: RFNode) => selectNode(node.id)}
                        onPaneClick={() => selectNode(null)}
                        onMoveEnd={(_: unknown, vp: RFViewport) => setViewport(vp)}
                        onNodeDragStop={onNodeDragStop}
                        fitView
                        colorMode="dark"
                        style={{ "--xy-background-color": "#171717" } as React.CSSProperties}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            bgColor="#171717"
                            color="#494949"
                            gap={18}
                            size={1.2}
                        />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>

                    {selectedNode && (
                        <NodeConfigPanel
                            node={selectedNode}
                            onClose={() => selectNode(null)}
                            onUpdate={(id, data) => updateNodeData(id, data)}
                        />
                    )}
                </GraphActionsContext.Provider>
            </div>
        </div>
    );
};

export default PageGraph;

