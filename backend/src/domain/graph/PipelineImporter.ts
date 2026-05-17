import { parse } from "yaml";
import { randomUUID } from "crypto";
import type { Graph, Viewport } from "./Graph.js";
import type { Stage } from "./Stage.js";
import type { Job } from "./Job.js";
import type { Node } from "./Node.js";
import type { Edge } from "./Edge.js";
import type { TriggerNodeParams } from "./nodes/TriggerNode.js";

type GitHubOn =
  | string
  | string[]
  | {
      push?: { branches?: string[] };
      pull_request?: { branches?: string[] };
      schedule?: Array<{ cron: string }>;
      workflow_dispatch?: unknown;
      create?: unknown;
      release?: unknown;
    };

interface GitHubStep {
  name?: string;
  uses?: string;
  run?: string;
  shell?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}

interface GitHubJob {
  "runs-on"?: string;
  needs?: string | string[];
  steps?: GitHubStep[];
}

interface GitHubWorkflow {
  name?: string;
  on?: GitHubOn;
  jobs?: Record<string, GitHubJob>;
}

interface GitLabDoc {
  stages?: string[];
  before_script?: string[];
  [key: string]: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function uuid(): string {
  return randomUUID();
}

function shellNode(label: string, script: string, y: number, env: Record<string, unknown> = {}): Node {
  return {
    id: uuid(),
    type: "shell_command",
    positionX: 0,
    positionY: y,
    data: {
      label: label.slice(0, 60) || "Run",
      description: script.slice(0, 120),
      params: { baseParameters: { shell: "bash", script } },
      env,
      secrets: {},
    },
  };
}

function gitNode(label: string, y: number): Node {
  return {
    id: uuid(),
    type: "git",
    positionX: 0,
    positionY: y,
    data: {
      label: label || "Checkout",
      description: "Checkout repository",
      params: { baseParameters: { action: "clone" } },
      env: {},
      secrets: {},
    },
  };
}

function sequentialEdges(nodes: Node[]): Edge[] {
  return nodes.slice(1).map((node, i) => ({
    id: uuid(),
    source: nodes[i].id,
    target: node.id,
    type: "default",
  }));
}

// ── GitHub Actions parser ──────────────────────────────────────────────────────

function parseGitHubTrigger(on: GitHubOn | undefined): TriggerNodeParams | undefined {
  if (!on) return undefined;

  // string shorthand: on: push
  if (typeof on === "string") {
    if (on === "push") return { triggerType: "push", branches: ["main"] };
    if (on === "pull_request") return { triggerType: "pull_request", branches: ["main"] };
    if (on === "workflow_dispatch") return { triggerType: "manual" };
  }

  // array shorthand: on: [push, pull_request]
  if (Array.isArray(on)) {
    const first = on[0];
    if (first === "push") return { triggerType: "push", branches: ["main"] };
    if (first === "workflow_dispatch") return { triggerType: "manual" };
  }

  const map = on as Exclude<GitHubOn, string | string[]>;

  if (map.push) {
    return { triggerType: "push", branches: map.push.branches ?? ["main"] };
  }
  if (map.pull_request) {
    return { triggerType: "pull_request", branches: map.pull_request.branches ?? ["main"] };
  }
  if (map.schedule?.length) {
    return { triggerType: "schedule", schedule: map.schedule[0].cron };
  }
  if (map.workflow_dispatch !== undefined) {
    return { triggerType: "manual" };
  }
  if (map.release !== undefined || map.create !== undefined) {
    return { triggerType: "tag" };
  }
  return undefined;
}

function parseGitHubSteps(steps: GitHubStep[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const y = i * 130;

    if (step.uses?.startsWith("actions/checkout")) {
      nodes.push(gitNode(step.name ?? "Checkout", y));
    } else if (step.run) {
      nodes.push(shellNode(step.name ?? step.run.split("\n")[0], step.run, y, step.env as Record<string, unknown>));
    } else if (step.uses) {
      // Other actions — represent as a commented shell step for visibility
      nodes.push(shellNode(step.name ?? step.uses, `# uses: ${step.uses}`, y));
    }
  }

  return { nodes, edges: sequentialEdges(nodes) };
}

function importGitHub(name: string, doc: GitHubWorkflow, projectId: string): Omit<Graph, "id"> {
  const trigger = parseGitHubTrigger(doc.on);
  const jobs = doc.jobs ?? {};
  const stages: Stage[] = [];
  const stageEdges: Edge[] = [];
  const stageIdByJob: Record<string, string> = {};

  let stageX = 0;
  for (const [jobName, jobDef] of Object.entries(jobs)) {
    const stageId = uuid();
    stageIdByJob[jobName] = stageId;

    const { nodes, edges } = parseGitHubSteps(jobDef.steps ?? []);
    const job: Job = {
      id: uuid(),
      name: jobName,
      runsOn: jobDef["runs-on"] ?? "ubuntu-latest",
      steps: nodes,
      stepEdges: edges,
    };

    stages.push({
      id: stageId,
      name: jobName,
      position: { x: stageX, y: 0 },
      jobs: [job],
      jobEdges: [],
    });
    stageX += 380;
  }

  // Build stage edges from `needs:`
  for (const [jobName, jobDef] of Object.entries(jobs)) {
    if (!jobDef.needs) continue;
    const deps = Array.isArray(jobDef.needs) ? jobDef.needs : [jobDef.needs];
    for (const dep of deps) {
      if (stageIdByJob[dep] && stageIdByJob[jobName]) {
        stageEdges.push({
          id: uuid(),
          source: stageIdByJob[dep],
          target: stageIdByJob[jobName],
          type: "stageEdge",
        });
      }
    }
  }

  return { projectId, name, status: "draft", trigger, viewport: defaultViewport(stages.length), stages, stageEdges };
}

// ── GitLab CI parser ───────────────────────────────────────────────────────────

const GITLAB_RESERVED = new Set([
  "stages", "variables", "default", "include", "workflow", "image",
  "services", "before_script", "after_script", "cache", "artifacts",
  "pages", "rules", "extends", "retry", "timeout", "interruptible",
]);

function importGitLab(name: string, doc: GitLabDoc, projectId: string): Omit<Graph, "id"> {
  const globalBeforeScript: string[] = (doc.before_script as string[] | undefined) ?? [];
  const stageOrder: string[] = doc.stages as string[] ?? [];

  // Collect jobs keyed by stage name
  const jobsByStage: Record<string, Array<{ name: string; def: Record<string, unknown> }>> = {};
  for (const [key, val] of Object.entries(doc)) {
    if (GITLAB_RESERVED.has(key)) continue;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const def = val as Record<string, unknown>;
    if (!def.script && !def.stage) continue;
    const stageName = (def.stage as string | undefined) ?? "test";
    if (!jobsByStage[stageName]) jobsByStage[stageName] = [];
    jobsByStage[stageName].push({ name: key, def });
  }

  const allStageNames = stageOrder.length > 0 ? stageOrder : [...new Set(Object.keys(jobsByStage))];

  const stages: Stage[] = [];
  const stageEdges: Edge[] = [];
  const stageIds: string[] = [];

  for (const stageName of allStageNames) {
    const stageId = uuid();
    stageIds.push(stageId);

    const jobs: Job[] = (jobsByStage[stageName] ?? []).map((entry, ji) => {
      const { def } = entry;
      const beforeScript = [
        ...globalBeforeScript,
        ...((def.before_script as string[] | undefined) ?? []),
      ];
      const script: string[] = (def.script as string[] | undefined) ?? [];
      const allLines = [...beforeScript, ...script];

      const nodes: Node[] = allLines.map((line, i) =>
        shellNode(line.slice(0, 50) || "Script", line, i * 130),
      );

      return {
        id: uuid(),
        name: entry.name,
        runsOn: (def.tags as string[] | undefined)?.[0] ?? "ubuntu-latest",
        steps: nodes,
        stepEdges: sequentialEdges(nodes),
      } satisfies Job;
    });

    stages.push({
      id: stageId,
      name: stageName,
      position: { x: stages.length * 380, y: 0 },
      jobs,
      jobEdges: [],
    });
  }

  // Sequential stage edges from the declared order
  for (let i = 1; i < stageIds.length; i++) {
    stageEdges.push({
      id: uuid(),
      source: stageIds[i - 1],
      target: stageIds[i],
      type: "stageEdge",
    });
  }

  return {
    projectId,
    name,
    status: "draft",
    trigger: { triggerType: "push", branches: ["main"] },
    viewport: defaultViewport(stages.length),
    stages,
    stageEdges,
  };
}

// ── Viewport helper ────────────────────────────────────────────────────────────

function defaultViewport(stageCount: number): Viewport {
  // Zoom out a bit for large pipelines so all stages are visible at a glance
  const zoom = stageCount > 4 ? 0.6 : stageCount > 2 ? 0.75 : 1;
  return { x: 40, y: 40, zoom };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export type SupportedProvider = "github" | "gitlab" | "azure_devops";

export class PipelineImporter {
  /**
   * Parse a raw CI/CD YAML file and return an unsaved Graph.
   * Returns null if the content cannot be parsed.
   */
  static import(
    name: string,
    content: string,
    provider: SupportedProvider,
    projectId: string,
  ): Omit<Graph, "id"> | null {
    let doc: unknown;
    try {
      doc = parse(content);
    } catch {
      return null;
    }

    if (!doc || typeof doc !== "object") return null;

    if (provider === "github") {
      return importGitHub(name, doc as GitHubWorkflow, projectId);
    }
    if (provider === "gitlab") {
      return importGitLab(name, doc as GitLabDoc, projectId);
    }
    // Azure DevOps uses a GitHub Actions-like syntax — best-effort
    if (provider === "azure_devops") {
      return importGitHub(name, doc as GitHubWorkflow, projectId);
    }
    return null;
  }
}
