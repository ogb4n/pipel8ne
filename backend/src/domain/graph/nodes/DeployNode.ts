import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type DeployTarget =
  | "kubernetes"
  | "aws_ecs"
  | "aws_lambda"
  | "gcp_run"
  | "azure_app"
  | "ssh"
  | "custom";

export type RolloutStrategy = "rolling" | "blue_green" | "canary" | "recreate";

/**
 * Type-specific parameters for a DeployNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface DeployNodeParams {
  target: DeployTarget;
  /** Logical environment name (e.g. 'staging', 'production'). */
  environment: string;
  /** Command override — used when target === 'custom'. */
  command?: string;

  // --- Kubernetes ---
  /** Path to K8s manifests or Helm chart directory. */
  manifestPath?: string;
  /** Kubernetes namespace. */
  namespace?: string;
  rolloutStrategy?: RolloutStrategy;

  // --- SSH ---
  /** SSH host (can reference a secret key instead of a plain value). */
  sshHost?: string;
  sshUser?: string;
  /** Remote path to deploy files to. */
  remotePath?: string;

  // --- AWS / GCP / Azure ---
  region?: string;
  /** Service / function / app name on the cloud provider. */
  serviceName?: string;

  /** If true, a deploy failure does NOT mark the whole pipeline as failed. */
  continueOnError?: boolean;
}

/** Deploys the built artefact to the configured target environment. */
export class DeployNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly deployParams: DeployNodeParams,
  ) {
    super(id, "deploy", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitDeploy(this);
  }
}
