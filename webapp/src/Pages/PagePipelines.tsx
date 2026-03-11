import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../Api/client";
import { Graph } from "../Api/types";

const inputCls = "w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider";

const PagePipelines: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [pipelines, setPipelines] = useState<Graph[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchPipelines = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const data = await api.pipelines.listByProject(projectId);
            setPipelines(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchPipelines(); }, [projectId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !newName.trim()) return;
        setCreating(true);
        try {
            const pipeline = await api.pipelines.create(projectId, newName.trim());
            setShowForm(false);
            setNewName("");
            void navigate(`/projects/${projectId}/pipelines/${pipeline.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de création");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (pipelineId: string) => {
        if (!projectId) return;
        if (!window.confirm("Supprimer cette pipeline ?")) return;
        try {
            await api.pipelines.delete(projectId, pipelineId);
            await fetchPipelines();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de suppression");
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-5">
            {/* Breadcrumb + Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Link
                        to="/projects"
                        className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                        Projets
                    </Link>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 dark:text-zinc-700">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipelines</h1>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 text-xs font-medium bg-accent-500 hover:bg-accent-600 text-white px-3.5 py-2 rounded-md transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Nouvelle pipeline
                </button>
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
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nouvelle pipeline</h2>
                            <button type="button" onClick={() => { setShowForm(false); setNewName(""); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <label className={labelCls}>Nom</label>
                            <input
                                type="text"
                                required
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Deploy to production"
                                className={inputCls}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setNewName(""); }}
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
            ) : pipelines.length === 0 ? (
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-20 flex flex-col items-center gap-2">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucune pipeline pour ce projet</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">Créez votre première pipeline ci-dessus</p>
                </div>
            ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                    {pipelines.map((p) => (
                        <div
                            key={p.id}
                            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="min-w-0">
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.name}</h3>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                    {p.jobs.length} job{p.jobs.length !== 1 ? "s" : ""}
                                    <span className="mx-1 opacity-50">·</span>
                                    {p.jobs.reduce((acc, j) => acc + j.steps.length, 0)} step{p.jobs.reduce((acc, j) => acc + j.steps.length, 0) !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 ml-4 shrink-0">
                                <Link
                                    to={`/projects/${projectId}/pipelines/${p.id}`}
                                    className="px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-accent-50 dark:hover:bg-accent-950/20 text-zinc-600 dark:text-zinc-300 hover:text-accent-500 dark:hover:text-accent-400 text-xs font-medium transition-colors"
                                >
                                    Ouvrir
                                </Link>
                                <button
                                    onClick={() => { void handleDelete(p.id); }}
                                    className="px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PagePipelines;
