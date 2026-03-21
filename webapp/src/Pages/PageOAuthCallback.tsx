import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../Api/client";
import type { GitProvider } from "../Api/types";

const VALID_PROVIDERS = new Set<string>(["github", "gitlab", "azure_devops"]);

export default function PageOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Paramètres OAuth manquants.");
      return;
    }

    let provider: string;
    try {
      const parsed = JSON.parse(atob(state));
      provider = parsed.provider;
    } catch {
      setError("State OAuth invalide.");
      return;
    }

    if (!VALID_PROVIDERS.has(provider)) {
      setError("Fournisseur Git invalide.");
      return;
    }

    api.gitConnections
      .oauthCallback(provider as GitProvider, code)
      .then(() => navigate("/projects", { replace: true }))
      .catch((e: Error) => setError(e.message));
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-10 h-10 mx-auto rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-red-600 dark:text-red-400"
            >
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => navigate("/settings/git", { replace: true })}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
          >
            Retour aux paramètres Git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-6 h-6 mx-auto border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Connexion en cours…</p>
      </div>
    </div>
  );
}
