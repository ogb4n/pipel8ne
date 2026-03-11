/**
 * nodeTypes — registre React Flow.
 *
 * Un seul composant (CicdNodeCard) enregistré sous chaque clé de type node.
 * JobGroupNode est enregistré sous "jobGroup" pour les groupes de jobs.
 * La stratégie de rendu est portée par nodeConfig, pas par des composants séparés.
 */
import CicdNodeCard from "./nodes/CicdNodeCard";
import JobGroupNode from "./nodes/JobGroupNode";
import type { NodeType } from "../../Api/types";

type AllNodeTypes = NodeType | "jobGroup";

export const nodeTypes: Record<AllNodeTypes, typeof CicdNodeCard | typeof JobGroupNode> = {
  trigger: CicdNodeCard,
  shell_command: CicdNodeCard,
  docker: CicdNodeCard,
  git: CicdNodeCard,
  test: CicdNodeCard,
  build: CicdNodeCard,
  deploy: CicdNodeCard,
  notification: CicdNodeCard,
  condition: CicdNodeCard,
  jobGroup: JobGroupNode,
};
