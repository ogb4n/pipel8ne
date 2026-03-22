import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react';

export default function JobEdge(props: EdgeProps) {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 6,
    });

    const markerId = `job-arrow-${id}`;

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
                    <polygon points="0 0, 7 2.5, 0 5" fill="rgba(99,102,241,0.6)" />
                </marker>
            </defs>
            <BaseEdge
                path={edgePath}
                style={{
                    stroke: 'rgba(99,102,241,0.35)',
                    strokeWidth: 1.5,
                    strokeDasharray: '5,4',
                }}
                markerEnd={`url(#${markerId})`}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                    className="nodrag nopan"
                >
                    <span
                        title="Ce job attend la fin du précédent avant de démarrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            color: 'rgba(165,170,255,0.85)',
                            background: 'rgba(30,28,60,0.92)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            padding: '2px 7px',
                            borderRadius: 99,
                            backdropFilter: 'blur(4px)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {/* dependency icon */}
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="4" cy="12" r="2" />
                            <circle cx="12" cy="4" r="2" />
                            <path d="M4 10V7a3 3 0 0 1 3-3h3" />
                        </svg>
                        attend
                    </span>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
