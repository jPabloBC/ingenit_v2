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
};

type GroupRow = {
	id: string;
	name: string;
	sort_order: number;
	is_active: boolean;
};

type TaskRow = {
	id: string;
	group_id: string | null;
	label: string;
	slots: number;
	sort_order: number;
	is_active: boolean;
};

type AssignmentRow = {
	id: string;
	assignment_date: string;
	task_id: string;
	person_id: string;
	created_at: string;
};

function getChileDate(): string {
	return new Date().toLocaleDateString("sv-SE", {
		timeZone: "America/Santiago",
	});
}

function toDateOnly(value: Date): string {
	return value.toISOString().slice(0, 10);
}

function getWeekStart(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00Z`);
	const day = d.getUTCDay(); // 0 = Sunday
	const diff = (day + 6) % 7; // Monday as start
	d.setUTCDate(d.getUTCDate() - diff);
	return toDateOnly(d);
}

function addDays(dateStr: string, days: number): string {
	const d = new Date(`${dateStr}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return toDateOnly(d);
}

function pickRandomUnique<T>(items: T[], count: number): T[] {
	if (count <= 0) return [];
	const shuffled = [...items].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, shuffled.length));
}

function buildAssignmentsForDate(
	date: string,
	tasks: TaskRow[],
	people: PersonRow[],
) {
	const rows: Array<{
		assignment_date: string;
		task_id: string;
		person_id: string;
	}> = [];
	for (const task of tasks) {
		const slots = Math.max(1, Number(task.slots || 1));
		const picked = pickRandomUnique(people, slots);
		for (const person of picked) {
			rows.push({
				assignment_date: date,
				task_id: task.id,
				person_id: person.id,
			});
		}
	}
	return rows;
}

export async function GET(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const { searchParams } = new URL(request.url);
	const mode = searchParams.get("mode") || "day";
	const date = searchParams.get("date") || getChileDate();
	const weekStart =
		mode === "week" ? getWeekStart(searchParams.get("start") || date) : date;
	const weekEnd = mode === "week" ? addDays(weekStart, 4) : date;

	const [peopleRes, groupsRes, tasksRes, assignmentsRes] = await Promise.all([
		supabaseAdmin
			.from("rt_print_people")
			.select("id, full_name, is_active")
			.order("full_name", { ascending: true }),
		supabaseAdmin
			.from("rt_print_task_groups")
			.select("id, name, sort_order, is_active")
			.order("sort_order", { ascending: true })
			.order("name", { ascending: true }),
		supabaseAdmin
			.from("rt_print_tasks")
			.select("id, group_id, label, slots, sort_order, is_active")
			.order("sort_order", { ascending: true })
			.order("label", { ascending: true }),
		supabaseAdmin
			.from("rt_print_assignments")
			.select("id, assignment_date, task_id, person_id, created_at")
			.gte("assignment_date", mode === "week" ? weekStart : date)
			.lte("assignment_date", mode === "week" ? weekEnd : date),
	]);

	if (peopleRes.error)
		return NextResponse.json(
			{ error: peopleRes.error.message || peopleRes.error },
			{ status: 500 },
		);
	if (groupsRes.error)
		return NextResponse.json(
			{ error: groupsRes.error.message || groupsRes.error },
			{ status: 500 },
		);
	if (tasksRes.error)
		return NextResponse.json(
			{ error: tasksRes.error.message || tasksRes.error },
			{ status: 500 },
		);
	if (assignmentsRes.error)
		return NextResponse.json(
			{ error: assignmentsRes.error.message || assignmentsRes.error },
			{ status: 500 },
		);

	return NextResponse.json({
		mode,
		date,
		weekStart,
		weekEnd,
		people: (peopleRes.data || []) as PersonRow[],
		groups: (groupsRes.data || []) as GroupRow[],
		tasks: (tasksRes.data || []) as TaskRow[],
		assignments: (assignmentsRes.data || []) as AssignmentRow[],
	});
}

