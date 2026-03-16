import { type ReactNode, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useTheme } from "../Context/ThemeContext";
import { api } from "../Api/client";
import type { ApiKey, CreateApiKeyResponse, User } from "../Api/types";
import CreateUserModal from "../Components/CreateUserModal";

/* ─────────────────────────────────────────────
   Section registry
───────────────────────────────────────────── */
export type SettingsSection = "profile" | "appearance" | "about" | "api" | "users";

export const SETTINGS_SECTIONS: {
    id: SettingsSection;
    label: string;
    description: string;
    icon: ReactNode;
    adminOnly?: boolean;
}[] = [
        {
            id: "profile",
            label: "Profil",
            description: "Informations de votre compte",
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="5" r="3" />
                    <path d="M1.5 14.5c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" />
                </svg>
            ),
        },
        {
            id: "appearance",
            label: "Apparence",
            description: "Thème et affichage",
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6.5" />
                    <path d="M8 1.5V8h6.5A6.5 6.5 0 0 0 8 1.5z" fill="currentColor" stroke="none" opacity="0.35" />
                </svg>
            ),
        },
        {
            id: "about",
            label: "À propos",
            description: "Version et informations",
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6.5" />
                    <line x1="8" y1="7" x2="8" y2="11" />
                    <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
            ),
        },
        {
            id: "api",
            label: "API",
            description: "Accès programmatique à l'API",
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1.5" y="4.5" width="13" height="7" rx="1.5" />
                    <line x1="4" y1="8" x2="6" y2="8" />
                    <line x1="7.5" y1="8" x2="9.5" y2="8" />
                    <line x1="11" y1="8" x2="12" y2="8" />
                </svg>
            ),
        },
        {
            id: "users",
            label: "Utilisateurs",
            description: "Gestion des utilisateurs",
            adminOnly: true,
            icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="5.5" cy="5" r="2.5" />
                    <path d="M1 13.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" />
                    <circle cx="11.5" cy="5" r="2" />
                    <path d="M13.5 13.5c0-2.209-1.791-4-4-4" />
                </svg>
            ),
        },
    ];

/* ─────────────────────────────────────────────
   Section: Profile
───────────────────────────────────────────── */
function SectionProfile() {
    const { user } = useAuth();

    const initials = (user?.name ?? user?.email ?? "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Profil</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Informations associées à votre compte.
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-500 text-white text-lg font-bold select-none shrink-0">
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user?.name ?? "—"}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
                </div>
            </div>

            <div className="grid gap-3 max-w-md">
                <Field label="Nom" value={user?.name ?? "—"} />
                <Field label="Email" value={user?.email ?? "—"} />
                <Field
                    label="Membre depuis"
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "—"}
                />
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-600">
                La modification du profil n'est pas encore disponible.
            </p>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                {label}
            </label>
            <div className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-700 dark:text-zinc-300 select-all">
                {value}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Section: Appearance
───────────────────────────────────────────── */
function SectionAppearance() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Apparence</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Personnalisez l'apparence de l'application.
                </p>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    Thème
                </label>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                    <ThemeCard
                        label="Clair"
                        selected={theme === "light"}
                        onClick={theme !== "light" ? toggleTheme : undefined}
                        preview={
                            <div className="w-full h-10 rounded bg-white border border-zinc-200 flex flex-col gap-1 p-1.5">
                                <div className="w-1/2 h-1.5 rounded-sm bg-zinc-300" />
                                <div className="w-3/4 h-1.5 rounded-sm bg-zinc-200" />
                            </div>
                        }
                    />
                    <ThemeCard
                        label="Sombre"
                        selected={theme === "dark"}
                        onClick={theme !== "dark" ? toggleTheme : undefined}
                        preview={
                            <div className="w-full h-10 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-1 p-1.5">
                                <div className="w-1/2 h-1.5 rounded-sm bg-zinc-600" />
                                <div className="w-3/4 h-1.5 rounded-sm bg-zinc-700" />
                            </div>
                        }
                    />
                </div>
            </div>
        </div>
    );
}

