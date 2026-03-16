import React, { createContext, useContext, useState, useEffect } from "react";
import { api, clearTokens } from "../Api/client";
import { User } from "../Api/types";

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            try { setUser(JSON.parse(stored) as User); } catch { /* ignore */ }
        }
        // Refresh user data from server to pick up new fields (e.g. role)
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            api.users.me()
                .then((fresh) => {
                    localStorage.setItem("user", JSON.stringify(fresh));
                    setUser(fresh);
                })
                .catch(() => { /* token may be expired, leave current user */ })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const result = await api.auth.login(email, password);
        api.setTokens(result.accessToken, result.refreshToken);
        localStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
    };

    const register = async (email: string, password: string, name?: string) => {
        const result = await api.auth.register(email, password, name);
        api.setTokens(result.accessToken, result.refreshToken);
        localStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem("refreshToken") ?? "";
        try { await api.auth.logout(refreshToken); } catch { /* best effort */ }
        clearTokens();
        localStorage.removeItem("user");
        setUser(null);
    };

    const isAdmin = user?.role === "admin";

    return (
        <AuthContext.Provider value={{ user, isAdmin, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
