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

export async function GET(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const printJobId = searchParams.get("printJobId");
	if (!printJobId)
		return NextResponse.json({ error: "Missing printJobId" }, { status: 400 });

	const { data, error } = await supabaseAdmin
		.from("rt_storage")
		.select("id, dropbox_path, file_name, file_type, created_at, metadata")
		.order("created_at", { ascending: false });

	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	const files = (data || []).filter(
		(f: { metadata?: { print_job_id?: string } }) =>
			f?.metadata?.print_job_id === printJobId,
	);
	return NextResponse.json({ files });
}

export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json().catch(() => ({}))) as {
		dropbox_path?: string;
		file_name?: string;
		file_type?: string;
		metadata?: Record<string, unknown> | null;
	};

	const dropboxPath = String(body.dropbox_path || "").trim();
	const fileName = String(body.file_name || "").trim();
	const fileType = String(body.file_type || "").trim();
	if (!dropboxPath || !fileName || !fileType) {
		return NextResponse.json(
			{ error: "Missing required fields" },
			{ status: 400 },
		);
	}

	const { data, error } = await supabaseAdmin
		.from("rt_storage")
		.insert({
			dropbox_path: dropboxPath,
			file_name: fileName,
			file_type: fileType,
			metadata: body.metadata ?? null,
		})
		.select("id, dropbox_path, file_name, file_type, created_at, metadata")
		.single();

	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ file: data });
}

export async function DELETE(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

	const { error } = await supabaseAdmin
		.from("rt_storage")
		.delete()
		.eq("id", id);
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ ok: true });
}
