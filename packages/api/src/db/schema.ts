import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('Projects', {
	projectId: text('project_id').primaryKey(),
	name: text('name').notNull(),
	destinationUrl: text('destination_url').notNull(),
	createdAt: text('created_at').notNull(),
	adminUserId: text('admin_user_id'),
});

export const qrCodes = sqliteTable('QRCodes', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.projectId, { onDelete: 'cascade' }),
	location: text('location').notNull().default('unset'),
	createdAt: text('created_at').notNull(),
	creatorId: text('creator_id'),
});

export const accessLogs = sqliteTable('AccessLogs', {
	qrId: text('qr_id').notNull(),
	projectId: text('project_id').notNull(),
	accessedAt: text('accessed_at').notNull(),
	userAgent: text('user_agent'),
	ipAddress: text('ip_address'),
});
