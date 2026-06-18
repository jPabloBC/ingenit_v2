import { createClient } from "@supabase/supabase-js";
import { Dropbox } from "dropbox";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

type StorageFile = {
	id: string;
	dropbox_path: string;
	file_name: string | null;
	file_type: string | null;
	metadata: { print_job_id?: string } | null;
};

const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"bmp",
	"svg",
	"avif",
	"tif",
	"tiff",
]);

function getExtension(value: string | null | undefined): string {
	if (!value) return "";
	const normalized = value.split("?")[0].split("#")[0];
	const idx = normalized.lastIndexOf(".");
	if (idx < 0) return "";
	return normalized.slice(idx + 1).toLowerCase();
}

function isImageFile(file: Pick<StorageFile, "file_type" | "file_name" | "dropbox_path">) {
	const mime = (file.file_type || "").toLowerCase();
	if (mime.startsWith("image/")) return true;
	const ext =
		getExtension(file.file_name) || getExtension(file.dropbox_path);
	return IMAGE_EXTENSIONS.has(ext);
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
		if (!ADMIN_AVAILABLE) {
			return NextResponse.json(
				{ error: "Admin API not configured" },
				{ status: 500 },
			);
		}
		const url = new URL(req.url);
		const jobId = url.searchParams.get("jobId");
		if (!jobId)
			return NextResponse.json({ error: "missing jobId" }, { status: 400 });

		const dbxServer = await getDropboxServerClient();

		const { data, error } = await supabaseAdmin
			.from("rt_storage")
			.select("id, dropbox_path, file_name, file_type, created_at, metadata")
			.order("created_at", { ascending: false });
		if (error)
			return NextResponse.json({ error: String(error) }, { status: 500 });

		const files = ((data || []) as StorageFile[]).filter(
			(f) => f.metadata?.print_job_id === jobId,
		);

		const filesWithLinks = await Promise.all(
			files.map(async (f) => {
				const isImage = isImageFile(f);
				const proxyUrl = `/api/image-by-path?path=${encodeURIComponent(f.dropbox_path)}`;
				try {
					const response = await dbxServer.filesGetTemporaryLink({
						path: f.dropbox_path,
					});
					return {
						id: f.id,
						path: f.dropbox_path,
						file_name: f.file_name,
						file_type: f.file_type,
						// Usamos proxy same-origin para render consistente en html2canvas/PDF.
						url: isImage ? proxyUrl : response.result.link,
						direct_url: response.result.link,
					};
				} catch (err: unknown) {
					return {
						id: f.id,
						path: f.dropbox_path,
						file_name: f.file_name,
						file_type: f.file_type,
						url: isImage ? proxyUrl : null,
						error: err instanceof Error ? err.message : String(err),
					};
				}
			}),
		);

		return NextResponse.json({ files: filesWithLinks });
	} catch (err: unknown) {
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}