export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	const body = (await request.json()) as {
		action?: string;
		date?: string;
		task_id?: string;
		person_ids?: string[];
	};
	const action = String(body.action || "generate");
	const date = body.date || getChileDate();

	if (action === "clear") {
		const { error } = await supabaseAdmin
			.from("rt_print_assignments")
			.delete()
			.eq("assignment_date", date);
		if (error)
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		return NextResponse.json({ ok: true });
	}
	if (action === "clear_week") {
		const weekStart = getWeekStart(date);
		const weekEnd = addDays(weekStart, 4);
		const { error } = await supabaseAdmin
			.from("rt_print_assignments")
			.delete()
			.gte("assignment_date", weekStart)
			.lte("assignment_date", weekEnd);
		if (error)
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		return NextResponse.json({ ok: true });
	}
	if (action === "set_cell") {
		const taskId = String(body.task_id || "");
		if (!taskId)
			return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
		const personIds = Array.isArray(body.person_ids)
			? body.person_ids.filter(Boolean)
			: [];
		const { error: deleteErr } = await supabaseAdmin
			.from("rt_print_assignments")
			.delete()
			.eq("assignment_date", date)
			.eq("task_id", taskId);
		if (deleteErr)
			return NextResponse.json(
				{ error: deleteErr.message || deleteErr },
				{ status: 500 },
			);

		if (personIds.length === 0) return NextResponse.json({ assignments: [] });
		const rows = personIds.map((personId) => ({
			assignment_date: date,
			task_id: taskId,
			person_id: personId,
		}));
		const { data: assignments, error: insertErr } = await supabaseAdmin
			.from("rt_print_assignments")
			.insert(rows)
			.select("id, assignment_date, task_id, person_id, created_at");
		if (insertErr)
			return NextResponse.json(
				{ error: insertErr.message || insertErr },
				{ status: 500 },
			);
		return NextResponse.json({ assignments: assignments || [] });
	}

	const [peopleRes, tasksRes] = await Promise.all([
		supabaseAdmin
			.from("rt_print_people")
			.select("id, full_name, is_active")
			.eq("is_active", true),
		supabaseAdmin
			.from("rt_print_tasks")
			.select("id, group_id, label, slots, sort_order, is_active")
			.eq("is_active", true),
	]);

	if (peopleRes.error)
		return NextResponse.json(
			{ error: peopleRes.error.message || peopleRes.error },
			{ status: 500 },
		);
	if (tasksRes.error)
		return NextResponse.json(
			{ error: tasksRes.error.message || tasksRes.error },
			{ status: 500 },
		);

	const people = (peopleRes.data || []) as PersonRow[];
	const tasks = (tasksRes.data || []) as TaskRow[];
	if (people.length === 0)
		return NextResponse.json(
			{ error: "No hay personas activas" },
			{ status: 400 },
		);
	if (tasks.length === 0)
		return NextResponse.json(
			{ error: "No hay tareas activas" },
			{ status: 400 },
		);

	if (action === "generate_week") {
		const weekStart = getWeekStart(date);
		const weekEnd = addDays(weekStart, 4);
		const { error: deleteErr } = await supabaseAdmin
			.from("rt_print_assignments")
			.delete()
			.gte("assignment_date", weekStart)
			.lte("assignment_date", weekEnd);
		if (deleteErr)
			return NextResponse.json(
				{ error: deleteErr.message || deleteErr },
				{ status: 500 },
			);

		const rows: Array<{
			assignment_date: string;
			task_id: string;
			person_id: string;
		}> = [];
		for (let i = 0; i < 5; i += 1) {
			const day = addDays(weekStart, i);
			rows.push(...buildAssignmentsForDate(day, tasks, people));
		}

		if (rows.length === 0) {
			return NextResponse.json({ assignments: [] });
		}

		const { data: assignments, error: insertErr } = await supabaseAdmin
			.from("rt_print_assignments")
			.insert(rows)
			.select("id, assignment_date, task_id, person_id, created_at");
		if (insertErr)
			return NextResponse.json(
				{ error: insertErr.message || insertErr },
				{ status: 500 },
			);
		return NextResponse.json({ assignments: assignments || [] });
	}

	// Clear previous assignments for the date
	const { error: deleteErr } = await supabaseAdmin
		.from("rt_print_assignments")
		.delete()
		.eq("assignment_date", date);
	if (deleteErr)
		return NextResponse.json(
			{ error: deleteErr.message || deleteErr },
			{ status: 500 },
		);

	const rows = buildAssignmentsForDate(date, tasks, people);

	if (rows.length === 0) {
		return NextResponse.json({ assignments: [] });
	}

	const { data: assignments, error: insertErr } = await supabaseAdmin
		.from("rt_print_assignments")
		.insert(rows)
		.select("id, assignment_date, task_id, person_id, created_at");
	if (insertErr)
		return NextResponse.json(
			{ error: insertErr.message || insertErr },
			{ status: 500 },
		);

	return NextResponse.json({ assignments: assignments || [] });
}
