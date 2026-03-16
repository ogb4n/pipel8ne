import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen gap-2">
            <svg className="animate-spin h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm text-zinc-400">Chargement...</span>
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

export default ProtectedRoute;
