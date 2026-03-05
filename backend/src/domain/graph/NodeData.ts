import { NodeParams } from "./NodeParams.js";

export interface NodeData {
  label: string;
  description: string;
  params: NodeParams;
  env: Record<string, unknown>;
  /**
   * Sensitive values — stored encrypted at rest (AES-256-GCM).
   * At domain level, values are plain strings; encryption/decryption
   * is handled exclusively in the infrastructure layer (SecretsService).
   */
  secrets: Record<string, string>;
}
