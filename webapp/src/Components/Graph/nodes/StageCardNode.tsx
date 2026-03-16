import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { useGraphActions } from "../GraphActionsContext";

interface StageCardData {
    name: string;
    jobCount: number;
}

interface StageCardNodeProps {
    id: string;
    data: StageCardData;
    selected?: boolean;
}

const StageCardNode: React.FC<StageCardNodeProps> = ({ id, data, selected }) => {
    const { setNodes } = useReactFlow();
    const { enterStage } = useGraphActions();
    const [editingName, setEditingName] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingName) nameRef.current?.focus();
    }, [editingName]);

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

    const handleDoubleClick = (e: React.MouseEvent) => {
        // Only drill in on the body area, not the name span (which has its own dblclick)
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "SPAN") {
            enterStage(id);
        }
    };

    const jobCount = data.jobCount ?? 0;

    return (
        <>
            <Handle type="target" position={Position.Left} id="stage-in" style={{ top: "50%" }} />
            <Handle type="source" position={Position.Right} id="stage-out" style={{ top: "50%" }} />

            <div
                style={{
                    width: 240,
                    height: 120,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: 8,
                    border: `1px solid ${selected
                        ? "rgba(139,92,246,0.8)"
                        : "rgba(139,92,246,0.4)"
                        }`,
                    background: "rgba(15,10,30,0.65)",
                    boxShadow: selected ? "0 0 0 2px rgba(139,92,246,0.25)" : "none",
                    transition: "border-color 0.12s, box-shadow 0.12s",
                    cursor: "pointer",
                }}
                onDoubleClick={handleDoubleClick}
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
                        borderBottom: `1px solid ${selected
                            ? "rgba(139,92,246,0.5)"
                            : "rgba(139,92,246,0.25)"
                            }`,
                        background: selected
                            ? "rgba(109,40,217,0.22)"
                            : "rgba(109,40,217,0.15)",
                        userSelect: "none",
                        transition: "background 0.12s, border-color 0.12s",
                    }}
                >
                    {/* "STAGE" badge */}
                    <span
                        style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: "rgba(196,181,253,0.9)",
                            background: "rgba(139,92,246,0.18)",
                            border: "1px solid rgba(139,92,246,0.3)",
                            borderRadius: 3,
                            padding: "1px 4px",
                            flexShrink: 0,
                        }}
                    >
                        STAGE
                    </span>

                    {/* Stage name */}
                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            style={{
                                background: "transparent",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "rgba(233,213,255,1)",
                                outline: "none",
                                borderBottom: "1px solid rgba(196,181,253,0.7)",
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
                                color: "rgba(233,213,255,1)",
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingName(true);
                            }}
                            title={`Double-clic pour renommer — ${data.name}`}
                        >
                            {data.name || "stage"}
                        </span>
                    )}

                    {/* Drill-in button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            enterStage(id);
                        }}
                        title="Ouvrir le canvas de la stage"
                        style={{
                            background: "rgba(139,92,246,0.15)",
                            border: "1px solid rgba(139,92,246,0.35)",
                            borderRadius: 4,
                            color: "rgba(196,181,253,0.85)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            flexShrink: 0,
                            padding: 0,
                            transition: "background 0.12s, border-color 0.12s",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.3)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.6)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.15)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.35)";
                        }}
                    >
                        {/* Chevron right icon */}
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "0 12px",
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            color: "rgba(148,163,184,0.7)",
                            userSelect: "none",
                        }}
                    >
                        {jobCount === 0
                            ? "Aucun job"
                            : `${jobCount} job${jobCount > 1 ? "s" : ""}`}
                    </span>
                    <span
                        style={{
                            fontSize: 10,
                            color: "rgba(139,92,246,0.5)",
                            userSelect: "none",
                        }}
                    >
                        · double-clic pour ouvrir
                    </span>
                </div>
            </div>
        </>
    );
};

export default StageCardNode;
