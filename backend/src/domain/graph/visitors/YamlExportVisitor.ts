/**
 * YamlExporter
 *
 * Converts a Graph into a GitHub Actions workflow YAML string.
 * Uses the Visitor pattern (YamlStepVisitor per job) to turn each node
 * into one or more GitHub Actions steps.
 *
 * Usage:
 *   const { yaml, filePath } = new YamlExporter().generate(graph);
 *   // filePath → ".github/workflows/my-pipeline.yml"
 */
import type { INodeVisitor } from "./INodeVisitor.js";
import type { TriggerNode } from "../nodes/TriggerNode.js";
import type { ShellCommandNode } from "../nodes/ShellCommandNode.js";
import type { DockerNode } from "../nodes/DockerNode.js";
import type { GitNode } from "../nodes/GitNode.js";
import type { TestNode } from "../nodes/TestNode.js";
import type { BuildNode } from "../nodes/BuildNode.js";
import type { DeployNode } from "../nodes/DeployNode.js";
import type { NotificationNode } from "../nodes/NotificationNode.js";
import type { Graph } from "../Graph.js";
import { NodeFactory } from "../nodes/NodeFactory.js";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Sanitize a string to a valid GitHub Actions job ID (alphanumeric + hyphens). */
function sanitizeId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "job";
}

/**
 * Sanitize a string to a valid Azure DevOps stage/job identifier.
 * Azure only allows alphanumeric characters and underscores; no hyphens.
 */
function sanitizeAzureId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "job";
}

/** Sanitize a pipeline name to a valid filename slug. */
function sanitizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "pipeline";
}

/** Indent every line by `n` spaces. */
function indent(lines: string[], n: number): string[] {
  const pad = " ".repeat(n);
  return lines.map((l) => (l === "" ? "" : pad + l));
}

/** Produce a YAML block scalar for a multiline string (run: | …). */
function blockScalar(script: string, baseIndent: number): string[] {
  const pad = " ".repeat(baseIndent);
  return script.split("\n").map((l) => pad + l);
}

// ── Step representation ───────────────────────────────────────────────────────

interface GhStep {
  name: string;
  run: string;
  env?: Record<string, string>;
  continueOnError?: boolean;
  timeoutMinutes?: number;
}

/** Serialize a single GitHub Actions step to YAML lines (no leading indent). */
function stepToLines(step: GhStep): string[] {
  const lines: string[] = [];
  lines.push(`- name: ${step.name}`);
  if (step.continueOnError) lines.push("  continue-on-error: true");
  if (step.timeoutMinutes) lines.push(`  timeout-minutes: ${step.timeoutMinutes}`);
  if (step.env && Object.keys(step.env).length > 0) {
    lines.push("  env:");
    for (const [k, v] of Object.entries(step.env)) {
      lines.push(`    ${k}: ${v}`);
    }
  }
  const scriptLines = step.run.split("\n");
  if (scriptLines.length === 1) {
    lines.push(`  run: ${step.run}`);
  } else {
    lines.push("  run: |");
    for (const l of scriptLines) {
      lines.push(`    ${l}`);
    }
  }
  return lines;
}

