import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { nodeConfig } from "../nodeConfig";
import type { NodeType, NodeData } from "../../../Api/types";

/**
 * CicdNodeCard — composant unique pour tous les types de nodes CI/CD.
 *
 * La stratégie de rendu (couleur, icône, résumé des params) est déléguée
 * à `nodeConfig[type]` — zéro branchement if/switch ici.
 */
const CicdNodeCard: React.FC<NodeProps> = ({ type, data }) => {
    const cfg = nodeConfig[type as NodeType];
    const d = data as unknown as NodeData;
    const params = d.params?.baseParameters ?? {};

    return (
        <div className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 w-52 text-xs overflow-hidden">
            {type !== "trigger" && (
                <Handle
                    type="target"
                    position={Position.Top}
                    style={{ background: cfg.color }}
                    className="!w-3 !h-3 !border-2 !border-white dark:!border-gray-800"
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
                <span className="font-medium text-gray-800 dark:text-gray-100 leading-tight truncate">
                    {d.label}
                </span>
                <span
                    className="text-gray-400 dark:text-gray-500 leading-tight truncate"
                    title={cfg.getSummary(params)}
                >
                    {cfg.getSummary(params)}
                </span>

                {/* Condition gets two labelled source handles */}
                {type === "condition" && (
                    <div className="flex justify-between mt-1">
                        <span className="text-green-500 font-medium">✔ true</span>
                        <span className="text-red-500 font-medium">✘ false</span>
                    </div>
                )}
            </div>

            {type === "condition" ? (
                <>
                    <Handle id="true" type="source" position={Position.Right}
                        className="!w-3 !h-3 !border-2 !border-white dark:!border-gray-800 !bg-green-500" />
                    <Handle id="false" type="source" position={Position.Left}
                        className="!w-3 !h-3 !border-2 !border-white dark:!border-gray-800 !bg-red-500" />
                </>
            ) : (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    style={{ background: cfg.color }}
                    className="!w-3 !h-3 !border-2 !border-white dark:!border-gray-800"
                />
            )}
        </div>
    );
};

export default CicdNodeCard;
