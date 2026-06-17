/**
 * nodeConfig — Strategy pattern pour le rendu des nodes CI/CD.
 *
 * Ajouter un type = ajouter une entrée ici. Zéro nouveau fichier composant.
 */
import type { NodeType } from "../../Api/types";

export interface NodeConfig {
  icon: string;
  color: string;
  label: string;
  description: string;
  /** Strategy : résume les params en une ligne pour la card */
  getSummary: (params: Record<string, unknown>) => string;
  /** Params injectés à la création depuis la palette */
  defaultParams: Record<string, unknown>;
}

export const nodeConfig: Record<NodeType, NodeConfig> = {
  shell_command: {
    icon: "$_",
    color: "#2563eb",
    label: "Shell",
    description: "Exécute un script bash / sh / PowerShell",
    getSummary: (p) => {
      const first = ((p.script as string) ?? "").split("\n")[0].slice(0, 48) || "—";
      return `${p.shell ?? "bash"}: ${first}`;
    },
    defaultParams: { shell: "bash", script: "echo hello" },
  },

  git: {
    icon: "🔀",
    color: "#ea580c",
    label: "Git",
    description: "Clone, checkout, tag ou push",
    getSummary: (p) => {
      const action = (p.action as string) ?? "?";
      if (action === "clone") return `clone → ${p.directory ?? "."}`;
      if (action === "checkout") return `checkout ${p.ref ?? "?"}`;
      if (action === "tag") return `tag ${p.tagName ?? "?"}`;
      return `${action} (${p.remote ?? "origin"})`;
    },
    defaultParams: { action: "clone", repositoryUrl: "", directory: "." },
  },

  notification: {
    icon: "🔔",
    color: "#db2777",
    label: "Notification",
    description: "Slack, Teams, email, webhook…",
    getSummary: (p) => `${p.channel ?? "?"} — ${p.notifyOn ?? "always"}`,
    defaultParams: { channel: "slack", notifyOn: "on_failure", message: "Pipeline {{status}}" },
  },
};
