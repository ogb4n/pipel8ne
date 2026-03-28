import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { GitRepository, GitProvider } from "../Api/types";

/* ── Types ──────────────────────────────────────────────── */
export type RepoWithProvider = GitRepository & { provider: GitProvider };

interface RepoListProps {
  repos: RepoWithProvider[];
  loading: boolean;
  connectedProviders: GitProvider[];
  onSelectRepo: (repo: RepoWithProvider) => void;
}

const PAGE_SIZE = 6;

const PROVIDER_LABEL: Record<GitProvider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  azure_devops: "Azure DevOps",
};

/* ── Provider icons ─────────────────────────────────────── */
const ProviderIcon: React.FC<{ provider: GitProvider; size?: number }> = ({
  provider,
  size = 16,
}) => {
  if (provider === "github")
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className="text-zinc-800 dark:text-zinc-200">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  if (provider === "gitlab")
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className="text-orange-500">
        <path d="M8 15.37l2.4-7.39H5.6L8 15.37z" />
        <path d="M8 15.37L5.6 7.98H1.22L8 15.37z" opacity="0.7" />
        <path d="M1.22 7.98l-.87 2.67a.6.6 0 0 0 .22.67L8 15.37 1.22 7.98z" opacity="0.5" />
        <path d="M1.22 7.98h4.38L3.72 2.3a.3.3 0 0 0-.57 0L1.22 7.98z" />
        <path d="M8 15.37l2.4-7.39h4.38L8 15.37z" opacity="0.7" />
        <path d="M14.78 7.98l.87 2.67a.6.6 0 0 1-.22.67L8 15.37l6.78-7.39z" opacity="0.5" />
        <path d="M14.78 7.98H10.4l1.88-5.68a.3.3 0 0 1 .57 0l1.93 5.68z" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className="text-blue-500">
      <path d="M15 3.622v8.512L11.5 15l-5.425-1.975v1.958L3.004 10.97l8.951.7V4.005L15 3.622zm-2.984.428L6.994 1v2.001L2.382 4.356 1 5.801v4.6l2.004.855V5.26l8.012-1.21z" />
    </svg>
  );
};

/* ── RepoList Component ─────────────────────────────────── */
const RepoList: React.FC<RepoListProps> = ({
  repos,
  loading,
  connectedProviders,
  onSelectRepo,
}) => {
  const [activeTab, setActiveTab] = useState<GitProvider | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = activeTab === "all" ? repos : repos.filter((r) => r.provider === activeTab);
    if (visibilityFilter === "public") list = list.filter((r) => !r.isPrivate);
    if (visibilityFilter === "private") list = list.filter((r) => r.isPrivate);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [repos, activeTab, visibilityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRepos = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Reset page on filter change
  const changeTab = (tab: GitProvider | "all") => {
    setActiveTab(tab);
    setPage(0);
  };
  const changeVisibility = (v: "all" | "public" | "private") => {
    setVisibilityFilter(v);
    setPage(0);
  };

  if (loading) {
    return (
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Vos dépôts
        </h2>
        <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 py-4">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Chargement des dépôts...
        </div>
      </section>
    );
  }

  if (connectedProviders.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Vos dépôts
        </h2>
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-10 flex flex-col items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-300 dark:text-zinc-700"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucun provider Git connecté
          </p>
          <Link
            to="/settings/git"
            className="text-xs font-medium text-accent-500 hover:text-accent-600 transition-colors"
          >
            Connecter un provider →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Vos dépôts
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {repos.length} dépôt{repos.length > 1 ? "s" : ""} · Sélectionnez pour créer un projet
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-8 pr-3 py-1.5 w-48 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-xs focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {connectedProviders.length > 1 && (
          <>
            <button
              onClick={() => changeTab("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "all"
                ? "bg-accent-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
            >
              Tous ({repos.length})
            </button>
            {connectedProviders.map((p) => {
              const count = repos.filter((r) => r.provider === p).length;
              return (
                <button
                  key={p}
                  onClick={() => changeTab(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === p
                    ? "bg-accent-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                >
                  <ProviderIcon provider={p} size={12} />
                  {PROVIDER_LABEL[p]} ({count})
                </button>
              );
            })}
            <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          </>
        )}

        {/* Visibility filters */}
        {(["all", "public", "private"] as const).map((v) => {
          const label = v === "all" ? "Tous" : v === "public" ? "Public" : "Privé";
          const count =
            v === "all"
              ? ''
              : v === "public"
                ? `(${repos.filter((r) => !r.isPrivate).length})`
                : `(${repos.filter((r) => r.isPrivate).length})`;
          return (
            <button
              key={v}
              onClick={() => changeVisibility(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${visibilityFilter === v
                ? "bg-zinc-700 text-white dark:bg-zinc-200 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
            >
              {label} {count}
            </button>
          );
        })}
      </div>

      {/* Repo grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-10 flex flex-col items-center gap-1.5">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            {search.trim()
              ? "Aucun dépôt ne correspond à la recherche"
              : "Aucun dépôt trouvé sur vos providers connectés"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {pageRepos.map((repo) => (
              <button
                key={`${repo.provider}-${repo.id}`}
                onClick={() => onSelectRepo(repo)}
                className="text-left border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 px-4 py-3 hover:border-accent-300 dark:hover:border-accent-700 hover:bg-accent-50/50 dark:hover:bg-accent-950/10 transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    <ProviderIcon provider={repo.provider} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                        {repo.fullName}
                      </p>
                      <span
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${repo.isPrivate
                          ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          }`}
                      >
                        {repo.isPrivate ? "privé" : "public"}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-600">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 3v10M10 3v10" />
                          <path d="M3 6h10M3 10h10" />
                        </svg>
                        {repo.defaultBranch}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination slider */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page précédente"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${i === currentPage
                      ? "bg-accent-500 text-white"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page suivante"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default RepoList;
export { ProviderIcon };
