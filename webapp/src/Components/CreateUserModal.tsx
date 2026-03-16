import { useState } from "react";
import { api } from "../Api/client";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateUserModal({ onClose, onCreated }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        setCreating(true);
        try {
            await api.users.create({ email, password, name: name.trim() || undefined, role: "user" });
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue");
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl space-y-5">
                <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Créer un utilisateur
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Le nouvel utilisateur aura le rôle <span className="font-medium">Utilisateur</span> par défaut.
                    </p>
                </div>

                {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                )}

                <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Nom <span className="text-zinc-400">(optionnel)</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jean Dupont"
                            className="w-full text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder:text-zinc-400"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jean@exemple.com"
                            className="w-full text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder:text-zinc-400"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Mot de passe <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 8 caractères"
                            className="w-full text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder:text-zinc-400"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={creating}
                            className="px-3 py-2 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-3 py-2 text-xs font-medium rounded-md bg-accent-500 text-white hover:bg-accent-600 transition-colors disabled:opacity-50"
                        >
                            {creating ? "Création…" : "Créer l'utilisateur"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
