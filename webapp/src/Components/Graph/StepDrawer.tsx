import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GraphNode, NodeType } from '../../Api/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface StepDrawerProps {
    jobId: string;
    jobName: string;
    runsOn: string;
    steps: GraphNode[];
    onClose: () => void;
    onUpdateJob: (
        jobId: string,
        patch: { name?: string; runsOn?: string; steps?: GraphNode[] },
    ) => void;
}

// ── Badge color map ──────────────────────────────────────────────────────────

const TYPE_BADGE: Record<NodeType, { bg: string; text: string; label: string }> = {
    shell_command: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'shell' },
    docker: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'docker' },
    git: { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'git' },
    test: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'test' },
    build: { bg: 'bg-violet-500/20', text: 'text-violet-300', label: 'build' },
    deploy: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'deploy' },
    notification: { bg: 'bg-pink-500/20', text: 'text-pink-300', label: 'notify' },
};

// ── SortableStepItem ─────────────────────────────────────────────────────────

interface SortableStepItemProps {
    step: GraphNode;
    onUpdate: (updated: GraphNode) => void;
    onDelete: () => void;
}

const SortableStepItem: React.FC<SortableStepItemProps> = ({ step, onUpdate, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: step.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : 'auto',
    };

    const badge = TYPE_BADGE[step.type] ?? {
        bg: 'bg-zinc-500/20',
        text: 'text-zinc-300',
        label: step.type,
    };
    const baseParams = (step.data.params?.baseParameters ?? {}) as Record<string, unknown>;

    const handleNameBlur = (value: string) => {
        onUpdate({ ...step, data: { ...step.data, label: value } });
    };

    const handleParamChange = (key: string, value: string) => {
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

    return (
        <div ref={setNodeRef} style={style} className="mb-2">
            {/* Main row */}
            <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-zinc-800 border border-zinc-700 hover:border-zinc-600">
                {/* Drag handle */}
                <span
                    {...attributes}
                    {...listeners}
                    className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing select-none text-base leading-none flex-shrink-0"
                    title="Déplacer"
                >
                    ⠿
                </span>

                {/* Type badge */}
                <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} uppercase tracking-wide flex-shrink-0`}
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
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                />

                {/* Expand button */}
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className={`text-zinc-500 hover:text-zinc-300 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
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
                    className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
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
                <div className="mt-1 px-3 py-2 rounded-md bg-zinc-800/60 border border-zinc-700/60 space-y-2">
                    {step.type === 'shell_command' ? (
                        <>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Shell</label>
                                <select
                                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                                    value={(baseParams.shell as string) ?? 'bash'}
                                    onChange={(e) => handleParamChange('shell', e.target.value)}
                                >
                                    {(['sh', 'bash', 'zsh', 'powershell', 'cmd'] as const).map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Script</label>
                                <textarea
                                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1.5 outline-none focus:border-zinc-500 resize-none font-mono"
                                    rows={4}
                                    defaultValue={(baseParams.script as string) ?? ''}
                                    placeholder="echo hello"
                                    onBlur={(e) => handleParamChange('script', e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Label</label>
                                <input
                                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                                    defaultValue={step.data.label}
                                    onBlur={(e) => handleNameBlur(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                                    Description
                                </label>
                                <input
                                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-zinc-500"
                                    defaultValue={step.data.description}
                                    onBlur={(e) =>
                                        onUpdate({ ...step, data: { ...step.data, description: e.target.value } })
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// ── AddStepSelector ──────────────────────────────────────────────────────────

const STEP_TYPES: NodeType[] = [
    'shell_command',
    'docker',
    'git',
    'test',
    'build',
    'deploy',
    'notification',
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
    onClose,
    onUpdateJob,
}) => {
    const [localName, setLocalName] = useState(jobName);
    const [localRunsOn, setLocalRunsOn] = useState(runsOn);
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
        const newSteps = steps.filter((_, i) => i !== index);
        onUpdateJob(jobId, { steps: newSteps });
    };

    const handleAddStep = (type: NodeType) => {
        const newStep: GraphNode = {
            id: `step-${Date.now()}`,
            type,
            positionX: 0,
            positionY: 0,
            data: {
                label: type,
                description: '',
                params: { baseParameters: {} },
                env: {},
                secrets: {},
            },
        };
        onUpdateJob(jobId, { steps: [...steps, newStep] });
    };

    return (
        <div
            className={`fixed top-0 right-0 h-screen w-[380px] bg-zinc-900 border-l border-zinc-800 flex flex-col z-50 shadow-2xl transition-transform duration-200 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 shrink-0">
                <h2 className="text-sm font-semibold text-zinc-100 truncate">{localName || 'Job'}</h2>
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
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
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
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                            />
                        </div>
                    </div>
                </section>

                <hr className="border-zinc-800" />

                {/* Steps section */}
                <section>
                    <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Steps{' '}
                        <span className="text-zinc-600 normal-case font-normal">({steps.length})</span>
                    </h3>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={steps.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
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
