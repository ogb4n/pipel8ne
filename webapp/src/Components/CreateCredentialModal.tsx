import React, { useEffect, useState } from "react";
import { api } from "../Api/client";
import { PROVIDER_CONFIGS, PROVIDER_ORDER } from "./providerConfig";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

const inputCls =
    "w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition";
const labelCls =
    "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider";

const CreateCredentialModal: React.FC<Props> = ({ onClose, onCreated }) => {
    const [provider, setProvider] = useState("github");
    const [label, setLabel] = useState("");
    const [labelTouched, setLabelTouched] = useState(false);
    const [value, setValue] = useState("");
    const [showValue, setShowValue] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Config active dérivée du provider sélectionné — pattern "registry lookup"
    const config = PROVIDER_CONFIGS[provider] ?? PROVIDER_CONFIGS["other"]!;

    // Quand le provider change : pré-remplir le libellé si non touché, vider la valeur secrète
    useEffect(() => {
        if (!labelTouched) setLabel(config.labelSuggestion);
        setValue("");
        setShowValue(false);
        setValidationError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider]);

    const handleValueChange = (v: string) => {
        setValue(v);
        if (config.validationPattern && v.length > 0 && !config.validationPattern.test(v)) {
            setValidationError(config.validationHint ?? "Format invalide");
        } else {
            setValidationError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validationError) return;
        setCreating(true);
        setError(null);
        try {
            await api.credentials.create({ provider, label, value });
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de création");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <form
                onSubmit={(e) => { void handleSubmit(e); }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-accent-500/10 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nouveau credential</h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-md px-3 py-2">
                        {error}
                    </p>
                )}

                {/* Provider select */}
                <div>
                    <label className={labelCls}>Plateforme</label>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
                        {PROVIDER_ORDER.map((key) => (
                            <option key={key} value={key}>{PROVIDER_CONFIGS[key]?.label ?? key}</option>
                        ))}
                    </select>
                </div>

                {/* Description contextuelle + lien docs — change avec le provider */}
                <div className="flex items-start gap-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50 px-3 py-2.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{config.description}</p>
                        {config.docsUrl && (
                            <a href={config.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-accent-500 hover:underline">
                                Créer un token
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        )}
                    </div>
                </div>

                {/* Libellé — pré-rempli par le registre, modifiable */}
                <div>
                    <label className={labelCls}>Libellé</label>
                    <input
                        type="text"
                        required
                        value={label}
                        onChange={(e) => { setLabel(e.target.value); setLabelTouched(true); }}
                        placeholder={config.labelSuggestion || "Mon credential"}
                        className={inputCls}
                    />
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
                        Nom lisible pour retrouver ce credential facilement.
                    </p>
                </div>

                {/* Valeur secrète — label, placeholder et hint viennent du registre */}
                <div>
                    <label className={labelCls}>{config.valueLabel}</label>
                    <div className="relative">
                        <input
                            type={showValue ? "text" : "password"}
                            required
                            value={value}
                            onChange={(e) => handleValueChange(e.target.value)}
                            placeholder={config.valuePlaceholder}
                            className={`${inputCls} pr-10 ${validationError ? "border-amber-400 focus:ring-amber-400" : ""}`}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <button type="button" onClick={() => setShowValue((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" tabIndex={-1}>
                            {showValue ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>
                    {/* Warning de format OU hint générique */}
                    {validationError ? (
                        <p className="mt-1 text-xs text-amber-500 flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {validationError}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">{config.valueHint}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
                        Annuler
                    </button>
                    <button type="submit" disabled={creating || !label.trim() || !value.trim() || !!validationError} className="flex-1 py-2 rounded-md bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                        {creating ? "Création..." : "Créer"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCredentialModal;
