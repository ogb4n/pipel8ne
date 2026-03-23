import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { GraphNode } from "../../../Api/types";
import { useGraphActions } from "../GraphActionsContext";

interface JobCardData {
    name: string;
    runsOn: string;
    steps: GraphNode[];
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
    const isDragOver = data.dragOver;

    const borderColor = isDragOver
        ? "rgba(99,102,241,0.8)"
        : selected
            ? "rgba(99,102,241,0.55)"
            : "rgba(255,255,255,0.07)";

    const boxShadow = isDragOver
        ? "0 0 0 3px rgba(99,102,241,0.18), 0 8px 32px rgba(0,0,0,0.5)"
        : selected
            ? "0 0 0 3px rgba(99,102,241,0.1), 0 8px 32px rgba(0,0,0,0.55)"
            : "0 2px 10px rgba(0,0,0,0.4)";

    return (
        <>
            <Handle
                type="target"
                position={Position.Left}
                id="job-in"
                title="Ce job peut dépendre d'un autre"
                style={{
                    width: 10, height: 10,
                    background: selected ? "#4f46e5" : "#252060",
                    border: "2px solid #1c1c26",
                    top: "50%",
                    transition: "background 0.15s, transform 0.15s",
                }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="job-out"
                title="Glisser pour créer une dépendance vers un autre job"
                style={{
                    width: 10, height: 10,
                    background: selected ? "#4f46e5" : "#252060",
                    border: "2px solid #1c1c26",
                    top: "50%",
                    transition: "background 0.15s, transform 0.15s",
                    cursor: "crosshair",
                }}
            />

            <div
                style={{
                    width: 280,
                    height: 104,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    background: isDragOver ? "rgba(79,70,229,0.08)" : "#1c1c26",
                    boxShadow,
                    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {/* Left accent stripe */}
                <div style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: 3,
                    background: isDragOver
                        ? "linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)"
                        : "linear-gradient(180deg, #6366f1 0%, #4338ca 100%)",
                    zIndex: 1,
                }} />

                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        paddingLeft: 16,
                        paddingRight: 10,
                        height: 44,
                        flexShrink: 0,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: isDragOver
                            ? "rgba(79,70,229,0.14)"
                            : selected
                                ? "rgba(79,70,229,0.1)"
                                : "rgba(79,70,229,0.06)",
                        transition: "background 0.15s",
                        userSelect: "none",
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: "rgba(129,140,248,0.8)",
                        background: "rgba(99,102,241,0.14)",
                        border: "1px solid rgba(99,102,241,0.22)",
                        borderRadius: 4,
                        padding: "2px 5px",
                        flexShrink: 0,
                    }}>
                        JOB
                    </span>

                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            style={{
                                background: "transparent",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#eef0ff",
                                outline: "none",
                                borderBottom: "1px solid rgba(129,140,248,0.45)",
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
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#eef0ff",
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            onDoubleClick={() => setEditingName(true)}
                            title={data.name}
                        >
                            {data.name || "job"}
                        </span>
                    )}

                    {editingRunner ? (
                        <input
                            ref={runnerRef}
                            defaultValue={data.runsOn}
                            style={{
                                background: "rgba(20,20,36,0.8)",
                                border: "1px solid rgba(99,102,241,0.3)",
                                borderRadius: 4,
                                fontSize: 10,
                                color: "rgba(180,185,240,0.9)",
                                outline: "none",
                                padding: "2px 6px",
                                width: 100,
                                flexShrink: 0,
                                fontFamily: "monospace",
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
                                color: "rgba(148,155,210,0.65)",
                                background: "rgba(20,20,40,0.6)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: 4,
                                padding: "2px 6px",
                                fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
                                flexShrink: 0,
                                maxWidth: 110,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                cursor: "text",
                            }}
                            onDoubleClick={() => setEditingRunner(true)}
                            title={data.runsOn}
                        >
                            {data.runsOn || "ubuntu-latest"}
                        </span>
                    )}
                </div>

                {/* Body */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 16,
                        paddingRight: 12,
                        gap: 7,
                        cursor: "pointer",
                        position: "relative",
                        zIndex: 1,
                    }}
                    onDoubleClick={() => enterJob(id)}
                >
                    <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: stepCount > 0 ? "rgba(99,102,241,0.7)" : "rgba(70,70,100,0.5)",
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontSize: 11,
                        color: stepCount > 0 ? "rgba(180,185,240,0.65)" : "rgba(90,90,130,0.65)",
                        userSelect: "none",
                    }}>
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
