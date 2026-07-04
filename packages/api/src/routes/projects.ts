import { count, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import * as z from 'zod';
import type { HonoEnv } from '../auth';
import { getDb, schema } from '../db';
import { Permissions, hasPermission } from '../permissions';

const createProjectBodySchema = z.object({
	projectName: z.string().min(1, 'Project name is required'),
	destinationUrl: z.string().url('Enter a valid URL'),
});

const updateProjectBodySchema = z.object({
	projectName: z.string().min(1).optional(),
	destinationUrl: z.string().url().optional(),
});

const createQRCodeBodySchema = z.object({
	projectId: z.string().min(1, 'projectId is required'),
	location: z.string().optional(),
});

const updateQRCodeBodySchema = z.object({
	location: z.string().min(1, 'location is required'),
});

// Pagination params, capped at 100 rows/page.
function parsePagination(query: Record<string, string | undefined>) {
	const page = Math.max(1, Number(query.page ?? '1'));
	const limit = Math.min(Math.max(1, Number(query.limit ?? '10')), 100);
	const offset = (page - 1) * limit;
	return { page, limit, offset };
}

const projectsApp = new Hono<HonoEnv>();

// GET /projects/qrcodes — every QR code across all projects
projectsApp.get('/qrcodes', async (c) => {
	const db = getDb(c.env.DB);
	const qrCodes = await db.select().from(schema.qrCodes).all();
	return c.json(qrCodes);
});

// GET /projects/qrcodes/:id — a single QR code
projectsApp.get('/qrcodes/:id', async (c) => {
	const qrId = c.req.param('id');
	const db = getDb(c.env.DB);
	const qrCode = await db
		.select()
		.from(schema.qrCodes)
		.where(eq(schema.qrCodes.id, qrId))
		.get();
	if (!qrCode) return c.json({ error: 'QR code not found' }, 404);
	return c.json(qrCode);
});

// GET /projects — paginated project list with access counts
projectsApp.get('/', async (c) => {
	const { limit, offset } = parsePagination(c.req.query());
	const db = getDb(c.env.DB);
	const [rows, totalRows, counts] = await Promise.all([
		db.select().from(schema.projects).limit(limit).offset(offset).all(),
		db.select({ total: count() }).from(schema.projects),
		db
			.select({ projectId: schema.accessLogs.projectId, accessCount: count() })
			.from(schema.accessLogs)
			.groupBy(schema.accessLogs.projectId)
			.all(),
	]);
	const countMap = Object.fromEntries(
		counts.map((row) => [row.projectId, row.accessCount]),
	);
	return c.json({
		data: rows.map((p) => ({
			id: p.projectId,
			projectId: p.projectId,
			name: p.name,
			destinationUrl: p.destinationUrl,
			createdAt: p.createdAt,
			adminUserId: p.adminUserId,
			accessCount: countMap[p.projectId] ?? 0,
		})),
		total: totalRows[0]?.total ?? 0,
	});
});

// POST /projects — create a project
projectsApp.post('/', async (c) => {
	const parsed = createProjectBodySchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json(
			{ error: 'Invalid request body', details: parsed.error.flatten() },
			400,
		);
	}
	const { projectName, destinationUrl } = parsed.data;
	const user = c.get('user');
	const projectId = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	const db = getDb(c.env.DB);
	await db.insert(schema.projects).values({
		projectId,
		name: projectName,
		destinationUrl,
		createdAt,
		adminUserId: user?.sub ?? null,
	});

	return c.json(
		{ projectId, name: projectName, destinationUrl, createdAt },
		201,
	);
});

// GET /projects/:id — a single project
projectsApp.get('/:id', async (c) => {
	const projectId = c.req.param('id');
	const db = getDb(c.env.DB);
	const project = await db
		.select()
		.from(schema.projects)
		.where(eq(schema.projects.projectId, projectId))
		.get();
	if (!project) return c.json({ error: 'Project not found' }, 404);
	return c.json({
		id: project.projectId,
		projectId: project.projectId,
		name: project.name,
		destinationUrl: project.destinationUrl,
		createdAt: project.createdAt,
		adminUserId: project.adminUserId,
	});
});

