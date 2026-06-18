type CreatePrintJobInput = {
	name?: string;
	description?: string;
	metadata?: Record<string, unknown> | null;
};

export type PrintJob = {
	id: string;
	name: string;
	description?: string | null;
	created_at?: string;
	status?: string | null;
	metadata?: Record<string, unknown> | null;
};

async function parseJsonOrThrow(res: Response) {
	const json = await res.json().catch(() => ({}) as Record<string, unknown>);
	if (!res.ok) {
		const errorMessage =
			(json as { error?: string; details?: string }).error ||
			(json as { error?: string; details?: string }).details ||
			`HTTP ${res.status}`;
		throw new Error(errorMessage);
	}
	return json;
}

export async function createPrintJob({
	name,
	description,
	metadata,
}: CreatePrintJobInput = {}) {
	const res = await fetch("/api/admin/print/jobs", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, description, metadata }),
	});
	const json = (await parseJsonOrThrow(res)) as { job: PrintJob };
	return json.job;
}

export async function listPrintJobs() {
	const res = await fetch("/api/admin/print/jobs", { cache: "no-store" });
	const json = (await parseJsonOrThrow(res)) as { jobs: PrintJob[] };
	return json.jobs || [];
}

export async function getPrintJob(id: string) {
	const res = await fetch(
		`/api/admin/print/jobs?id=${encodeURIComponent(id)}`,
		{ cache: "no-store" },
	);
	const json = (await parseJsonOrThrow(res)) as { job: PrintJob };
	return json.job;
}

export async function updatePrintJob(
	id: string,
	updates: Record<string, unknown>,
) {
	const res = await fetch("/api/admin/print/jobs", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, updates }),
	});
	const json = (await parseJsonOrThrow(res)) as { job: PrintJob };
	return json.job;
}

export async function deletePrintJob(id: string) {
	const res = await fetch(
		`/api/admin/print/jobs?id=${encodeURIComponent(id)}`,
		{ method: "DELETE" },
	);
	await parseJsonOrThrow(res);
}
