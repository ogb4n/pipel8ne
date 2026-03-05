import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

type Tab = "login" | "register";

const PageLogin: React.FC = () => {
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { user, isLoading, login, register } = useAuth();
    const navigate = useNavigate();

    // Navigate once user state is confirmed non-null (avoids React batching race condition)
    useEffect(() => {
        if (!isLoading && user) {
            navigate("/projects", { replace: true });
        }
    }, [user, isLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (tab === "login") await login(email, password);
            else await register(email, password, name || undefined);
            // Navigation is handled by the useEffect above once user state is set
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur s'est produite");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
                    Pipel8ne
                </h1>
                {/* Tabs */}
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
                    {(["login", "register"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setError(null); }}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === t
                                ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                        >
                            {t === "login" ? "Connexion" : "Inscription"}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {tab === "register" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Votre nom"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition"
                    >
                        {loading ? "..." : tab === "login" ? "Se connecter" : "Créer un compte"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PageLogin;
