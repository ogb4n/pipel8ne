import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";

interface StageLaneData {
    name: string;
    collapsed?: boolean;
    dragOver?: boolean;
}

interface StageLaneNodeProps {
    id: string;
    data: StageLaneData;
    selected?: boolean;
}

const StageIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="2" width="12" height="2.5" rx="0.5" fill="rgba(167,139,250,0.8)" />
        <rect x="1" y="5.75" width="12" height="2.5" rx="0.5" fill="rgba(167,139,250,0.8)" />
        <rect x="1" y="9.5" width="12" height="2.5" rx="0.5" fill="rgba(167,139,250,0.8)" />
    </svg>
);

const StageLaneNode: React.FC<StageLaneNodeProps> = ({ id, data, selected }) => {
    const { setNodes } = useReactFlow();
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

    const isCollapsed = data.collapsed ?? false;

    return (
        <>
            <NodeResizer
                minWidth={300}
                minHeight={120}
                isVisible={selected && !isCollapsed}
                lineStyle={{ borderColor: "rgba(139,92,246,0.6)" }}
                handleStyle={{ borderColor: "rgba(139,92,246,0.8)", background: "#1e1e2e" }}
            />

            <Handle type="target" position={Position.Left} id="stage-in" style={{ top: "50%" }} />
            <Handle type="source" position={Position.Right} id="stage-out" style={{ top: "50%" }} />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: isCollapsed ? 48 : "100%",
                    overflow: "hidden",
                    borderRadius: 10,
                    border: `1px solid ${data.dragOver
                        ? "rgba(139,92,246,0.7)"
                        : selected
                            ? "rgba(139,92,246,0.8)"
                            : "rgba(139,92,246,0.3)"
                        }`,
                    background: data.dragOver ? "rgba(30,15,60,0.45)" : "rgba(20,10,40,0.35)",
                    boxShadow: selected ? "0 0 0 2px rgba(139,92,246,0.15)" : "none",
                    transition: "border-color 0.12s, background 0.12s, box-shadow 0.12s",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        paddingLeft: 10,
                        paddingRight: 10,
                        height: 44,
                        flexShrink: 0,
                        userSelect: "none",
                        background: "rgba(109,40,217,0.25)",
                        borderBottom: "1px solid rgba(139,92,246,0.3)",
                    }}
                >
                    <StageIcon />

                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            style={{
                                background: "transparent",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "rgba(196,181,253,1)",
                                outline: "none",
                                borderBottom: "1px solid rgba(167,139,250,0.7)",
                                width: 120,
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
                                color: "rgba(196,181,253,1)",
                                cursor: "pointer",
                                flex: 1,
                            }}
                            onDoubleClick={() => setEditingName(true)}
                            title="Double-clic pour renommer"
                        >
                            {data.name || "stage"}
                        </span>
                    )}

                    {/* Collapse button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = !isCollapsed;
                            setNodes((nds) =>
                                nds.map((n) =>
                                    n.id === id
                                        ? {
                                            ...n,
                                            style: { ...n.style, height: next ? 48 : undefined },
                                            data: {
                                                ...(n.data as Record<string, unknown>),
                                                collapsed: next,
                                            },
                                        }
                                        : n,
                                ),
                            );
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 2,
                            color: "rgba(139,92,246,0.7)",
                            display: "flex",
                            alignItems: "center",
                        }}
                        title={isCollapsed ? "Développer" : "Réduire"}
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            style={{
                                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                transition: "transform 0.15s",
                            }}
                        >
                            <path
                                d="M2 4l4 4 4-4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                {!isCollapsed && (
                    <div
                        style={{
                            flex: 1,
                            position: "relative",
                            overflow: "hidden",
                            margin: 8,
                            borderRadius: 8,
                            border: `1px dashed ${data.dragOver ? "rgba(139,92,246,0.7)" : "rgba(139,92,246,0.25)"
                                }`,
                            background: data.dragOver ? "rgba(109,40,217,0.12)" : "transparent",
                            transition: "border-color 0.12s, background 0.12s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                color: "rgba(139,92,246,0.4)",
                                userSelect: "none",
                                pointerEvents: "none",
                                letterSpacing: "0.02em",
                            }}
                        >
                            {data.dragOver ? "Relâcher pour déposer ici" : "Glisser des jobs ici"}
                        </span>
                    </div>
                )}
            </div>
        </>
    );
};

export default StageLaneNode;
