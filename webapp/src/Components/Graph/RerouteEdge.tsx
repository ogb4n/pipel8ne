import React, { useCallback } from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useReactFlow,
    type EdgeProps,
} from "@xyflow/react";

interface EdgeWaypoint {
    x: number;
    y: number;
}

interface RerouteData {
    waypoint?: EdgeWaypoint;
    [key: string]: unknown;
}

/**
 * RerouteEdge — custom edge with a draggable midpoint handle.
 *
 * Drag the midpoint circle to create a waypoint that forces the edge path.
 * Double-click the midpoint to reset to the automatic bezier curve.
 *
 * The waypoint is stored in `edge.data.waypoint` and persisted on save.
 */
export const RerouteEdge: React.FC<EdgeProps> = ({
    id,
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
    markerEnd,
}) => {
    const { setEdges, screenToFlowPosition } = useReactFlow();
    const d = (data ?? {}) as RerouteData;
    const wp = d.waypoint;

    // ── Path computation ──────────────────────────────────────────────────────

    let edgePath: string;
    let handleX: number;
    let handleY: number;

    if (wp) {
        // Two cubic bezier segments through the waypoint — smooth S-curve
        const cx1 = (sourceX + wp.x) / 2;
        const cx2 = (wp.x + targetX) / 2;
        edgePath =
            `M${sourceX},${sourceY}` +
            ` C${cx1},${sourceY} ${cx1},${wp.y} ${wp.x},${wp.y}` +
            ` C${cx2},${wp.y} ${cx2},${targetY} ${targetX},${targetY}`;
        handleX = wp.x;
        handleY = wp.y;
    } else {
        const [path, lx, ly] = getBezierPath({
            sourceX, sourceY, sourcePosition,
            targetX, targetY, targetPosition,
        });
        edgePath = path;
        handleX = lx;
        handleY = ly;
    }

    // ── Drag logic ────────────────────────────────────────────────────────────

    const onPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            e.stopPropagation();
            e.preventDefault();

            // Keep a reference to the capturing element and pointer ID so we
            // can release the capture correctly in onUp (me.currentTarget
            // would point to window, not the div, causing a stuck handle).
            const el = e.currentTarget as HTMLDivElement;
            const pointerId = e.pointerId;
            el.setPointerCapture(pointerId);

            const onMove = (me: PointerEvent) => {
                const pos = screenToFlowPosition({ x: me.clientX, y: me.clientY });
                setEdges((eds) =>
                    eds.map((ed) =>
                        ed.id === id
                            ? { ...ed, data: { ...(ed.data ?? {}), waypoint: { x: pos.x, y: pos.y } } }
                            : ed,
                    ),
                );
            };

            const onUp = () => {
                el.releasePointerCapture(pointerId);
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
            };

            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
        },
        [id, setEdges, screenToFlowPosition],
    );

    const resetWaypoint = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setEdges((eds) =>
                eds.map((ed) =>
                    ed.id === id
                        ? { ...ed, data: { ...(ed.data ?? {}), waypoint: undefined } }
                        : ed,
                ),
            );
        },
        [id, setEdges],
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />

            <EdgeLabelRenderer>
                <div
                    style={{
                        // EdgeLabelRenderer uses flow-space coordinates via transform.
                        // zIndex > 0 is required so the handle renders above node cards,
                        // which otherwise block pointer events (especially the condition
                        // node's "false" edge whose midpoint sits under the card).
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${handleX}px, ${handleY}px)`,
                        pointerEvents: "all",
                        zIndex: 1000,
                    }}
                    className="nodrag nopan group/edge-handle"
                >
                    {/* Draggable midpoint handle */}
                    <div
                        onPointerDown={onPointerDown}
                        onDoubleClick={resetWaypoint}
                        title="Glisser pour déplacer — double-clic pour réinitialiser"
                        className={[
                            "w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing",
                            "transition-all duration-100",
                            wp
                                ? "bg-indigo-500 border-indigo-300 opacity-100 scale-110"
                                : "bg-gray-600 border-gray-400 opacity-0 group-hover/edge-handle:opacity-100",
                        ].join(" ")}
                    />
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default RerouteEdge;
