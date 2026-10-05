import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from '@/shared/api/axiosInstance';

interface User {
    username: string;
    branch_name: string;
    accesslevel: string;
    emp_id: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "auth_user";

function getCachedUser(): User | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => getCachedUser());
    const [loading, setLoading] = useState(() => getCachedUser() === null);
    const hasFetched = useRef(false);
    const isChecking = useRef(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        refreshUser();
    }, []);

    useEffect(() => {
        const handleUnauthorized = () => {
            if (isChecking.current) return;
            isChecking.current = true;
            refreshUser().finally(() => {
                isChecking.current = false;
            });
        };
        window.addEventListener("app:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("app:unauthorized", handleUnauthorized);
    }, []);

    const refreshUser = async () => {
        try {
            const res = await api.get("/auth/user-info");
            if (res.data?.authenticated) {
                const u: User = {
                    username: res.data.username,
                    branch_name: res.data.branch_name,
                    accesslevel: res.data.accesslevel ?? "",
                    emp_id: res.data.emp_id ?? "",
                };
                setUser(u);
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
            } else {
                setUser(null);
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setUser(null);
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            setUser(null);
            sessionStorage.removeItem(STORAGE_KEY);
            queryClient.clear();
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}