import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type NotificationChannel = "slack" | "teams" | "email" | "discord" | "webhook" | "pagerduty";

/** When to fire the notification relative to the pipeline status. */
export type NotificationTrigger = "always" | "on_success" | "on_failure" | "on_change";

/**
 * Type-specific parameters for a NotificationNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface NotificationNodeParams {
  channel: NotificationChannel;
  notifyOn: NotificationTrigger;
  /** Human-readable message body. Supports template variables: {{status}}, {{branch}}, {{commit}}. */
  message: string;
  /** Target: channel name, email address, or webhook URL.
   *  Sensitive values (tokens, webhook URLs with secrets) should go into `NodeData.secrets`. */
  recipient?: string;
  /** E-mail subject line (for 'email' channel). */
  subject?: string;
  /** Additional mentions / CC list. */
  mentions?: string[];
}

/** Sends a notification via the configured channel at the configured moment. */
export class NotificationNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly notificationParams: NotificationNodeParams,
  ) {
    super(id, "notification", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitNotification(this);
  }
}
