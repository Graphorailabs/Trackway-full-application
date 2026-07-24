import { useEffect, useRef, useState } from 'react';
import { requestOtp, verifyOtp } from '@/services/AuthService';
import { setAuthToken } from '@/utils/authToken';
import { ApiError } from '@/services/ApiService';

interface AuthModalProps {
	open: boolean;
	onSuccess: (token: string) => void;
	onCancel: () => void;
}

type Step = 'email' | 'otp';

function getErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof ApiError) {
		const info = err.info as { error?: string } | undefined;
		if (info?.error) return info.error;
	}
	return fallback;
}

function UserIcon() {
	return (
		<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<circle cx="12" cy="8" r="4" stroke="#0284c7" strokeWidth="1.5" />
			<path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
		</svg>
	);
}

const AuthModal = ({ open, onSuccess, onCancel }: AuthModalProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [step, setStep] = useState<Step>('email');
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setStep('email');
			setEmail('');
			setCode('');
			setError(null);
			setBusy(false);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	if (!open) {
		return null;
	}

	const handleRequestOtp = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setBusy(true);
		try {
			await requestOtp(email.trim());
			setStep('otp');
		} catch (err) {
			setError(getErrorMessage(err, 'Failed to send code. Try again.'));
		} finally {
			setBusy(false);
		}
	};

	const handleVerifyOtp = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const { token } = await verifyOtp(email.trim(), code.trim());
			setAuthToken(token);
			onSuccess(token);
		} catch (err) {
			setError(getErrorMessage(err, 'Invalid code. Try again.'));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="auth-modal-title"
		>
			<div className="w-full max-w-sm mx-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex flex-col items-center gap-3 mb-4 text-center">
					<div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center">
						<UserIcon />
					</div>
					<div>
						<h2 id="auth-modal-title" className="text-lg font-semibold text-slate-900">
							Sign in to Trackway
						</h2>
						<p className="text-sm text-slate-500">
							{step === 'email'
								? 'Sign in to import projects from Flow.'
								: `Enter the code sent to ${email}.`}
						</p>
					</div>
				</div>

				{step === 'email' ? (
					<form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
						<input
							ref={inputRef}
							type="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="you@example.com"
							className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 text-center shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-300"
						/>
						{error && <p className="text-sm text-red-500 text-center">{error}</p>}
						<button
							type="submit"
							disabled={busy}
							className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-sky-300 hover:bg-sky-500"
						>
							{busy ? 'Sending…' : 'Send code'}
						</button>
					</form>
				) : (
					<form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
						<input
							ref={inputRef}
							type="text"
							inputMode="numeric"
							required
							maxLength={6}
							value={code}
							onChange={(event) => setCode(event.target.value)}
							placeholder="123456"
							className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 text-center tracking-[0.4em] shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-300"
						/>
						{error && <p className="text-sm text-red-500 text-center">{error}</p>}
						<button
							type="submit"
							disabled={busy}
							className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-sky-300 hover:bg-sky-500"
						>
							{busy ? 'Verifying…' : 'Verify'}
						</button>
						<button
							type="button"
							onClick={() => {
								setStep('email');
								setCode('');
								setError(null);
							}}
							className="text-sm text-slate-500 hover:text-slate-700"
						>
							Use a different email
						</button>
					</form>
				)}

				<button
					type="button"
					onClick={onCancel}
					className="mt-3 w-full text-sm text-slate-400 hover:text-slate-600"
				>
					Maybe later
				</button>
			</div>
		</div>
	);
};

export type { AuthModalProps };
export default AuthModal;
