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

const CONFIG_PANEL_NODE_TYPES = new Set([
    "shell_command", "docker", "git", "test", "build", "deploy", "notification",
]);

interface PageGraphCanvasProps {
    projectId?: string;
    pipelineId?: string;
}

const PageGraphCanvas: React.FC<PageGraphCanvasProps> = ({ projectId, pipelineId }) => {
    const navigate = useNavigate();

    const {
        pipeline, pipelineStatus, setPipelineStatus,
        nodes, edges, status, error, savedOk,
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

    const selectedNode = nodes.find(
        (n) => n.id === selectedNodeId && CONFIG_PANEL_NODE_TYPES.has(n.type ?? ""),
    ) ?? null;

    const activeStageName = useMemo(
        () => (activeStageId ? (pipeline?.stages.find((s) => s.id === activeStageId)?.name ?? null) : null),
        [activeStageId, pipeline],
    );

    const activeJobName = useMemo(() => {
        if (!activeJobId) return null;
        const jobNode = nodes.find((n) => n.id === activeJobId);
        const jobNodeData = jobNode?.data as any | undefined;
        const nodeName: string | null =
            jobNodeData?.name ?? jobNodeData?.label ?? jobNodeData?.title ?? null;
        if (nodeName) return nodeName;
        if (!activeStageId) return null;
        const stage = pipeline?.stages.find((s) => s.id === activeStageId);
        return stage?.jobs.find((j) => j.id === activeJobId)?.name ?? null;
    }, [activeJobId, activeStageId, nodes, pipeline]);

    const defaultEdgeOptions = useMemo(
        () => ({ type: activeJobId ? "default" : activeStageId ? "jobEdge" : "stageEdge" }),
        [activeStageId, activeJobId],
    );

    const handleDelete = async () => {
        if (!window.confirm("Supprimer cette pipeline ? Cette action est irréversible.")) return;
        await deletePipeline();
        void navigate(`/projects/${projectId}/pipelines`);
    };

    const isPipelineView = !activeStageId && !activeJobId;

    if (status === "loading") return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", height: "calc(100vh - 3rem)", color: "rgba(120,115,150,0.7)", fontSize: 13 }}>
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
            <div className="flex items-center gap-2 px-4 py-0 h-11 shrink-0" style={{ background: "#111116", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
                        <span style={{ fontSize: 11, color: "rgba(52,211,153,0.8)", display: "flex", alignItems: "center", gap: 5 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Sauvegardé
                        </span>
                    )}
                    {/* Draft / Active toggle */}
                    <button
                        onClick={() => setPipelineStatus(pipelineStatus === "draft" ? "active" : "draft")}
                        title={pipelineStatus === "draft" ? "Passer en Actif" : "Repasser en Brouillon"}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: pipelineStatus === "draft"
                                ? "1px solid rgba(245,158,11,0.3)"
                                : "1px solid rgba(52,211,153,0.3)",
                            background: pipelineStatus === "draft"
                                ? "rgba(245,158,11,0.08)"
                                : "rgba(52,211,153,0.08)",
                            color: pipelineStatus === "draft"
                                ? "rgba(251,191,36,0.85)"
                                : "rgba(52,211,153,0.85)",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            textTransform: "uppercase",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.75";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                        }}
                    >
                        <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: pipelineStatus === "draft" ? "rgba(251,191,36,0.8)" : "rgba(52,211,153,0.8)",
                            flexShrink: 0,
                        }} />
                        {pipelineStatus === "draft" ? "Brouillon" : "Actif"}
                    </button>
                    <button
                        onClick={() => { void handleDelete(); }}
                        disabled={status === "deleting"}
                        style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: "rgba(248,113,113,0.8)",
                            background: "transparent",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                            e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                        }}
                    >
                        {status === "deleting" ? "Suppression..." : "Supprimer"}
                    </button>
                    {/* Export YAML split button */}
                    <div className="relative">
                        {exportDropdownOpen && (
                            <div className="fixed inset-0 z-10" onClick={() => setExportDropdownOpen(false)} />
                        )}
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                            <button
                                onClick={() => exportToYaml(exportFormat)}
                                title="Exporter en YAML"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "5px 10px",
                                    borderRadius: "6px 0 0 6px",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRight: "none",
                                    color: "rgba(200,200,220,0.75)",
                                    background: "rgba(255,255,255,0.04)",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                {formatLabels[exportFormat]}
                            </button>
                            <button
                                onClick={() => setExportDropdownOpen((o) => !o)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "5px 7px",
                                    borderRadius: "0 6px 6px 0",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "rgba(180,180,200,0.6)",
                                    background: "rgba(255,255,255,0.04)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>
                        </div>
                        {exportDropdownOpen && (
                            <ul style={{
                                position: "absolute",
                                right: 0,
                                zIndex: 20,
                                marginTop: 4,
                                width: 144,
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "#1c1c26",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                                overflow: "hidden",
                                padding: "3px 0",
                            }}>
                                {(["github", "gitlab", "azure"] as const).map((fmt) => (
                                    <li key={fmt} style={{ listStyle: "none" }}>
                                        <button
                                            onClick={() => { setExportFormat(fmt); setExportDropdownOpen(false); }}
                                            style={{
                                                width: "100%",
                                                textAlign: "left",
                                                padding: "7px 12px",
                                                fontSize: 12,
                                                color: exportFormat === fmt ? "#a78bfa" : "rgba(200,200,220,0.7)",
                                                fontWeight: exportFormat === fmt ? 600 : 400,
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                transition: "background 0.1s",
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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
                        style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: "1px solid rgba(124,58,237,0.4)",
                            background: "rgba(124,58,237,0.18)",
                            color: "#c4b5fd",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            opacity: status === "saving" ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(124,58,237,0.28)";
                            e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(124,58,237,0.18)";
                            e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)";
                        }}
                    >
                        {status === "saving" ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
                {/* Fixed bottom add button — context-aware, same pattern for all 3 levels */}
                <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
                    {isPipelineView && (
                        <button
                            onClick={() => addStage()}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "1px solid rgba(124,58,237,0.3)",
                                background: "rgba(15,12,26,0.9)",
                                color: "rgba(167,139,250,0.9)",
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: "0.02em",
                                cursor: "pointer",
                                backdropFilter: "blur(12px)",
                                transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(30,18,54,0.95)";
                                e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
                                e.currentTarget.style.color = "#c4b5fd";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(15,12,26,0.9)";
                                e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                                e.currentTarget.style.color = "rgba(167,139,250,0.9)";
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Stage
                        </button>
                    )}
                    {activeStageId && !activeJobId && (
                        <button
                            onClick={() => addJob()}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "1px solid rgba(79,70,229,0.3)",
                                background: "rgba(12,12,26,0.9)",
                                color: "rgba(129,140,248,0.9)",
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: "0.02em",
                                cursor: "pointer",
                                backdropFilter: "blur(12px)",
                                transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(20,18,48,0.95)";
                                e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
                                e.currentTarget.style.color = "#a5b4fc";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(12,12,26,0.9)";
                                e.currentTarget.style.borderColor = "rgba(79,70,229,0.3)";
                                e.currentTarget.style.color = "rgba(129,140,248,0.9)";
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Job
                        </button>
                    )}
                    {activeJobId && (
                        <button
                            onClick={() => addStepNode("shell_command")}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: "rgba(12,12,18,0.9)",
                                color: "rgba(200,200,220,0.8)",
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: "0.02em",
                                cursor: "pointer",
                                backdropFilter: "blur(12px)",
                                transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(24,24,36,0.95)";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                                e.currentTarget.style.color = "rgba(230,230,245,0.9)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(12,12,18,0.9)";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                                e.currentTarget.style.color = "rgba(200,200,220,0.8)";
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Task
                        </button>
                    )}
                </div>

                <GraphActionsContext.Provider
                    value={{ selectNode, enterStage, exitStage, openJobDrawer, enterJob, exitJob, addStage, addJob }}
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
                        onNodeClick={(_: React.MouseEvent, node: RFNode) => selectNode(node.id)}
                        onPaneClick={() => selectNode(null)}
                        onMoveEnd={(_: unknown, vp: RFViewport) => setViewport(vp)}
                        onNodeDragStart={onNodeDragStart}
                        onNodeDrag={onNodeDrag}
                        onNodeDragStop={onNodeDragStop}
                        colorMode="dark"
                        style={{ "--xy-background-color": "#0f0f12" } as React.CSSProperties}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            bgColor="#0f0f12"
                            color="#1e1e28"
                            gap={22}
                            size={1.3}
                        />
                        <Controls
                            style={{
                                background: "#1c1c26",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                            }}
                        />
                        <MiniMap
                            nodeColor={(node) => {
                                if (node.type === "stageCard" || node.type === "stageGroup") return "rgba(124,58,237,0.7)";
                                if (node.type === "jobCard" || node.type === "jobGroup") return "rgba(79,70,229,0.7)";

                                if (node.type === "shell_command") return "#3f3f50";
                                if (node.type === "docker") return "#1d4ed8";
                                if (node.type === "git") return "#c2410c";
                                if (node.type === "test") return "#15803d";
                                if (node.type === "build") return "#a16207";
                                if (node.type === "deploy") return "#4338ca";
                                if (node.type === "notification") return "#be185d";
                                return "#3f3f50";
                            }}
                            maskColor="rgba(0,0,0,0.65)"
                            style={{
                                background: "#14141c",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
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
