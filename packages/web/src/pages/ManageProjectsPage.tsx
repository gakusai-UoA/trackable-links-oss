import { BarChart3, QrCode, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { apiFetch } from '../lib/api';
import { Permissions, hasPermission } from '../lib/permissions';

interface Project {
	id: string;
	name: string;
	destinationUrl: string;
	createdAt: string;
	accessCount: number;
}

const PAGE_SIZE = 10;

export function ManageProjectsPage() {
	const { user } = useAuth();
	const permissions = user?.permissions ?? 0;
	const [projects, setProjects] = useState<Project[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);

	async function load() {
		setLoading(true);
		const res = await apiFetch<{ data: Project[]; total: number }>(
			`/projects?page=${page}&limit=${PAGE_SIZE}`,
		);
		setProjects(res.data);
		setTotal(res.total);
		setLoading(false);
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	async function handleDelete(id: string) {
		if (!confirm('Delete this project and all of its QR codes?')) return;
		await apiFetch(`/projects/${id}`, { method: 'DELETE' });
		load();
	}

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className="p-8">
			<h1 className="mb-6 text-xl font-semibold text-slate-900">Projects</h1>

			{loading ? (
				<p className="text-slate-500">Loading…</p>
			) : projects.length === 0 ? (
				<p className="text-slate-500">No projects yet.</p>
			) : (
				<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
							<tr>
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Destination URL</th>
								<th className="px-4 py-3 font-medium">Scans</th>
								<th className="px-4 py-3 font-medium">Created</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{projects.map((project) => (
								<tr key={project.id}>
									<td className="px-4 py-3 font-medium text-slate-900">
										{project.name}
									</td>
									<td className="max-w-xs truncate px-4 py-3 text-blue-600">
										<a
											href={project.destinationUrl}
											target="_blank"
											rel="noreferrer"
										>
											{project.destinationUrl}
										</a>
									</td>
									<td className="px-4 py-3 text-slate-700">
										{project.accessCount}
									</td>
									<td className="px-4 py-3 text-slate-500">
										{new Date(project.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-3">
											<Link
												to={`/projects/${project.id}/qrcodes`}
												className="text-slate-500 hover:text-slate-900"
												title="QR codes"
											>
												<QrCode className="h-4 w-4" />
											</Link>
											{hasPermission(
												permissions,
												Permissions.TRACKABLE_LINKS_ANALYTICS,
											) && (
												<Link
													to={`/projects/${project.id}/analytics`}
													className="text-slate-500 hover:text-slate-900"
													title="Analytics"
												>
													<BarChart3 className="h-4 w-4" />
												</Link>
											)}
											{hasPermission(
												permissions,
												Permissions.TRACKABLE_LINKS_DELETE,
											) && (
												<button
													type="button"
													onClick={() => handleDelete(project.id)}
													className="text-slate-500 hover:text-red-600"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{totalPages > 1 && (
				<div className="mt-4 flex items-center gap-2 text-sm">
					<button
						type="button"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
						className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
					>
						Prev
					</button>
					<span className="text-slate-500">
						Page {page} of {totalPages}
					</span>
					<button
						type="button"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
						className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}
