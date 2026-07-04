/**
 * Permission bits, expressed as a bitmask so a single JWT `permissions`
 * claim can grant any combination of them.
 *
 * There is a duplicate copy of these four constants in
 * `packages/web/src/lib/permissions.ts` for the admin UI (a separate
 * package, no shared build step) — keep both in sync if you add bits here.
 */
export const Permissions = {
	TRACKABLE_LINKS_VIEW: 1 << 0, // 1
	TRACKABLE_LINKS_EDIT: 1 << 1, // 2
	TRACKABLE_LINKS_ANALYTICS: 1 << 2, // 4
	TRACKABLE_LINKS_DELETE: 1 << 3, // 8
} as const;

export const ALL_PERMISSIONS = Object.values(Permissions).reduce(
	(acc, bit) => acc | bit,
	0,
);

export function hasPermission(
	userPermissions: number,
	required: number,
): boolean {
	return (userPermissions & required) === required;
}
