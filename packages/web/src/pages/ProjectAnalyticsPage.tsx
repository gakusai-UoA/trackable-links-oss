import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { apiFetch } from '../lib/api';

interface AccessStat {
	hour: number;
	location: string;
	count: number;
}

interface AccessLog {
	qrId: string;
	accessedAt: string;
	ipAddress: string | null;
	location: string;
}

const COLORS = [
	'#3b82f6',
	'#10b981',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#06b6d4',
	'#f97316',
];
const PAGE_SIZE = 15;

export function ProjectAnalyticsPage() {
	const { id: projectId } = useParams<{ id: string }>();
	const [projectName, setProjectName] = useState('');
	const [stats, setStats] = useState<AccessStat[]>([]);
	const [logs, setLogs] = useState<AccessLog[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!projectId) return;
		setLoading(true);
		Promise.all([
			apiFetch<{ name: string }>(`/projects/${projectId}`),
			apiFetch<AccessStat[]>(`/projects/${projectId}/access-stats`),
			apiFetch<{ data: AccessLog[]; total: number }>(
				`/projects/${projectId}/access-logs?page=${page}&limit=${PAGE_SIZE}`,
			),
		]).then(([project, statsRes, logsRes]) => {
			setProjectName(project.name);
			setStats(statsRes);
			setLogs(logsRes.data);
			setTotal(logsRes.total);
			setLoading(false);
		});
	}, [projectId, page]);

	const locations = useMemo(
		() => Array.from(new Set(stats.map((s) => s.location))),
		[stats],
	);

	const hourlyData = useMemo(() => {
		const byHour = new Map<number, Record<string, number>>();
		for (let h = 0; h < 24; h++) byHour.set(h, {});
		for (const stat of stats) {
			byHour.get(stat.hour)![stat.location] = stat.count;
		}
		return Array.from(byHour.entries()).map(([hour, counts]) => ({
			hour: `${hour}:00`,
			...counts,
		}));
	}, [stats]);

	const locationTotals = useMemo(() => {
		const totals = new Map<string, number>();
		for (const stat of stats) {
			totals.set(stat.location, (totals.get(stat.location) ?? 0) + stat.count);
		}
		return Array.from(totals.entries())
			.map(([location, count]) => ({ location, count }))
			.sort((a, b) => b.count - a.count);
	}, [stats]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className="p-8">
			<Link
				to="/"
				className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
			>
				<ArrowLeft className="h-4 w-4" />
				Projects
			</Link>
			<h1 className="mb-6 text-xl font-semibold text-slate-900">
				{projectName || 'Analytics'}
			</h1>

			{loading ? (
				<p className="text-slate-500">Loading…</p>
			) : (
				<>
					<div className="mb-6 grid gap-6 lg:grid-cols-2">
						<div className="rounded-lg border border-slate-200 bg-white p-4">
							<h2 className="mb-4 text-sm font-semibold text-slate-700">
								Scans by hour of day
							</h2>
							<ResponsiveContainer width="100%" height={280}>
								<BarChart data={hourlyData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
									<XAxis dataKey="hour" fontSize={12} />
									<YAxis allowDecimals={false} fontSize={12} />
									<Tooltip />
									<Legend />
									{locations.map((location, i) => (
										<Bar
											key={location}
											dataKey={location}
											stackId="location"
											fill={COLORS[i % COLORS.length]}
										/>
									))}
								</BarChart>
							</ResponsiveContainer>
						</div>

						<div className="rounded-lg border border-slate-200 bg-white p-4">
							<h2 className="mb-4 text-sm font-semibold text-slate-700">
								Scans by location
							</h2>
							<ResponsiveContainer width="100%" height={280}>
								<BarChart data={locationTotals} layout="vertical">
									<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
									<XAxis type="number" allowDecimals={false} fontSize={12} />
									<YAxis
										type="category"
										dataKey="location"
										width={100}
										fontSize={12}
									/>
									<Tooltip />
									<Bar dataKey="count">
										{locationTotals.map((_, i) => (
											<Cell key={i} fill={COLORS[i % COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
								<tr>
									<th className="px-4 py-3 font-medium">Time</th>
									<th className="px-4 py-3 font-medium">Location</th>
									<th className="px-4 py-3 font-medium">QR ID</th>
									<th className="px-4 py-3 font-medium">IP</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{logs.map((log, i) => (
									<tr key={i}>
										<td className="px-4 py-3 text-slate-700">
											{new Date(log.accessedAt).toLocaleString()}
										</td>
										<td className="px-4 py-3 text-slate-900">{log.location}</td>
										<td className="px-4 py-3 font-mono text-xs text-slate-500">
											{log.qrId}
										</td>
										<td className="px-4 py-3 text-slate-500">
											{log.ipAddress ?? '—'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

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
				</>
			)}
		</div>
	);
}
