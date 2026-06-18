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

type PersonRow = {
	id: string;
	full_name: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
};

export async function GET() {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { data, error } = await supabaseAdmin
		.from("rt_print_people")
		.select("id, full_name, is_active, created_at, updated_at")
		.order("full_name", { ascending: true });
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ people: (data || []) as PersonRow[] });
}

export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json()) as Partial<PersonRow>;
	const fullName = String(body.full_name || "").trim();
	if (!fullName)
		return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
	const { data, error } = await supabaseAdmin
		.from("rt_print_people")
		.insert({ full_name: fullName, is_active: body.is_active ?? true })
		.select("id, full_name, is_active, created_at, updated_at")
		.single();
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ person: data });
}

export async function PUT(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json()) as Partial<PersonRow>;
	if (!body.id)
		return NextResponse.json({ error: "Missing id" }, { status: 400 });
	const updates: Record<string, unknown> = {};
	if (body.full_name !== undefined)
		updates.full_name = String(body.full_name || "").trim();
	if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
	updates.updated_at = new Date().toISOString();
	const { data, error } = await supabaseAdmin
		.from("rt_print_people")
		.update(updates)
		.eq("id", body.id)
		.select("id, full_name, is_active, created_at, updated_at")
		.single();
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ person: data });
}

export async function DELETE(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
	const { error } = await supabaseAdmin
		.from("rt_print_people")
		.delete()
		.eq("id", id);
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ ok: true });
}
