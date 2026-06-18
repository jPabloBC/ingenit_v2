export type RTStorageFile = {
	id: string;
	dropbox_path: string;
	file_name: string;
	file_type: string;
	created_at?: string;
	metadata?: Record<string, unknown> | null;
};

async function parseJsonOrThrow(res: Response) {
	const json = await res.json().catch(() => ({}) as Record<string, unknown>);
	if (!res.ok) {
		const message =
			(json as { error?: string; details?: string }).error ||
			(json as { error?: string; details?: string }).details ||
			`HTTP ${res.status}`;
		throw new Error(message);
	}
	return json;
}

export async function saveFileRecord({
	dropbox_path,
	file_name,
	file_type,
	metadata,
}: {
	dropbox_path: string;
	file_name: string;
	file_type: string;
	metadata?: Record<string, unknown> | null;
}) {
	const res = await fetch("/api/admin/print/storage", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			dropbox_path,
			file_name,
			file_type,
			metadata: metadata ?? null,
		}),
	});
	const json = (await parseJsonOrThrow(res)) as { file: RTStorageFile };
	return json.file;
}

export async function listFilesByPrintJob(print_job_id: string) {
	const res = await fetch(
		`/api/admin/print/storage?printJobId=${encodeURIComponent(print_job_id)}`,
		{
			cache: "no-store",
		},
	);
	const json = (await parseJsonOrThrow(res)) as { files: RTStorageFile[] };
	return json.files || [];
}

export async function deleteFileRecord(id: string) {
	const res = await fetch(
		`/api/admin/print/storage?id=${encodeURIComponent(id)}`,
		{ method: "DELETE" },
	);
	await parseJsonOrThrow(res);
}
