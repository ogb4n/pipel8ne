import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    useReactFlow,
    type EdgeProps,
} from '@xyflow/react';

type Condition = 'on_success' | 'always' | 'on_failure';

interface StageEdgeData extends Record<string, unknown> {
    condition?: Condition;
}

const CONDITIONS: Condition[] = ['on_success', 'always', 'on_failure'];

const CONDITION_LABEL: Record<Condition, string> = {
    on_success: '✓ on success',
    always: '↺ always',
    on_failure: '✗ on failure',
};

const CONDITION_COLOR: Record<Condition, string> = {
    on_success: '#22c55e',
    always: '#94a3b8',
    on_failure: '#ef4444',
};

const STROKE_COLOR = 'rgba(139,92,246,0.85)';

export default function StageEdge(props: EdgeProps) {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
    const data = props.data as StageEdgeData | undefined;
    const condition: Condition = data?.condition ?? 'on_success';

    const { updateEdgeData } = useReactFlow();

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    const markerId = `stage-arrow-${id}`;
    const labelColor = CONDITION_COLOR[condition];

    const handleClick = () => {
        const nextIndex = (CONDITIONS.indexOf(condition) + 1) % CONDITIONS.length;
        updateEdgeData(id, { condition: CONDITIONS[nextIndex] });
    };

    return (
        <>
            <defs>
                <marker
                    id={markerId}
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                >
                    <polygon points="0 0, 8 3, 0 6" fill={STROKE_COLOR} />
                </marker>
            </defs>
            <BaseEdge
                path={edgePath}
                style={{ stroke: STROKE_COLOR, strokeWidth: 2.5 }}
                markerEnd={`url(#${markerId})`}
            />
            <EdgeLabelRenderer>
                <button
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        background: labelColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '2px 7px',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                    className="nodrag nopan"
                    onClick={handleClick}
                >
                    {CONDITION_LABEL[condition]}
                </button>
            </EdgeLabelRenderer>
        </>
    );
}
