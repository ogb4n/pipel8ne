export interface Edge {
  id: string;
  source: string; // Node.id
  target: string; // Node.id
  type: string;
  /** Optional execution condition. Only valid for stage edges. */
  condition?: "on_success" | "always" | "on_failure";
  /** Optional reroute waypoint (flow coordinates) */
  waypoint?: { x: number; y: number };
}
