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
  trigger: {
    icon: "⚡",
    color: "#7c3aed",
    label: "Trigger",
    description: "Démarre le pipeline (push, PR, schedule…)",
    getSummary: (p) => {
      const type = (p.triggerType as string) ?? "?";
      if (type === "schedule") return `schedule: ${p.schedule ?? "cron ?"}`;
      if (type === "manual") return "manual";
      const branches = ((p.branches as string[]) ?? []).join(", ") || "*";
      return `${type} → ${branches}`;
    },
    defaultParams: { triggerType: "push", branches: ["main"] },
  },

  shell_command: {
    icon: "$_",
    color: "#52525b",
    label: "Shell",
    description: "Exécute un script bash / sh / PowerShell",
    getSummary: (p) => {
      const first = ((p.script as string) ?? "").split("\n")[0].slice(0, 48) || "—";
      return `${p.shell ?? "bash"}: ${first}`;
    },
    defaultParams: { shell: "bash", script: "echo hello" },
  },

  docker: {
    icon: "🐳",
    color: "#2563eb",
    label: "Docker",
    description: "Build, push, pull ou run de containers",
    getSummary: (p) => {
      const action = (p.action as string) ?? "?";
      if (action === "build")
        return `build → ${((p.tags as string[]) ?? []).join(", ") || "untagged"}`;
      if (action === "push") return `push → ${p.registry ?? "registry"}`;
      if (action === "run") return `run ${p.image ?? "?"}`;
      if (action === "compose_up" || action === "compose_down")
        return `${action} (${p.composeFile ?? "docker-compose.yml"})`;
      return action;
    },
    defaultParams: { action: "build", dockerfile: "Dockerfile", buildContext: "." },
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

  test: {
    icon: "✅",
    color: "#16a34a",
    label: "Test",
    description: "Lance une suite de tests",
    getSummary: (p) => {
      const runner =
        p.runner === "custom" ? ((p.command as string) ?? "custom") : ((p.runner as string) ?? "?");
      const cov = p.coverageThreshold !== undefined ? ` | cov ≥ ${p.coverageThreshold}%` : "";
      return `${runner}${cov}`;
    },
    defaultParams: { runner: "jest" },
  },

  build: {
    icon: "🔨",
    color: "#ca8a04",
    label: "Build",
    description: "Compile / package (npm, cargo, go…)",
    getSummary: (p) => {
      const tool =
        p.tool === "custom" ? ((p.command as string) ?? "custom") : ((p.tool as string) ?? "?");
      return `${tool}${p.target ? ` — ${p.target}` : ""}${p.outputPath ? ` → ${p.outputPath}` : ""}`;
    },
    defaultParams: { tool: "npm", target: "build" },
  },

  deploy: {
    icon: "🚀",
    color: "#4f46e5",
    label: "Deploy",
    description: "Déploie sur k8s, AWS, GCP, SSH…",
    getSummary: (p) => {
      const target = (p.target as string) ?? "?";
      const env = (p.environment as string) ?? "?";
      if (target === "kubernetes") return `k8s / ${p.namespace ?? "default"} [${env}]`;
      if (target === "ssh") return `ssh ${p.sshUser ?? "?"}@${p.sshHost ?? "?"}`;
      return `${target} / ${env}${p.rolloutStrategy ? ` [${p.rolloutStrategy}]` : ""}`;
    },
    defaultParams: { target: "kubernetes", environment: "staging", namespace: "default" },
  },

  notification: {
    icon: "🔔",
    color: "#db2777",
    label: "Notification",
    description: "Slack, Teams, email, webhook…",
    getSummary: (p) => `${p.channel ?? "?"} — ${p.notifyOn ?? "always"}`,
    defaultParams: { channel: "slack", notifyOn: "on_failure", message: "Pipeline {{status}}" },
  },

  condition: {
    icon: "⑂",
    color: "#d97706",
    label: "Condition",
    description: "Branche selon une condition runtime",
    getSummary: (p) => {
      const count = ((p.conditions as unknown[]) ?? []).length;
      return `${count} condition${count !== 1 ? "s" : ""} [${p.logicalOperator ?? "AND"}]`;
    },
    defaultParams: {
      conditions: [{ leftOperand: "", operator: "equals", rightOperand: "" }],
      logicalOperator: "AND",
      trueBranchNodeIds: [],
      falseBranchNodeIds: [],
    },
  },
};
