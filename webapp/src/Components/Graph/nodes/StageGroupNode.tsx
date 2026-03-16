/**
 * StageGroupNode — React Flow Group node representing a CI/CD Stage.
 *
 * A Stage is the outermost container, grouping jobs that run in sequence.
 * Stages are connected via stageEdges (left ↔ right handles).
 * Jobs are placed inside a stage as child nodes (always parallel).
 */
import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";

interface StageGroupNodeData {
    name: string;
    /** Set to true while a job is being dragged over this stage (for visual feedback). */
    dragOver?: boolean;
}

interface StageGroupNodeProps {
    id: string;
    data: StageGroupNodeData;
    selected?: boolean;
}

const StageGroupNode: React.FC<StageGroupNodeProps> = ({ id, data, selected }) => {
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

    return (
        <>
            {/* Resize handle so users can resize the stage container */}
            <NodeResizer
                minWidth={320}
                minHeight={200}
                isVisible={selected}
                lineStyle={{ borderColor: "rgba(139,92,246,0.6)" }}
                handleStyle={{ borderColor: "rgba(139,92,246,0.8)", background: "#1e1e2e" }}
            />

            {/* Stage-level connection handles (inter-stage dependencies) */}
            <Handle type="target" position={Position.Left} id="stage-in" style={{ top: "50%" }} />
            <Handle type="source" position={Position.Right} id="stage-out" style={{ top: "50%" }} />

            {/*
             * Outer wrapper fills 100% of the React Flow node bounds (width + height set via `style`).
             * Without this, the flex-1 body has no flex parent and the visual box doesn't fill the frame.
             */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    borderRadius: 10,
                    border: `1px solid ${data.dragOver
                        ? "rgba(139,92,246,0.95)"
                        : selected
                            ? "rgba(139,92,246,0.8)"
                            : "rgba(139,92,246,0.35)"
                        }`,
                    background: data.dragOver ? "rgba(139,92,246,0.10)" : "rgba(20,10,40,0.45)",
                    transition: "border-color 0.12s, background 0.12s",
                    boxShadow: data.dragOver ? "0 0 0 3px rgba(139,92,246,0.20)" : "none",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-3 py-2 border-b shrink-0 select-none"
                    style={{
                        background: data.dragOver
                            ? "rgba(109,40,217,0.28)"
                            : "rgba(109,40,217,0.18)",
                        borderColor: data.dragOver
                            ? "rgba(139,92,246,0.6)"
                            : selected
                                ? "rgba(139,92,246,0.5)"
                                : "rgba(139,92,246,0.25)",
                        transition: "background 0.12s, border-color 0.12s",
                    }}
                >
                    {/* Stage name */}
                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            className="bg-transparent text-xs font-semibold text-violet-300 outline-none border-b border-violet-400 w-32"
                            onBlur={(e) => commitName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitName((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setEditingName(false);
                            }}
                        />
                    ) : (
                        <span
                            className="text-xs font-semibold text-violet-300 cursor-pointer hover:text-violet-200 transition-colors"
                            onDoubleClick={() => setEditingName(true)}
                            title="Double-clic pour renommer"
                        >
                            {data.name || "stage"}
                        </span>
                    )}
                </div>

                {/* Body — flex:1 now works because the outer wrapper is a flex column */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    {/* Drop-zone hint — always visible beneath child nodes as an empty-state guide */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 10,
                            border: `1.5px dashed ${data.dragOver ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.22)"}`,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: data.dragOver ? "rgba(139,92,246,0.7)" : "rgba(139,92,246,0.35)",
                            fontSize: 11,
                            userSelect: "none",
                            pointerEvents: "none",
                            letterSpacing: "0.02em",
                            transition: "border-color 0.12s, color 0.12s",
                        }}
                    >
                        {data.dragOver ? "Relâcher pour déposer ici" : "Glisser des jobs ici"}
                    </div>
                </div>
            </div>
        </>
    );
};

export default StageGroupNode;
