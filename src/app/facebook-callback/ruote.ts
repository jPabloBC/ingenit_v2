export async function GET(req: Request) {
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const error = url.searchParams.get("error");
	const errorDesc = url.searchParams.get("error_description");

	if (error) {
		return new Response(
			`Facebook OAuth error: ${error}${errorDesc ? ` - ${errorDesc}` : ""}`,
			{ status: 400, headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	}

	if (code) {
		return new Response(
			`Facebook OAuth OK\ncode=${code}\nstate=${state ?? ""}`,
			{ status: 200, headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	}

	return new Response("Missing code", {
		status: 400,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}
