import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../Api/client";
import { Project, ProjectVisibility } from "../Api/types";
import { useAuth } from "../Context/AuthContext";

const PageProjects: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New project form
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPath, setNewPath] = useState("");
    const [newProvider, setNewProvider] = useState("github");
    const [newVisibility, setNewVisibility] = useState<ProjectVisibility>("private");
    const [creating, setCreating] = useState(false);

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

    useEffect(() => { void fetchProjects(); }, []);

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
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mes projets</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                    + Nouveau projet
                </button>
            </div>

            {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}

            {/* New project form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <form
                        onSubmit={(e) => { void handleCreate(e); }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4"
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau projet</h2>
                        {(
                            [
                                { label: "Nom", value: newName, setter: setNewName, placeholder: "Mon Pipeline" },
                                { label: "Path", value: newPath, setter: setNewPath, placeholder: "/pipelines/mon-pipeline" },
                                { label: "Provider", value: newProvider, setter: setNewProvider, placeholder: "github" },
                            ] as { label: string; value: string; setter: React.Dispatch<React.SetStateAction<string>>; placeholder: string }[]
                        ).map(({ label, value, setter, placeholder }) => (
                            <div key={label}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                                <input
                                    type="text"
                                    required
                                    value={value}
                                    onChange={(e) => setter(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibilité</label>
                            <select
                                value={newVisibility}
                                onChange={(e) => setNewVisibility(e.target.value as ProjectVisibility)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="private">Privé</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
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
            ) : projects.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg mb-2">Aucun projet pour l'instant.</p>
                    <p className="text-sm">Créez votre premier pipeline ci-dessus.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((p) => (
                        <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{p.provider} · {p.path}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.visibility === "public" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                                    {p.visibility === "public" ? "Public" : "Privé"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-4">
                                <Link
                                    to={`/projects/${p.id}/pipelines`}
                                    className="flex-1 text-center py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                                >
                                    Pipelines →
                                </Link>
                                {p.ownerId === user?.id && (
                                    <button
                                        onClick={() => { void handleDelete(p.id); }}
                                        className="py-1.5 px-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
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
    );
};

export default PageProjects;
