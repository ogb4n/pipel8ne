import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { useGraphActions } from "../GraphActionsContext";

const STAGE_W = 240;
const STAGE_H = 108;

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
    const { setNodes, getNode } = useReactFlow();
    const { enterStage, addStage } = useGraphActions();
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
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "SPAN") {
            enterStage(id);
        }
    };

    const addNextStage = (e: React.MouseEvent) => {
        e.stopPropagation();
        const node = getNode(id);
        addStage(undefined, {
            afterNodeId: id,
            position: node ? { x: node.position.x + STAGE_W + 80, y: node.position.y } : undefined,
        });
    };

    const addParallelStage = (e: React.MouseEvent) => {
        e.stopPropagation();
        const node = getNode(id);
        addStage(undefined, {
            position: node ? { x: node.position.x, y: node.position.y + STAGE_H + 56 } : undefined,
            noEdge: true,
        });
    };

    const jobCount = data.jobCount ?? 0;
    const show = selected ? 1 : 0;

    const plusBtn: React.CSSProperties = {
        position: "absolute",
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "1px solid rgba(139,92,246,0.35)",
        background: "#1e1929",
        color: "rgba(167,139,250,0.75)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        zIndex: 10,
        opacity: show,
        pointerEvents: selected ? "auto" : "none",
        transition: "opacity 0.12s",
    };

    return (
        <>
            <Handle
                type="target"
                position={Position.Left}
                id="stage-in"
                style={{
                    width: 8, height: 8,
                    background: selected ? "#7c3aed" : "#2e1f55",
                    border: `2px solid ${selected ? "#1a1a24" : "#1a1a24"}`,
                    top: "50%",
                    transition: "background 0.15s",
                }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="stage-out"
                style={{
                    width: 8, height: 8,
                    background: selected ? "#7c3aed" : "#2e1f55",
                    border: "2px solid #1a1a24",
                    top: "50%",
                    transition: "background 0.15s",
                }}
            />

            <button
                title="Ajouter une stage après"
                style={{ ...plusBtn, right: -26, top: "50%", transform: "translateY(-50%)" }}
                onClick={addNextStage}
            >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                </svg>
            </button>

            <button
                title="Ajouter une stage en parallèle"
                style={{ ...plusBtn, bottom: -26, left: "50%", transform: "translateX(-50%)" }}
                onClick={addParallelStage}
            >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                </svg>
            </button>

            <div
                style={{
                    width: STAGE_W,
                    height: STAGE_H,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 10,
                    border: `1px solid ${selected ? "rgba(139,92,246,0.55)" : "rgba(255,255,255,0.07)"}`,
                    background: "#1c1c26",
                    boxShadow: selected
                        ? "0 0 0 3px rgba(139,92,246,0.1), 0 8px 32px rgba(0,0,0,0.55)"
                        : "0 2px 10px rgba(0,0,0,0.4)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                }}
                onDoubleClick={handleDoubleClick}
            >
                {/* Left accent stripe */}
                <div style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: 3,
                    background: "linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)",
                    zIndex: 1,
                }} />

                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        paddingLeft: 16,
                        paddingRight: 8,
                        height: 44,
                        flexShrink: 0,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: selected ? "rgba(109,40,217,0.1)" : "rgba(109,40,217,0.06)",
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
                        color: "rgba(167,139,250,0.8)",
                        background: "rgba(124,58,237,0.14)",
                        border: "1px solid rgba(124,58,237,0.22)",
                        borderRadius: 4,
                        padding: "2px 5px",
                        flexShrink: 0,
                    }}>
                        STAGE
                    </span>

                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            style={{
                                background: "transparent",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#f0eeff",
                                outline: "none",
                                borderBottom: "1px solid rgba(167,139,250,0.45)",
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
                                color: "#f0eeff",
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
                            title={data.name}
                        >
                            {data.name || "stage"}
                        </span>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); enterStage(id); }}
                        title="Ouvrir le canvas de la stage"
                        style={{
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 6,
                            color: "rgba(167,139,250,0.6)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                            padding: 0,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(124,58,237,0.2)";
                            e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
                            e.currentTarget.style.color = "#a78bfa";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.color = "rgba(167,139,250,0.6)";
                        }}
                    >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
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
                        paddingLeft: 16,
                        paddingRight: 12,
                        gap: 7,
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: jobCount > 0 ? "rgba(139,92,246,0.7)" : "rgba(80,75,110,0.5)",
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontSize: 11,
                        color: jobCount > 0 ? "rgba(200,190,240,0.65)" : "rgba(110,105,140,0.65)",
                        userSelect: "none",
                    }}>
                        {jobCount === 0 ? "Aucun job" : `${jobCount} job${jobCount > 1 ? "s" : ""}`}
                    </span>
                    {jobCount === 0 && (
                        <span style={{ fontSize: 10, color: "rgba(80,75,110,0.5)", userSelect: "none" }}>
                            · double-clic pour ouvrir
                        </span>
                    )}
                </div>
            </div>
        </>
    );
};

export default StageCardNode;
