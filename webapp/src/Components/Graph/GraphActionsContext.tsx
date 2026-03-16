import { createContext, useContext } from "react";

interface GraphActions {
    selectNode: (id: string | null) => void;
}

export const GraphActionsContext = createContext<GraphActions>({
    selectNode: () => undefined,
});

export const useGraphActions = () => useContext(GraphActionsContext);
