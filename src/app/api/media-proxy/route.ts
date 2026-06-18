import { type NextRequest, NextResponse } from "next/server";

async function fetchUpstreamWithFallbacks(
	rawUrl: string,
	accessToken: string,
	opts?: { preferQueryTokenFirst?: boolean },
): Promise<Response> {
	const baseHeaders: Record<string, string> = {
		Accept: "*/*",
		"User-Agent": "ingenit-media-proxy/1.0",
	};

	const tryFetch = async (
		url: string,
		headers: Record<string, string>,
	): Promise<Response> =>
		fetch(url, {
			headers,
			redirect: "follow",
		});

	const attempts: Array<() => Promise<Response>> = [];
	const withQueryToken = () => {
		const u = new URL(rawUrl);
		if (!u.searchParams.get("access_token") && accessToken) {
			u.searchParams.set("access_token", accessToken);
		}
		return u.toString();
	};

	if (opts?.preferQueryTokenFirst && accessToken) {
		attempts.push(() => tryFetch(withQueryToken(), baseHeaders));
	}

	// 1) URL as-is (importante para lookaside firmado)
	attempts.push(() => tryFetch(rawUrl, baseHeaders));

	// 2) con Authorization Bearer
	if (accessToken) {
		attempts.push(() =>
			tryFetch(rawUrl, {
				...baseHeaders,
				Authorization: `Bearer ${accessToken}`,
			}),
		);
	}

	// 3) con access_token query
	if (accessToken && !opts?.preferQueryTokenFirst) {
		attempts.push(() => tryFetch(withQueryToken(), baseHeaders));
	}

	let last: Response | null = null;
	for (const attempt of attempts) {
		last = await attempt();
		if (last.ok) return last;
	}

	return (
		last ??
		NextResponse.json(
			{ error: "no upstream attempts executed" },
			{ status: 502 },
		)
	);
}

export async function GET(req: NextRequest) {
	try {
		const url = req.nextUrl.searchParams.get("u");
		if (!url)
			return NextResponse.json({ error: "missing url" }, { status: 400 });

		const parsed = new URL(url);
		// Only allow proxying known hosts for safety
		const allowedHosts = ["lookaside.fbsbx.com", "graph.facebook.com"];
		if (!allowedHosts.includes(parsed.hostname)) {
			return NextResponse.json({ error: "host not allowed" }, { status: 403 });
		}

		const accessToken =
			process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
		const isGraph = parsed.hostname.includes("graph.facebook.com");
		const res = await fetchUpstreamWithFallbacks(url, accessToken, {
			// Graph media-id suele requerir token; priorizamos query en ese caso.
			preferQueryTokenFirst: isGraph,
		});
		if (!res.ok)
			return NextResponse.json(
				{
					error: "upstream error",
					status: res.status,
					ct: res.headers.get("content-type"),
				},
				{ status: 502 },
			);

		const ct = res.headers.get("content-type") || "";

		// Graph media-id endpoints often return JSON metadata with a signed `url`.
		// Resolve that URL and return the real binary so chat previews can render.
		if (isGraph && ct.includes("application/json")) {
			const metadata = (await res.json().catch(() => null)) as {
				url?: string;
			} | null;
			const signedUrl = typeof metadata?.url === "string" ? metadata.url : "";
			if (signedUrl) {
				const signedRes = await fetchUpstreamWithFallbacks(
					signedUrl,
					accessToken,
					{
						// URL firmada de lookaside: no alterar primero.
						preferQueryTokenFirst: false,
					},
				);
				if (!signedRes.ok) {
					return NextResponse.json(
						{
							error: "signed-url upstream error",
							status: signedRes.status,
							ct: signedRes.headers.get("content-type"),
						},
						{ status: 502 },
					);
				}
				const resolvedHeaders: Record<string, string> = {};
				const resolvedCt = signedRes.headers.get("content-type");
				if (resolvedCt) resolvedHeaders["Content-Type"] = resolvedCt;
				resolvedHeaders["Cache-Control"] =
					"public, max-age=3600, stale-while-revalidate=86400";
				const resolvedBody = await signedRes.arrayBuffer();
				return new NextResponse(Buffer.from(resolvedBody), {
					headers: resolvedHeaders,
				});
			}
			return NextResponse.json(
				{
					error: "graph metadata without signed url",
					ct,
				},
				{ status: 502 },
			);
		}

		const responseHeaders: Record<string, string> = {};
		if (ct) responseHeaders["Content-Type"] = ct;
		responseHeaders["Cache-Control"] =
			"public, max-age=3600, stale-while-revalidate=86400";
		const body = await res.arrayBuffer();
		return new NextResponse(Buffer.from(body), { headers: responseHeaders });
	} catch (e) {
		return NextResponse.json(
			{ error: "proxy error", detail: String(e) },
			{ status: 500 },
		);
	}
}
