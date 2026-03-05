import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../Api/client";
import { Graph } from "../Api/types";

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
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/projects"
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                >
                    ← Projets
                </Link>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Pipelines</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                    + Nouvelle pipeline
                </button>
            </div>

            {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}

            {/* New pipeline form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <form
                        onSubmit={(e) => { void handleCreate(e); }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-4"
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouvelle pipeline</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                            <input
                                type="text"
                                required
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Deploy to production"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setNewName(""); }}
                                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition"
                            >
                                {creating ? "..." : "Créer"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
            ) : pipelines.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg mb-2">Aucune pipeline pour ce projet.</p>
                    <p className="text-sm">Créez votre première pipeline ci-dessus.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {pipelines.map((p) => (
                        <div
                            key={p.id}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:shadow-md transition"
                        >
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {p.nodes.length} nœud{p.nodes.length !== 1 ? "s" : ""} · {p.edges.length} connexion{p.edges.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    to={`/projects/${projectId}/pipelines/${p.id}`}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                                >
                                    Ouvrir →
                                </Link>
                                <button
                                    onClick={() => { void handleDelete(p.id); }}
                                    className="px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
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