// PUT /projects/:id — update a project
projectsApp.put('/:id', async (c) => {
	const projectId = c.req.param('id');
	const parsed = updateProjectBodySchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json(
			{ error: 'Invalid request body', details: parsed.error.flatten() },
			400,
		);
	}

	const values: Partial<typeof schema.projects.$inferInsert> = {};
	if (parsed.data.projectName) values.name = parsed.data.projectName;
	if (parsed.data.destinationUrl)
		values.destinationUrl = parsed.data.destinationUrl;
	if (Object.keys(values).length === 0) {
		return c.json({ error: 'No fields to update' }, 400);
	}

	const db = getDb(c.env.DB);
	const result = await db
		.update(schema.projects)
		.set(values)
		.where(eq(schema.projects.projectId, projectId));
	if (result.meta.changes === 0)
		return c.json({ error: 'Project not found' }, 404);
	return c.json({ message: 'Project updated' });
});

// DELETE /projects/:id — delete a project (QR codes cascade)
projectsApp.delete('/:id', async (c) => {
	const user = c.get('user');
	if (
		!hasPermission(user?.permissions ?? 0, Permissions.TRACKABLE_LINKS_DELETE)
	) {
		return c.json({ error: 'TRACKABLE_LINKS_DELETE permission required' }, 403);
	}
	const projectId = c.req.param('id');
	const db = getDb(c.env.DB);
	const result = await db
		.delete(schema.projects)
		.where(eq(schema.projects.projectId, projectId));
	if (result.meta.changes === 0)
		return c.json({ error: 'Project not found' }, 404);
	return c.json({ message: 'Project deleted' });
});

// GET /projects/:id/qrcodes — paginated QR codes for a project
projectsApp.get('/:id/qrcodes', async (c) => {
	const projectId = c.req.param('id');
	const { limit, offset } = parsePagination(c.req.query());
	const db = getDb(c.env.DB);
	const [qrCodes, totalRows] = await Promise.all([
		db
			.select()
			.from(schema.qrCodes)
			.where(eq(schema.qrCodes.projectId, projectId))
			.limit(limit)
			.offset(offset)
			.all(),
		db
			.select({ total: count() })
			.from(schema.qrCodes)
			.where(eq(schema.qrCodes.projectId, projectId)),
	]);
	return c.json({ data: qrCodes, total: totalRows[0]?.total ?? 0 });
});

// GET /projects/:id/access-stats — hour × location aggregation, for the analytics chart
projectsApp.get('/:id/access-stats', async (c) => {
	const projectId = c.req.param('id');
	const db = getDb(c.env.DB);
	const stats = await db
		.select({
			hour: sql<number>`CAST(strftime('%H', ${schema.accessLogs.accessedAt}) AS INTEGER)`,
			location: sql<string>`COALESCE(${schema.qrCodes.location}, 'unknown')`,
			count: count(),
		})
		.from(schema.accessLogs)
		.leftJoin(schema.qrCodes, eq(schema.accessLogs.qrId, schema.qrCodes.id))
		.where(eq(schema.accessLogs.projectId, projectId))
		.groupBy(
			sql`strftime('%H', ${schema.accessLogs.accessedAt})`,
			schema.qrCodes.location,
		)
		.all();
	return c.json(stats);
});

