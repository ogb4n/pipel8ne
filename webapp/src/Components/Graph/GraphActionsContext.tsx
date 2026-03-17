import { createContext, useContext } from "react";

interface GraphActions {
    selectNode: (id: string | null) => void;
    enterStage: (stageId: string) => void;
    exitStage: () => void;
    openJobDrawer: (jobId: string) => void;
    enterJob: (jobId: string) => void;
    exitJob: () => void;
}

export const GraphActionsContext = createContext<GraphActions>({
    selectNode: () => undefined,
    enterStage: () => undefined,
    exitStage: () => undefined,
    openJobDrawer: () => undefined,
    enterJob: () => undefined,
    exitJob: () => undefined,
});

export const useGraphActions = () => useContext(GraphActionsContext);