/** Build an env block combining node.data.env and node.data.secrets. */
function buildEnv(
  env: Record<string, unknown>,
  secrets: Record<string, string>,
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    result[k] = String(v);
  }
  for (const [k] of Object.entries(secrets)) {
    result[k] = `\${{ secrets.${k} }}`;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ── Visitor ───────────────────────────────────────────────────────────────────

/** Collects GitHub Actions steps for one Job. Instantiate once per job. */
class YamlStepVisitor implements INodeVisitor {
  private readonly steps: GhStep[] = [];

  getSteps(): GhStep[] {
    return [...this.steps];
  }

  visitShellCommand(node: ShellCommandNode): void {
    const p = node.shellParams ?? {};
    const env = buildEnv(node.data.env ?? {}, node.data.secrets ?? {});
    const envWithWd =
      p.workingDirectory
        ? { ...env, WORKING_DIR: p.workingDirectory }
        : env;
    const script = p.workingDirectory
      ? `cd ${p.workingDirectory}\n${p.script ?? ""}`
      : (p.script ?? "echo 'no script'");
    this.steps.push({
      name: node.data.label,
      run: script,
      env: envWithWd && Object.keys(envWithWd).length > 0 ? envWithWd : undefined,
      continueOnError: p.continueOnError,
      timeoutMinutes: p.timeoutSeconds ? Math.ceil(p.timeoutSeconds / 60) : undefined,
    });
  }

  visitDocker(node: DockerNode): void {
    const p = node.dockerParams ?? {};
    let run: string;
    switch (p.action) {
      case "build": {
        const tagFlags = (p.tags ?? []).map((t) => `-t ${t}`).join(" ");
        const argFlags = Object.entries(p.buildArgs ?? {})
          .map(([k, v]) => `--build-arg ${k}=${v}`)
          .join(" ");
        run = `docker build ${tagFlags} ${argFlags} -f ${p.dockerfile ?? "Dockerfile"} ${p.buildContext ?? "."}`.trim();
        break;
      }
      case "push":
        run = `docker push ${p.image ?? ""}`;
        break;
      case "pull":
        run = `docker pull ${p.image ?? ""}`;
        break;
      case "run": {
        const portFlags = (p.ports ?? []).map((port) => `-p ${port}`).join(" ");
        const volFlags = (p.volumes ?? []).map((v) => `-v ${v}`).join(" ");
        run = `docker run ${portFlags} ${volFlags} ${p.image ?? ""} ${p.command ?? ""}`.trim();
        break;
      }
      case "compose_up":
        run = `docker compose -f ${p.composeFile ?? "docker-compose.yml"} up -d`;
        break;
      case "compose_down":
        run = `docker compose -f ${p.composeFile ?? "docker-compose.yml"} down`;
        break;
      default:
        run = `docker ${p.action}`;
    }
    this.steps.push({
      name: node.data.label,
      run,
      env: buildEnv(node.data.env ?? {}, node.data.secrets ?? {}),
    });
  }

  visitGit(node: GitNode): void {
    const p = node.gitParams ?? {};
    let run: string;
    switch (p.action) {
      case "clone":
        run = `git clone${p.depth ? ` --depth ${p.depth}` : ""} ${p.repositoryUrl ?? ""} ${p.directory ?? ""}`.trim();
        break;
      case "checkout":
        run = `git checkout ${p.ref ?? "main"}`;
        break;
      case "pull":
        run = `git pull ${p.remote ?? "origin"}`;
        break;
      case "fetch":
        run = `git fetch ${p.remote ?? "origin"}`;
        break;
      case "tag":
        run = `git tag${p.tagMessage ? ` -a` : ""} ${p.tagName ?? "v0.0.0"}${p.tagMessage ? ` -m "${p.tagMessage}"` : ""}`;
        break;
      case "push":
        run = `git push ${p.remote ?? "origin"}`;
        break;
      default:
        run = `git ${p.action}`;
    }
    this.steps.push({
      name: node.data.label,
      run,
      env: buildEnv(node.data.env ?? {}, node.data.secrets ?? {}),
    });
  }

  visitTest(node: TestNode): void {
    const p = node.testParams ?? {};
    let run: string;
    switch (p.runner) {
      case "npm":
        run = p.testPattern ? `npm test -- --testPathPattern="${p.testPattern}"` : "npm test";
        break;
      case "pytest":
        run = `pytest${p.testPattern ? ` ${p.testPattern}` : ""}`;
        break;
      case "custom":
        run = p.command ?? "echo 'no test command'";
        break;
      default:
        run = p.command ?? `${p.runner} test`;
    }
    this.steps.push({
      name: node.data.label,
      run,
      continueOnError: p.continueOnError,
      env: buildEnv(node.data.env ?? {}, node.data.secrets ?? {}),
    });
  }

  visitBuild(node: BuildNode): void {
    const p = node.buildParams ?? {};
    let run: string;
    switch (p.tool) {
      case "npm":
        run = `npm run ${p.target ?? "build"}`;
        break;
      case "gradle":
        run = `./gradlew ${p.target ?? "build"}`;
        break;
      case "maven":
        run = `mvn ${p.target ?? "package"}`;
        break;
      case "make":
        run = `make ${p.target ?? ""}`.trim();
        break;
      case "custom":
        run = p.command ?? "echo 'no build command'";
        break;
      default:
        run = p.command ?? `${p.tool} build`;
    }
    if (p.workingDirectory) run = `cd ${p.workingDirectory}\n${run}`;
    this.steps.push({
      name: node.data.label,
      run,
      env: buildEnv(node.data.env ?? {}, node.data.secrets ?? {}),
    });
  }

  visitDeploy(node: DeployNode): void {
    const p = node.deployParams ?? {};
    let run: string;
    switch (p.target) {
      case "kubernetes":
        run = `kubectl apply -f ${p.manifestPath ?? "."}${p.namespace ? ` -n ${p.namespace}` : ""}`;
        break;
      case "ssh":
        run = `ssh ${p.sshUser ?? "user"}@${p.sshHost ?? "host"} "cd ${p.remotePath ?? "."} && ./deploy.sh"`;
        break;
      default:
        run = `echo "Deploy to ${p.target} — env: ${p.environment ?? "?"}"`;
    }
    this.steps.push({
      name: node.data.label,
      run,
      env: buildEnv(node.data.env ?? {}, node.data.secrets ?? {}),
    });
  }

  visitTrigger(_node: TriggerNode): void {
    // Trigger is rendered at the graph level via buildTrigger(), not as a job step
  }

  visitNotification(_node: NotificationNode): void {
    // Notification steps are intentionally omitted from YAML export
    // (no universal cross-provider GitHub Action for all channels)
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Wrap a shell command as a safe single-quoted YAML scalar. */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Runner name → GitLab tags */
function gitlabTags(runsOn: string): string[] {
  const r = (runsOn || "").toLowerCase();
  if (r.includes("windows")) return ["windows"];
  if (r.includes("macos")) return ["macos"];
  return ["linux"];
}

// ── Exporter ─────────────────────────────────────────────────────────────────

export interface YamlExportResult {
  yaml: string;
  filePath: string;
}

export class YamlExporter {
  generate(graph: Graph): YamlExportResult {
    const filePath = `.github/workflows/${sanitizeName(graph.name)}.yml`;
    const lines: string[] = [];

    // name:
    lines.push(`name: ${graph.name}`);
    lines.push("");

    // on:
    lines.push(...this.buildTrigger(graph));
    lines.push("");

    // jobs:
    lines.push("jobs:");

    if (graph.stages.length === 0) {
      lines.push("  # No stages configured");
    }

    let prevStageJobIds: string[] = [];
    const usedIds = new Set<string>();

    for (const stage of graph.stages) {
      const stageJobIds: string[] = [];

      for (const job of stage.jobs) {
        // Generate a unique job ID
        let jobId = sanitizeId(`${stage.name}-${job.name}`);
        let suffix = 2;
        while (usedIds.has(jobId)) {
          jobId = sanitizeId(`${stage.name}-${job.name}-${suffix++}`);
        }
        usedIds.add(jobId);
        stageJobIds.push(jobId);

        lines.push(`  ${jobId}:`);
        lines.push(`    runs-on: ${job.runsOn || "ubuntu-latest"}`);

        if (prevStageJobIds.length > 0) {
          lines.push(`    needs: [${prevStageJobIds.join(", ")}]`);
        }

        lines.push("    steps:");

        const domainNodes = NodeFactory.fromDTOs(job.steps);
        const visitor = new YamlStepVisitor();
        for (const node of domainNodes) node.accept(visitor);
        const steps = visitor.getSteps();

        if (steps.length === 0) {
          lines.push('      - run: echo "No steps configured"');
        } else {
          for (const step of steps) {
            const stepLines = indent(stepToLines(step), 6);
            lines.push(...stepLines);
          }
        }

        lines.push("");
      }

      prevStageJobIds = stageJobIds;
    }

    return { yaml: lines.join("\n").trimEnd() + "\n", filePath };
  }

  private buildTrigger(graph: Graph): string[] {
    const t = graph.trigger;
    if (!t) return ["on: workflow_dispatch"];

    const lines: string[] = ["on:"];
    switch (t.triggerType) {
      case "push":
        lines.push("  push:");
        if (t.branches?.length) {
          lines.push("    branches:");
          for (const b of t.branches) lines.push(`      - '${b}'`);
        }
        break;
      case "pull_request":
        lines.push("  pull_request:");
        if (t.branches?.length) {
          lines.push("    branches:");
          for (const b of t.branches) lines.push(`      - '${b}'`);
        }
        break;
      case "schedule":
        lines.push("  schedule:");
        lines.push(`    - cron: '${t.schedule ?? "0 0 * * *"}'`);
        break;
      case "tag":
        lines.push("  push:");
        if (t.tags?.length) {
          lines.push("    tags:");
          for (const tag of t.tags) lines.push(`      - '${tag}'`);
        }
        break;
      case "manual":
      default:
        lines.push("  workflow_dispatch:");
        break;
    }
    return lines;
  }
}

// ── GitLab CI exporter ────────────────────────────────────────────────────────

export class GitLabYamlExporter {
  generate(graph: Graph): YamlExportResult {
    const lines: string[] = [];

    // workflow rules (trigger)
    const t = graph.trigger;
    if (t) {
      lines.push("workflow:");
      lines.push("  rules:");
      switch (t.triggerType) {
        case "push":
          if (t.branches?.length) {
            for (const b of t.branches)
              lines.push(`    - if: '$CI_COMMIT_BRANCH == "${b}"'`);
          } else {
            lines.push('    - if: \'$CI_PIPELINE_SOURCE == "push"\'');
          }
          break;
        case "pull_request":
          lines.push('    - if: \'$CI_PIPELINE_SOURCE == "merge_request_event"\'');
          break;
        case "tag":
          lines.push("    - if: '$CI_COMMIT_TAG'");
          break;
        case "manual":
          lines.push("    - when: manual");
          break;
        case "schedule":
          lines.push('    - if: \'$CI_PIPELINE_SOURCE == "schedule"\'');
          break;
      }
      lines.push("");
    }

    // stages:
    if (graph.stages.length > 0) {
      lines.push("stages:");
      for (const stage of graph.stages) lines.push(`  - ${stage.name}`);
      lines.push("");
    }

    // jobs
    for (const stage of graph.stages) {
      for (const job of stage.jobs) {
        const jobKey = sanitizeId(job.name) || "job";
        lines.push(`${jobKey}:`);
        lines.push(`  stage: ${stage.name}`);

        const tags = gitlabTags(job.runsOn);
        lines.push("  tags:");
        for (const tag of tags) lines.push(`    - ${tag}`);

        // collect env + secrets from all steps
        const vars: Record<string, string> = {};
        for (const step of job.steps) {
          for (const [k, v] of Object.entries((step.data?.env as Record<string, unknown>) ?? {}))
            vars[k] = String(v);
          for (const k of Object.keys((step.data?.secrets as Record<string, string>) ?? {}))
            vars[k] = `$${k}`;
        }
        if (Object.keys(vars).length > 0) {
          lines.push("  variables:");
          for (const [k, v] of Object.entries(vars)) lines.push(`    ${k}: ${shellQuote(v)}`);
        }

        // script — reuse GhStep visitor, flatten run commands into script lines
        const domainNodes = NodeFactory.fromDTOs(job.steps);
        const visitor = new YamlStepVisitor();
        for (const node of domainNodes) node.accept(visitor);
        const steps = visitor.getSteps();

        lines.push("  script:");
        if (steps.length === 0) {
          lines.push('    - echo "No steps configured"');
        } else {
          for (const step of steps) {
            const scriptLines = step.run.split("\n").filter((l) => l.trim() !== "");
            for (const l of scriptLines) lines.push(`    - ${shellQuote(l)}`);
          }
        }

        lines.push("");
      }
    }

    return { yaml: lines.join("\n").trimEnd() + "\n", filePath: ".gitlab-ci.yml" };
  }
}

// ── Azure Pipelines exporter ──────────────────────────────────────────────────

export class AzureYamlExporter {
  generate(graph: Graph): YamlExportResult {
    const lines: string[] = [];

    // trigger
    const t = graph.trigger;
    if (t) {
      switch (t.triggerType) {
        case "push":
          lines.push("trigger:");
          lines.push("  branches:");
          lines.push("    include:");
          for (const b of t.branches ?? ["main"]) lines.push(`      - ${b}`);
          break;
        case "pull_request":
          lines.push("pr:");
          lines.push("  branches:");
          lines.push("    include:");
          for (const b of t.branches ?? ["main"]) lines.push(`      - ${b}`);
          break;
        case "tag":
          lines.push("trigger:");
          lines.push("  tags:");
          lines.push("    include:");
          for (const tag of t.tags ?? ["v*"]) lines.push(`      - ${tag}`);
          break;
        case "schedule":
          lines.push("schedules:");
          lines.push(`  - cron: '${t.schedule ?? "0 0 * * *"}'`);
          lines.push("    always: false");
          lines.push("    branches:");
          lines.push("      include:");
          lines.push("        - main");
          break;
        case "manual":
          lines.push("trigger: none");
          break;
      }
    } else {
      lines.push("trigger:");
      lines.push("  branches:");
      lines.push("    include:");
      lines.push("      - main");
    }
    lines.push("");

    // stages
    if (graph.stages.length === 0) {
      lines.push("# No stages configured");
      return { yaml: lines.join("\n").trimEnd() + "\n", filePath: "azure-pipelines.yml" };
    }

    let prevStageNames: string[] = [];
    lines.push("stages:");

    for (const stage of graph.stages) {
      const stageId = sanitizeAzureId(stage.name) || "stage";
      lines.push(`  - stage: ${stageId}`);
      if (prevStageNames.length > 0)
        lines.push(`    dependsOn: [${prevStageNames.join(", ")}]`);
      lines.push("    jobs:");

      for (const job of stage.jobs) {
        lines.push(`      - job: ${sanitizeAzureId(job.name) || "job"}`);
        lines.push("        pool:");
        lines.push(`          vmImage: ${job.runsOn || "ubuntu-latest"}`);
        lines.push("        steps:");

        const domainNodes = NodeFactory.fromDTOs(job.steps);
        const visitor = new YamlStepVisitor();
        for (const node of domainNodes) node.accept(visitor);
        const steps = visitor.getSteps();

        if (steps.length === 0) {
          lines.push('          - script: echo "No steps configured"');
        } else {
          for (const step of steps) {
            const scriptLines = step.run.split("\n");
            if (scriptLines.length === 1) {
              lines.push(`          - script: ${shellQuote(step.run)}`);
            } else {
              lines.push("          - script: |");
              for (const l of scriptLines) lines.push(`              ${l}`);
            }
            lines.push(`            displayName: ${shellQuote(step.name)}`);
            if (step.env && Object.keys(step.env).length > 0) {
              lines.push("            env:");
              for (const [k, v] of Object.entries(step.env))
                lines.push(`              ${k}: ${shellQuote(v)}`);
            }
          }
        }
      }

      prevStageNames = [stageId];
    }

    return { yaml: lines.join("\n").trimEnd() + "\n", filePath: "azure-pipelines.yml" };
  }
}
