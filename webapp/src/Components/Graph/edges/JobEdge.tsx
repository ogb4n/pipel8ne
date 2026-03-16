import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react';

export default function JobEdge(props: EdgeProps) {
    const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    return (
        <>
            <BaseEdge
                path={edgePath}
                style={{
                    stroke: 'rgba(99,102,241,0.6)',
                    strokeWidth: 1.5,
                    strokeDasharray: '5,4',
                }}
            />
            <EdgeLabelRenderer>
                <span
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 9,
                        color: 'rgba(99,102,241,0.7)',
                        pointerEvents: 'none',
                        fontWeight: 500,
                    }}
                    className="nodrag nopan"
                >
                    needs
                </span>
            </EdgeLabelRenderer>
        </>
    );
}
