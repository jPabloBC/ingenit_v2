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

type TaskRow = {
	id: string;
	group_id: string | null;
	label: string;
	slots: number;
	sort_order: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
};

export async function GET() {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { data, error } = await supabaseAdmin
		.from("rt_print_tasks")
		.select(
			"id, group_id, label, slots, sort_order, is_active, created_at, updated_at",
		)
		.order("sort_order", { ascending: true })
		.order("label", { ascending: true });
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ tasks: (data || []) as TaskRow[] });
}

export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json()) as Partial<TaskRow>;
	const label = String(body.label || "").trim();
	if (!label)
		return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
	const { data, error } = await supabaseAdmin
		.from("rt_print_tasks")
		.insert({
			group_id: body.group_id ?? null,
			label,
			slots:
				typeof body.slots === "number" && body.slots > 0
					? Math.floor(body.slots)
					: 1,
			sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
			is_active: body.is_active ?? true,
		})
		.select(
			"id, group_id, label, slots, sort_order, is_active, created_at, updated_at",
		)
		.single();
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ task: data });
}

export async function PUT(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json()) as Partial<TaskRow>;
	if (!body.id)
		return NextResponse.json({ error: "Missing id" }, { status: 400 });
	const updates: Record<string, unknown> = {};
	if (body.label !== undefined) updates.label = String(body.label || "").trim();
	if (body.group_id !== undefined) updates.group_id = body.group_id;
	if (body.slots !== undefined)
		updates.slots = Math.max(1, Math.floor(Number(body.slots)));
	if (body.sort_order !== undefined)
		updates.sort_order = Number(body.sort_order);
	if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
	updates.updated_at = new Date().toISOString();
	const { data, error } = await supabaseAdmin
		.from("rt_print_tasks")
		.update(updates)
		.eq("id", body.id)
		.select(
			"id, group_id, label, slots, sort_order, is_active, created_at, updated_at",
		)
		.single();
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ task: data });
}

export async function DELETE(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
	const { error } = await supabaseAdmin
		.from("rt_print_tasks")
		.delete()
		.eq("id", id);
	if (error)
		return NextResponse.json(
			{ error: error.message || error },
			{ status: 500 },
		);
	return NextResponse.json({ ok: true });
}
