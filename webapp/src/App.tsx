import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./Context/ThemeContext";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import ThemeToggle from "./Components/ThemeToggle";
import ProtectedRoute from "./Components/ProtectedRoute";
import PageLogin from "./Pages/PageLogin";
import PageProjects from "./Pages/PageProjects";
import PagePipelines from "./Pages/PagePipelines";
import PageGraph from "./Pages/PageGraph";
import "./App.css";

function NavContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md px-4 py-3 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to={user ? "/projects" : "/login"} className="font-bold text-xl text-indigo-600 dark:text-indigo-400">
          Pipel8ne
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link to="/projects" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition">
                Projets
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">{user.name ?? user.email}</span>
              <button
                onClick={() => { void handleLogout(); }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
              >
                Déconnexion
              </button>
            </>
          )}
          <ThemeToggle />
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
          <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
            <NavContent />
            <main className="flex-grow">
              <Routes>
                <Route path="/login" element={<PageLogin />} />
                <Route path="/projects" element={<ProtectedRoute><PageProjects /></ProtectedRoute>} />
                <Route path="/projects/:projectId/pipelines" element={<ProtectedRoute><PagePipelines /></ProtectedRoute>} />
                <Route path="/projects/:projectId/pipelines/:pipelineId" element={<ProtectedRoute><PageGraph /></ProtectedRoute>} />
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