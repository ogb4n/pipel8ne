import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { api } from "../Api/client";

type Tab = "login" | "register";

const PageLogin: React.FC = () => {
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
    const { user, isLoading, login, register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && user) {
            navigate("/projects", { replace: true });
        }
    }, [user, isLoading, navigate]);

    useEffect(() => {
        api.auth.registrationStatus()
            .then(({ registrationEnabled }) => {
                setRegistrationEnabled(registrationEnabled);
                if (!registrationEnabled) setTab("login");
            })
            .catch(() => setRegistrationEnabled(true)); // fallback: show registration
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (tab === "login") await login(email, password);
            else await register(email, password, name || undefined);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur s'est produite");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition";
    const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-3rem)]">
            <div className="w-full max-w-sm animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        pipel<span className="text-accent-500">8</span>ne
                    </h1>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        CI/CD pipeline orchestrator
                    </p>
                </div>

                {/* Card */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6">
                    {/* Tabs */}
                    {registrationEnabled === true && (
                        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 -mx-1">
                            {(["login", "register"] as Tab[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => { setTab(t); setError(null); }}
                                    className={`px-1 mx-1 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t
                                        ? "border-accent-500 text-accent-500"
                                        : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                        }`}
                                >
                                    {t === "login" ? "Connexion" : "Inscription"}
                                </button>
                            ))}
                        </div>
                    )}
                    {registrationEnabled !== true && (
                        <div className="border-b border-zinc-200 dark:border-zinc-800 mb-6 -mx-1 pb-3">
                            <span className="px-1 mx-1 text-sm font-medium text-accent-500 border-b-2 border-accent-500 pb-3">Connexion</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {tab === "register" && registrationEnabled === true && (
                            <div>
                                <label className={labelCls}>Nom</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Votre nom"
                                    className={inputCls}
                                />
                            </div>
                        )}
                        <div>
                            <label className={labelCls}>Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Mot de passe</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={inputCls}
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-md bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Chargement...
                                </span>
                            ) : tab === "login" || registrationEnabled !== true ? "Se connecter" : "Créer un compte"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PageLogin;
