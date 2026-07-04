import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiFetch } from '../lib/api';

export function CreateProjectPage() {
	const navigate = useNavigate();
	const [projectName, setProjectName] = useState('');
	const [destinationUrl, setDestinationUrl] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await apiFetch('/projects', {
				method: 'POST',
				body: JSON.stringify({ projectName, destinationUrl }),
			});
			navigate('/');
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : 'Failed to create project',
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="mx-auto max-w-lg p-8">
			<h1 className="mb-6 text-xl font-semibold text-slate-900">New project</h1>
			<form
				onSubmit={handleSubmit}
				className="rounded-lg border border-slate-200 bg-white p-6"
			>
				<label
					htmlFor="projectName"
					className="mb-1 block text-sm font-medium text-slate-700"
				>
					Project name
				</label>
				<input
					id="projectName"
					required
					value={projectName}
					onChange={(e) => setProjectName(e.target.value)}
					className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					placeholder="e.g. Flyer campaign"
				/>

				<label
					htmlFor="destinationUrl"
					className="mb-1 block text-sm font-medium text-slate-700"
				>
					Destination URL
				</label>
				<input
					id="destinationUrl"
					type="url"
					required
					value={destinationUrl}
					onChange={(e) => setDestinationUrl(e.target.value)}
					className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					placeholder="https://example.com/landing-page"
				/>
				<p className="mb-4 text-xs text-slate-500">
					Every QR code you create under this project will redirect here once
					its location is set.
				</p>

				{error && <p className="mb-4 text-sm text-red-600">{error}</p>}

				<button
					type="submit"
					disabled={submitting}
					className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{submitting ? 'Creating…' : 'Create project'}
				</button>
			</form>
		</div>
	);
}
