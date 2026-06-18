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

async function generateCorrelativeName(): Promise<string> {
	const { data, error } = await supabaseAdmin
		.from("rt_print_jobs")
		.select("name")
		.like("name", "PRINT_%");

	if (error) {
		throw new Error(error.message || "Error generando correlativo");
	}

	let maxNumber = 0;
	for (const row of data || []) {
		const match = String(row.name || "").match(/^PRINT_(\d+)$/);
		if (!match) continue;
		const n = Number.parseInt(match[1], 10);
		if (Number.isFinite(n) && n > maxNumber) maxNumber = n;
	}

	const nextNumber = maxNumber + 1;
	const formattedNumber = String(nextNumber).padStart(3, "0");
	return `PRINT_${formattedNumber}`;
}

export async function GET(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (id) {
		const { data, error } = await supabaseAdmin
			.from("rt_print_jobs")
			.select("id, name, description, created_at, status, metadata")
			.eq("id", id)
			.single();
		if (error)
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		return NextResponse.json({ job: data });
	}

	const { data, error } = await supabaseAdmin
		.from("rt_print_jobs")
		.select("id, name, description, created_at, status")
		.order("created_at", { ascending: false });
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ jobs: data || [] });
}

export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json().catch(() => ({}))) as {
		name?: string;
		description?: string;
		metadata?: Record<string, unknown> | null;
	};

	const explicitName = String(body.name || "").trim();
	const name = explicitName || (await generateCorrelativeName());

	const payload = {
		name,
		description: body.description ? String(body.description).trim() : null,
		metadata: body.metadata ?? null,
	};

	const { data, error } = await supabaseAdmin
		.from("rt_print_jobs")
		.insert(payload)
		.select("id, name, description, created_at, status, metadata")
		.single();

	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ job: data });
}

export async function PUT(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json().catch(() => ({}))) as {
		id?: string;
		updates?: Record<string, unknown>;
	};
	const id = String(body.id || "").trim();
	if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

	const updates = body.updates || {};
	const { data, error } = await supabaseAdmin
		.from("rt_print_jobs")
		.update(updates)
		.eq("id", id)
		.select("id, name, description, created_at, status, metadata")
		.single();

	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ job: data });
}

export async function DELETE(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

	const { error } = await supabaseAdmin
		.from("rt_print_jobs")
		.delete()
		.eq("id", id);
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ ok: true });
}
