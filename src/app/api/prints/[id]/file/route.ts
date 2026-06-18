import fs from "node:fs/promises";
import path from "node:path";

const BASE_DIR = process.env.PRINTS_DIR || "/tmp/ingenit_prints";
type PrintMeta = {
	temporaryLink?: string | null;
	filePath?: string;
};

export async function GET(
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
		const metaPath = path.join(BASE_DIR, `${id}.json`);
		const m = await fs.readFile(metaPath, "utf8");
		const meta = JSON.parse(m) as PrintMeta;
		if (meta.temporaryLink) {
			return Response.redirect(meta.temporaryLink, 302);
		}
		const filePath = meta.filePath;
		if (!filePath) {
			return new Response(
				JSON.stringify({ error: "File path not available" }),
				{
					status: 404,
				},
			);
		}
		const data = await fs.readFile(filePath);
		return new Response(data, {
			status: 200,
			headers: { "Content-Type": "application/pdf" },
		});
	} catch (err: unknown) {
		return new Response(
			JSON.stringify({
				error: err instanceof Error ? err.message : String(err),
			}),
			{ status: 404 },
		);
	}
}
