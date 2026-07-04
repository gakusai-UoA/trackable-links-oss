import type { ReactNode } from 'react';
import { hasPermission } from '../lib/permissions';
import { useAuth } from './AuthProvider';

export function PermissionGuard({
	required,
	children,
	fallback,
}: {
	required: number;
	children: ReactNode;
	fallback?: ReactNode;
}) {
	const { user } = useAuth();

	if (!user || !hasPermission(user.permissions, required)) {
		return (
			fallback ?? (
				<div className="flex h-full items-center justify-center p-12 text-slate-500">
					You don't have permission to view this page.
				</div>
			)
		);
	}

	return <>{children}</>;
}
