import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthModal } from '@/hooks/useAuthModal';

function UserIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<circle cx="12" cy="8" r="4" stroke="#0284c7" strokeWidth="1.5" />
			<path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
		</svg>
	);
}

const AccountStatus = () => {
	const { token, email, requireAuth, logout, switchAccount } = useAuthModal();
	const [menuOpen, setMenuOpen] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

	const handleClick = () => {
		if (token) {
			if (!menuOpen && buttonRef.current) {
				const rect = buttonRef.current.getBoundingClientRect();
				setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
			}
			setMenuOpen((open) => !open);
			return;
		}
		requireAuth().catch(() => {
			// user declined sign-in; nothing to do
		});
	};

	return (
		<div className="relative">
			<button
				ref={buttonRef}
				type="button"
				onClick={handleClick}
				title={email ?? 'Sign in'}
				className="relative flex h-9 w-9 items-center justify-center rounded-full border border-sky-100 bg-sky-50 transition-colors hover:bg-sky-100"
			>
				<UserIcon />
				<span
					className={
						'absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ' +
						(token ? 'bg-emerald-500' : 'bg-slate-300')
					}
				/>
			</button>

			{menuOpen && token && menuPos &&
				createPortal(
					<>
						<div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[1490]" />
						<div
							style={{ top: menuPos.top, right: menuPos.right }}
							className="fixed z-[1500] w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
						>
							<p className="text-xs text-slate-400">Signed in as</p>
							<p className="mb-3 break-all text-sm font-medium text-slate-900">{email}</p>
							<button
								type="button"
								onClick={() => {
									setMenuOpen(false);
									switchAccount().catch(() => {});
								}}
								className="mb-1.5 w-full rounded-md bg-sky-50 px-3 py-2 text-left text-sm text-sky-700 hover:bg-sky-100"
							>
								Switch account
							</button>
							<button
								type="button"
								onClick={() => {
									setMenuOpen(false);
									logout();
								}}
								className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
							>
								Sign out
							</button>
						</div>
					</>,
					document.body,
				)}
		</div>
	);
};

export default AccountStatus;
