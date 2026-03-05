import { NodeData } from "./NodeData.js";

export interface Node {
  id: string;
  type: string;
  positionX: number;
  positionY: number;
  data: NodeData;
}