import { API_URL } from '../config';

const TOKEN_KEY = 'trackable-links.token';

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
	localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

export async function apiFetch<T>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const token = getToken();
	const headers = new Headers(init.headers);
	headers.set('Content-Type', 'application/json');
	if (token) headers.set('Authorization', `Bearer ${token}`);

	const response = await fetch(`${API_URL}${path}`, { ...init, headers });

	if (response.status === 401) {
		clearToken();
	}

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new ApiError(
			response.status,
			body.error || body.message || `Request failed (${response.status})`,
		);
	}

	if (response.status === 204) return undefined as T;
	return response.json();
}
