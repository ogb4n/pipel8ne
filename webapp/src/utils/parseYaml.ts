import jsyaml from "js-yaml";
import type { Graph, GraphEdge, GraphNode, Job, Stage, TriggerNodeParams } from "../Api/types";

type Platform = "github" | "gitlab" | "azure";

function uid(): string {
  return crypto.randomUUID();
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(doc: Record<string, unknown>): Platform {
  if (doc["on"] !== undefined && doc["jobs"] !== undefined) return "github";
  const stages = doc["stages"];
  if (Array.isArray(stages) && stages.length > 0) {
    if (typeof stages[0] === "string") return "gitlab";
    if (typeof stages[0] === "object" && stages[0] !== null && "stage" in (stages[0] as object))
      return "azure";
  }
  if (doc["trigger"] !== undefined || doc["pr"] !== undefined || doc["schedules"] !== undefined)
    return "azure";
  return "github";
}

// ── Step parsers ──────────────────────────────────────────────────────────────

function makeShellStep(label: string, script: string, y: number): GraphNode {
  return {
    id: uid(),
    type: "shell_command",
    positionX: 0,
    positionY: y,
    data: {
      label: label || "Script",
      description: "",
      params: { baseParameters: { shell: "bash", script } },
      env: {},
      secrets: {},
    },
  };
}

function parseGithubStep(step: Record<string, unknown>, index: number): GraphNode {
  const y = index * 120;
  const label = (step["name"] as string) ?? `Step ${index + 1}`;
  const uses = step["uses"] as string | undefined;
  const run = step["run"] as string | undefined;
  const withParams = (step["with"] as Record<string, unknown>) ?? {};

  if (uses?.startsWith("actions/checkout")) {
    return {
      id: uid(),
      type: "git",
      positionX: 0,
      positionY: y,
      data: {
        label: label || "Checkout",
        description: "",
        params: { baseParameters: { action: "clone", ref: withParams["ref"] ?? "" } },
        env: {},
        secrets: {},
      },
    };
  }

  if (uses && /docker\/(build-push|login)-action/.test(uses)) {
    return {
      id: uid(),
      type: "docker",
      positionX: 0,
      positionY: y,
      data: {
        label: label || "Docker",
        description: "",
        params: {
          baseParameters: {
            action: uses.includes("login") ? "push" : "build",
            tags: withParams["tags"] ?? "",
            dockerfile: withParams["file"] ?? "Dockerfile",
            registry: withParams["registry"] ?? "",
          },
        },
        env: {},
        secrets: {},
      },
    };
  }

  const script = run ?? (uses ? `# uses: ${uses}` : "echo done");
  return makeShellStep(label, script as string, y);
}

function parseGitlabScriptLines(lines: unknown[], jobName: string): GraphNode[] {
  if (lines.length === 0) return [];
  // Combine all lines into a single shell step
  const script = (lines as string[]).join("\n");
  return [makeShellStep(jobName, script, 0)];
}

function parseAzureStep(step: Record<string, unknown>, index: number): GraphNode {
  const y = index * 120;
  const label = (step["displayName"] as string) ?? (step["task"] as string) ?? `Step ${index + 1}`;
  const task = step["task"] as string | undefined;
  const script = (step["script"] as string) ?? (step["bash"] as string) ?? (step["pwsh"] as string);
  const inputs = (step["inputs"] as Record<string, unknown>) ?? {};

  if (task?.startsWith("Docker@")) {
    return {
      id: uid(),
      type: "docker",
      positionX: 0,
      positionY: y,
      data: {
        label: label,
        description: "",
        params: {
          baseParameters: {
            action: (inputs["command"] as string) ?? "build",
            image: inputs["imageName"] ?? inputs["containerRegistry"] ?? "",
          },
        },
        env: {},
        secrets: {},
      },
    };
  }

  if (task?.startsWith("KubernetesManifest@") || task?.startsWith("HelmDeploy@")) {
    return {
      id: uid(),
      type: "deploy",
      positionX: 0,
      positionY: y,
      data: {
        label: label,
        description: "",
        params: {
          baseParameters: {
            target: "kubernetes",
            environment: (inputs["environment"] as string) ?? "production",
            namespace: inputs["namespace"] ?? "",
            manifestPath: inputs["manifests"] ?? "",
          },
        },
        env: {},
        secrets: {},
      },
    };
  }

  if (script) return makeShellStep(label, script, y);

  // Fallback for any other task
  return makeShellStep(label, `# task: ${task ?? "unknown"}`, y);
}

// ── Trigger parsers ───────────────────────────────────────────────────────────

function parseGithubTrigger(on: unknown): TriggerNodeParams | undefined {
  if (!on) return undefined;
  if (on === "push" || (Array.isArray(on) && (on as string[]).includes("push"))) {
    return { triggerType: "push", branches: ["main"] };
  }
  if (typeof on === "object" && on !== null) {
    const obj = on as Record<string, unknown>;
    if (obj["push"]) {
      const push = obj["push"] as Record<string, unknown>;
      if (push["tags"]) return { triggerType: "tag", tags: push["tags"] as string[] };
      return { triggerType: "push", branches: (push["branches"] as string[]) ?? ["main"] };
    }
    if (obj["pull_request"]) {
      const pr = obj["pull_request"] as Record<string, unknown>;
      return { triggerType: "pull_request", branches: (pr["branches"] as string[]) ?? ["main"] };
    }
    if (obj["schedule"]) {
      const sched = obj["schedule"] as Array<Record<string, string>>;
      return { triggerType: "schedule", schedule: sched[0]?.cron ?? "0 0 * * *" };
    }
    if (obj["workflow_dispatch"]) return { triggerType: "manual" };
  }
  return undefined;
}

function parseAzureTrigger(doc: Record<string, unknown>): TriggerNodeParams | undefined {
  const trigger = doc["trigger"];
  const pr = doc["pr"];
  const schedules = doc["schedules"];

  if (trigger === "none") return { triggerType: "manual" };
  if (schedules && Array.isArray(schedules)) {
    const s = (schedules[0] as Record<string, unknown>);
    return { triggerType: "schedule", schedule: (s["cron"] as string) ?? "0 0 * * *" };
  }
  if (pr) {
    const branches = ((pr as Record<string, unknown>)["branches"] as Record<string, string[]>)?.["include"] ?? ["main"];
    return { triggerType: "pull_request", branches };
  }
  if (trigger && typeof trigger === "object") {
    const t = trigger as Record<string, unknown>;
    if (t["tags"]) return { triggerType: "tag", tags: (t["tags"] as Record<string, string[]>)?.["include"] ?? ["v*"] };
    const branches = (t["branches"] as Record<string, string[]>)?.["include"] ?? ["main"];
    return { triggerType: "push", branches };
  }
  return undefined;
}

// ── Topological level grouping (for GitHub Actions flat jobs) ─────────────────

function topoLevels(
  jobs: Record<string, { needs?: string | string[] }>
): Map<string, number> {
  const levels = new Map<string, number>();

  const getLevel = (name: string, visited = new Set<string>()): number => {
    if (levels.has(name)) return levels.get(name)!;
    if (visited.has(name)) return 0; // cycle guard
    visited.add(name);
    const raw = jobs[name]?.needs;
    const needs: string[] = raw
      ? Array.isArray(raw)
        ? raw
        : [raw]
      : [];
    const level = needs.length === 0 ? 0 : Math.max(...needs.map((n) => getLevel(n, new Set(visited)))) + 1;
    levels.set(name, level);
    return level;
  };

  for (const name of Object.keys(jobs)) getLevel(name);
  return levels;
}

// ── Platform-specific parsers ─────────────────────────────────────────────────

function parseGithubActions(doc: Record<string, unknown>): Pick<Graph, "trigger" | "stages" | "stageEdges"> {
  const rawJobs = (doc["jobs"] as Record<string, Record<string, unknown>>) ?? {};
  const trigger = parseGithubTrigger(doc["on"]);
  const levels = topoLevels(rawJobs as Record<string, { needs?: string | string[] }>);

  // Group job names by level
  const byLevel = new Map<number, string[]>();
  for (const [name, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(name);
  }

  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
  const stages: Stage[] = [];
  const stageEdges: GraphEdge[] = [];

  for (const level of sortedLevels) {
    const jobNames = byLevel.get(level)!;
    const stageId = uid();
    const jobs: Job[] = jobNames.map((jobName, ji) => {
      const rawJob = rawJobs[jobName];
      const rawSteps = (rawJob["steps"] as Record<string, unknown>[]) ?? [];
      return {
        id: uid(),
        name: jobName,
        runsOn: (rawJob["runs-on"] as string) ?? "ubuntu-latest",
        steps: rawSteps.map((s, i) => parseGithubStep(s, i)),
        position: { x: ji * 300, y: 0 },
      };
    });

    stages.push({
      id: stageId,
      name: `stage-${level + 1}`,
      jobs,
      position: { x: level * 400, y: 100 },
    });

    if (level > 0) {
      const prevStage = stages[stages.length - 2];
      stageEdges.push({
        id: uid(),
        source: prevStage.id,
        target: stageId,
        type: "stageEdge",
      });
    }
  }

  return { trigger, stages, stageEdges };
}

function parseGitlabCI(doc: Record<string, unknown>): Pick<Graph, "trigger" | "stages" | "stageEdges"> {
  const stageOrder = (doc["stages"] as string[]) ?? [];

  // Collect job definitions — everything that isn't a reserved key
  const reservedKeys = new Set(["stages", "image", "variables", "before_script", "after_script", "cache", "include", "workflow", "default"]);
  const jobsByStage = new Map<string, Array<{ name: string; job: Record<string, unknown> }>>();

  for (const [key, val] of Object.entries(doc)) {
    if (reservedKeys.has(key)) continue;
    if (typeof val !== "object" || val === null) continue;
    const jobDef = val as Record<string, unknown>;
    const stageName = (jobDef["stage"] as string) ?? (stageOrder[0] ?? "build");
    if (!jobsByStage.has(stageName)) jobsByStage.set(stageName, []);
    jobsByStage.get(stageName)!.push({ name: key, job: jobDef });
  }

  // Determine stage order
  const orderedStageNames =
    stageOrder.length > 0
      ? stageOrder.filter((s) => jobsByStage.has(s))
      : [...jobsByStage.keys()];

  const stages: Stage[] = [];
  const stageEdges: GraphEdge[] = [];

  for (let si = 0; si < orderedStageNames.length; si++) {
    const stageName = orderedStageNames[si];
    const jobDefs = jobsByStage.get(stageName) ?? [];
    const stageId = uid();

    const jobs: Job[] = jobDefs.map((jd, ji) => {
      const script = (jd.job["script"] as unknown[]) ?? [];
      const beforeScript = (jd.job["before_script"] as string[]) ?? [];
      const allLines = [...beforeScript, ...(script as string[])];
      const image = jd.job["image"] as string | undefined;
      const tags = jd.job["tags"] as string[] | undefined;
      const runsOn = image ?? (tags ? tags.join(",") : "ubuntu-latest");

      return {
        id: uid(),
        name: jd.name,
        runsOn,
        steps: parseGitlabScriptLines(allLines, jd.name),
        position: { x: ji * 300, y: 0 },
      };
    });

    stages.push({ id: stageId, name: stageName, jobs, position: { x: si * 400, y: 100 } });

    if (si > 0) {
      stageEdges.push({
        id: uid(),
        source: stages[si - 1].id,
        target: stageId,
        type: "stageEdge",
      });
    }
  }

  return { trigger: undefined, stages, stageEdges };
}

function parseAzureDevOps(doc: Record<string, unknown>): Pick<Graph, "trigger" | "stages" | "stageEdges"> {
  const trigger = parseAzureTrigger(doc);
  const rawStages = (doc["stages"] as Record<string, unknown>[]) ?? [];

  const stageIdByName = new Map<string, string>();
  const stages: Stage[] = [];
  const stageEdges: GraphEdge[] = [];

  for (let si = 0; si < rawStages.length; si++) {
    const raw = rawStages[si];
    const stageName = (raw["stage"] as string) ?? `Stage${si + 1}`;
    const stageId = uid();
    stageIdByName.set(stageName, stageId);

    const rawJobs = (raw["jobs"] as Record<string, unknown>[]) ?? [];
    const jobs: Job[] = rawJobs.map((rj, ji) => {
      const jobName = (rj["job"] as string) ?? `job${ji + 1}`;
      const pool = (rj["pool"] as Record<string, string>) ?? {};
      const runsOn = pool["vmImage"] ?? "ubuntu-latest";
      const rawSteps = (rj["steps"] as Record<string, unknown>[]) ?? [];
      return {
        id: uid(),
        name: jobName,
        runsOn,
        steps: rawSteps.map((s, i) => parseAzureStep(s, i)),
        position: { x: ji * 300, y: 0 },
      };
    });

    stages.push({ id: stageId, name: stageName, jobs, position: { x: si * 400, y: 100 } });

    // Resolve dependsOn
    const deps = raw["dependsOn"];
    const depNames: string[] = deps
      ? Array.isArray(deps)
        ? (deps as string[])
        : [deps as string]
      : [];

    for (const dep of depNames) {
      const sourceId = stageIdByName.get(dep);
      if (sourceId) {
        stageEdges.push({ id: uid(), source: sourceId, target: stageId, type: "stageEdge" });
      }
    }

    // If no explicit deps and not the first stage, link to previous
    if (depNames.length === 0 && si > 0) {
      stageEdges.push({
        id: uid(),
        source: stages[si - 1].id,
        target: stageId,
        type: "stageEdge",
      });
    }
  }

  return { trigger, stages, stageEdges };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ParsedPipeline {
  name: string;
  trigger?: TriggerNodeParams;
  stages: Stage[];
  stageEdges: GraphEdge[];
  platform: Platform;
}

export function parseYamlToPipeline(yamlText: string, fileName: string): ParsedPipeline {
  const doc = jsyaml.load(yamlText) as Record<string, unknown>;
  if (!doc || typeof doc !== "object") throw new Error("Fichier YAML invalide");

  const platform = detectPlatform(doc);
  const name = (doc["name"] as string) ?? fileName.replace(/\.(yml|yaml)$/i, "");

  let result: Pick<Graph, "trigger" | "stages" | "stageEdges">;
  if (platform === "github") result = parseGithubActions(doc);
  else if (platform === "gitlab") result = parseGitlabCI(doc);
  else result = parseAzureDevOps(doc);

  return { name, platform, ...result };
}
