import React from 'react';
import {
    BaseEdge,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react';

export default function StageEdge(props: EdgeProps) {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 8,
    });

    const markerId = `stage-arrow-${id}`;

    return (
        <>
            <defs>
                <marker
                    id={markerId}
                    markerWidth="7"
                    markerHeight="5"
                    refX="6"
                    refY="2.5"
                    orient="auto"
                >
                    <polygon
                        points="0 0, 7 2.5, 0 5"
                        fill="rgba(124,58,237,0.65)"
                    />
                </marker>
            </defs>
            <BaseEdge
                path={edgePath}
                style={{
                    stroke: 'rgba(124,58,237,0.45)',
                    strokeWidth: 1.5,
                }}
                markerEnd={`url(#${markerId})`}
            />
        </>
    );
}
