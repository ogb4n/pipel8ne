export interface Edge {
  id: string;
  source: string; // Node.id
  target: string; // Node.id
  type: string;
  /** Optional reroute waypoint (flow coordinates) */
  waypoint?: { x: number; y: number };
}
