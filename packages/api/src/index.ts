import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type HonoEnv, authMiddleware } from './auth';
import { getDb, schema } from './db';
import { locationViewHTML } from './location-view-html';
import authApp from './routes/auth';
import forwardApp from './routes/forward';
import projectsApp from './routes/projects';

const app = new Hono<HonoEnv>();

app.use('*', async (c, next) => {
	const allowed = (c.env.ALLOWED_ORIGINS ?? '')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return cors({
		origin: allowed.length > 0 ? allowed : '*',
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		maxAge: 86400,
	})(c, next);
});

// QR scan → access log → redirect, and the location-setup passcode endpoint.
app.route('/', forwardApp);

// Session login/check.
app.route('/auth', authApp);

// Project + QR code management (requires a Bearer session token).
app.use('/projects/*', authMiddleware);
app.route('/projects', projectsApp);

// Human-readable info page for a QR code.
app.get('/view/:qrId', async (c) => {
	const qrId = c.req.param('qrId');
	const db = getDb(c.env.DB);

	const row = await db
		.select({
			id: schema.qrCodes.id,
			location: schema.qrCodes.location,
			projectName: schema.projects.name,
		})
		.from(schema.qrCodes)
		.leftJoin(
			schema.projects,
			eq(schema.qrCodes.projectId, schema.projects.projectId),
		)
		.where(eq(schema.qrCodes.id, qrId))
		.get();

	if (!row) {
		return c.html(
			'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>QR code not found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>QR code not found</h1></body></html>',
			404,
		);
	}

	const projectName = row.projectName ?? 'Unknown project';
	const location = row.location ?? 'unset';
	const accessTime = new Date().toISOString();

	return c.html(
		locationViewHTML(qrId, projectName, location, accessTime),
		200,
		{
			'Cache-Control': 'no-store',
		},
	);
});

// Re-label a QR code's location. Passcode-gated only — this page is reached
// straight from a QR scan (see /view/:qrId above), so it can't carry a
// staff session token.
app.post('/api/edit-location/:qrId', async (c) => {
	const qrId = c.req.param('qrId');
	const { passcode, location } = await c.req.json<{
		passcode?: string;
		location?: string;
	}>();

	if (!passcode || !location) {
		return c.json({ message: 'passcode and location are required' }, 400);
	}
	if (passcode !== c.env.LOCATION_SETUP_PASSCODE) {
		return c.json({ message: 'Incorrect passcode' }, 401);
	}

	const db = getDb(c.env.DB);
	const result = await db
		.update(schema.qrCodes)
		.set({ location: location.trim() })
		.where(eq(schema.qrCodes.id, qrId));

	if (result.meta.changes === 0) {
		return c.json({ message: 'QR code not found' }, 404);
	}
	return c.json({ message: 'Location updated' }, 200);
});

app.notFound((c) => c.text('404 Not Found', 404));
app.onError((err, c) => {
	console.error('Unhandled error:', err);
	return c.text('Internal Server Error', 500);
});

export default app;
