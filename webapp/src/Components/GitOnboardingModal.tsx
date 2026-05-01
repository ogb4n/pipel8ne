import { useEffect, useState } from "react";
import { api } from "../Api/client";
import type { OAuthConfig, GitProvider, GitConnection, Credential } from "../Api/types";
import CreateCredentialModal from "./CreateCredentialModal";

const STORAGE_KEY = "git-onboarding-dismissed";

const PROVIDER_TO_CRED_KEY: Record<GitProvider, string[]> = {
  github: ["github"],
  gitlab: ["gitlab"],
  azure_devops: ["azure_devops", "azure"],
};

const PROVIDER_LABEL: Record<GitProvider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  azure_devops: "Azure DevOps",
};

interface Props {
  /** Ouvre la modale de force, sans tenir compte du localStorage ni des connexions existantes */
  forceOpen?: boolean;
  /** Appelé quand l'utilisateur ferme la modale en mode forceOpen */
  onClose?: () => void;
}

/**
 * Modal d'onboarding Git — apparaît à l'ouverture de l'app si l'utilisateur
 * n'a encore connecté aucun compte GitHub / GitLab.
 * L'utilisateur peut la fermer (dismiss persisté en localStorage).
 */
export default function GitOnboardingModal({ forceOpen, onClose }: Props = {}) {
  const [visible, setVisible] = useState(false);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // PAT flow state
  const [patProvider, setPatProvider] = useState<GitProvider | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showCreateCredential, setShowCreateCredential] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      api.gitConnections.oauthConfig()
        .then((config) => { setOauthConfig(config); setVisible(true); })
        .catch(() => { /* silently ignore */ })
        .finally(() => setLoading(false));
      return;
    }

    // Si déjà fermé cette session, ne pas réafficher
    if (localStorage.getItem(STORAGE_KEY)) {
      setLoading(false);
      return;
    }

    Promise.all([api.gitConnections.list(), api.gitConnections.oauthConfig()])
      .then(([connections, config]: [GitConnection[], OAuthConfig]) => {
        if (connections.length === 0) {
          setOauthConfig(config);
          setVisible(true);
        }
      })
      .catch(() => {
        /* silently ignore — server may not support git connections yet */
      })
      .finally(() => setLoading(false));
  }, [forceOpen]);

  function handleConnect(provider: GitProvider) {
    if (!oauthConfig) return;
    const config = oauthConfig[provider];
    if (!config.enabled) return;
    if (!forceOpen) localStorage.setItem(STORAGE_KEY, "1");
    globalThis.location.href = config.authUrl;
  }

  function handleDismiss() {
    if (onClose) {
      onClose();
      return;
    }
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function handlePatConnect(provider: GitProvider) {
    setPatProvider(provider);
    setSelectedCredentialId(null);
    setConnectError(null);
    setCredentialsLoading(true);
    api.credentials.list()
      .then((creds) => {
        setCredentials(creds);
        const matching = creds.filter((c) =>
          PROVIDER_TO_CRED_KEY[provider].includes(c.provider)
        );
        if (matching.length > 0) setSelectedCredentialId(matching[0].id);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setCredentialsLoading(false));
  }

  async function handleConnectWithCredential() {
    if (!selectedCredentialId) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await api.gitConnections.connectWithCredential(selectedCredentialId);
      if (!forceOpen) localStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
      if (onClose) onClose();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setConnecting(false);
    }
  }

  function handleCredentialCreated() {
    setShowCreateCredential(false);
    if (!patProvider) return;
    setCredentialsLoading(true);
    api.credentials.list()
      .then((creds) => {
        setCredentials(creds);
        const matching = creds.filter((c) =>
          PROVIDER_TO_CRED_KEY[patProvider].includes(c.provider)
        );
        if (matching.length > 0) setSelectedCredentialId(matching[matching.length - 1].id);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setCredentialsLoading(false));
  }

  const matchingCredentials = patProvider
    ? credentials.filter((c) => PROVIDER_TO_CRED_KEY[patProvider].includes(c.provider))
    : [];

  if (loading || !visible || !oauthConfig) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent-500/10 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent-500"
              >
                <circle cx="4" cy="12" r="1.5" />
                <circle cx="12" cy="4" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <path d="M4 10.5V6a2 2 0 0 1 2-2h2.5" />
                <path d="M12 5.5v5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {patProvider ? `Connecter ${PROVIDER_LABEL[patProvider]}` : "Connectez votre compte Git"}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
              {patProvider
                ? "Sélectionnez un token personnel enregistré ou créez-en un nouveau."
                : "Liez votre compte GitHub, GitLab ou Azure DevOps pour importer vos dépôts et créer des pipelines CI/CD."}
            </p>
          </div>

          {patProvider === null ? (
            /* ── Provider list ── */
            <div className="px-8 pb-6 space-y-3">
              <button
                onClick={() =>
                  oauthConfig.github.enabled
                    ? handleConnect("github")
                    : handlePatConnect("github")
                }
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="text-zinc-800 dark:text-zinc-200"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {oauthConfig.github.enabled ? "Continuer avec GitHub" : "Connecter avec un token GitHub"}
                </span>
              </button>

              <button
                onClick={() =>
                  oauthConfig.gitlab.enabled
                    ? handleConnect("gitlab")
                    : handlePatConnect("gitlab")
                }
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="text-orange-500"
                >
                  <path d="M8 15.37l2.4-7.39H5.6L8 15.37z" />
                  <path d="M8 15.37L5.6 7.98H1.22L8 15.37z" opacity="0.7" />
                  <path d="M1.22 7.98l-.87 2.67a.6.6 0 0 0 .22.67L8 15.37 1.22 7.98z" opacity="0.5" />
                  <path d="M1.22 7.98h4.38L3.72 2.3a.3.3 0 0 0-.57 0L1.22 7.98z" />
                  <path d="M8 15.37l2.4-7.39h4.38L8 15.37z" opacity="0.7" />
                  <path d="M14.78 7.98l.87 2.67a.6.6 0 0 1-.22.67L8 15.37l6.78-7.39z" opacity="0.5" />
                  <path d="M14.78 7.98H10.4l1.88-5.68a.3.3 0 0 1 .57 0l1.93 5.68z" />
                </svg>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {oauthConfig.gitlab.enabled ? "Continuer avec GitLab" : "Connecter avec un token GitLab"}
                </span>
              </button>

              <button
                onClick={() =>
                  oauthConfig.azure_devops.enabled
                    ? handleConnect("azure_devops")
                    : handlePatConnect("azure_devops")
                }
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="text-blue-500"
                >
                  <path d="M15 3.622v8.512L11.5 15l-5.425-1.975v1.958L3.004 10.97l8.951.7V4.005L15 3.622zm-2.984.428L6.994 1v2.001L2.382 4.356 1 5.801v4.6l2.004.855V5.26l8.012-1.21z" />
                </svg>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {oauthConfig.azure_devops.enabled ? "Continuer avec Azure DevOps" : "Connecter avec un token Azure DevOps"}
                </span>
              </button>
            </div>
          ) : (
            /* ── PAT step ── */
            <div className="px-8 pb-6 space-y-3">
              {/* Back button */}
              <button
                onClick={() => { setPatProvider(null); setConnectError(null); }}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Retour
              </button>

              {credentialsLoading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400 py-4">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Chargement des credentials...
                </div>
              ) : (
                <>
                  {matchingCredentials.length > 0 ? (
                    <div className="space-y-2">
                      {matchingCredentials.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCredentialId(c.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selectedCredentialId === c.id
                            ? "border-accent-500 bg-accent-500/5 dark:bg-accent-500/10"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                            }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.label}</p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">{c.provider}</p>
                          </div>
                          {selectedCredentialId === c.id && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500 shrink-0">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-2">
                      Aucun token enregistré pour ce provider.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCreateCredential(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400 hover:border-accent-500 hover:text-accent-500 dark:hover:border-accent-400 dark:hover:text-accent-400 transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Créer un token
                  </button>

                  {connectError && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-md px-3 py-2">
                      {connectError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => { void handleConnectWithCredential(); }}
                    disabled={!selectedCredentialId || connecting}
                    className="w-full py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {connecting ? "Connexion..." : "Connecter"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          {patProvider === null && (
            <div className="px-8 pb-6 flex items-center justify-between">
              <button
                onClick={handleDismiss}
                className="text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
              >
                Passer pour l'instant
              </button>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                Modifiable dans Paramètres → Git
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreateCredential && (
        <CreateCredentialModal
          onClose={() => setShowCreateCredential(false)}
          onCreated={handleCredentialCreated}
        />
      )}
    </>
  );
}

/**
 * Réinitialise le dismiss pour permettre au modal de réapparaître.
 * Appelé après déconnexion d'un compte Git par exemple.
 */
export function resetGitOnboardingDismiss() {
  localStorage.removeItem(STORAGE_KEY);
}
