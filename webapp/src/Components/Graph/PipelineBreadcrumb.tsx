import React from "react";
import { Link } from "react-router-dom";

interface PipelineBreadcrumbProps {
    projectId: string;
    pipelineName: string;
    /** Name of the active stage — null when in pipeline view */
    stageName: string | null;
    onExitStage: () => void;
    /** Name of the active job — null when not in job canvas */
    jobName: string | null;
    onExitJob: () => void;
    onExitJobAndStage: () => void;
}

const crumbStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "color 0.12s",
};

const backBtnStyle: React.CSSProperties = {
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
};

const BackArrow = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M6.5 1.5L3.5 5L6.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const Sep = () => (
    <span style={{ color: "rgba(71,85,105,0.7)", flexShrink: 0 }}>›</span>
);

const PipelineBreadcrumb: React.FC<PipelineBreadcrumbProps> = ({
    projectId,
    pipelineName,
    stageName,
    onExitStage,
    jobName,
    onExitJob,
    onExitJobAndStage,
}) => {
    const inJobCanvas = jobName !== null;
    const inStageCanvas = stageName !== null && !inJobCanvas;

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
                style={{ color: "rgba(148,163,184,0.5)", textDecoration: "none", flexShrink: 0, transition: "color 0.12s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.9)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.5)")}
            >
                Pipelines
            </Link>

            <Sep />

            {/* Pipeline name */}
            {(inStageCanvas || inJobCanvas) ? (
                <button
                    onClick={inJobCanvas ? onExitJobAndStage : onExitStage}
                    style={{ ...crumbStyle, color: "rgba(148,163,184,0.6)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.9)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.6)")}
                    title="Retour au canvas pipeline"
                >
                    {pipelineName}
                </button>
            ) : (
                <span style={{ color: "rgba(226,232,240,0.9)", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {pipelineName}
                </span>
            )}

            {/* Stage level */}
            {stageName && (
                <>
                    <Sep />
                    {inJobCanvas ? (
                        <button
                            onClick={onExitJob}
                            style={{ ...crumbStyle, color: "rgba(196,181,253,0.7)" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(196,181,253,1)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(196,181,253,0.7)")}
                            title="Retour au canvas stage"
                        >
                            {stageName}
                        </button>
                    ) : (
                        <span
                            style={{ color: "rgba(196,181,253,0.9)", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}
                            title={stageName}
                        >
                            {stageName}
                        </span>
                    )}

                    {inStageCanvas && (
                        <button
                            onClick={onExitStage}
                            title="Retour au canvas pipeline"
                            style={backBtnStyle}
                            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(71,85,105,0.3)"; b.style.color = "rgba(226,232,240,0.9)"; }}
                            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(71,85,105,0.15)"; b.style.color = "rgba(148,163,184,0.7)"; }}
                        >
                            <BackArrow /> Retour
                        </button>
                    )}
                </>
            )}

            {/* Job level */}
            {inJobCanvas && jobName && (
                <>
                    <Sep />
                    <span
                        style={{ color: "rgba(129,140,248,0.9)", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}
                        title={jobName}
                    >
                        {jobName}
                    </span>
                    <button
                        onClick={onExitJob}
                        title="Retour au canvas stage"
                        style={backBtnStyle}
                        onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(71,85,105,0.3)"; b.style.color = "rgba(226,232,240,0.9)"; }}
                        onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(71,85,105,0.15)"; b.style.color = "rgba(148,163,184,0.7)"; }}
                    >
                        <BackArrow /> Retour
                    </button>
                </>
            )}
        </div>
    );
};

export default PipelineBreadcrumb;
