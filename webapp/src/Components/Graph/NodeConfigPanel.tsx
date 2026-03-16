import React, { useEffect, useState } from "react";
import type { Node as RFNode } from "@xyflow/react";
import { nodeConfig } from "./nodeConfig";
import type {
    NodeData,
    NodeType,
    NodeParams,
    TriggerType,
    Shell,
    DockerAction,
    GitAction,
    TestRunner,
    BuildTool,
    DeployTarget,
    RolloutStrategy,
    NotificationChannel,
    NotificationTrigger,
    ConditionOperator,
} from "../../Api/types";

// ── Shared field components ──────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className={`w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 ${props.className ?? ""}`}
    />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        rows={4}
        {...props}
        className={`w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none font-mono ${props.className ?? ""}`}
    />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
    <select
        {...props}
        className={`w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 ${props.className ?? ""}`}
    >
        {children}
    </select>
);

const Checkbox: React.FC<{ label: string } & React.InputHTMLAttributes<HTMLInputElement>> = ({
    label,
    ...props
}) => (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" {...props} className="accent-violet-500 w-4 h-4" />
        {label}
    </label>
);

const FieldGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-col gap-3">{children}</div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-4 mb-2 border-b border-zinc-100 dark:border-zinc-800 pb-1">
        {children}
    </p>
);

// ── Tags input (comma-separated strings displayed as chips) ──────────────────

const TagsInput: React.FC<{
    value: string[];
    onChange: (v: string[]) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
    const [draft, setDraft] = useState("");
    const add = () => {
        const trimmed = draft.trim();
        if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
        setDraft("");
    };
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5 flex-wrap">
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs px-2 py-0.5"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => onChange(value.filter((t) => t !== tag))}
                            className="hover:text-red-500 leading-none"
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-1">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    placeholder={placeholder ?? "Valeur… Entrée pour ajouter"}
                />
                <button
                    type="button"
                    onClick={add}
                    className="shrink-0 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-lg leading-none"
                >
                    +
                </button>
            </div>
        </div>
    );
};

// ── Type-specific param forms ────────────────────────────────────────────────

type PP = Record<string, unknown>;

const TriggerForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => (
    <FieldGroup>
        <div>
            <Label>Type de déclencheur</Label>
            <Select value={(p.triggerType as string) ?? "push"} onChange={(e) => set("triggerType", e.target.value)}>
                {(["push", "pull_request", "tag", "schedule", "manual"] as TriggerType[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </Select>
        </div>
        {(p.triggerType === "push" || p.triggerType === "pull_request") && (
            <div>
                <Label>Branches</Label>
                <TagsInput
                    value={(p.branches as string[]) ?? []}
                    onChange={(v) => set("branches", v)}
                    placeholder="main… Entrée pour ajouter"
                />
            </div>
        )}
        {p.triggerType === "tag" && (
            <div>
                <Label>Patterns de tags</Label>
                <TagsInput
                    value={(p.tags as string[]) ?? []}
                    onChange={(v) => set("tags", v)}
                    placeholder="v*… Entrée pour ajouter"
                />
            </div>
        )}
        {p.triggerType === "schedule" && (
            <div>
                <Label>Expression cron</Label>
                <Input
                    value={(p.schedule as string) ?? ""}
                    onChange={(e) => set("schedule", e.target.value)}
                    placeholder="0 2 * * *"
                />
            </div>
        )}
    </FieldGroup>
);

const ShellForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => (
    <FieldGroup>
        <div>
            <Label>Shell</Label>
            <Select value={(p.shell as string) ?? "bash"} onChange={(e) => set("shell", e.target.value)}>
                {(["sh", "bash", "zsh", "powershell", "cmd"] as Shell[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </Select>
        </div>
        <div>
            <Label>Script</Label>
            <Textarea
                rows={6}
                value={(p.script as string) ?? ""}
                onChange={(e) => set("script", e.target.value)}
                placeholder="echo hello"
            />
        </div>
        <div>
            <Label>Répertoire de travail</Label>
            <Input
                value={(p.workingDirectory as string) ?? ""}
                onChange={(e) => set("workingDirectory", e.target.value)}
                placeholder="."
            />
        </div>
        <div>
            <Label>Timeout (secondes)</Label>
            <Input
                type="number"
                value={(p.timeoutSeconds as number) ?? ""}
                onChange={(e) => set("timeoutSeconds", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="300"
                min={1}
            />
        </div>
        <Checkbox
            label="Continuer en cas d'erreur"
            checked={!!p.continueOnError}
            onChange={(e) => set("continueOnError", e.target.checked)}
        />
    </FieldGroup>
);

const DockerForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => {
    const action = (p.action as DockerAction) ?? "build";
    return (
        <FieldGroup>
            <div>
                <Label>Action</Label>
                <Select value={action} onChange={(e) => set("action", e.target.value)}>
                    {(["build", "run", "push", "pull", "compose_up", "compose_down"] as DockerAction[]).map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </Select>
            </div>
            {(action === "build") && (
                <>
                    <div>
                        <Label>Dockerfile</Label>
                        <Input value={(p.dockerfile as string) ?? "Dockerfile"} onChange={(e) => set("dockerfile", e.target.value)} />
                    </div>
                    <div>
                        <Label>Contexte de build</Label>
                        <Input value={(p.buildContext as string) ?? "."} onChange={(e) => set("buildContext", e.target.value)} />
                    </div>
                    <div>
                        <Label>Tags</Label>
                        <TagsInput value={(p.tags as string[]) ?? []} onChange={(v) => set("tags", v)} placeholder="myapp:latest" />
                    </div>
                </>
            )}
            {(action === "push" || action === "pull") && (
                <>
                    <div>
                        <Label>Image</Label>
                        <Input value={(p.image as string) ?? ""} onChange={(e) => set("image", e.target.value)} placeholder="registry/image:tag" />
                    </div>
                    <div>
                        <Label>Registry</Label>
                        <Input value={(p.registry as string) ?? ""} onChange={(e) => set("registry", e.target.value)} placeholder="docker.io" />
                    </div>
                </>
            )}
            {action === "run" && (
                <>
                    <div>
                        <Label>Image</Label>
                        <Input value={(p.image as string) ?? ""} onChange={(e) => set("image", e.target.value)} placeholder="nginx:latest" />
                    </div>
                    <div>
                        <Label>Commande (optionnel)</Label>
                        <Input value={(p.command as string) ?? ""} onChange={(e) => set("command", e.target.value)} />
                    </div>
                </>
            )}
            {(action === "compose_up" || action === "compose_down") && (
                <div>
                    <Label>Fichier Compose</Label>
                    <Input value={(p.composeFile as string) ?? "docker-compose.yml"} onChange={(e) => set("composeFile", e.target.value)} />
                </div>
            )}
        </FieldGroup>
    );
};

const GitForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => {
    const action = (p.action as GitAction) ?? "clone";
    return (
        <FieldGroup>
            <div>
                <Label>Action</Label>
                <Select value={action} onChange={(e) => set("action", e.target.value)}>
                    {(["clone", "checkout", "pull", "fetch", "tag", "push"] as GitAction[]).map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </Select>
            </div>
            {action === "clone" && (
                <>
                    <div>
                        <Label>URL du dépôt</Label>
                        <Input value={(p.repositoryUrl as string) ?? ""} onChange={(e) => set("repositoryUrl", e.target.value)} placeholder="https://github.com/org/repo.git" />
                    </div>
                    <div>
                        <Label>Répertoire cible</Label>
                        <Input value={(p.directory as string) ?? "."} onChange={(e) => set("directory", e.target.value)} />
                    </div>
                    <div>
                        <Label>Profondeur (depth)</Label>
                        <Input type="number" value={(p.depth as number) ?? ""} onChange={(e) => set("depth", e.target.value ? Number(e.target.value) : undefined)} placeholder="1" min={1} />
                    </div>
                </>
            )}
            {action === "checkout" && (
                <div>
                    <Label>Ref (branche / commit / tag)</Label>
                    <Input value={(p.ref as string) ?? ""} onChange={(e) => set("ref", e.target.value)} placeholder="main" />
                </div>
            )}
            {action === "tag" && (
                <div>
                    <Label>Nom du tag</Label>
                    <Input value={(p.tagName as string) ?? ""} onChange={(e) => set("tagName", e.target.value)} placeholder="v1.0.0" />
                </div>
            )}
            {(action === "push" || action === "pull" || action === "fetch") && (
                <div>
                    <Label>Remote</Label>
                    <Input value={(p.remote as string) ?? "origin"} onChange={(e) => set("remote", e.target.value)} />
                </div>
            )}
        </FieldGroup>
    );
};

const TestForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => (
    <FieldGroup>
        <div>
            <Label>Runner</Label>
            <Select value={(p.runner as TestRunner) ?? "jest"} onChange={(e) => set("runner", e.target.value)}>
                {(["jest", "vitest", "pytest", "go_test", "cargo_test", "dotnet_test", "custom"] as TestRunner[]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </Select>
        </div>
        {p.runner === "custom" && (
            <div>
                <Label>Commande</Label>
                <Input value={(p.command as string) ?? ""} onChange={(e) => set("command", e.target.value)} placeholder="npm run test:ci" />
            </div>
        )}
        <div>
            <Label>Pattern de tests (glob)</Label>
            <Input value={(p.testPattern as string) ?? ""} onChange={(e) => set("testPattern", e.target.value)} placeholder="**/*.test.ts" />
        </div>
        <div>
            <Label>Seuil de couverture (%)</Label>
            <Input type="number" value={(p.coverageThreshold as number) ?? ""} onChange={(e) => set("coverageThreshold", e.target.value ? Number(e.target.value) : undefined)} placeholder="80" min={0} max={100} />
        </div>
        <Checkbox label="Continuer en cas d'erreur" checked={!!p.continueOnError} onChange={(e) => set("continueOnError", e.target.checked)} />
    </FieldGroup>
);

const BuildForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => (
    <FieldGroup>
        <div>
            <Label>Outil de build</Label>
            <Select value={(p.tool as BuildTool) ?? "npm"} onChange={(e) => set("tool", e.target.value)}>
                {(["npm", "yarn", "pnpm", "maven", "gradle", "cargo", "go", "dotnet", "make", "custom"] as BuildTool[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </Select>
        </div>
        {p.tool === "custom" ? (
            <div>
                <Label>Commande</Label>
                <Input value={(p.command as string) ?? ""} onChange={(e) => set("command", e.target.value)} placeholder="make release" />
            </div>
        ) : (
            <div>
                <Label>Target / script</Label>
                <Input value={(p.target as string) ?? ""} onChange={(e) => set("target", e.target.value)} placeholder="build" />
            </div>
        )}
        <div>
            <Label>Répertoire de travail</Label>
            <Input value={(p.workingDirectory as string) ?? ""} onChange={(e) => set("workingDirectory", e.target.value)} placeholder="." />
        </div>
        <div>
            <Label>Dossier de sortie</Label>
            <Input value={(p.outputPath as string) ?? ""} onChange={(e) => set("outputPath", e.target.value)} placeholder="dist/" />
        </div>
        <div>
            <Label>Version du runtime</Label>
            <Input value={(p.runtimeVersion as string) ?? ""} onChange={(e) => set("runtimeVersion", e.target.value)} placeholder="20.x" />
        </div>
    </FieldGroup>
);

const DeployForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => {
    const target = (p.target as DeployTarget) ?? "kubernetes";
    return (
        <FieldGroup>
            <div>
                <Label>Cible de déploiement</Label>
                <Select value={target} onChange={(e) => set("target", e.target.value)}>
                    {(["kubernetes", "aws_ecs", "aws_lambda", "gcp_run", "azure_app", "ssh", "custom"] as DeployTarget[]).map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </Select>
            </div>
            <div>
                <Label>Environnement</Label>
                <Input value={(p.environment as string) ?? ""} onChange={(e) => set("environment", e.target.value)} placeholder="staging" />
            </div>
            {target === "kubernetes" && (
                <>
                    <div>
                        <Label>Namespace</Label>
                        <Input value={(p.namespace as string) ?? "default"} onChange={(e) => set("namespace", e.target.value)} />
                    </div>
                    <div>
                        <Label>Chemin du manifest</Label>
                        <Input value={(p.manifestPath as string) ?? ""} onChange={(e) => set("manifestPath", e.target.value)} placeholder="k8s/deployment.yml" />
                    </div>
                    <div>
                        <Label>Stratégie de rollout</Label>
                        <Select value={(p.rolloutStrategy as RolloutStrategy) ?? "rolling"} onChange={(e) => set("rolloutStrategy", e.target.value)}>
                            {(["rolling", "blue_green", "canary", "recreate"] as RolloutStrategy[]).map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </Select>
                    </div>
                </>
            )}
            {target === "ssh" && (
                <>
                    <div>
                        <Label>Hôte SSH</Label>
                        <Input value={(p.sshHost as string) ?? ""} onChange={(e) => set("sshHost", e.target.value)} placeholder="server.example.com" />
                    </div>
                    <div>
                        <Label>Utilisateur SSH</Label>
                        <Input value={(p.sshUser as string) ?? ""} onChange={(e) => set("sshUser", e.target.value)} placeholder="deploy" />
                    </div>
                    <div>
                        <Label>Chemin distant</Label>
                        <Input value={(p.remotePath as string) ?? ""} onChange={(e) => set("remotePath", e.target.value)} placeholder="/var/www/app" />
                    </div>
                </>
            )}
            {(target === "aws_ecs" || target === "gcp_run" || target === "azure_app") && (
                <div>
                    <Label>Nom du service</Label>
                    <Input value={(p.serviceName as string) ?? ""} onChange={(e) => set("serviceName", e.target.value)} />
                </div>
            )}
        </FieldGroup>
    );
};

const NotificationForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => (
    <FieldGroup>
        <div>
            <Label>Canal</Label>
            <Select value={(p.channel as NotificationChannel) ?? "slack"} onChange={(e) => set("channel", e.target.value)}>
                {(["slack", "teams", "email", "discord", "webhook", "pagerduty"] as NotificationChannel[]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </Select>
        </div>
        <div>
            <Label>Déclencher</Label>
            <Select value={(p.notifyOn as NotificationTrigger) ?? "always"} onChange={(e) => set("notifyOn", e.target.value)}>
                {(["always", "on_success", "on_failure", "on_change"] as NotificationTrigger[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </Select>
        </div>
        <div>
            <Label>Destinataire / Webhook URL</Label>
            <Input value={(p.recipient as string) ?? ""} onChange={(e) => set("recipient", e.target.value)} placeholder="#channel ou https://..." />
        </div>
        <div>
            <Label>Message</Label>
            <Textarea rows={3} value={(p.message as string) ?? ""} onChange={(e) => set("message", e.target.value)} placeholder="Pipeline {{status}} sur {{branch}}" />
        </div>
    </FieldGroup>
);

const CONDITION_OPERATORS: ConditionOperator[] = [
    "equals", "not_equals", "contains", "greater_than", "less_than", "matches_regex", "is_empty", "is_not_empty",
];

interface ConditionRow {
    leftOperand: string;
    operator: ConditionOperator;
    rightOperand?: string;
}

const ConditionForm: React.FC<{ p: PP; set: (k: string, v: unknown) => void }> = ({ p, set }) => {
    const conditions: ConditionRow[] = (p.conditions as ConditionRow[]) ?? [];
    const noRight = (op: ConditionOperator) => op === "is_empty" || op === "is_not_empty";

    const updateRow = (idx: number, patch: Partial<ConditionRow>) => {
        const updated = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
        set("conditions", updated);
    };

    return (
        <FieldGroup>
            <div>
                <Label>Opérateur logique</Label>
                <Select value={(p.logicalOperator as string) ?? "AND"} onChange={(e) => set("logicalOperator", e.target.value)}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </Select>
            </div>
            <SectionTitle>Conditions</SectionTitle>
            {conditions.map((cond, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                        <button
                            type="button"
                            onClick={() => set("conditions", conditions.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 text-xs"
                        >
                            Supprimer
                        </button>
                    </div>
                    <div>
                        <Label>Opérande gauche</Label>
                        <Input value={cond.leftOperand} onChange={(e) => updateRow(idx, { leftOperand: e.target.value })} placeholder="${{ env.BRANCH }}" />
                    </div>
                    <div>
                        <Label>Opérateur</Label>
                        <Select value={cond.operator} onChange={(e) => updateRow(idx, { operator: e.target.value as ConditionOperator })}>
                            {CONDITION_OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                        </Select>
                    </div>
                    {!noRight(cond.operator) && (
                        <div>
                            <Label>Opérande droit</Label>
                            <Input value={cond.rightOperand ?? ""} onChange={(e) => updateRow(idx, { rightOperand: e.target.value })} />
                        </div>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={() => set("conditions", [...conditions, { leftOperand: "", operator: "equals", rightOperand: "" }])}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline text-left"
            >
                + Ajouter une condition
            </button>
        </FieldGroup>
    );
};

// ── Dispatch to the right form ───────────────────────────────────────────────

const ParamsForm: React.FC<{ type: NodeType; p: PP; set: (k: string, v: unknown) => void }> = ({ type, p, set }) => {
    switch (type) {
        case "trigger": return <TriggerForm p={p} set={set} />;
        case "shell_command": return <ShellForm p={p} set={set} />;
        case "docker": return <DockerForm p={p} set={set} />;
        case "git": return <GitForm p={p} set={set} />;
        case "test": return <TestForm p={p} set={set} />;
        case "build": return <BuildForm p={p} set={set} />;
        case "deploy": return <DeployForm p={p} set={set} />;
        case "notification": return <NotificationForm p={p} set={set} />;
        case "condition": return <ConditionForm p={p} set={set} />;
    }
};

// ── Main panel ───────────────────────────────────────────────────────────────

interface NodeConfigPanelProps {
    node: RFNode;
    onClose: () => void;
    onUpdate: (id: string, data: NodeData) => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose, onUpdate }) => {
    const nodeType = (node.type ?? "shell_command") as NodeType;
    const cfg = nodeConfig[nodeType];
    const rawData = node.data as unknown as NodeData;

    // Local copy of data — propagated to parent on each change
    const [localData, setLocalData] = useState<NodeData>(() => ({
        label: rawData?.label ?? "",
        description: rawData?.description ?? "",
        params: rawData?.params ?? { baseParameters: {} },
        env: rawData?.env ?? {},
        secrets: rawData?.secrets ?? {},
    }));

    // Reinitialise if the selected node changes
    useEffect(() => {
        setLocalData({
            label: rawData?.label ?? "",
            description: rawData?.description ?? "",
            params: rawData?.params ?? { baseParameters: {} },
            env: rawData?.env ?? {},
            secrets: rawData?.secrets ?? {},
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node.id]);

    const patch = (updates: Partial<NodeData>) => {
        const next = { ...localData, ...updates };
        setLocalData(next);
        onUpdate(node.id, next);
    };

    const setParam = (key: string, value: unknown) => {
        const nextParams: NodeParams = {
            ...localData.params,
            baseParameters: { ...localData.params.baseParameters, [key]: value },
        };
        patch({ params: nextParams });
    };

    return (
        <div className="absolute top-0 right-0 h-full w-90 z-20 flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 py-3 text-white shrink-0"
                style={{ background: cfg.color }}
            >
                <span className="text-xl">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest opacity-80">{cfg.label}</p>
                    <p className="text-xs opacity-70 truncate">{cfg.description}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors text-white font-bold text-base"
                    aria-label="Fermer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {/* Label */}
                <div>
                    <Label>Nom du node</Label>
                    <Input
                        value={localData.label}
                        onChange={(e) => patch({ label: e.target.value })}
                        placeholder="Mon node"
                    />
                </div>

                {/* Description */}
                <div>
                    <Label>Description</Label>
                    <Textarea
                        rows={2}
                        value={localData.description}
                        onChange={(e) => patch({ description: e.target.value })}
                        placeholder="Description facultative…"
                        className="font-sans"
                    />
                </div>

                {/* Type-specific params */}
                <div>
                    <SectionTitle>Paramètres</SectionTitle>
                    <ParamsForm
                        type={nodeType}
                        p={localData.params.baseParameters}
                        set={setParam}
                    />
                </div>
            </div>

            {/* Footer hint */}
            <div className="shrink-0 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500">
                Les modifications sont appliquées en temps réel · Sauvegarde via le bouton en haut
            </div>
        </div>
    );
};

export default NodeConfigPanel;
