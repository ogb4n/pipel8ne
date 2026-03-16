import React from "react";
import { Link } from "react-router-dom";

interface PipelineBreadcrumbProps {
    projectId: string;
    pipelineName: string;
    /** Name of the active stage — null when in pipeline view */
    stageName: string | null;
    onExitStage: () => void;
}

const PipelineBreadcrumb: React.FC<PipelineBreadcrumbProps> = ({
    projectId,
    pipelineName,
    stageName,
    onExitStage,
}) => {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "rgba(148,163,184,0.7)",
                minWidth: 0,
                overflow: "hidden",
            }}
        >
            <Link
                to={`/projects/${projectId}/pipelines`}
                style={{
                    color: "rgba(148,163,184,0.5)",
                    textDecoration: "none",
                    flexShrink: 0,
                    transition: "color 0.12s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.9)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.5)")}
            >
                Pipelines
            </Link>

            <span style={{ color: "rgba(71,85,105,0.7)", flexShrink: 0 }}>›</span>

            {stageName ? (
                /* Stage view: clickable pipeline name goes back to pipeline canvas */
                <button
                    onClick={onExitStage}
                    style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "rgba(148,163,184,0.6)",
                        fontSize: 13,
                        fontFamily: "inherit",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "color 0.12s",
                    }}
                    onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.9)")
                    }
                    onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.6)")
                    }
                    title="Retour au canvas pipeline"
                >
                    {pipelineName}
                </button>
            ) : (
                /* Pipeline view: pipeline name is the current page */
                <span
                    style={{
                        color: "rgba(226,232,240,0.9)",
                        fontWeight: 500,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                    }}
                >
                    {pipelineName}
                </span>
            )}

            {stageName && (
                <>
                    <span style={{ color: "rgba(71,85,105,0.7)", flexShrink: 0 }}>›</span>
                    <span
                        style={{
                            color: "rgba(196,181,253,0.9)",
                            fontWeight: 500,
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                        title={stageName}
                    >
                        {stageName}
                    </span>

                    {/* Back button */}
                    <button
                        onClick={onExitStage}
                        title="Retour au canvas pipeline"
                        style={{
                            background: "rgba(71,85,105,0.15)",
                            border: "1px solid rgba(71,85,105,0.3)",
                            borderRadius: 4,
                            color: "rgba(148,163,184,0.7)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 7px",
                            fontSize: 11,
                            fontFamily: "inherit",
                            marginLeft: 4,
                            flexShrink: 0,
                            transition: "background 0.12s, border-color 0.12s, color 0.12s",
                        }}
                        onMouseEnter={(e) => {
                            const btn = e.currentTarget as HTMLButtonElement;
                            btn.style.background = "rgba(71,85,105,0.3)";
                            btn.style.color = "rgba(226,232,240,0.9)";
                        }}
                        onMouseLeave={(e) => {
                            const btn = e.currentTarget as HTMLButtonElement;
                            btn.style.background = "rgba(71,85,105,0.15)";
                            btn.style.color = "rgba(148,163,184,0.7)";
                        }}
                    >
                        {/* Left arrow */}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                                d="M6.5 1.5L3.5 5L6.5 8.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Retour
                    </button>
                </>
            )}
        </div>
    );
};

export default PipelineBreadcrumb;
