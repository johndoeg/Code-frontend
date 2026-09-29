import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/shared/contexts/AuthContext';

const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;
const EXPIRY_STORAGE_KEY = "session_expires_at";

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
			sessionStorage.removeItem(EXPIRY_STORAGE_KEY);
			return;
		}

		let expiresAt = Number(sessionStorage.getItem(EXPIRY_STORAGE_KEY));
		if (!expiresAt || Number.isNaN(expiresAt)) {
			expiresAt = Date.now() + SESSION_DURATION_MS;
			sessionStorage.setItem(EXPIRY_STORAGE_KEY, String(expiresAt));
		}

		let loggedOut = false;

		async function expireSession() {
			loggedOut = true;
			sessionStorage.removeItem(EXPIRY_STORAGE_KEY);
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