import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="text-gray-500">Chargement...</span>
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

export default ProtectedRoute;
