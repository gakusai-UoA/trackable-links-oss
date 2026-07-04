import { LinkIcon, LogOut, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Permissions, hasPermission } from '../lib/permissions';
import { useAuth } from './AuthProvider';

export function AppLayout({ children }: { children: ReactNode }) {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const permissions = user?.permissions ?? 0;

	return (
		<div className="flex h-screen bg-slate-50">
			<aside className="flex w-56 flex-col border-r border-slate-200 bg-white p-4">
				<div className="mb-6 flex items-center gap-2 px-2 font-semibold text-slate-900">
					<LinkIcon className="h-5 w-5 text-blue-600" />
					Trackable Links
				</div>
				<nav className="flex flex-1 flex-col gap-1">
					<Link
						to="/"
						className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
					>
						Projects
					</Link>
					{hasPermission(permissions, Permissions.TRACKABLE_LINKS_EDIT) && (
						<Link
							to="/create"
							className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
						>
							<Plus className="h-4 w-4" />
							New project
						</Link>
					)}
				</nav>
				<button
					type="button"
					onClick={() => {
						logout();
						navigate('/login');
					}}
					className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
				>
					<LogOut className="h-4 w-4" />
					Log out
				</button>
			</aside>
			<main className="flex-1 overflow-y-auto">{children}</main>
		</div>
	);
}
