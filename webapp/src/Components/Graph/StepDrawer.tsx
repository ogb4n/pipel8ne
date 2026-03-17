import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  GraphNode,
  GraphEdge,
  NodeType,
  JobConditionGuard,
  ConditionOperator,
} from "../../Api/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface StepDrawerProps {
  jobId: string;
  jobName: string;
  runsOn: string;
  steps: GraphNode[];
  stepEdges: GraphEdge[];
  onClose: () => void;
  onUpdateJob: (
    jobId: string,
    patch: {
      name?: string;
      runsOn?: string;
      condition?: JobConditionGuard;
      steps?: GraphNode[];
      stepEdges?: GraphEdge[];
    },
  ) => void;
  condition?: JobConditionGuard;
}

// ── Badge color map ──────────────────────────────────────────────────────────

const TYPE_BADGE: Record<NodeType, { bg: string; text: string; label: string }> = {
  trigger: { bg: "bg-amber-500/20", text: "text-amber-300", label: "trigger" },
  shell_command: { bg: "bg-blue-500/20", text: "text-blue-300", label: "shell" },
  docker: { bg: "bg-cyan-500/20", text: "text-cyan-300", label: "docker" },
  git: { bg: "bg-orange-500/20", text: "text-orange-300", label: "git" },
  test: { bg: "bg-green-500/20", text: "text-green-300", label: "test" },
  build: { bg: "bg-violet-500/20", text: "text-violet-300", label: "build" },
  deploy: { bg: "bg-red-500/20", text: "text-red-300", label: "deploy" },
  notification: { bg: "bg-pink-500/20", text: "text-pink-300", label: "notify" },
  condition: { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "cond" },
  invokable: { bg: "bg-teal-500/20", text: "text-teal-300", label: "invoke" },
};

// ── SortableStepItem ─────────────────────────────────────────────────────────

interface SortableStepItemProps {
  step: GraphNode;
  onUpdate: (updated: GraphNode) => void;
  onDelete: () => void;
}

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

