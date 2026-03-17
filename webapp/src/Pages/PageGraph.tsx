import React, { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    ReactFlow,
    ReactFlowProvider,
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
import { NodeConfigPanel } from "../Components/Graph/NodeConfigPanel";
import { GraphActionsContext } from "../Components/Graph/GraphActionsContext";
import StageEdge from "../Components/Graph/edges/StageEdge";
import JobEdge from "../Components/Graph/edges/JobEdge";
import PipelineBreadcrumb from "../Components/Graph/PipelineBreadcrumb";

const edgeTypes = { stageEdge: StageEdge, jobEdge: JobEdge };

/** Node types that open a config panel when selected (step-level nodes, not stage/job cards) */
const CONFIG_PANEL_NODE_TYPES = new Set([
    "trigger", "shell_command", "docker", "git", "test", "build", "deploy", "notification", "condition",
]);

interface PageGraphCanvasProps {
    projectId?: string;
    pipelineId?: string;
}

const PageGraphCanvas: React.FC<PageGraphCanvasProps> = ({ projectId, pipelineId }) => {
    const navigate = useNavigate();

    const {
        pipeline, nodes, edges, status, error, savedOk,
        selectedNodeId, activeStageId, activeJobId,
        onNodesChange, onEdgesChange, onConnect, onNodeDragStart, onNodeDrag, onNodeDragStop,
        addJob, addStage, addStepNode, save, exportToYaml, deletePipeline,
        selectNode, enterStage, exitStage, enterJob, exitJob, exitJobAndStage,
        updateNodeData, setViewport,
        openJobDrawer,
    } = usePipeline(projectId, pipelineId);

    const [exportFormat, setExportFormat] = useState<"github" | "gitlab" | "azure">("github");
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

    const formatLabels: Record<"github" | "gitlab" | "azure", string> = {
        github: "GitHub Actions",
        gitlab: "GitLab CI",
        azure: "Azure DevOps",
    };

    // Only show NodeConfigPanel for step-type nodes (not stage/job cards)
    const selectedNode = nodes.find(
        (n) => n.id === selectedNodeId && CONFIG_PANEL_NODE_TYPES.has(n.type ?? ""),
    ) ?? null;

    // Active stage name for breadcrumb
    const activeStageName = useMemo(
        () => (activeStageId ? (pipeline?.stages.find((s) => s.id === activeStageId)?.name ?? null) : null),
        [activeStageId, pipeline],
    );

    // Active job name for breadcrumb
    const activeJobName = useMemo(() => {
        if (!activeJobId) return null;

        // Prefer the ReactFlow node data, which is kept in sync while editing
        const jobNode = nodes.find((n) => n.id === activeJobId);
        const jobNodeData = jobNode?.data as any | undefined;
        const nodeName: string | null =
            jobNodeData?.name ??
            jobNodeData?.label ??
            jobNodeData?.title ??
            null;

        if (nodeName) {
            return nodeName;
        }

        // Fallback to pipeline data (e.g. immediately after initial load)
        if (!activeStageId) return null;
        const stage = pipeline?.stages.find((s) => s.id === activeStageId);
        return stage?.jobs.find((j) => j.id === activeJobId)?.name ?? null;
    }, [activeJobId, activeStageId, nodes, pipeline]);

    // Dynamic edge options: stageEdge → jobEdge → default (step level)
    const defaultEdgeOptions = useMemo(
        () => ({ type: activeJobId ? "default" : activeStageId ? "jobEdge" : "stageEdge" }),
        [activeStageId, activeJobId],
    );

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
                {/* Breadcrumb */}
                <PipelineBreadcrumb
                    projectId={projectId ?? ""}
                    pipelineName={pipeline?.name ?? "Pipeline"}
                    stageName={activeStageName}
                    onExitStage={exitStage}
                    jobName={activeJobName}
                    onExitJob={exitJob}
                    onExitJobAndStage={exitJobAndStage}
                />

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
                    {/* Export YAML split button */}
                    <div className="relative">
                        {exportDropdownOpen && (
                            <div className="fixed inset-0 z-10" onClick={() => setExportDropdownOpen(false)} />
                        )}
                        <div className="flex items-stretch">
                            <button
                                onClick={() => exportToYaml(exportFormat)}
                                title="Exporter en YAML"
                                className="px-3 py-1.5 rounded-l-md border border-r-0 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                {formatLabels[exportFormat]}
                            </button>
                            <button
                                onClick={() => setExportDropdownOpen((o) => !o)}
                                className="px-1.5 py-1.5 rounded-r-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>
                        </div>
                        {exportDropdownOpen && (
                            <ul className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg text-xs">
                                {(["github", "gitlab", "azure"] as const).map((fmt) => (
                                    <li key={fmt}>
                                        <button
                                            onClick={() => { setExportFormat(fmt); setExportDropdownOpen(false); }}
                                            className={`w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${exportFormat === fmt ? "text-accent-500 font-medium" : "text-zinc-600 dark:text-zinc-300"
                                                }`}
                                        >
                                            {formatLabels[fmt]}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
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
                {/* Floating toolbar — context-aware */}
                <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10 }} className="flex flex-col gap-2">
                    {activeJobId ? (
                        /* Job canvas: add first task (trigger) */
                        <button
                            onClick={() => addStepNode("shell_command")}
                            title="Ajouter une task dans ce job"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/10 hover:border-zinc-400/60 text-xs font-medium transition-colors shadow-md bg-zinc-900"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                            + Task
                        </button>
                    ) : !activeStageId ? (
                        /* Pipeline view: only add stage */
                        <button
                            onClick={() => addStage()}
                            title="Ajouter une nouvelle stage"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 hover:border-violet-400/60 text-xs font-medium transition-colors shadow-md bg-zinc-900"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                            + Stage
                        </button>
                    ) : (
                        /* Stage view: only add job */
                        <button
                            onClick={() => addJob()}
                            title="Ajouter un job dans cette stage"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400/60 text-xs font-medium transition-colors shadow-md bg-zinc-900"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                            + Job
                        </button>
                    )}
                </div>

                <GraphActionsContext.Provider
                    value={{ selectNode, enterStage, exitStage, openJobDrawer, enterJob, exitJob }}
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={(_: React.MouseEvent, node: RFNode) => {
                            selectNode(node.id);
                        }}
                        onPaneClick={() => selectNode(null)}
                        onMoveEnd={(_: unknown, vp: RFViewport) => setViewport(vp)}
                        onNodeDragStart={onNodeDragStart}
                        onNodeDrag={onNodeDrag}
                        onNodeDragStop={onNodeDragStop}
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
                        <MiniMap
                            nodeColor={(node) => {
                                if (node.type === "stageCard" || node.type === "stageGroup") return "rgba(139,92,246,0.6)";
                                if (node.type === "jobCard" || node.type === "jobGroup") return "rgba(99,102,241,0.6)";
                                if (node.type === "trigger") return "#7c3aed";
                                if (node.type === "shell_command") return "#52525b";
                                if (node.type === "docker") return "#2563eb";
                                if (node.type === "git") return "#ea580c";
                                if (node.type === "test") return "#16a34a";
                                if (node.type === "build") return "#ca8a04";
                                if (node.type === "deploy") return "#4f46e5";
                                if (node.type === "notification") return "#db2777";
                                if (node.type === "condition") return "#d97706";
                                return "#52525b";
                            }}
                            maskColor="rgba(0,0,0,0.6)"
                            style={{
                                background: "rgba(15,10,30,0.8)",
                                border: "1px solid rgba(139,92,246,0.2)",
                                borderRadius: 8,
                            }}
                        />
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

const PageGraph: React.FC = () => {
    const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
    return (
        <ReactFlowProvider>
            <PageGraphCanvas projectId={projectId} pipelineId={pipelineId} />
        </ReactFlowProvider>
    );
};

export default PageGraph;
