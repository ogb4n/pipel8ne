/**
 * nodeTypes — registre React Flow.
 *
 * Un seul composant (CicdNodeCard) enregistré sous chaque clé de type.
 * La stratégie de rendu est portée par nodeConfig, pas par des composants séparés.
 */
import CicdNodeCard from "./nodes/CicdNodeCard";
import type { NodeType } from "../../Api/types";

export const nodeTypes: Record<NodeType, typeof CicdNodeCard> = {
  trigger: CicdNodeCard,
  shell_command: CicdNodeCard,
  docker: CicdNodeCard,
  git: CicdNodeCard,
  test: CicdNodeCard,
  build: CicdNodeCard,
  deploy: CicdNodeCard,
  notification: CicdNodeCard,
  condition: CicdNodeCard,
};