// GET /projects/:id/access-logs — paginated, newest-first raw access log
projectsApp.get('/:id/access-logs', async (c) => {
	const projectId = c.req.param('id');
	const { limit, offset } = parsePagination(c.req.query());
	const db = getDb(c.env.DB);
	const [logs, totalRows] = await Promise.all([
		db
			.select({
				qrId: schema.accessLogs.qrId,
				projectId: schema.accessLogs.projectId,
				accessedAt: schema.accessLogs.accessedAt,
				ipAddress: schema.accessLogs.ipAddress,
				location: schema.qrCodes.location,
			})
			.from(schema.accessLogs)
			.leftJoin(schema.qrCodes, eq(schema.accessLogs.qrId, schema.qrCodes.id))
			.where(eq(schema.accessLogs.projectId, projectId))
			.orderBy(desc(schema.accessLogs.accessedAt))
			.limit(limit)
			.offset(offset)
			.all(),
		db
			.select({ total: count() })
			.from(schema.accessLogs)
			.where(eq(schema.accessLogs.projectId, projectId)),
	]);
	return c.json({
		data: logs.map((log) => ({ ...log, location: log.location ?? 'unknown' })),
		total: totalRows[0]?.total ?? 0,
	});
});

// POST /projects/:id/qrcodes — create a QR code for a project
projectsApp.post('/:id/qrcodes', async (c) => {
	const projectId = c.req.param('id');
	const parsed = createQRCodeBodySchema.safeParse({
		...(await c.req.json().catch(() => ({}))),
		projectId,
	});
	if (!parsed.success) {
		return c.json(
			{ error: 'Invalid request body', details: parsed.error.flatten() },
			400,
		);
	}

	const { location = 'unset' } = parsed.data;
	const user = c.get('user');
	const qrId = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	const db = getDb(c.env.DB);
	await db.insert(schema.qrCodes).values({
		id: qrId,
		projectId,
		location,
		createdAt,
		creatorId: user?.sub ?? null,
	});

	return c.json({ id: qrId, projectId, location, createdAt }, 201);
});

// PUT /projects/qrcodes/:id — update a QR code's location
projectsApp.put('/qrcodes/:id', async (c) => {
	const qrId = c.req.param('id');
	const parsed = updateQRCodeBodySchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json(
			{ error: 'Invalid request body', details: parsed.error.flatten() },
			400,
		);
	}

	const db = getDb(c.env.DB);
	const result = await db
		.update(schema.qrCodes)
		.set({ location: parsed.data.location })
		.where(eq(schema.qrCodes.id, qrId));
	if (result.meta.changes === 0)
		return c.json({ error: 'QR code not found' }, 404);
	return c.json({ message: 'QR code updated', qrId });
});

// DELETE /projects/qrcodes/:id — delete a QR code (and its access logs)
// TRACKABLE_LINKS_DELETE can delete any QR code; TRACKABLE_LINKS_EDIT only its own.
projectsApp.delete('/qrcodes/:id', async (c) => {
	const user = c.get('user');
	const userPermissions = user?.permissions ?? 0;
	const canDeleteAny = hasPermission(
		userPermissions,
		Permissions.TRACKABLE_LINKS_DELETE,
	);
	const canEdit = hasPermission(
		userPermissions,
		Permissions.TRACKABLE_LINKS_EDIT,
	);

	if (!canDeleteAny && !canEdit) {
		return c.json(
			{
				error:
					'TRACKABLE_LINKS_EDIT or TRACKABLE_LINKS_DELETE permission required',
			},
			403,
		);
	}

	const qrId = c.req.param('id');
	const db = getDb(c.env.DB);
	const qr = await db
		.select()
		.from(schema.qrCodes)
		.where(eq(schema.qrCodes.id, qrId))
		.get();
	if (!qr) return c.json({ error: 'QR code not found' }, 404);
	if (!canDeleteAny && qr.creatorId !== user?.sub) {
		return c.json({ error: 'You can only delete QR codes you created' }, 403);
	}

	await db.delete(schema.accessLogs).where(eq(schema.accessLogs.qrId, qrId));
	await db.delete(schema.qrCodes).where(eq(schema.qrCodes.id, qrId));
	return c.json({ message: 'QR code deleted', qrId });
});

export default projectsApp;
