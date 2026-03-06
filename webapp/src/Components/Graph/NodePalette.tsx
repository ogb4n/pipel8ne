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
                className="text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
                + Node
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <ul className="absolute left-0 top-8 z-20 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden py-1">
                        {(Object.entries(nodeConfig) as [NodeType, typeof nodeConfig[NodeType]][]).map(([type, cfg]) => (
                            <li key={type}>
                                <button
                                    onClick={() => handlePick(type)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                                >
                                    <span
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                                        style={{ background: cfg.color }}
                                    >
                                        {cfg.icon}
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{cfg.label}</span>
                                        <span className="text-xs text-gray-400 truncate">{cfg.description}</span>
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
