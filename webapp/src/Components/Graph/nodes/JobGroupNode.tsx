/**
 * JobGroupNode — React Flow Group node representing a CI/CD Job.
 *
 * A Job groups a set of steps (child nodes) that run on the same runner.
 * The group node acts as a container; steps are positioned relatively inside it.
 * Job-to-job dependencies are expressed via edges between group nodes.
 */
import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";

interface JobGroupNodeData {
    name: string;
    runsOn: string;
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

            {/* Job-level connection handles */}
            <Handle type="target" position={Position.Left} id="job-in" style={{ top: "50%" }} />
            <Handle type="source" position={Position.Right} id="job-out" style={{ top: "50%" }} />

            {/* Header */}
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-t-lg border-b select-none"
                style={{
                    background: "rgba(99,102,241,0.12)",
                    borderColor: selected ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.3)",
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

            {/* Body — transparent so child nodes are visible */}
            <div
                className="flex-1 rounded-b-lg"
                style={{
                    minHeight: 120,
                    background: "rgba(24,24,36,0.35)",
                    border: `1px solid ${selected ? "rgba(99,102,241,0.55)" : "rgba(99,102,241,0.2)"}`,
                    borderTop: "none",
                }}
            />
        </>
    );
};

export default JobGroupNode;
