import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../Api/client";
import { Credential, Project, ProjectVisibility } from "../Api/types";
import { useAuth } from "../Context/AuthContext";
import CreateCredentialModal from "../Components/CreateCredentialModal";

const PROVIDER_LABELS: Record<string, string> = {
    github: "GitHub", gitlab: "GitLab", dockerhub: "Docker Hub",
    aws: "AWS", gcp: "Google Cloud", azure: "Azure", npm: "npm",
};

const PROVIDER_COLORS: Record<string, string> = {
    github: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    gitlab: "bg-orange-500 text-white",
    dockerhub: "bg-blue-500 text-white",
    aws: "bg-amber-500 text-white",
    gcp: "bg-blue-600 text-white",
    azure: "bg-sky-600 text-white",
    npm: "bg-red-500 text-white",
};

const inputCls = "w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider";

const PageProjects: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPath, setNewPath] = useState("");
    const [newProvider, setNewProvider] = useState("github");
    const [newVisibility, setNewVisibility] = useState<ProjectVisibility>("private");
    const [creating, setCreating] = useState(false);

    // Dropdown + credential modal
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showCredentialModal, setShowCredentialModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Credentials
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [credLoading, setCredLoading] = useState(true);
    const [deletingCredId, setDeletingCredId] = useState<string | null>(null);

    const fetchCredentials = async () => {
        try {
            setCredLoading(true);
            const data = await api.credentials.list();
            setCredentials(data);
        } catch {
            // silently ignore (user peut ne pas avoir de credentials)
        } finally {
            setCredLoading(false);
        }
    };

    const handleDeleteCredential = async (id: string) => {
        if (!confirm("Supprimer ce credential ?")) return;
        setDeletingCredId(id);
        try {
            await api.credentials.delete(id);
            setCredentials((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de suppression");
        } finally {
            setDeletingCredId(null);
        }
    };

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const data = await api.projects.getMine();
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchProjects(); void fetchCredentials(); }, []);

    // Ferme le dropdown si clic en dehors
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [dropdownOpen]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.projects.create({ name: newName, path: newPath, provider: newProvider, visibility: newVisibility });
            setShowForm(false);
            setNewName(""); setNewPath(""); setNewProvider("github"); setNewVisibility("private");
            await fetchProjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de création");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer ce projet ?")) return;
        try { await api.projects.delete(id); await fetchProjects(); }
        catch (err) { setError(err instanceof Error ? err.message : "Erreur de suppression"); }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto py-10 px-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Projets</h1>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                            {projects.length > 0 ? `${projects.length} projet${projects.length > 1 ? 's' : ''}` : 'Aucun projet'}
                        </p>
                    </div>

                    {/* Split button style n8n */}
                    <div className="relative" ref={dropdownRef}>
                        <div className="flex items-stretch rounded-md overflow-hidden shadow-sm">
                            {/* Primary action */}
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-1.5 text-xs font-medium bg-accent-500 hover:bg-accent-600 text-white px-3.5 py-2 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Nouveau projet
                            </button>
                            {/* Divider */}
                            <span className="w-px bg-accent-600/60" />
                            {/* Chevron / dropdown trigger */}
                            <button
                                onClick={() => setDropdownOpen((o) => !o)}
                                className="flex items-center px-2 bg-accent-500 hover:bg-accent-600 text-white transition-colors"
                                aria-label="Plus d'options"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>
                        </div>

                        {/* Dropdown menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-30 overflow-hidden animate-fade-in">
                                <button
                                    onClick={() => { setDropdownOpen(false); setShowCredentialModal(true); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-accent-500/10 text-accent-500 shrink-0">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                    Nouveau credential
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                {/* Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                        <form
                            onSubmit={(e) => { void handleCreate(e); }}
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nouveau projet</h2>
                                <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6 6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {([
                                { label: "Nom", value: newName, setter: setNewName, placeholder: "Mon Pipeline" },
                                { label: "Path", value: newPath, setter: setNewPath, placeholder: "/pipelines/mon-pipeline" },
                                { label: "Provider", value: newProvider, setter: setNewProvider, placeholder: "github" },
                            ] as { label: string; value: string; setter: React.Dispatch<React.SetStateAction<string>>; placeholder: string }[]).map(({ label, value, setter, placeholder }) => (
                                <div key={label}>
                                    <label className={labelCls}>{label}</label>
                                    <input type="text" required value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} className={inputCls} />
                                </div>
                            ))}

                            <div>
                                <label className={labelCls}>Visibilité</label>
                                <select
                                    value={newVisibility}
                                    onChange={(e) => setNewVisibility(e.target.value as ProjectVisibility)}
                                    className={inputCls}
                                >
                                    <option value="private">Privé</option>
                                    <option value="public">Public</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2 rounded-md bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                                >
                                    {creating ? "Création..." : "Créer"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Chargement...
                    </div>
                ) : projects.length === 0 ? (
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-20 flex flex-col items-center gap-2">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun projet pour l'instant</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-600">Créez votre premier projet ci-dessus</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {projects.map((p) => (
                            <div
                                key={p.id}
                                className="group border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.name}</h3>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                                            {p.provider}
                                            <span className="mx-1 opacity-50">/</span>
                                            {p.path}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${p.visibility === "public"
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                        }`}>
                                        {p.visibility === "public" ? "public" : "privé"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <Link
                                        to={`/projects/${p.id}/pipelines`}
                                        className="flex-1 text-center py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 hover:bg-accent-50 dark:hover:bg-accent-950/20 text-zinc-600 dark:text-zinc-300 hover:text-accent-500 dark:hover:text-accent-400 text-xs font-medium transition-colors"
                                    >
                                        Pipelines
                                    </Link>
                                    {p.ownerId === user?.id && (
                                        <button
                                            onClick={() => { void handleDelete(p.id); }}
                                            className="py-1.5 px-2.5 rounded-md text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Separator ──────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-5">
                <div className="border-t border-zinc-100 dark:border-zinc-800" />
            </div>

            {/* ── Credentials section ──────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-5 pb-16">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2">Credentials</h2>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                            Tokens et clés d'accès pour vos plateformes
                        </p>
                    </div>
                </div>

                {credLoading ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 py-4">
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Chargement...
                    </div>
                ) : credentials.length === 0 ? (
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-10 flex flex-col items-center gap-1.5">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 dark:text-zinc-700">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <p className="text-xs text-zinc-400 dark:text-zinc-600">Aucun credential enregistré</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {credentials.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 px-4 py-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group"
                            >
                                {/* Provider badge */}
                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${PROVIDER_COLORS[c.provider] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                                    {(PROVIDER_LABELS[c.provider] ?? c.provider).slice(0, 2).toUpperCase()}
                                </span>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{c.label}</p>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{PROVIDER_LABELS[c.provider] ?? c.provider}</p>
                                </div>

                                {/* Lock icon — valeur chiffrée */}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 dark:text-zinc-700 shrink-0">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>

                                {/* Delete */}
                                <button
                                    onClick={() => { void handleDeleteCredential(c.id); }}
                                    disabled={deletingCredId === c.id}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all disabled:opacity-30"
                                    aria-label="Supprimer"
                                >
                                    {deletingCredId === c.id ? (
                                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-1 14H6L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4h6v2" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showCredentialModal && (
                <CreateCredentialModal
                    onClose={() => setShowCredentialModal(false)}
                    onCreated={() => { void fetchCredentials(); }}
                />
            )}
        </>
    );
};

export default PageProjects;
