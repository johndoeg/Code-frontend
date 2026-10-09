import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from '@/shared/api/axiosInstance';
import { useAuth } from '@/shared/contexts/AuthContext';
import GenieLogo from '@/shared/components/GenieLogo';

type Stage = "credentials" | "pin";

const PIN_LENGTH = 6;
const DEFAULT_PIN_TTL_SECONDS = 5 * 60;
const MAX_PIN_ATTEMPTS = 3;

const formatTime = (totalSeconds: number) => {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
};

const Spinner = () => (
	<svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path
			className="opacity-75"
			fill="currentColor"
			d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
		/>
	</svg>
);

const INPUT_BASE =
	"border border-[var(--app-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-[var(--app-surface-alt)] disabled:cursor-not-allowed";

export default function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { refreshUser } = useAuth();

	const [stage, setStage] = useState<Stage>("credentials");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [pinDigits, setPinDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(DEFAULT_PIN_TTL_SECONDS);
	const [pinTtlTotal, setPinTtlTotal] = useState(DEFAULT_PIN_TTL_SECONDS);
	const [attemptsLeft, setAttemptsLeft] = useState(MAX_PIN_ATTEMPTS);

	const from = (location.state as any)?.from?.pathname || "/";

	const pinRefs = [
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
	];

	const pinComplete = pinDigits.every((d) => d !== "");
	const pinExpired = secondsLeft <= 0;
	const pinLockedOut = attemptsLeft <= 0;

	useEffect(() => {
		if (stage !== "pin" || pinExpired || pinLockedOut) return;

		const interval = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					setError("PIN expired. Please request a new one.");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [stage, pinExpired, pinLockedOut]);

	const handleCredentialsSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const res = await api.post("/auth/login", { username, password });
			if (res.data?.pin_required) {
				const ttl = res.data?.expires_in ?? DEFAULT_PIN_TTL_SECONDS;
				setStage("pin");
				setPinDigits(Array(PIN_LENGTH).fill(""));
				setSecondsLeft(ttl);
				setPinTtlTotal(ttl);
				setAttemptsLeft(MAX_PIN_ATTEMPTS);
				setTimeout(() => pinRefs[0].current?.focus(), 50);
			} else {
				await refreshUser();
				navigate(from, { replace: true });
			}
		} catch (err: any) {
			const data = err.response?.data;
			if (data?.maintenance) {
				setError(data.message || "System under maintenance");
			} else {
				setError(data?.message || err.message || "Login failed");
			}
		} finally {
			setLoading(false);
		}
	};

	const handlePinDigitChange = (index: number, value: string) => {
		const digit = value.replace(/\D/g, "").slice(-1);
		const next = [...pinDigits];
		next[index] = digit;
		setPinDigits(next);

		if (digit && index < PIN_LENGTH - 1) {
			pinRefs[index + 1].current?.focus();
		}
	};

	const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
			pinRefs[index - 1].current?.focus();
		}
	};

	const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
		if (pasted.length === PIN_LENGTH) {
			e.preventDefault();
			setPinDigits(pasted.split(""));
			pinRefs[PIN_LENGTH - 1].current?.focus();
		}
	};

	const handlePinSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!pinComplete || pinExpired || pinLockedOut) return;

		const pin = pinDigits.join("");
		setError("");
		setLoading(true);
		try {
			await api.post("/auth/verify-pin", { pin });
			await refreshUser();
			navigate(from, { replace: true });
		} catch (err: any) {
			const data = err.response?.data;
			const remaining = attemptsLeft - 1;
			setAttemptsLeft(remaining);
			setPinDigits(Array(PIN_LENGTH).fill(""));

			if (remaining <= 0) {
				setError("Too many failed attempts. Please log in again.");
			} else {
				setError(
					`${data?.message || err.message || "Incorrect PIN"} (${remaining} attempt${remaining === 1 ? "" : "s"
					} left)`
				);
				pinRefs[0].current?.focus();
			}
		} finally {
			setLoading(false);
		}
	};

	const handleBackToCredentials = () => {
		setStage("credentials");
		setError("");
		setPinDigits(Array(PIN_LENGTH).fill(""));
		setSecondsLeft(DEFAULT_PIN_TTL_SECONDS);
		setPinTtlTotal(DEFAULT_PIN_TTL_SECONDS);
		setAttemptsLeft(MAX_PIN_ATTEMPTS);
	};

	const pinProgressPct = Math.max(0, Math.min(100, (secondsLeft / pinTtlTotal) * 100));

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
			<GenieLogo height={125} width={600} className="relative z-10 -mb-9 select-none" />
			<div className="w-full max-w-md backdrop-blur-xl bg-[var(--app-card)]/40 border border-white/60 dark:border-slate-700/60 rounded-3xl shadow-2xl px-8 pb-8 pt-14 animate-fadeIn">
				{stage === "credentials" ? (
					<>
						<h2 className="text-3xl font-extrabold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Welcome Back
						</h2>

						<form onSubmit={handleCredentialsSubmit} className="space-y-5">
							<div>
								<label className="block text-sm font-semibold text-[var(--app-text)] mb-1">
									Username
								</label>
								<input
									type="text"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									disabled={loading}
									className={`w-full px-4 py-2.5 ${INPUT_BASE}`}
									required
									autoComplete="username"
									autoFocus
								/>
							</div>

							<div>
								<label className="block text-sm font-semibold text-[var(--app-text)] mb-1">
									Password
								</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={loading}
									className={`w-full px-4 py-2.5 ${INPUT_BASE}`}
									required
									autoComplete="current-password"
								/>
							</div>

							{error && (
								<p className="text-red-500 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2 rounded-lg animate-shake">
									{error}
								</p>
							)}

							<button
								type="submit"
								disabled={loading || !username || !password}
								className={`w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 ${loading ? "animate-pulse" : "hover:opacity-90"
									}`}
							>
								{loading ? (
									<span className="flex items-center justify-center gap-2">
										<Spinner />
										Signing in...
									</span>
								) : (
									"Login"
								)}
							</button>
						</form>
					</>
				) : (
					<>
						<h2 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Enter PIN
						</h2>
						<p className="text-sm text-[var(--app-muted)] text-center mb-4">
							A {PIN_LENGTH}-digit code has been sent to your Telegram.
						</p>

						<div className="mb-6">
							<div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
								{!pinExpired && (
									<svg className="w-3.5 h-3.5 text-[var(--app-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								)}
								<span className={pinExpired ? "text-red-500" : "text-[var(--app-muted)]"}>
									{pinExpired ? "Code expired" : `Expires in ${formatTime(secondsLeft)}`}
								</span>
							</div>
							<div className="mt-2 h-1 w-full rounded-full bg-[var(--app-surface-alt)] overflow-hidden">
								<div
									className={`h-full rounded-full transition-all duration-1000 ease-linear ${pinExpired ? "bg-red-400" : "bg-gradient-to-r from-blue-500 to-purple-500"
										}`}
									style={{ width: `${pinProgressPct}%` }}
								/>
							</div>
						</div>

						<form onSubmit={handlePinSubmit} className="space-y-5">
							<div className={`flex justify-center gap-2.5 ${error ? "animate-shake" : ""}`}>
								{pinDigits.map((digit, i) => {
									const filled = digit !== "";
									return (
										<input
											key={i}
											ref={pinRefs[i]}
											type="text"
											inputMode="numeric"
											maxLength={1}
											value={digit}
											onChange={(e) => handlePinDigitChange(i, e.target.value)}
											onKeyDown={(e) => handlePinKeyDown(i, e)}
											onPaste={i === 0 ? handlePinPaste : undefined}
											onFocus={(e) => e.target.select()}
											disabled={loading || pinExpired || pinLockedOut}
											className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none shadow-sm transition-all duration-150 focus:scale-105 focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${filled
												? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400"
												: "border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)]"
												}`}
										/>
									);
								})}
							</div>

							{!pinExpired && !pinLockedOut && (
								<div className="flex items-center justify-center gap-1.5">
									{Array.from({ length: MAX_PIN_ATTEMPTS }).map((_, i) => (
										<span
											key={i}
											className={`h-1.5 w-1.5 rounded-full transition-colors ${i < attemptsLeft ? "bg-blue-400" : "bg-[var(--app-border)]"
												}`}
										/>
									))}
									<span className="ml-1 text-xs text-[var(--app-muted)]">
										{attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining
									</span>
								</div>
							)}

							{error && (
								<p className="text-red-500 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2 rounded-lg text-center animate-shake">
									{error}
								</p>
							)}

							<button
								type="submit"
								disabled={loading || !pinComplete || pinExpired || pinLockedOut}
								className={`w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 ${loading ? "animate-pulse" : "hover:opacity-90"
									}`}
							>
								{loading ? (
									<span className="flex items-center justify-center gap-2">
										<Spinner />
										Verifying...
									</span>
								) : (
									"Verify"
								)}
							</button>

							<button
								type="button"
								onClick={handleBackToCredentials}
								disabled={loading}
								className="w-full text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] disabled:opacity-50"
							>
								Back to login
							</button>
						</form>
					</>
				)}

				<div className="mt-6 text-center text-xs text-[var(--app-muted)]">
					<p>© {new Date().getFullYear()} PT Genie Finance Indonesia</p>
					<p className="mt-1">
						Version {import.meta.env.VITE_APP_VERSION || "1.0.0"}
					</p>
				</div>
			</div>
		</div>
	);
}