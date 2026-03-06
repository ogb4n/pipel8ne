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
// ── Node type discriminator ─────────────────────────────────────────────────
export type NodeType =
  | "trigger"
  | "shell_command"
  | "docker"
  | "git"
  | "test"
  | "build"
  | "deploy"
  | "notification"
  | "condition";

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

export type DockerAction = "build" | "run" | "push" | "pull" | "compose_up" | "compose_down";
export interface DockerNodeParams {
  action: DockerAction;
  image?: string;
  dockerfile?: string;
  buildContext?: string;
  tags?: string[];
  registry?: string;
  command?: string;
  composeFile?: string;
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

export type TestRunner =
  | "jest"
  | "vitest"
  | "pytest"
  | "go_test"
  | "cargo_test"
  | "dotnet_test"
  | "custom";
export interface TestNodeParams {
  runner: TestRunner;
  command?: string;
  testPattern?: string;
  coverageThreshold?: number;
  continueOnError?: boolean;
}

export type BuildTool =
  | "npm"
  | "yarn"
  | "pnpm"
  | "maven"
  | "gradle"
  | "cargo"
  | "go"
  | "dotnet"
  | "make"
  | "custom";
export interface BuildNodeParams {
  tool: BuildTool;
  target?: string;
  command?: string;
  workingDirectory?: string;
  outputPath?: string;
  runtimeVersion?: string;
}

export type DeployTarget =
  | "kubernetes"
  | "aws_ecs"
  | "aws_lambda"
  | "gcp_run"
  | "azure_app"
  | "ssh"
  | "custom";
export type RolloutStrategy = "rolling" | "blue_green" | "canary" | "recreate";
export interface DeployNodeParams {
  target: DeployTarget;
  environment: string;
  namespace?: string;
  manifestPath?: string;
  rolloutStrategy?: RolloutStrategy;
  sshHost?: string;
  sshUser?: string;
  remotePath?: string;
  serviceName?: string;
}

export type NotificationChannel = "slack" | "teams" | "email" | "discord" | "webhook" | "pagerduty";
export type NotificationTrigger = "always" | "on_success" | "on_failure" | "on_change";
export interface NotificationNodeParams {
  channel: NotificationChannel;
  notifyOn: NotificationTrigger;
  message: string;
  recipient?: string;
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "matches_regex"
  | "is_empty"
  | "is_not_empty";
export interface Condition {
  leftOperand: string;
  operator: ConditionOperator;
  rightOperand?: string;
}
export interface ConditionNodeParams {
  conditions: Condition[];
  logicalOperator: "AND" | "OR";
  trueBranchNodeIds: string[];
  falseBranchNodeIds: string[];
}

/** Union of all typed params, keyed by node type */
export type NodeParamsByType = {
  trigger: TriggerNodeParams;
  shell_command: ShellCommandNodeParams;
  docker: DockerNodeParams;
  git: GitNodeParams;
  test: TestNodeParams;
  build: BuildNodeParams;
  deploy: DeployNodeParams;
  notification: NotificationNodeParams;
  condition: ConditionNodeParams;
};

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
