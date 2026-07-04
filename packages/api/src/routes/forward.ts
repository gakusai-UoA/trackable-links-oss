import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getConnInfo } from 'hono/cloudflare-workers';
import { html } from 'hono/html';
import * as z from 'zod';
import type { HonoEnv } from '../auth';
import { getDb, schema } from '../db';
import { locationSetupHTML } from '../location-setup-html';

const setLocationBodySchema = z.object({
	qrId: z.string().min(1),
	passcode: z.string().min(1),
	location: z.string().min(1),
});

const forwardApp = new Hono<HonoEnv>();

// GET /?id=<qrId> — scan a QR code: look it up, log the access, redirect.
forwardApp.get('/', async (c) => {
	const { id } = c.req.query();
	const userAgent = c.req.header('User-Agent') || 'unknown';

	if (!id) return c.text('Not found', 404);

	const db = getDb(c.env.DB);
	const qrCode = await db
		.select()
		.from(schema.qrCodes)
		.where(eq(schema.qrCodes.id, id))
		.get();

	const isLinkPreviewBot =
		userAgent.includes('facebook') || userAgent.includes('Discordbot');

	if (!qrCode) {
		if (isLinkPreviewBot) {
			return c.html(
				html`<!DOCTYPE html>
					<html lang="en">
						<head prefix="og: http://ogp.me/ns#">
							<meta name="viewport" content="width=device-width, initial-scale=1.0" />
							<meta property="og:title" content="This QR code could not be found." />
							<meta
								property="og:description"
								content="Check that the QR code is valid, or issue a new one."
							/>
						</head>
					</html>`,
				200,
				{ 'Cache-Control': 'no-store' },
			);
		}
		return c.text('QR code not found', 404);
	}

	const project = await db
		.select()
		.from(schema.projects)
		.where(eq(schema.projects.projectId, qrCode.projectId))
		.get();
	if (!project) return c.text('Project not found', 404);

	// No location set yet — show the setup form instead of redirecting.
	const location = qrCode.location?.trim();
	if (!location || location === 'unset') {
		return c.html(locationSetupHTML(id, project.name), 200, {
			'Cache-Control': 'no-store',
		});
	}

	if (isLinkPreviewBot) {
		const accessedAt = new Date().toISOString();
		return c.html(
			html`<!DOCTYPE html>
				<html lang="en">
					<head prefix="og: http://ogp.me/ns#">
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<meta property="og:title" content="${project.name} QR code" />
						<meta property="og:description" content="${accessedAt} · location: ${location}" />
					</head>
				</html>`,
			200,
			{ 'Cache-Control': 'no-store' },
		);
	}

	const { remote } = getConnInfo(c);

	try {
		await db.insert(schema.accessLogs).values({
			qrId: id,
			projectId: qrCode.projectId,
			accessedAt: new Date().toISOString(),
			userAgent,
			ipAddress: remote.address ?? null,
		});
	} catch (error) {
		console.error('[GET /] failed to insert access log:', error);
		// Don't block the redirect just because logging failed.
	}

	return c.redirect(project.destinationUrl, 301);
});

// POST /api/set-location — label a freshly-installed QR code (passcode-gated, no login required).
forwardApp.post('/api/set-location', async (c) => {
	const parsed = setLocationBodySchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json({ message: 'qrId, passcode and location are required' }, 400);
	}
	const { qrId, passcode, location } = parsed.data;

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
	return c.json({ message: 'Location saved' }, 200);
});

export default forwardApp;
