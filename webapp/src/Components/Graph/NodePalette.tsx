import React, { useState } from "react";
import { nodeConfig } from "./nodeConfig";
import type { NodeType, NodeData } from "../../Api/types";

interface NodePaletteProps {
    onAdd: (type: NodeType, data: NodeData) => void;
}

/**
 * NodePalette — liste déroulante pour ajouter un node typé.
 * Entièrement driven par nodeConfig : zéro duplication de labels/couleurs.
 */
const NodePalette: React.FC<NodePaletteProps> = ({ onAdd }) => {
    const [open, setOpen] = useState(false);

    const handlePick = (type: NodeType) => {
        setOpen(false);
        const cfg = nodeConfig[type];
        onAdd(type, {
            label: cfg.label,
            description: "",
            params: { baseParameters: cfg.defaultParams },
            env: {},
            secrets: {},
        });
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
                + Node
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <ul className="absolute left-0 top-9 z-20 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1">
                        {(Object.entries(nodeConfig) as [NodeType, typeof nodeConfig[NodeType]][]).map(([type, cfg]) => (
                            <li key={type}>
                                <button
                                    onClick={() => handlePick(type)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                >
                                    <span
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                                        style={{ background: cfg.color }}
                                    >
                                        {cfg.icon}
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{cfg.label}</span>
                                        <span className="text-[11px] text-zinc-400 truncate">{cfg.description}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default NodePalette;
