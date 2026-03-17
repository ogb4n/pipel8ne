import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { GraphNode, GraphEdge } from "../../../Api/types";
import { useGraphActions } from "../GraphActionsContext";

interface JobCardData {
    name: string;
    runsOn: string;
    steps: GraphNode[];
    stepEdges: GraphEdge[];
    dragOver?: boolean;
}

interface JobCardNodeProps {
    id: string;
    data: JobCardData;
    selected?: boolean;
}

const JobCardNode: React.FC<JobCardNodeProps> = ({ id, data, selected }) => {
    const { setNodes } = useReactFlow();
    const { enterJob } = useGraphActions();
    const [editingName, setEditingName] = useState(false);
    const [editingRunner, setEditingRunner] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const runnerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingName) nameRef.current?.focus();
    }, [editingName]);

    useEffect(() => {
        if (editingRunner) runnerRef.current?.focus();
    }, [editingRunner]);

    const commitName = (value: string) => {
        setNodes((nds) =>
            nds.map((n) =>
                n.id === id
                    ? { ...n, data: { ...(n.data as Record<string, unknown>), name: value } }
                    : n,
            ),
        );
        setEditingName(false);
    };

    const commitRunner = (value: string) => {
        setNodes((nds) =>
            nds.map((n) =>
                n.id === id
                    ? { ...n, data: { ...(n.data as Record<string, unknown>), runsOn: value } }
                    : n,
            ),
        );
        setEditingRunner(false);
    };

    const stepCount = data.steps?.length ?? 0;

    return (
        <>
            <Handle type="target" position={Position.Left} id="job-in" style={{ top: "50%" }} />
            <Handle type="source" position={Position.Right} id="job-out" style={{ top: "50%" }} />

            <div
                style={{
                    width: 280,
                    height: 100,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: 8,
                    border: `1px solid ${data.dragOver
                            ? "rgba(99,102,241,0.9)"
                            : selected
                                ? "rgba(99,102,241,0.7)"
                                : "rgba(99,102,241,0.35)"
                        }`,
                    background: data.dragOver ? "rgba(99,102,241,0.10)" : "rgba(18,18,40,0.60)",
                    boxShadow: selected ? "0 0 0 2px rgba(99,102,241,0.2)" : "none",
                    transition: "border-color 0.12s, background 0.12s, box-shadow 0.12s",
                    cursor: "pointer",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 10px",
                        height: 40,
                        flexShrink: 0,
                        borderBottom: `1px solid ${data.dragOver
                                ? "rgba(99,102,241,0.6)"
                                : selected
                                    ? "rgba(99,102,241,0.5)"
                                    : "rgba(99,102,241,0.25)"
                            }`,
                        background: data.dragOver ? "rgba(79,70,229,0.22)" : "rgba(79,70,229,0.16)",
                        userSelect: "none",
                        transition: "background 0.12s, border-color 0.12s",
                    }}
                >
                    {/* "JOB" badge */}
                    <span
                        style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: "rgba(129,140,248,0.9)",
                            background: "rgba(99,102,241,0.18)",
                            border: "1px solid rgba(99,102,241,0.3)",
                            borderRadius: 3,
                            padding: "1px 4px",
                            flexShrink: 0,
                        }}
                    >
                        JOB
                    </span>

                    {/* Job name */}
                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            style={{
                                background: "transparent",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "rgba(199,210,254,1)",
                                outline: "none",
                                borderBottom: "1px solid rgba(129,140,248,0.7)",
                                flex: 1,
                                minWidth: 0,
                            }}
                            onBlur={(e) => commitName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitName((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setEditingName(false);
                            }}
                        />
                    ) : (
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "rgba(199,210,254,1)",
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            onDoubleClick={() => setEditingName(true)}
                            title={`Double-clic pour renommer — ${data.name}`}
                        >
                            {data.name || "job"}
                        </span>
                    )}

                    {/* runsOn badge */}
                    {editingRunner ? (
                        <input
                            ref={runnerRef}
                            defaultValue={data.runsOn}
                            style={{
                                background: "transparent",
                                fontSize: 10,
                                color: "rgba(148,163,184,1)",
                                outline: "none",
                                borderBottom: "1px solid rgba(100,116,139,0.7)",
                                width: 100,
                                flexShrink: 0,
                            }}
                            onBlur={(e) => commitRunner(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitRunner((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setEditingRunner(false);
                            }}
                        />
                    ) : (
                        <span
                            style={{
                                fontSize: 10,
                                color: "rgba(148,163,184,0.8)",
                                background: "rgba(30,41,59,0.6)",
                                border: "1px solid rgba(51,65,85,0.5)",
                                borderRadius: 3,
                                padding: "1px 5px",
                                fontFamily: "monospace",
                                flexShrink: 0,
                                maxWidth: 110,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            onDoubleClick={() => setEditingRunner(true)}
                            title={`Double-clic pour modifier le runner — ${data.runsOn}`}
                        >
                            {data.runsOn || "ubuntu-latest"}
                        </span>
                    )}
                </div>

                {/* Body — double-click to open job canvas */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 12px",
                        cursor: "pointer",
                    }}
                    onDoubleClick={() => enterJob(id)}
                    title="Double-clic pour éditer les tasks"
                >
                    <span
                        style={{
                            fontSize: 11,
                            color: "rgba(100,116,139,0.8)",
                            userSelect: "none",
                        }}
                    >
                        {stepCount === 0
                            ? "Aucun task · double-clic"
                            : `${stepCount} task${stepCount > 1 ? "s" : ""} · double-clic`}
                    </span>
                </div>
            </div>
        </>
    );
};

export default JobCardNode;
