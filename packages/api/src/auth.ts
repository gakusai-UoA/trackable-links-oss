import type { MiddlewareHandler } from 'hono';
import { SignJWT, jwtVerify } from 'jose';

export interface Bindings {
	DB: D1Database;
	/** Secret used to sign/verify admin session tokens. Set with `wrangler secret put JWT_SECRET`. */
	JWT_SECRET: string;
	/** Password required to log in to the admin UI/API. Set with `wrangler secret put ADMIN_PASSWORD`. */
	ADMIN_PASSWORD: string;
	/** Passcode required to label a freshly-printed QR code's location. */
	LOCATION_SETUP_PASSCODE: string;
	/** Comma-separated list of origins allowed to call this API from a browser. */
	ALLOWED_ORIGINS?: string;
}

export interface AuthUser {
	sub: string;
	permissions: number;
}

export interface Variables {
	user?: AuthUser;
}

export interface HonoEnv {
	Bindings: Bindings;
	Variables: Variables;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function signSession(
	user: AuthUser,
	secret: string,
): Promise<string> {
	return new SignJWT({ permissions: user.permissions })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(user.sub)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_TTL_SECONDS}s`)
		.sign(new TextEncoder().encode(secret));
}

/**
 * Verifies a self-issued session token (see `signSession`/`POST /auth/login`).
 *
 * This is the *default* auth strategy — swap it out in `authMiddleware` below
 * if you want to delegate to an external identity provider (Auth0, Clerk,
 * your own SSO, ...) instead of the built-in single-admin-password login.
 */
export async function verifyLocalSession(
	token: string,
	secret: string,
): Promise<AuthUser | null> {
	try {
		const { payload } = await jwtVerify(
			token,
			new TextEncoder().encode(secret),
		);
		if (
			typeof payload.sub !== 'string' ||
			typeof payload.permissions !== 'number'
		) {
			return null;
		}
		return { sub: payload.sub, permissions: payload.permissions };
	} catch {
		return null;
	}
}

function extractBearerToken(
	authHeader: string | undefined | null,
): string | null {
	if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
	const token = authHeader.slice(7);
	return token.length > 0 ? token : null;
}

/**
 * Verifies the caller and attaches `user` to the request context.
 *
 * To plug in a different identity provider, replace the call to
 * `verifyLocalSession` below with your own token-verification logic — it
 * just needs to resolve to `{ sub, permissions } | null`.
 */
export const authMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
	const token = extractBearerToken(c.req.header('Authorization'));
	if (!token) {
		return c.json({ error: 'Authorization header required' }, 401);
	}

	const user = await verifyLocalSession(token, c.env.JWT_SECRET);
	if (!user) {
		return c.json({ error: 'Invalid or expired token' }, 401);
	}

	c.set('user', user);
	await next();
};
