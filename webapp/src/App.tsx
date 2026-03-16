import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ThemeProvider } from "./Context/ThemeContext";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import ProtectedRoute from "./Components/ProtectedRoute";
import PageLogin from "./Pages/PageLogin";
import PageProjects from "./Pages/PageProjects";
import PagePipelines from "./Pages/PagePipelines";
import PageGraph from "./Pages/PageGraph";
import PageSettings from "./Pages/PageSettings";
import { SETTINGS_SECTIONS } from "./Pages/PageSettings";
import "./App.css";

function SettingsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Paramètres"
        className={`p-2 rounded-md transition-colors ${open ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1 animate-fade-in">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
              Paramètres
            </p>
            {SETTINGS_SECTIONS.filter((s) => s.id !== "api").map((s) => (
              <Link
                key={s.id}
                to={`/settings/${s.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{s.label}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{s.description}</p>
                </div>
              </Link>
            ))}
            {SETTINGS_SECTIONS.filter((s) => s.id === "api").map((s) => (
              <Link
                key={s.id}
                to={`/settings/${s.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{s.label}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{s.description}</p>
                </div>
              </Link>
            ))}

            <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
              <button
                onClick={() => { void handleLogout(); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                  <polyline points="10 11 14 8 10 5" />
                  <line x1="14" y1="8" x2="6" y2="8" />
                </svg>
                <p className="text-xs font-medium">Se déconnecter</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NavContent() {
  const { user } = useAuth();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm px-5 sticky top-0 z-50 transition-colors">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center h-12">
        <Link
          to={user ? "/projects" : "/login"}
          className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 hover:text-accent-500 dark:hover:text-accent-400 transition-colors"
        >
          pipel<span className="text-accent-500">8</span>ne
        </Link>

        <div className="flex items-center gap-1">
          {user && (
            <>
              <Link
                to="/projects"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-3 py-2 rounded-md transition-colors"
              >
                Projets
              </Link>
              <span className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              <SettingsDropdown />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
            <NavContent />
            <main className="flex-grow">
              <Routes>
                <Route path="/login" element={<PageLogin />} />
                <Route path="/projects" element={<ProtectedRoute><PageProjects /></ProtectedRoute>} />
                <Route path="/projects/:projectId/pipelines" element={<ProtectedRoute><PagePipelines /></ProtectedRoute>} />
                <Route path="/projects/:projectId/pipelines/:pipelineId" element={<ProtectedRoute><PageGraph /></ProtectedRoute>} />
                <Route path="/settings/:section" element={<ProtectedRoute><PageSettings /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><PageSettings /></ProtectedRoute>} />
                <Route path="*" element={<ProtectedRoute><PageProjects /></ProtectedRoute>} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;