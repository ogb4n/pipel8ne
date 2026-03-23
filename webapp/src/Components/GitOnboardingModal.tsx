import { useEffect, useState } from "react";
import { api } from "../Api/client";
import type { OAuthConfig, GitProvider, GitConnection } from "../Api/types";

const STORAGE_KEY = "git-onboarding-dismissed";

/**
 * Modal d'onboarding Git — apparaît à l'ouverture de l'app si l'utilisateur
 * n'a encore connecté aucun compte GitHub / GitLab.
 * L'utilisateur peut la fermer (dismiss persisté en localStorage).
 */
export default function GitOnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  function handleConnect(provider: GitProvider) {
    if (!oauthConfig) return;
    const config = oauthConfig[provider];
    if (!config.enabled) return;
    localStorage.setItem(STORAGE_KEY, "1");
    window.location.href = config.authUrl;
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (loading || !visible || !oauthConfig) return null;

  return (
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
            Connectez votre compte Git
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
            Liez votre compte GitHub, GitLab ou Azure DevOps pour importer vos dépôts et créer des pipelines
            CI/CD.
          </p>
        </div>

        {/* Provider buttons — always show all 3, disabled if not configured */}
        <div className="px-8 pb-6 space-y-3">
          <button
            onClick={() => handleConnect("github")}
            disabled={!oauthConfig.github.enabled}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border transition-colors group ${
              oauthConfig.github.enabled
                ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 opacity-50 cursor-not-allowed"
            }`}
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
              Continuer avec GitHub
            </span>
            {!oauthConfig.github.enabled && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">(non configuré)</span>
            )}
          </button>

          <button
            onClick={() => handleConnect("gitlab")}
            disabled={!oauthConfig.gitlab.enabled}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border transition-colors group ${
              oauthConfig.gitlab.enabled
                ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 opacity-50 cursor-not-allowed"
            }`}
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
              Continuer avec GitLab
            </span>
            {!oauthConfig.gitlab.enabled && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">(non configuré)</span>
            )}
          </button>

          <button
            onClick={() => handleConnect("azure_devops")}
            disabled={!oauthConfig.azure_devops.enabled}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border transition-colors group ${
              oauthConfig.azure_devops.enabled
                ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 opacity-50 cursor-not-allowed"
            }`}
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
              Continuer avec Azure DevOps
            </span>
            {!oauthConfig.azure_devops.enabled && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">(non configuré)</span>
            )}
          </button>
        </div>

        {/* Footer */}
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
      </div>
    </div>
  );
}

/**
 * Réinitialise le dismiss pour permettre au modal de réapparaître.
 * Appelé après déconnexion d'un compte Git par exemple.
 */
export function resetGitOnboardingDismiss() {
  localStorage.removeItem(STORAGE_KEY);
}
