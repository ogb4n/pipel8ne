export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  userId: string;
  provider: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export type ProjectVisibility = "private" | "public";

export interface ProjectGitRepository {
  cloneUrl: string;
  fullName: string;
  defaultBranch: string;
  provider: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  provider: string;
  visibility: ProjectVisibility;
  ownerId: string;
  lastModified: string;
  gitRepository?: ProjectGitRepository;
}
// ── Node type discriminator ─────────────────────────────────────────────────
export type NodeType = "shell_command" | "git" | "notification";

// ── Typed params — mirror of backend Domain node params ─────────────────────
export type TriggerType = "push" | "pull_request" | "schedule" | "manual" | "tag";
export interface TriggerNodeParams {
  triggerType: TriggerType;
  branches?: string[];
  schedule?: string;
  tags?: string[];
}

export type Shell = "sh" | "bash" | "zsh" | "powershell" | "cmd";
export interface ShellCommandNodeParams {
  shell: Shell;
  script: string;
  workingDirectory?: string;
  continueOnError?: boolean;
  timeoutSeconds?: number;
}

export type GitAction = "clone" | "checkout" | "pull" | "fetch" | "tag" | "push";
export interface GitNodeParams {
  action: GitAction;
  repositoryUrl?: string;
  ref?: string;
  directory?: string;
  depth?: number;
  tagName?: string;
  remote?: string;
}

export type NotificationChannel = "slack" | "teams" | "email" | "discord" | "webhook" | "pagerduty";
export type NotificationTrigger = "always" | "on_success" | "on_failure" | "on_change";
export interface NotificationNodeParams {
  channel: NotificationChannel;
  notifyOn: NotificationTrigger;
  message: string;
  recipient?: string;
}

/** Union of all typed params, keyed by node type */
export type NodeParamsByType = {
  shell_command: ShellCommandNodeParams;
  git: GitNodeParams;
  notification: NotificationNodeParams;
};

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  isRevoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResponse extends ApiKey {
  rawKey: string; // returned once only
}

// ── Git Connections ─────────────────────────────────────────────────────────
export type GitProvider = "github" | "gitlab" | "azure_devops";

export interface GitConnection {
  id: string;
  userId: string;
  provider: GitProvider;
  providerUsername: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GitRepository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  updatedAt: string;
}

export interface OAuthConfig {
  github: { enabled: boolean; authUrl: string };
  gitlab: { enabled: boolean; authUrl: string };
  azure_devops: { enabled: boolean; authUrl: string };
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
  type: NodeType;
  positionX: number;
  positionY: number;
  data: NodeData;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  /** Optional reroute waypoint stored as flow coordinates */
  waypoint?: { x: number; y: number };
}
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
export interface Job {
  id: string;
  name: string;
  runsOn: string;
  /** Steps executed in array order */
  steps: GraphNode[];
  /** Canvas position in stage view */
  position?: { x: number; y: number };
  /** Dependencies between steps within this job */
  stepEdges?: GraphEdge[];
}
export interface Stage {
  id: string;
  name: string;
  /** Jobs belonging to this stage — always run in parallel */
  jobs: Job[];
  /** Canvas position of the stage group node */
  position: { x: number; y: number };
  /** Dependencies between jobs within this stage */
  jobEdges?: GraphEdge[];
}
export interface Graph {
  id: string;
  projectId: string;
  name: string;
  /** draft = work in progress, no validation enforced. active = fully validated. */
  status: "draft" | "active";
  /** Pipeline-level trigger configuration */
  trigger?: TriggerNodeParams;
  viewport: Viewport;
  /** Stages composing the pipeline. */
  stages: Stage[];
  /** Edges between stages — source/target are stage IDs, define execution order. */
  stageEdges: GraphEdge[];
}
