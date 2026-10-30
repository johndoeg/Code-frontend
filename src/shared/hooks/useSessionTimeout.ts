import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, SESSION_EXPIRY_KEY } from '@/shared/contexts/AuthContext';

const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;

interface StoredExpiry {
    username: string;
    expiresAt: number;
}

function readExpiry(username: string): number {
    try {
        const raw = sessionStorage.getItem(SESSION_EXPIRY_KEY);
        if (!raw) return 0;
        const saved = JSON.parse(raw) as Partial<StoredExpiry>;
        if (saved?.username !== username) return 0;
        const expiresAt = Number(saved.expiresAt);
        return Number.isFinite(expiresAt) && expiresAt > Date.now() ? expiresAt : 0;
    } catch {
        return 0;
    }
}

function writeExpiry(username: string, expiresAt: number) {
    const payload: StoredExpiry = { username, expiresAt };
    sessionStorage.setItem(SESSION_EXPIRY_KEY, JSON.stringify(payload));
}

export function useSessionTimeout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [remainingMs, setRemainingMs] = useState(SESSION_DURATION_MS);

    const logoutRef = useRef(logout);
    const navigateRef = useRef(navigate);
    logoutRef.current = logout;
    navigateRef.current = navigate;

    useEffect(() => {
        if (!user) {
            sessionStorage.removeItem(SESSION_EXPIRY_KEY);
            setRemainingMs(SESSION_DURATION_MS);
            return;
        }

        let expiresAt = readExpiry(user.username);
        if (!expiresAt) {
            expiresAt = Date.now() + SESSION_DURATION_MS;
            writeExpiry(user.username, expiresAt);
        }

        let loggedOut = false;

        async function expireSession() {
            loggedOut = true;
            sessionStorage.removeItem(SESSION_EXPIRY_KEY);
            try {
                await logoutRef.current();
            } finally {
                navigateRef.current("/login", { replace: true });
            }
        }

        function tick() {
            const remaining = expiresAt - Date.now();
            setRemainingMs(Math.max(remaining, 0));

            if (remaining <= 0 && !loggedOut) {
                expireSession();
            }
        }

        tick();
        const intervalId = window.setInterval(tick, 1000);
        return () => window.clearInterval(intervalId);
    }, [user?.username]);

    return remainingMs;
}

export function formatCountdown(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}