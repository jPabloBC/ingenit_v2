import { Dropbox } from "dropbox";
import { NextResponse } from "next/server";

function getExtension(value: string): string {
	const normalized = value.split("?")[0].split("#")[0];
	const idx = normalized.lastIndexOf(".");
	if (idx < 0) return "";
	return normalized.slice(idx + 1).toLowerCase();
}

function inferContentTypeFromPath(path: string): string {
	const ext = getExtension(path);
	switch (ext) {
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "gif":
			return "image/gif";
		case "webp":
			return "image/webp";
		case "svg":
			return "image/svg+xml";
		case "bmp":
			return "image/bmp";
		case "avif":
			return "image/avif";
		case "tif":
		case "tiff":
			return "image/tiff";
		case "pdf":
			return "application/pdf";
		default:
			return "application/octet-stream";
	}
}

async function getDropboxServerClient() {
	const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
	const clientId = process.env.DROPBOX_CLIENT_ID;
	const clientSecret = process.env.DROPBOX_CLIENT_SECRET;

	if (!refreshToken || !clientId || !clientSecret) {
		throw new Error(
			"Dropbox credentials are not configured (refresh token flow).",
		);
	}

	const params = new URLSearchParams({
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});

	const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
		"base64",
	);
	const tokenRes = await fetch("https://api.dropbox.com/oauth2/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${basicAuth}`,
		},
		body: params.toString(),
	});

	const tokenJson = await tokenRes
		.json()
		.catch(() => ({}) as Record<string, unknown>);
	if (
		!tokenRes.ok ||
		!tokenJson ||
		typeof tokenJson.access_token !== "string"
	) {
		throw new Error(
			(tokenJson as { error_description?: string; error?: string })
				.error_description ||
				(tokenJson as { error_description?: string; error?: string }).error ||
				"Failed to refresh Dropbox access token.",
		);
	}

	return new Dropbox({
		accessToken: tokenJson.access_token,
		fetch,
	});
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const path = url.searchParams.get("path");
		if (!path)
			return NextResponse.json({ error: "missing path" }, { status: 400 });

		const dbx = await getDropboxServerClient();
		const temp = await dbx.filesGetTemporaryLink({ path });
		const upstream = await fetch(temp.result.link, {
			method: "GET",
			redirect: "follow",
		});

		if (!upstream.ok) {
			return NextResponse.json(
				{
					error: "failed fetching temporary link content",
					status: upstream.status,
				},
				{ status: 502 },
			);
		}

		const contentType =
			upstream.headers.get("content-type") || inferContentTypeFromPath(path);
		const body = await upstream.arrayBuffer();
		return new Response(Buffer.from(body), {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=300, stale-while-revalidate=600",
			},
		});
	} catch (err: unknown) {
		const detail = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: "image proxy error", detail }, { status: 500 });
	}
}
