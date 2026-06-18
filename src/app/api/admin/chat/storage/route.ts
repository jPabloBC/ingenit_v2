import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

function adminConfigUnavailableResponse() {
	return NextResponse.json(
		{ error: "Admin API not configured" },
		{ status: 500 },
	);
}

export async function DELETE(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	const body = (await request.json().catch(() => ({}))) as {
		paths?: string[];
	};

	const rawPaths = Array.isArray(body.paths) ? body.paths : [];
	const paths = Array.from(
		new Set(
			rawPaths
				.filter((p): p is string => typeof p === "string")
				.map((p) => p.trim())
				.filter((p) => p.length > 0),
		),
	);

	if (paths.length === 0) {
		return NextResponse.json({ ok: true, removed: 0, paths: [] });
	}

	const { data, error } = await supabaseAdmin.storage
		.from("ingenit")
		.remove(paths);

	if (error) {
		return NextResponse.json(
			{ error: error.message || String(error) },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		ok: true,
		removed: paths.length,
		paths,
		data: data || null,
	});
}
