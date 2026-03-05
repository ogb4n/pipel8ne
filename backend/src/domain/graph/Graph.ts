import { Node } from "./Node.js";
import { Edge } from "./Edge.js";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Graph {
  id: string;
  projectId: string; // references Project.id
  name: string;
  viewport: Viewport;
  nodes: Node[];
  edges: Edge[];
}
