import { ArrowLeft, Download, Plus, QrCode, Trash2, X } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { API_URL } from '../config';
import { apiFetch } from '../lib/api';
import { Permissions, hasPermission } from '../lib/permissions';

interface QRCodeRow {
	id: string;
	projectId: string;
	location: string;
	createdAt: string;
	creatorId: string | null;
}

const PAGE_SIZE = 10;

export function QRCodesPage() {
	const { id: projectId } = useParams<{ id: string }>();
	const { user } = useAuth();
	const permissions = user?.permissions ?? 0;
	const canDeleteAny = hasPermission(
		permissions,
		Permissions.TRACKABLE_LINKS_DELETE,
	);
	const canEdit = hasPermission(permissions, Permissions.TRACKABLE_LINKS_EDIT);

	const [projectName, setProjectName] = useState('');
	const [qrCodes, setQrCodes] = useState<QRCodeRow[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [newLocation, setNewLocation] = useState('');
	const [dialogQr, setDialogQr] = useState<QRCodeRow | null>(null);

	async function load() {
		if (!projectId) return;
		setLoading(true);
		const [project, res] = await Promise.all([
			apiFetch<{ name: string }>(`/projects/${projectId}`),
			apiFetch<{ data: QRCodeRow[]; total: number }>(
				`/projects/${projectId}/qrcodes?page=${page}&limit=${PAGE_SIZE}`,
			),
		]);
		setProjectName(project.name);
		setQrCodes(res.data);
		setTotal(res.total);
		setLoading(false);
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId, page]);

	async function handleCreate() {
		if (!projectId) return;
		await apiFetch(`/projects/${projectId}/qrcodes`, {
			method: 'POST',
			body: JSON.stringify({ location: newLocation || undefined }),
		});
		setNewLocation('');
		load();
	}

	async function handleDelete(qr: QRCodeRow) {
		if (!confirm('Delete this QR code and its access history?')) return;
		await apiFetch(`/projects/qrcodes/${qr.id}`, { method: 'DELETE' });
		load();
	}

	function canDelete(qr: QRCodeRow) {
		return canDeleteAny || (canEdit && qr.creatorId === user?.sub);
	}

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
				{projectName || 'QR codes'}
			</h1>

			{canEdit && (
				<div className="mb-6 flex items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
					<div className="flex-1">
						<label
							htmlFor="newLocation"
							className="mb-1 block text-sm font-medium text-slate-700"
						>
							Location (optional — can be set later by scanning the printed
							code)
						</label>
						<input
							id="newLocation"
							value={newLocation}
							onChange={(e) => setNewLocation(e.target.value)}
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
							placeholder="e.g. Entrance A"
						/>
					</div>
					<button
						type="button"
						onClick={handleCreate}
						className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
					>
						<Plus className="h-4 w-4" />
						New QR code
					</button>
				</div>
			)}

			{loading ? (
				<p className="text-slate-500">Loading…</p>
			) : qrCodes.length === 0 ? (
				<p className="text-slate-500">No QR codes yet.</p>
			) : (
				<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
							<tr>
								<th className="px-4 py-3 font-medium">QR ID</th>
								<th className="px-4 py-3 font-medium">Location</th>
								<th className="px-4 py-3 font-medium">Created</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{qrCodes.map((qr) => (
								<tr key={qr.id}>
									<td className="px-4 py-3 font-mono text-xs text-slate-500">
										{qr.id}
									</td>
									<td className="px-4 py-3 text-slate-900">
										{qr.location === 'unset' ? (
											<span className="italic text-amber-600">not set</span>
										) : (
											qr.location
										)}
									</td>
									<td className="px-4 py-3 text-slate-500">
										{new Date(qr.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-3">
											<button
												type="button"
												onClick={() => setDialogQr(qr)}
												className="text-slate-500 hover:text-slate-900"
												title="Show QR code"
											>
												<QrCode className="h-4 w-4" />
											</button>
											{canDelete(qr) && (
												<button
													type="button"
													onClick={() => handleDelete(qr)}
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

			{dialogQr && <QRDialog qr={dialogQr} onClose={() => setDialogQr(null)} />}
		</div>
	);
}

function QRDialog({ qr, onClose }: { qr: QRCodeRow; onClose: () => void }) {
	const [dataUrl, setDataUrl] = useState<string | null>(null);
	const link = `${API_URL}/?id=${qr.id}`;

	useEffect(() => {
		QRCodeLib.toDataURL(link, { width: 320, margin: 2 }).then(setDataUrl);
	}, [link]);

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-slate-900">QR code</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-slate-700"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{dataUrl && (
					<img
						src={dataUrl}
						alt={`QR code for ${qr.id}`}
						className="mx-auto mb-4 h-64 w-64"
					/>
				)}

				<p className="mb-4 break-all text-center text-xs text-slate-500">
					{link}
				</p>

				{dataUrl && (
					<a
						href={dataUrl}
						download={`qr-${qr.id}.png`}
						className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
					>
						<Download className="h-4 w-4" />
						Download PNG
					</a>
				)}
			</div>
		</div>
	);
}
