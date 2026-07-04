import { Hono } from 'hono';
import * as z from 'zod';
import { type HonoEnv, authMiddleware, signSession } from '../auth';
import { ALL_PERMISSIONS } from '../permissions';

const loginBodySchema = z.object({
	password: z.string().min(1),
});

const authApp = new Hono<HonoEnv>();

// POST /auth/login — exchange the shared admin password for a session token.
//
// This is a minimal single-admin login meant to get you running without any
// external identity provider. If you need per-user accounts, replace this
// route (and `authMiddleware` in ../auth.ts) with your own logic — the rest
// of the API only cares that it ends up with a Bearer token that resolves to
// `{ sub, permissions }`.
authApp.post('/login', async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = loginBodySchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'password is required' }, 400);
	}

	if (parsed.data.password !== c.env.ADMIN_PASSWORD) {
		return c.json({ error: 'Invalid password' }, 401);
	}

	const token = await signSession(
		{ sub: 'admin', permissions: ALL_PERMISSIONS },
		c.env.JWT_SECRET,
	);
	return c.json({ token });
});

// GET /auth/me — resolve the current session, for the admin UI to check on load.
authApp.get('/me', authMiddleware, async (c) => {
	return c.json(c.get('user'));
});

export default authApp;