function ThemeCard({
    label,
    selected,
    onClick,
    preview,
}: {
    label: string;
    selected: boolean;
    onClick?: () => void;
    preview: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`flex flex-col gap-2 p-3 rounded-lg border-2 transition-all text-left ${selected
                ? "border-accent-500 bg-accent-500/5"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                }`}
        >
            {preview}
            <div className="flex items-center gap-1.5">
                <span
                    className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${selected ? "border-accent-500" : "border-zinc-300 dark:border-zinc-600"
                        }`}
                >
                    {selected && <span className="w-1.5 h-1.5 rounded-full bg-accent-500 block" />}
                </span>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
            </div>
        </button>
    );
}

/* ─────────────────────────────────────────────
   Section: About
───────────────────────────────────────────── */
function SectionAbout() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">À propos</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Informations sur l'application.
                </p>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden max-w-md">
                <AboutRow label="Application" value="pipel8ne" />
                <AboutRow label="Version" value="0.1.0" />
                <AboutRow label="Environnement" value={import.meta.env.MODE} />
            </div>

            <a
                href="https://github.com/ogb4n/pipel8ne"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-accent-500 dark:hover:text-accent-400 transition-colors"
            >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Voir sur GitHub
            </a>
        </div>
    );
}

function AboutRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 bg-white dark:bg-zinc-900">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{value}</span>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Section: API Keys
───────────────────────────────────────────── */
function SectionApiKeys() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [creating, setCreating] = useState(false);
    const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        api.apiKeys
            .list()
            .then(setKeys)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newKeyName.trim()) return;
        setCreating(true);
        setError(null);
        try {
            const result = await api.apiKeys.create(newKeyName.trim());
            setCreatedKey(result);
            setKeys((prev) => [result, ...prev]);
            setNewKeyName("");
            setShowForm(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue");
        } finally {
            setCreating(false);
        }
    }

    async function handleRevoke(id: string) {
        setError(null);
        try {
            const updated = await api.apiKeys.revoke(id);
            setKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue");
        }
    }

    async function handleDelete(id: string) {
        setError(null);
        try {
            await api.apiKeys.deleteKey(id);
            setKeys((prev) => prev.filter((k) => k.id !== id));
            if (createdKey?.id === id) setCreatedKey(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue");
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Clés API</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Utilisez des clés API pour accéder à l'API programmatiquement, par exemple depuis des workflows n8n.
                </p>
            </div>

            {/* One-time raw key display */}
            {createdKey && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        ⚠ Cette clé ne sera affichée qu'une seule fois. Copiez-la maintenant.
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-3 py-2 rounded break-all">
                            {createdKey.rawKey}
                        </code>
                        <button
                            onClick={() => copyToClipboard(createdKey.rawKey)}
                            className="shrink-0 px-3 py-2 text-xs font-medium rounded-md bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                        >
                            {copied ? "Copié !" : "Copier"}
                        </button>
                    </div>
                    <button
                        onClick={() => setCreatedKey(null)}
                        className="text-xs text-amber-700 dark:text-amber-500 hover:underline"
                    >
                        J'ai copié la clé, fermer
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Generate button / inline form */}
            {showForm ? (
                <form onSubmit={handleCreate} className="flex items-center gap-2 max-w-md">
                    <input
                        type="text"
                        placeholder="Nom de la clé (ex: n8n prod)"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={creating || !newKeyName.trim()}
                        className="px-3 py-2 text-xs font-medium rounded-md bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                    >
                        {creating ? "Création…" : "Créer"}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowForm(false); setNewKeyName(""); }}
                        className="px-3 py-2 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Annuler
                    </button>
                </form>
            ) : (
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-accent-500 text-white hover:bg-accent-600 transition-colors"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="6" y1="2" x2="6" y2="10" />
                        <line x1="2" y1="6" x2="10" y2="6" />
                    </svg>
                    Générer une clé API
                </button>
            )}

            {/* Keys list */}
            {loading ? (
                <p className="text-xs text-zinc-400">Chargement…</p>
            ) : keys.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-600">Aucune clé API.</p>
            ) : (
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden max-w-2xl">
                    {keys.map((key) => (
                        <div
                            key={key.id}
                            className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 bg-white dark:bg-zinc-900"
                        >
                            <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {key.name}
                                    </span>
                                    <span
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${key.isRevoked
                                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                                            : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                                            }`}
                                    >
                                        {key.isRevoked ? "Révoquée" : "Actif"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <code className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                                        {key.prefix}...
                                    </code>
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                        Créée le {new Date(key.createdAt).toLocaleDateString("fr-FR")}
                                    </span>
                                    {key.lastUsedAt && (
                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                            Dernière utilisation&nbsp;: {new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {!key.isRevoked && (
                                    <button
                                        onClick={() => { void handleRevoke(key.id); }}
                                        className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                    >
                                        Révoquer
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Supprimer la clé "${key.name}" ? Cette action est irréversible.`)) {
                                            void handleDelete(key.id);
                                        }
                                    }}
                                    className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
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
}

/* ─────────────────────────────────────────────
   Section: Users (admin only)
───────────────────────────────────────────── */
function SectionUsers() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [registrationEnabled, setRegistrationEnabled] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);

    function loadUsers() {
        setLoadingUsers(true);
        api.users
            .list()
            .then(setUsers)
            .catch((e: Error) => setUsersError(e.message))
            .finally(() => setLoadingUsers(false));
    }

    useEffect(() => {
        api.admin
            .getSettings()
            .then((s) => setRegistrationEnabled(s.registrationEnabled))
            .catch((e: Error) => setSettingsError(e.message))
            .finally(() => setLoadingSettings(false));

        loadUsers();
    }, []);

    async function handleToggleRegistration() {
        try {
            const updated = await api.admin.updateSettings({ registrationEnabled: !registrationEnabled });
            setRegistrationEnabled(updated.registrationEnabled);
        } catch (e) {
            setSettingsError(e instanceof Error ? e.message : "Erreur inconnue");
        }
    }

    async function handleRoleChange(u: User, role: "admin" | "user") {
        try {
            const updated = await api.users.update(u.id, { role });
            setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        } catch (e) {
            setUsersError(e instanceof Error ? e.message : "Erreur inconnue");
        }
    }

    async function handleDelete() {
        if (!userToDelete) return;
        setDeleting(true);
        try {
            await api.users.delete(userToDelete.id);
            setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
            setUserToDelete(null);
        } catch (e) {
            setUsersError(e instanceof Error ? e.message : "Erreur inconnue");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Utilisateurs</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Gestion des utilisateurs et paramètres d'inscription.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent-500 text-white hover:bg-accent-600 transition-colors"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="6" y1="1" x2="6" y2="11" />
                        <line x1="1" y1="6" x2="11" y2="6" />
                    </svg>
                    Nouvel utilisateur
                </button>
            </div>

            {showCreateUserModal && (
                <CreateUserModal
                    onClose={() => setShowCreateUserModal(false)}
                    onCreated={loadUsers}
                />
            )}

            {settingsError && <p className="text-xs text-red-600 dark:text-red-400">{settingsError}</p>}
            {usersError && <p className="text-xs text-red-600 dark:text-red-400">{usersError}</p>}

            {/* Registration toggle */}
            <div className="flex items-center justify-between max-w-md p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Inscription</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {loadingSettings
                            ? "Chargement…"
                            : registrationEnabled
                                ? "Inscription activée"
                                : "Inscription désactivée"}
                    </p>
                </div>
                <button
                    onClick={() => { void handleToggleRegistration(); }}
                    disabled={loadingSettings}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${registrationEnabled ? "bg-accent-500" : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                    role="switch"
                    aria-checked={registrationEnabled}
                >
                    <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${registrationEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                    />
                </button>
            </div>

            {/* Users list */}
            <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    Utilisateurs ({users.length})
                </p>
                {loadingUsers ? (
                    <p className="text-xs text-zinc-400">Chargement…</p>
                ) : users.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">Aucun utilisateur.</p>
                ) : (
                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden max-w-2xl">
                        {users.map((u) => (
                            <div
                                key={u.id}
                                className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${u.id === currentUser?.id
                                    ? "bg-accent-500/5 dark:bg-accent-500/10"
                                    : "bg-white dark:bg-zinc-900"
                                    }`}
                            >
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                            {u.name ?? "—"}
                                        </span>
                                        {u.id === currentUser?.id && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400">
                                                Vous
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{u.email}</span>
                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                            Créé le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <select
                                        value={u.role}
                                        onChange={(e) => {
                                            void handleRoleChange(u, e.target.value as "admin" | "user");
                                        }}
                                        disabled={u.id === currentUser?.id}
                                        className="text-[11px] rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="user">Utilisateur</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                    <button
                                        onClick={() => setUserToDelete(u)}
                                        disabled={u.id === currentUser?.id}
                                        className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            Supprimer l'utilisateur
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                {userToDelete.name ?? userToDelete.email}
                            </span>{" "}
                            ? Cette action est irréversible.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setUserToDelete(null)}
                                disabled={deleting}
                                className="px-3 py-2 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => { void handleDelete(); }}
                                disabled={deleting}
                                className="px-3 py-2 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleting ? "Suppression…" : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Section content map
───────────────────────────────────────────── */
const SECTION_CONTENT: Record<SettingsSection, ReactNode> = {
    profile: <SectionProfile />,
    appearance: <SectionAppearance />,
    about: <SectionAbout />,
    api: <SectionApiKeys />,
    users: <SectionUsers />,
};

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function PageSettings() {
    const { section } = useParams<{ section: string }>();
    const navigate = useNavigate();
    const { isAdmin, isLoading } = useAuth();
    const visibleSections = SETTINGS_SECTIONS.filter((s) => !s.adminOnly || isAdmin);
    const activeSection = SETTINGS_SECTIONS.find((s) => s.id === section)
        ? (section as SettingsSection)
        : "profile";

    useEffect(() => {
        if (!isLoading && activeSection === "users" && !isAdmin) {
            navigate("/settings/profile", { replace: true });
        }
    }, [activeSection, isAdmin, isLoading, navigate]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 flex gap-6">
            {/* Sidebar */}
            <aside className="w-52 shrink-0">
                {/* Back link */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors mb-4 px-1"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="7.5 2 3.5 6 7.5 10" />
                    </svg>
                    Retour
                </button>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 px-2 mb-1.5">
                    Paramètres
                </p>

                <nav className="flex flex-col gap-0.5">
                    {visibleSections.map((item) => (
                        <Link
                            key={item.id}
                            to={`/settings/${item.id}`}
                            className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${activeSection === item.id
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200"
                                }`}
                        >
                            <span className="shrink-0">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Content */}
            <main className="flex-1 min-w-0">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                    {SECTION_CONTENT[activeSection]}
                </div>
            </main>
        </div>
    );
}
