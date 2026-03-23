import { createContext, useContext } from "react";

interface GraphActions {
    selectNode: (id: string | null) => void;
    enterStage: (stageId: string) => void;
    exitStage: () => void;
    enterJob: (jobId: string) => void;
    exitJob: () => void;
    openJobDrawer: (jobId: string) => void;
    addStage: (name?: string, options?: { position?: { x: number; y: number }; afterNodeId?: string; noEdge?: boolean }) => void;
    addJob: () => void;
}

export const GraphActionsContext = createContext<GraphActions>({
    selectNode: () => undefined,
    enterStage: () => undefined,
    exitStage: () => undefined,
    enterJob: () => undefined,
    exitJob: () => undefined,
    openJobDrawer: () => undefined,
    addStage: () => undefined,
    addJob: () => undefined,
});

export const useGraphActions = () => useContext(GraphActionsContext);
