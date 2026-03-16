import React, { useEffect, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { nodeConfig } from "../nodeConfig";
import { useGraphActions } from "../GraphActionsContext";
import type { NodeType, NodeData } from "../../../Api/types";

/** Node types that can be added as a next step (no trigger in the middle) */
const ADDABLE_TYPES: NodeType[] = [
    "shell_command", "docker", "git", "test",
    "build", "deploy", "notification", "condition",
];

// ── Hover toolbar button ─────────────────────────────────────────────────────
const ToolbarBtn: React.FC<{
    onClick: (e: React.MouseEvent) => void;
    title: string;
    danger?: boolean;
    children: React.ReactNode;
}> = ({ onClick, title, danger, children }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        className={[
            "w-7 h-7 flex items-center justify-center rounded-lg text-sm transition",
            danger
                ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
                : "text-gray-300 hover:bg-white/15 hover:text-white",
        ].join(" ")}
    >
        {children}
    </button>
);

// ── Inline node picker (shown when clicking "+") ─────────────────────────────
const NodePicker: React.FC<{
    onPick: (t: NodeType) => void;
    onClose: () => void;
}> = ({ onPick, onClose }) => (
    <>
        <ul
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1"
        >
            {ADDABLE_TYPES.map((t) => {
                const c = nodeConfig[t];
                return (
                    <li key={t}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onPick(t); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                        >
                            <span
                                className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 text-xs"
                                style={{ background: c.color }}
                            >
                                {c.icon}
                            </span>
                            <span className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{c.label}</span>
                                <span className="text-[11px] text-zinc-400 truncate">{c.description}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    </>
);

const CicdNodeCard: React.FC<NodeProps> = ({ id, type, data }) => {
    const cfg = nodeConfig[type as NodeType];
    const d = data as unknown as NodeData;
    const params = d.params?.baseParameters ?? {};
    const { deleteElements, getEdges, getNode, addNodes, addEdges } = useReactFlow();
    const { selectNode } = useGraphActions();

    const [hovered, setHovered] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!pickerOpen) return;
        const close = () => setPickerOpen(false);
        const id = setTimeout(() => document.addEventListener("click", close), 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener("click", close);
        };
    }, [pickerOpen]);

    const onEnter = () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        setHovered(true);
    };
    const onLeave = () => {
        leaveTimer.current = setTimeout(() => setHovered(false), 150);
    };

    // condition nodes have two branches — skip the "+" invite
    const hasOutgoing = type === "condition" || getEdges().some((e) => e.source === id);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        void deleteElements({ nodes: [{ id }] });
    };

    const handleConfigure = (e: React.MouseEvent) => {
        e.stopPropagation();
        selectNode(id);
    };

    const handlePickNext = (nextType: NodeType) => {
        setPickerOpen(false);
        const sourceNode = getNode(id);
        const position = sourceNode
            ? { x: sourceNode.position.x + 280, y: sourceNode.position.y }
            : { x: 300, y: 100 };
        const newId = `node-${Date.now()}`;
        const nextCfg = nodeConfig[nextType];
        addNodes([{
            id: newId,
            type: nextType,
            position,
            data: {
                label: nextCfg.label,
                description: "",
                params: { baseParameters: nextCfg.defaultParams },
                env: {},
                secrets: {},
            } as unknown as Record<string, unknown>,
        }]);
        addEdges([{
            id: `edge-${id}-${newId}`,
            source: id,
            target: newId,
            type: "reroute",
        }]);
    };

    return (
        <div
            className="relative"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            {/* ── Hover toolbar ── */}
            <div
                className={[
                    "absolute -top-10 left-1/2 -translate-x-1/2 z-10",
                    "flex items-center gap-0.5 px-1.5 py-1",
                    "rounded-lg bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/60 shadow-lg",
                    "transition-opacity duration-100",
                    hovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                ].join(" ")}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
            >
                <ToolbarBtn title="Configurer" onClick={handleConfigure}>⚙</ToolbarBtn>
                <div className="w-px h-4 bg-zinc-600 mx-0.5" />
                <ToolbarBtn title="Supprimer" onClick={handleDelete} danger>🗑</ToolbarBtn>
            </div>

            {/* ── Card ── */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-52 text-xs overflow-hidden">
                {type !== "trigger" && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        style={{ background: cfg.color }}
                        className="w-3! h-3! border-2! border-white! dark:border-zinc-900!"
                    />
                )}

                {/* Header */}
                <div
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white font-semibold select-none"
                    style={{ background: cfg.color }}
                >
                    <span>{cfg.icon}</span>
                    <span className="uppercase tracking-wide text-[10px]">{cfg.label}</span>
                </div>

                {/* Body */}
                <div className="px-3 py-2 flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100 leading-tight truncate">
                        {d.label}
                    </span>
                    <span
                        className="text-zinc-400 dark:text-zinc-500 leading-tight truncate"
                        title={cfg.getSummary(params)}
                    >
                        {cfg.getSummary(params)}
                    </span>

                    {type === "condition" && (
                        <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-green-500 font-medium">✔ true →</span>
                            <span className="text-red-500 font-medium">✘ false ↓</span>
                        </div>
                    )}
                </div>

                {type === "condition" ? (
                    <>
                        <Handle id="true" type="source" position={Position.Right}
                            className="w-3! h-3! border-2! border-white! dark:border-zinc-900! bg-green-500!" />
                        <Handle id="false" type="source" position={Position.Bottom}
                            className="w-3! h-3! border-2! border-white! dark:border-zinc-900! bg-red-500!" />
                    </>
                ) : (
                    <Handle
                        type="source"
                        position={Position.Right}
                        style={{ background: cfg.color }}
                        className="w-3! h-3! border-2! border-white! dark:border-zinc-900!"
                    />
                )}
            </div>

            {/* ── "+" add next node ── */}
            {!hasOutgoing && (
                <div className="absolute top-1/2 left-full -translate-y-1/2 ml-3 z-20 flex items-center">
                    <button
                        type="button"
                        title="Ajouter un node"
                        onClick={(e) => { e.stopPropagation(); setPickerOpen((p) => !p); }}
                        className="w-6 h-6 rounded-full flex items-center justify-center
                                   bg-zinc-800 hover:bg-accent-500
                                   border border-zinc-600 hover:border-accent-400
                                   text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </button>
                    {pickerOpen && (
                        <NodePicker
                            onPick={handlePickNext}
                            onClose={() => setPickerOpen(false)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default CicdNodeCard;