const getStepValidationErrors = (step: GraphNode): Record<string, string> => {
  const p = (step.data.params?.baseParameters ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  switch (step.type) {
    case "trigger": {
      const triggerType = p.triggerType as string | undefined;
      if (isBlank(triggerType)) errors.triggerType = "triggerType requis";
      if (
        (triggerType === "push" || triggerType === "pull_request") &&
        !Array.isArray(p.branches)
      ) {
        errors.branches = "branches requis pour push/pull_request";
      }
      if (
        (triggerType === "push" || triggerType === "pull_request") &&
        Array.isArray(p.branches) &&
        p.branches.length === 0
      ) {
        errors.branches = "au moins une branche requise";
      }
      if (triggerType === "schedule" && isBlank(p.schedule)) {
        errors.schedule = "schedule (cron) requis";
      }
      break;
    }
    case "shell_command": {
      if (isBlank(p.shell)) errors.shell = "shell requis";
      if (isBlank(p.script)) errors.script = "script requis";
      if (p.timeoutSeconds !== undefined && Number(p.timeoutSeconds) <= 0) {
        errors.timeoutSeconds = "timeoutSeconds doit etre > 0";
      }
      break;
    }
    case "docker": {
      const action = p.action as string | undefined;
      if (isBlank(action)) errors.action = "action requise";
      if (action === "build") {
        if (isBlank(p.dockerfile)) errors.dockerfile = "dockerfile requis pour build";
        if (isBlank(p.buildContext)) errors.buildContext = "buildContext requis pour build";
      }
      if (action === "push" && isBlank(p.registry)) {
        errors.registry = "registry requis pour push";
      }
      if ((action === "compose_up" || action === "compose_down") && isBlank(p.composeFile)) {
        errors.composeFile = "composeFile requis pour compose_*";
      }
      break;
    }
    case "git": {
      const action = p.action as string | undefined;
      if (isBlank(action)) errors.action = "action requise";
      if (action === "clone" && isBlank(p.repositoryUrl)) {
        errors.repositoryUrl = "repositoryUrl requis pour clone";
      }
      if (action === "tag" && isBlank(p.tagName)) {
        errors.tagName = "tagName requis pour tag";
      }
      break;
    }
    case "test": {
      if (isBlank(p.runner)) errors.runner = "runner requis";
      if (p.runner === "custom" && isBlank(p.command)) {
        errors.command = "command requis pour runner custom";
      }
      if (
        p.coverageThreshold !== undefined &&
        (Number(p.coverageThreshold) < 0 || Number(p.coverageThreshold) > 100)
      ) {
        errors.coverageThreshold = "coverageThreshold doit etre entre 0 et 100";
      }
      break;
    }
    case "build": {
      if (isBlank(p.tool)) errors.tool = "tool requis";
      if (p.tool === "custom" && isBlank(p.command)) {
        errors.command = "command requis pour tool custom";
      }
      break;
    }
    case "deploy": {
      const target = p.target as string | undefined;
      if (isBlank(target)) errors.target = "target requis";
      if (isBlank(p.environment)) errors.environment = "environment requis";
      if (target === "ssh") {
        if (isBlank(p.sshHost)) errors.sshHost = "sshHost requis";
        if (isBlank(p.sshUser)) errors.sshUser = "sshUser requis";
        if (isBlank(p.remotePath)) errors.remotePath = "remotePath requis";
      }
      if (target === "kubernetes" && isBlank(p.manifestPath)) {
        errors.manifestPath = "manifestPath requis";
      }
      break;
    }
    case "notification": {
      if (isBlank(p.channel)) errors.channel = "channel requis";
      if (isBlank(p.notifyOn)) errors.notifyOn = "notifyOn requis";
      if (isBlank(p.message)) errors.message = "message requis";
      break;
    }
    case "invokable": {
      if (isBlank(p.targetJobId)) errors.targetJobId = "targetJobId requis";
      break;
    }
    case "condition": {
      errors.type = "Condition non supporte au niveau step";
      break;
    }
    default:
      break;
  }

  return errors;
};

const SortableStepItem: React.FC<SortableStepItemProps> = ({ step, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };

  const badge = TYPE_BADGE[step.type] ?? {
    bg: "bg-zinc-500/20",
    text: "text-zinc-300",
    label: step.type,
  };
  const baseParams = (step.data.params?.baseParameters ?? {}) as Record<string, unknown>;
  const validationErrors = getStepValidationErrors(step);
  const hasErrors = Object.keys(validationErrors).length > 0;
  const isInvalid = (field: string): boolean => Boolean(validationErrors[field]);
  const fieldClass = (field: string): string =>
    `w-full bg-zinc-900 border text-zinc-200 text-xs rounded px-2 py-1 outline-none ${
      isInvalid(field)
        ? "border-red-500 focus:border-red-400"
        : "border-zinc-700 focus:border-zinc-500"
    }`;
  const areaClass = (field: string): string =>
    `w-full bg-zinc-900 border text-zinc-200 text-xs rounded px-2 py-1.5 outline-none resize-none ${
      isInvalid(field)
        ? "border-red-500 focus:border-red-400"
        : "border-zinc-700 focus:border-zinc-500"
    }`;

  const handleNameBlur = (value: string) => {
    onUpdate({ ...step, data: { ...step.data, label: value } });
  };

  const handleParamChange = (key: string, value: unknown) => {
    onUpdate({
      ...step,
      data: {
        ...step.data,
        params: {
          ...step.data.params,
          baseParameters: { ...baseParams, [key]: value },
        },
      },
    });
  };

  const setListFromCsv = (key: string, value: string) => {
    const list = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    handleParamChange(key, list);
  };

  const csvFromList = (value: unknown): string =>
    Array.isArray(value) ? value.map((v) => String(v)).join(", ") : "";

  const renderTypeSpecificEditor = () => {
    switch (step.type) {
      case "trigger":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Trigger type
              </label>
              <select
                className={fieldClass("triggerType")}
                value={(baseParams.triggerType as string) ?? "push"}
                onChange={(e) => handleParamChange("triggerType", e.target.value)}
              >
                {["push", "pull_request", "schedule", "manual", "tag"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {((baseParams.triggerType as string) === "push" ||
              (baseParams.triggerType as string) === "pull_request") && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Branches (CSV)
                </label>
                <input
                  className={fieldClass("branches")}
                  defaultValue={csvFromList(baseParams.branches)}
                  onBlur={(e) => setListFromCsv("branches", e.target.value)}
                  placeholder="main, release/*"
                />
              </div>
            )}
            {(baseParams.triggerType as string) === "tag" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Tags (CSV)
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={csvFromList(baseParams.tags)}
                  onBlur={(e) => setListFromCsv("tags", e.target.value)}
                  placeholder="v*, prod-*"
                />
              </div>
            )}
            {(baseParams.triggerType as string) === "schedule" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Cron schedule
                </label>
                <input
                  className={fieldClass("schedule")}
                  defaultValue={(baseParams.schedule as string) ?? ""}
                  onBlur={(e) => handleParamChange("schedule", e.target.value)}
                  placeholder="0 2 * * *"
                />
              </div>
            )}
          </>
        );

      case "shell_command":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Shell</label>
              <select
                className={fieldClass("shell")}
                value={(baseParams.shell as string) ?? "bash"}
                onChange={(e) => handleParamChange("shell", e.target.value)}
              >
                {(["sh", "bash", "zsh", "powershell", "cmd"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Script</label>
              <textarea
                className={`${areaClass("script")} font-mono`}
                rows={4}
                defaultValue={(baseParams.script as string) ?? ""}
                placeholder="echo hello"
                onBlur={(e) => handleParamChange("script", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Working directory
              </label>
              <input
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                defaultValue={(baseParams.workingDirectory as string) ?? ""}
                onBlur={(e) => handleParamChange("workingDirectory", e.target.value)}
                placeholder="."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Timeout (sec)
              </label>
              <input
                type="number"
                min={1}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                defaultValue={(baseParams.timeoutSeconds as number) ?? ""}
                onBlur={(e) =>
                  handleParamChange(
                    "timeoutSeconds",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                className="accent-indigo-500"
                checked={Boolean(baseParams.continueOnError)}
                onChange={(e) => handleParamChange("continueOnError", e.target.checked)}
              />
              Continuer en cas d'erreur
            </label>
          </>
        );

      case "docker":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Action</label>
              <select
                className={fieldClass("action")}
                value={(baseParams.action as string) ?? "build"}
                onChange={(e) => handleParamChange("action", e.target.value)}
              >
                {["build", "run", "push", "pull", "compose_up", "compose_down"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Image</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.image as string) ?? ""}
                  onBlur={(e) => handleParamChange("image", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Registry
                </label>
                <input
                  className={fieldClass("registry")}
                  defaultValue={(baseParams.registry as string) ?? ""}
                  onBlur={(e) => handleParamChange("registry", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Dockerfile
                </label>
                <input
                  className={fieldClass("dockerfile")}
                  defaultValue={(baseParams.dockerfile as string) ?? ""}
                  onBlur={(e) => handleParamChange("dockerfile", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Build context
                </label>
                <input
                  className={fieldClass("buildContext")}
                  defaultValue={(baseParams.buildContext as string) ?? ""}
                  onBlur={(e) => handleParamChange("buildContext", e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Tags (CSV)
              </label>
              <input
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                defaultValue={csvFromList(baseParams.tags)}
                onBlur={(e) => setListFromCsv("tags", e.target.value)}
                placeholder="myapp:latest, myapp:sha"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Command</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.command as string) ?? ""}
                  onBlur={(e) => handleParamChange("command", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Compose file
                </label>
                <input
                  className={fieldClass("composeFile")}
                  defaultValue={(baseParams.composeFile as string) ?? ""}
                  onBlur={(e) => handleParamChange("composeFile", e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case "git":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Action</label>
              <select
                className={fieldClass("action")}
                value={(baseParams.action as string) ?? "clone"}
                onChange={(e) => handleParamChange("action", e.target.value)}
              >
                {["clone", "checkout", "pull", "fetch", "tag", "push"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Repository URL
                </label>
                <input
                  className={fieldClass("repositoryUrl")}
                  defaultValue={(baseParams.repositoryUrl as string) ?? ""}
                  onBlur={(e) => handleParamChange("repositoryUrl", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Ref</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.ref as string) ?? ""}
                  onBlur={(e) => handleParamChange("ref", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Directory
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.directory as string) ?? ""}
                  onBlur={(e) => handleParamChange("directory", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Depth</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.depth as number) ?? ""}
                  onBlur={(e) =>
                    handleParamChange("depth", e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Remote</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.remote as string) ?? ""}
                  onBlur={(e) => handleParamChange("remote", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Tag name
                </label>
                <input
                  className={fieldClass("tagName")}
                  defaultValue={(baseParams.tagName as string) ?? ""}
                  onBlur={(e) => handleParamChange("tagName", e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case "test":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Runner</label>
              <select
                className={fieldClass("runner")}
                value={(baseParams.runner as string) ?? "jest"}
                onChange={(e) => handleParamChange("runner", e.target.value)}
              >
                {["jest", "vitest", "pytest", "go_test", "cargo_test", "dotnet_test", "custom"].map(
                  (r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Command (custom)
                </label>
                <input
                  className={fieldClass("command")}
                  defaultValue={(baseParams.command as string) ?? ""}
                  onBlur={(e) => handleParamChange("command", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Test pattern
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.testPattern as string) ?? ""}
                  onBlur={(e) => handleParamChange("testPattern", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Coverage %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.coverageThreshold as number) ?? ""}
                  onBlur={(e) =>
                    handleParamChange(
                      "coverageThreshold",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                className="accent-indigo-500"
                checked={Boolean(baseParams.continueOnError)}
                onChange={(e) => handleParamChange("continueOnError", e.target.checked)}
              />
              Continuer en cas d'erreur
            </label>
          </>
        );

      case "build":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Build tool
              </label>
              <select
                className={fieldClass("tool")}
                value={(baseParams.tool as string) ?? "npm"}
                onChange={(e) => handleParamChange("tool", e.target.value)}
              >
                {[
                  "npm",
                  "yarn",
                  "pnpm",
                  "maven",
                  "gradle",
                  "cargo",
                  "go",
                  "dotnet",
                  "make",
                  "custom",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Target</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.target as string) ?? ""}
                  onBlur={(e) => handleParamChange("target", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Command (custom)
                </label>
                <input
                  className={fieldClass("command")}
                  defaultValue={(baseParams.command as string) ?? ""}
                  onBlur={(e) => handleParamChange("command", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Working directory
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.workingDirectory as string) ?? ""}
                  onBlur={(e) => handleParamChange("workingDirectory", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Output path
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.outputPath as string) ?? ""}
                  onBlur={(e) => handleParamChange("outputPath", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Runtime version
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.runtimeVersion as string) ?? ""}
                  onBlur={(e) => handleParamChange("runtimeVersion", e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case "deploy":
        return (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Target</label>
              <select
                className={fieldClass("target")}
                value={(baseParams.target as string) ?? "kubernetes"}
                onChange={(e) => handleParamChange("target", e.target.value)}
              >
                {[
                  "kubernetes",
                  "aws_ecs",
                  "aws_lambda",
                  "gcp_run",
                  "azure_app",
                  "ssh",
                  "custom",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Environment
                </label>
                <input
                  className={fieldClass("environment")}
                  defaultValue={(baseParams.environment as string) ?? ""}
                  onBlur={(e) => handleParamChange("environment", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Namespace
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.namespace as string) ?? ""}
                  onBlur={(e) => handleParamChange("namespace", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Manifest path
                </label>
                <input
                  className={fieldClass("manifestPath")}
                  defaultValue={(baseParams.manifestPath as string) ?? ""}
                  onBlur={(e) => handleParamChange("manifestPath", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Rollout strategy
                </label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  value={(baseParams.rolloutStrategy as string) ?? "rolling"}
                  onChange={(e) => handleParamChange("rolloutStrategy", e.target.value)}
                >
                  {["rolling", "blue_green", "canary", "recreate"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Service name
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.serviceName as string) ?? ""}
                  onBlur={(e) => handleParamChange("serviceName", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  SSH host
                </label>
                <input
                  className={fieldClass("sshHost")}
                  defaultValue={(baseParams.sshHost as string) ?? ""}
                  onBlur={(e) => handleParamChange("sshHost", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  SSH user
                </label>
                <input
                  className={fieldClass("sshUser")}
                  defaultValue={(baseParams.sshUser as string) ?? ""}
                  onBlur={(e) => handleParamChange("sshUser", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Remote path
                </label>
                <input
                  className={fieldClass("remotePath")}
                  defaultValue={(baseParams.remotePath as string) ?? ""}
                  onBlur={(e) => handleParamChange("remotePath", e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case "notification":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Channel</label>
                <select
                  className={fieldClass("channel")}
                  value={(baseParams.channel as string) ?? "slack"}
                  onChange={(e) => handleParamChange("channel", e.target.value)}
                >
                  {["slack", "teams", "email", "discord", "webhook", "pagerduty"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Notify on
                </label>
                <select
                  className={fieldClass("notifyOn")}
                  value={(baseParams.notifyOn as string) ?? "always"}
                  onChange={(e) => handleParamChange("notifyOn", e.target.value)}
                >
                  {["always", "on_success", "on_failure", "on_change"].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                  Recipient
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                  defaultValue={(baseParams.recipient as string) ?? ""}
                  onBlur={(e) => handleParamChange("recipient", e.target.value)}
                  placeholder="#alerts or https://..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Message</label>
              <textarea
                className={areaClass("message")}
                rows={3}
                defaultValue={(baseParams.message as string) ?? ""}
                onBlur={(e) => handleParamChange("message", e.target.value)}
              />
            </div>
          </>
        );

      case "invokable":
        return (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
              Target job id
            </label>
            <input
              className={fieldClass("targetJobId")}
              defaultValue={(baseParams.targetJobId as string) ?? ""}
              onBlur={(e) => handleParamChange("targetJobId", e.target.value)}
              placeholder="job-123"
            />
          </div>
        );

      case "condition":
        return (
          <p className="text-xs text-amber-300">
            Ce type n'est pas supporte au niveau step. Utiliser une condition de stage ou un guard
            de job.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      {/* Main row */}
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded-md bg-zinc-800 border ${
          hasErrors
            ? "border-red-500/80 hover:border-red-400"
            : "border-zinc-700 hover:border-zinc-600"
        }`}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing select-none text-base leading-none shrink-0"
          title="Déplacer"
        >
          ⠿
        </span>

        {/* Type badge */}
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} uppercase tracking-wide shrink-0`}
        >
          {badge.label}
        </span>

        {/* Editable name */}
        <input
          className="flex-1 min-w-0 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          defaultValue={step.data.label}
          placeholder="step name"
          onBlur={(e) => handleNameBlur(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />

        {hasErrors && (
          <span className="text-[10px] text-red-300 shrink-0" title="Parametres invalides">
            invalide
          </span>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`text-zinc-500 hover:text-zinc-300 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          title="Configurer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
          title="Supprimer ce step"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded params */}
      {expanded && (
        <div
          className={`mt-1 px-3 py-2 rounded-md bg-zinc-800/60 border space-y-2 ${
            hasErrors ? "border-red-500/70" : "border-zinc-700/60"
          }`}
        >
          {hasErrors && (
            <div className="rounded border border-red-500/40 bg-red-950/20 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-red-300">
                Erreurs de validation
              </p>
              <ul className="text-[11px] text-red-200 list-disc pl-4">
                {Object.entries(validationErrors).map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Label</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
              defaultValue={step.data.label}
              onBlur={(e) => handleNameBlur(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Description</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
              defaultValue={step.data.description}
              onBlur={(e) =>
                onUpdate({ ...step, data: { ...step.data, description: e.target.value } })
              }
            />
          </div>
          {renderTypeSpecificEditor()}
        </div>
      )}
    </div>
  );
};

// ── AddStepSelector ──────────────────────────────────────────────────────────

const STEP_TYPES: NodeType[] = [
  "trigger",
  "shell_command",
  "docker",
  "git",
  "test",
  "build",
  "deploy",
  "notification",
  "invokable",
];

interface AddStepSelectorProps {
  onAdd: (type: NodeType) => void;
}

const AddStepSelector: React.FC<AddStepSelectorProps> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 text-xs transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Ajouter un step
      </button>
    );
  }

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800 p-2">
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {STEP_TYPES.map((type) => {
          const badge = TYPE_BADGE[type];
          return (
            <button
              key={type}
              onClick={() => {
                setOpen(false);
                onAdd(type);
              }}
              className={`px-2 py-1.5 rounded text-[10px] font-semibold ${badge.bg} ${badge.text} hover:ring-1 hover:ring-current transition-all uppercase tracking-wide`}
            >
              {badge.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-400 py-0.5"
      >
        annuler
      </button>
    </div>
  );
};

// ── StepDrawer ───────────────────────────────────────────────────────────────

const StepDrawer: React.FC<StepDrawerProps> = ({
  jobId,
  jobName,
  runsOn,
  steps,
  stepEdges,
  condition,
  onClose,
  onUpdateJob,
}) => {
  const [localName, setLocalName] = useState(jobName);
  const [localRunsOn, setLocalRunsOn] = useState(runsOn);
  const [guardEnabled, setGuardEnabled] = useState(!!condition);
  const [localCondition, setLocalCondition] = useState<JobConditionGuard>(
    condition ?? {
      logicalOperator: "AND",
      conditions: [{ leftOperand: "", operator: "equals", rightOperand: "" }],
    },
  );
  const [visible, setVisible] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sync props → local state when the selected job changes
  useEffect(() => {
    setLocalName(jobName);
  }, [jobName]);
  useEffect(() => {
    setLocalRunsOn(runsOn);
  }, [runsOn]);
  useEffect(() => {
    setGuardEnabled(!!condition);
    setLocalCondition(
      condition ?? {
        logicalOperator: "AND",
        conditions: [{ leftOperand: "", operator: "equals", rightOperand: "" }],
      },
    );
  }, [condition]);

  const guardOperators: ConditionOperator[] = [
    "equals",
    "not_equals",
    "contains",
    "starts_with",
    "ends_with",
    "greater_than",
    "less_than",
    "matches_regex",
    "is_empty",
    "is_not_empty",
  ];

  const noRightOperand = (op: ConditionOperator): boolean =>
    op === "is_empty" || op === "is_not_empty";

  const commitGuard = (nextEnabled?: boolean, next?: JobConditionGuard) => {
    const enabled = nextEnabled ?? guardEnabled;
    const payload = next ?? localCondition;
    onUpdateJob(jobId, { condition: enabled ? payload : undefined });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = steps.findIndex((s) => s.id === active.id);
      const newIdx = steps.findIndex((s) => s.id === over.id);
      const newSteps = arrayMove(steps, oldIdx, newIdx);
      onUpdateJob(jobId, { steps: newSteps });
    }
  };

  const handleUpdateStep = (index: number, updated: GraphNode) => {
    const newSteps = steps.map((s, i) => (i === index ? updated : s));
    onUpdateJob(jobId, { steps: newSteps });
  };

  const handleDeleteStep = (index: number) => {
    const removedId = steps[index].id;
    const newSteps = steps.filter((_, i) => i !== index);
    const newStepEdges = stepEdges.filter((e) => e.source !== removedId && e.target !== removedId);
    onUpdateJob(jobId, { steps: newSteps, stepEdges: newStepEdges });
  };

  const handleAddStep = (type: NodeType) => {
    const newStep: GraphNode = {
      id: `step-${Date.now()}`,
      type,
      positionX: 0,
      positionY: 0,
      data: {
        label: type,
        description: "",
        params: { baseParameters: {} },
        env: {},
        secrets: {},
      },
    };
    onUpdateJob(jobId, { steps: [...steps, newStep] });
  };

  return (
    <div
      className={`fixed top-0 right-0 h-screen w-95 bg-zinc-900 border-l border-zinc-800 flex flex-col z-50 shadow-2xl transition-transform duration-200 ease-out ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100 truncate">{localName || "Job"}</h2>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 transition-colors ml-2 shrink-0"
          title="Fermer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Properties section */}
        <section>
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Propriétés
          </h3>
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">Nom du job</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-md px-3 py-1.5 outline-none focus:border-zinc-500 transition-colors"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={() => onUpdateJob(jobId, { name: localName })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">Runs On</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-md px-3 py-1.5 outline-none focus:border-zinc-500 transition-colors font-mono"
                value={localRunsOn}
                onChange={(e) => setLocalRunsOn(e.target.value)}
                onBlur={() => onUpdateJob(jobId, { runsOn: localRunsOn })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>

            <div className="pt-1">
              <label className="inline-flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setGuardEnabled(enabled);
                    commitGuard(enabled);
                  }}
                  className="accent-indigo-500"
                />
                Guard condition du job
              </label>
            </div>

            {guardEnabled && (
              <div className="rounded-md border border-zinc-700 bg-zinc-800/60 p-2 space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                    Operateur logique
                  </label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                    value={localCondition.logicalOperator}
                    onChange={(e) => {
                      const next = {
                        ...localCondition,
                        logicalOperator: e.target.value as "AND" | "OR",
                      };
                      setLocalCondition(next);
                      commitGuard(undefined, next);
                    }}
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>

                {localCondition.conditions.map((c, index) => (
                  <div key={index} className="rounded border border-zinc-700 p-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500">Condition #{index + 1}</span>
                      <button
                        type="button"
                        className="text-[10px] text-red-400 hover:text-red-300"
                        onClick={() => {
                          const next = {
                            ...localCondition,
                            conditions: localCondition.conditions.filter((_, i) => i !== index),
                          };
                          setLocalCondition(next);
                          commitGuard(undefined, next);
                        }}
                      >
                        supprimer
                      </button>
                    </div>
                    <input
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                      placeholder="Operande gauche"
                      value={c.leftOperand}
                      onChange={(e) => {
                        const next = {
                          ...localCondition,
                          conditions: localCondition.conditions.map((cond, i) =>
                            i === index ? { ...cond, leftOperand: e.target.value } : cond,
                          ),
                        };
                        setLocalCondition(next);
                        commitGuard(undefined, next);
                      }}
                    />
                    <select
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                      value={c.operator}
                      onChange={(e) => {
                        const op = e.target.value as ConditionOperator;
                        const next = {
                          ...localCondition,
                          conditions: localCondition.conditions.map((cond, i) =>
                            i === index
                              ? {
                                  ...cond,
                                  operator: op,
                                  ...(noRightOperand(op) ? { rightOperand: undefined } : {}),
                                }
                              : cond,
                          ),
                        };
                        setLocalCondition(next);
                        commitGuard(undefined, next);
                      }}
                    >
                      {guardOperators.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    {!noRightOperand(c.operator) && (
                      <input
                        className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                        placeholder="Operande droit"
                        value={c.rightOperand ?? ""}
                        onChange={(e) => {
                          const next = {
                            ...localCondition,
                            conditions: localCondition.conditions.map((cond, i) =>
                              i === index ? { ...cond, rightOperand: e.target.value } : cond,
                            ),
                          };
                          setLocalCondition(next);
                          commitGuard(undefined, next);
                        }}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  onClick={() => {
                    const next = {
                      ...localCondition,
                      conditions: [
                        ...localCondition.conditions,
                        { leftOperand: "", operator: "equals", rightOperand: "" },
                      ],
                    };
                    setLocalCondition(next);
                    commitGuard(undefined, next);
                  }}
                >
                  + ajouter une condition
                </button>
              </div>
            )}
          </div>
        </section>

        <hr className="border-zinc-800" />

        {/* Steps section */}
        <section>
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Steps <span className="text-zinc-600 normal-case font-normal">({steps.length})</span>
          </h3>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {steps.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  onUpdate={(updated) => handleUpdateStep(index, updated)}
                  onDelete={() => handleDeleteStep(index)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {steps.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">
              Aucun step — ajoutez-en un ci-dessous
            </p>
          )}

          <div className="mt-2">
            <AddStepSelector onAdd={handleAddStep} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default StepDrawer;
