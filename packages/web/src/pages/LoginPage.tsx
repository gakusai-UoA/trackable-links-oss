import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { ApiError } from '../lib/api';

export function LoginPage() {
	const { user, login } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (user) return <Navigate to="/" replace />;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await login(password);
			navigate('/');
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Login failed');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex h-screen items-center justify-center bg-slate-50">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
			>
				<h1 className="mb-1 text-lg font-semibold text-slate-900">
					Trackable Links
				</h1>
				<p className="mb-6 text-sm text-slate-500">
					Sign in with the admin password.
				</p>

				<label
					htmlFor="password"
					className="mb-1 block text-sm font-medium text-slate-700"
				>
					Password
				</label>
				<input
					id="password"
					type="password"
					required
					autoFocus
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
				/>

				{error && <p className="mb-4 text-sm text-red-600">{error}</p>}

				<button
					type="submit"
					disabled={submitting}
					className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>
			</form>
		</div>
	);
}
