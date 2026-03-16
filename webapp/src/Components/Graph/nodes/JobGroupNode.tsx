/**
 * JobGroupNode — React Flow Group node representing a CI/CD Job.
 *
 * A Job groups a set of steps (child nodes). Jobs live inside a Stage and are
 * always parallel — there are no inter-job connections.
 * The group node acts as a container; steps are positioned relatively inside it.
 */
import React, { useState, useRef, useEffect } from "react";
import { NodeResizer, useReactFlow } from "@xyflow/react";

interface JobGroupNodeData {
    name: string;
    runsOn: string;
    /** Set to true while a step is being dragged over this job (for visual feedback). */
    dragOver?: boolean;
}

interface JobGroupNodeProps {
    id: string;
    data: JobGroupNodeData;
    selected?: boolean;
}

const JobGroupNode: React.FC<JobGroupNodeProps> = ({ id, data, selected }) => {
    const { setNodes } = useReactFlow();
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

    return (
        <>
            {/* Resize handle so users can resize the job container */}
            <NodeResizer
                minWidth={260}
                minHeight={160}
                isVisible={selected}
                lineStyle={{ borderColor: "rgba(99,102,241,0.6)" }}
                handleStyle={{ borderColor: "rgba(99,102,241,0.8)", background: "#1e1e2e" }}
            />

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
                    borderRadius: 8,
                    border: `1px solid ${data.dragOver
                        ? "rgba(99,102,241,0.9)"
                        : selected
                            ? "rgba(99,102,241,0.7)"
                            : "rgba(99,102,241,0.3)"
                        }`,
                    background: data.dragOver ? "rgba(99,102,241,0.08)" : "rgba(18,18,34,0.5)",
                    transition: "border-color 0.12s, background 0.12s",
                    boxShadow: data.dragOver ? "0 0 0 2px rgba(99,102,241,0.25)" : "none",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-3 py-2 border-b shrink-0 select-none"
                    style={{
                        background: data.dragOver
                            ? "rgba(99,102,241,0.2)"
                            : "rgba(99,102,241,0.14)",
                        borderColor: data.dragOver
                            ? "rgba(99,102,241,0.6)"
                            : selected
                                ? "rgba(99,102,241,0.5)"
                                : "rgba(99,102,241,0.25)",
                        transition: "background 0.12s, border-color 0.12s",
                    }}
                >
                    {/* Job name */}
                    {editingName ? (
                        <input
                            ref={nameRef}
                            defaultValue={data.name}
                            className="bg-transparent text-xs font-semibold text-indigo-300 outline-none border-b border-indigo-400 w-32"
                            onBlur={(e) => commitName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitName((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setEditingName(false);
                            }}
                        />
                    ) : (
                        <span
                            className="text-xs font-semibold text-indigo-300 cursor-pointer hover:text-indigo-200 transition-colors"
                            onDoubleClick={() => setEditingName(true)}
                            title="Double-clic pour renommer"
                        >
                            {data.name || "job"}
                        </span>
                    )}

                    <span className="text-zinc-600 text-xs">·</span>

                    {/* runs-on badge */}
                    {editingRunner ? (
                        <input
                            ref={runnerRef}
                            defaultValue={data.runsOn}
                            className="bg-transparent text-xs text-zinc-400 outline-none border-b border-zinc-500 w-28"
                            onBlur={(e) => commitRunner(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitRunner((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setEditingRunner(false);
                            }}
                        />
                    ) : (
                        <span
                            className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors font-mono"
                            onDoubleClick={() => setEditingRunner(true)}
                            title="Double-clic pour modifier le runner"
                        >
                            runs-on: {data.runsOn || "ubuntu-latest"}
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
                            border: `1.5px dashed ${data.dragOver ? "rgba(99,102,241,0.55)" : "rgba(99,102,241,0.18)"}`,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: data.dragOver ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.28)",
                            fontSize: 11,
                            userSelect: "none",
                            pointerEvents: "none",
                            letterSpacing: "0.02em",
                            transition: "border-color 0.12s, color 0.12s",
                        }}
                    >
                        {data.dragOver ? "Relâcher pour déposer ici" : "Glisser des steps ici"}
                    </div>
                </div>
            </div>
        </>
    );
};

export default JobGroupNode;
