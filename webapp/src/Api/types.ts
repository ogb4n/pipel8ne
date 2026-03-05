export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export type ProjectVisibility = "private" | "public";
export interface Project {
  id: string;
  name: string;
  path: string;
  provider: string;
  visibility: ProjectVisibility;
  ownerId: string;
  lastModified: string;
}
export interface NodeParams {
  baseParameters: Record<string, unknown>;
}
export interface NodeData {
  label: string;
  description: string;
  params: NodeParams;
  env: Record<string, unknown>;
  secrets: Record<string, string>;
}
export interface GraphNode {
  id: string;
  type: string;
  positionX: number;
  positionY: number;
  data: NodeData;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
export interface Graph {
  id: string;
  projectId: string;
  name: string;
  viewport: Viewport;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
