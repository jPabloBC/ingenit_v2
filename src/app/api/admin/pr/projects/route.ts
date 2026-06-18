import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
if (!ADMIN_AVAILABLE) {
	console.error(
		"Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin PR projects API",
	);
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

type JsonRecord = Record<string, unknown>;

function adminConfigUnavailableResponse() {
	return NextResponse.json(
		{ error: "Admin API not configured" },
		{ status: 500 },
	);
}

async function validateRequestToken(req: Request) {
	const authHeader = req.headers.get("authorization") || "";
	const token = authHeader.replace(/^Bearer\s+/i, "");
	if (!token) return { ok: false as const };
	const { data: userData, error: userError } =
		await supabaseAdmin.auth.getUser(token);
	if (userError || !userData?.user?.id) return { ok: false as const };
	return { ok: true as const, userId: userData.user.id };
}

async function hasAdminPrivileges(userId: string) {
	const byId = await supabaseAdmin
		.from("pr_users")
		.select("role")
		.eq("id", userId)
		.maybeSingle();
	if (!byId.error && byId.data?.role) {
		return byId.data.role === "admin" || byId.data.role === "dev";
	}

	const byAuthId = await supabaseAdmin
		.from("pr_users")
		.select("role")
		.eq("auth_id", userId)
		.maybeSingle();
	if (!byAuthId.error && byAuthId.data?.role) {
		return byAuthId.data.role === "admin" || byAuthId.data.role === "dev";
	}

	return false;
}

async function validateAdminAccess(req: Request) {
	const tokenValidation = await validateRequestToken(req);
	if (!tokenValidation.ok) {
		return { ok: false as const, status: 401, error: "invalid auth token" };
	}
	const allowed = await hasAdminPrivileges(tokenValidation.userId);
	if (!allowed) {
		return {
			ok: false as const,
			status: 403,
			error: "forbidden: admin/dev role required",
		};
	}
	return { ok: true as const };
}

function extractMissingColumnName(errorMessage: string) {
	const match = errorMessage.match(/'([a-zA-Z0-9_]+)'\s+column/i);
	return match?.[1] || null;
}

async function insertProjectWithFallback(payloadToInsert: JsonRecord) {
	const payload = { ...payloadToInsert };
	const removedColumns: string[] = [];

	for (let attempt = 0; attempt < 8; attempt++) {
		const { data, error } = await supabaseAdmin
			.from("pr_projects")
			.insert([payload])
			.select()
			.single();

		if (!error) {
			return { data, removedColumns };
		}

		const missingColumn = extractMissingColumnName(error.message || "");
		if (!missingColumn || !(missingColumn in payload)) {
			throw error;
		}
		delete payload[missingColumn];
		removedColumns.push(missingColumn);
	}

	throw new Error("No se pudo crear proyecto tras múltiples reintentos.");
}

async function updateProjectWithFallback(
	projectId: string,
	payloadToUpdate: JsonRecord,
) {
	const payload = { ...payloadToUpdate };
	const removedColumns: string[] = [];

	for (let attempt = 0; attempt < 8; attempt++) {
		const { data, error } = await supabaseAdmin
			.from("pr_projects")
			.update(payload)
			.eq("id", projectId)
			.select()
			.single();

		if (!error) {
			return { data, removedColumns };
		}

		const missingColumn = extractMissingColumnName(error.message || "");
		if (!missingColumn || !(missingColumn in payload)) {
			throw error;
		}
		delete payload[missingColumn];
		removedColumns.push(missingColumn);
	}

	throw new Error("No se pudo actualizar proyecto tras múltiples reintentos.");
}

export async function POST(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const body = (await req.json()) as JsonRecord;
		const name =
			typeof body.name === "string" ? body.name.trim() : "";
		const companyId =
			typeof body.company_id === "string" ? body.company_id.trim() : "";

		if (!name) {
			return NextResponse.json(
				{ error: "Missing project name" },
				{ status: 400 },
			);
		}
		if (!companyId) {
			return NextResponse.json(
				{ error: "Missing company_id" },
				{ status: 400 },
			);
		}

		const { data: companyRow, error: companyError } = await supabaseAdmin
			.from("pr_companies")
			.select("id")
			.eq("id", companyId)
			.maybeSingle();
		if (companyError || !companyRow) {
			return NextResponse.json(
				{ error: "Company does not exist" },
				{ status: 400 },
			);
		}

		const payload: JsonRecord = {
			name,
			description: typeof body.description === "string" ? body.description : "",
			environment:
				typeof body.environment === "string" && body.environment.trim()
					? body.environment.trim()
					: "development",
			status:
				typeof body.status === "string" && body.status.trim()
					? body.status.trim()
					: "active",
			repository_url:
				typeof body.repository_url === "string" ? body.repository_url : "",
			deployment_url:
				typeof body.deployment_url === "string" ? body.deployment_url : "",
			country: typeof body.country === "string" ? body.country : "",
			region: typeof body.region === "string" ? body.region : "",
			city: typeof body.city === "string" ? body.city : "",
			comuna: typeof body.comuna === "string" ? body.comuna : "",
			address: typeof body.address === "string" ? body.address : "",
			health_status: "healthy",
			created_at: new Date().toISOString(),
			last_deployment: new Date().toISOString(),
			company_id: companyId,
		};

		const { data, removedColumns } = await insertProjectWithFallback(payload);
		return NextResponse.json(
			{ project: data, removedColumns },
			{ status: 200 },
		);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function GET(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const { searchParams } = new URL(req.url);
		const companyId = searchParams.get("company_id");

		let query = supabaseAdmin
			.from("pr_projects")
			.select("*")
			.order("created_at", { ascending: false });

		if (companyId) {
			query = query.eq("company_id", companyId);
		}

		const { data, error } = await query;
		if (error) {
			return NextResponse.json(
				{ error: error.message || "Failed to fetch projects" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ projects: data || [] }, { status: 200 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const body = (await req.json()) as JsonRecord;
		const projectId = typeof body.id === "string" ? body.id.trim() : "";
		const companyId =
			typeof body.company_id === "string" ? body.company_id.trim() : "";
		const name = typeof body.name === "string" ? body.name.trim() : "";

		if (!projectId) {
			return NextResponse.json({ error: "Missing project id" }, { status: 400 });
		}
		if (!companyId) {
			return NextResponse.json(
				{ error: "Missing company_id" },
				{ status: 400 },
			);
		}
		if (!name) {
			return NextResponse.json(
				{ error: "Missing project name" },
				{ status: 400 },
			);
		}

		const { data: existing, error: existingError } = await supabaseAdmin
			.from("pr_projects")
			.select("id, company_id")
			.eq("id", projectId)
			.maybeSingle();
		if (existingError || !existing) {
			return NextResponse.json(
				{ error: "Project does not exist" },
				{ status: 404 },
			);
		}
		if ((existing.company_id || "") !== companyId) {
			return NextResponse.json(
				{ error: "Project does not belong to the selected company" },
				{ status: 400 },
			);
		}

		const payload: JsonRecord = {
			name,
			description: typeof body.description === "string" ? body.description : "",
			environment:
				typeof body.environment === "string" && body.environment.trim()
					? body.environment.trim()
					: "development",
			status:
				typeof body.status === "string" && body.status.trim()
					? body.status.trim()
					: "active",
			repository_url:
				typeof body.repository_url === "string" ? body.repository_url : "",
			deployment_url:
				typeof body.deployment_url === "string" ? body.deployment_url : "",
			country: typeof body.country === "string" ? body.country : "",
			region: typeof body.region === "string" ? body.region : "",
			city: typeof body.city === "string" ? body.city : "",
			comuna: typeof body.comuna === "string" ? body.comuna : "",
			address: typeof body.address === "string" ? body.address : "",
			company_id: companyId,
		};

		const { data, removedColumns } = await updateProjectWithFallback(
			projectId,
			payload,
		);
		return NextResponse.json(
			{ project: data, removedColumns },
			{ status: 200 },
		);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export const runtime = "nodejs";
