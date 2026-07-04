import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { apiFetch, clearToken, getToken, setToken } from '../lib/api';

interface AuthUser {
	sub: string;
	permissions: number;
}

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	login: (password: string) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!getToken()) {
			setLoading(false);
			return;
		}
		apiFetch<AuthUser>('/auth/me')
			.then(setUser)
			.catch(() => setUser(null))
			.finally(() => setLoading(false));
	}, []);

	const login = useCallback(async (password: string) => {
		const { token } = await apiFetch<{ token: string }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ password }),
		});
		setToken(token);
		const me = await apiFetch<AuthUser>('/auth/me');
		setUser(me);
	}, []);

	const logout = useCallback(() => {
		clearToken();
		setUser(null);
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
	return ctx;
}

export type { AuthUser };
