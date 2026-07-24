import { useCallback, useRef, useState, type ReactNode } from 'react';
import AuthModal from '@/components/auth/AuthModal';
import { getAuthToken, clearAuthToken } from '@/utils/authToken';
import { decodeJwtEmail } from '@/utils/decodeJwtEmail';
import { AuthModalContext } from './AuthModalContextBase';

export function AuthModalProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [token, setToken] = useState<string | null>(() => getAuthToken());
	const resolverRef = useRef<{ resolve: (token: string) => void; reject: (err: Error) => void } | null>(null);

	const requireAuth = useCallback((): Promise<string> => {
		const existing = getAuthToken();
		if (existing) return Promise.resolve(existing);

		return new Promise<string>((resolve, reject) => {
			resolverRef.current = { resolve, reject };
			setIsOpen(true);
		});
	}, []);

	const handleSuccess = useCallback((newToken: string) => {
		setIsOpen(false);
		setToken(newToken);
		resolverRef.current?.resolve(newToken);
		resolverRef.current = null;
	}, []);

	const handleCancel = useCallback(() => {
		setIsOpen(false);
		resolverRef.current?.reject(new Error('Sign-in cancelled'));
		resolverRef.current = null;
	}, []);

	const logout = useCallback(() => {
		clearAuthToken();
		setToken(null);
	}, []);

	const switchAccount = useCallback((): Promise<string> => {
		clearAuthToken();
		setToken(null);
		return new Promise<string>((resolve, reject) => {
			resolverRef.current = { resolve, reject };
			setIsOpen(true);
		});
	}, []);

	const email = token ? decodeJwtEmail(token) : null;

	return (
		<AuthModalContext.Provider value={{ token, email, requireAuth, logout, switchAccount }}>
			{children}
			<AuthModal open={isOpen} onSuccess={handleSuccess} onCancel={handleCancel} />
		</AuthModalContext.Provider>
	);
}
