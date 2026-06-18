import fs from "node:fs/promises";
import path from "node:path";

const BASE_DIR = process.env.PRINTS_DIR || "/tmp/ingenit_prints";
type PrintMeta = {
	status?: string;
	lastMessage?: string;
	updatedAt?: string;
};
type StatusBody = {
	status?: string;
	message?: string;
};

export async function POST(
	req: Request,
	{ params }: { params: { id: string } },
) {
	try {
		const agentKeyHeader = req.headers.get("x-agent-key");
		const configuredAgentKey = process.env.AGENT_KEY;
		if (configuredAgentKey && agentKeyHeader !== configuredAgentKey) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			});
		}
		const id = params.id;
		const body = (await req.json()) as StatusBody;
		const metaPath = path.join(BASE_DIR, `${id}.json`);
		const m = await fs.readFile(metaPath, "utf8");
		const meta = JSON.parse(m) as PrintMeta;
		meta.status = body.status || meta.status;
		if (body.message) meta.lastMessage = body.message;
		meta.updatedAt = new Date().toISOString();
		await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	} catch (err: unknown) {
		return new Response(
			JSON.stringify({
				error: err instanceof Error ? err.message : String(err),
			}),
			{ status: 500 },
		);
	}
}
