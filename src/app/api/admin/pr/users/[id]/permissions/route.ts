import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
	DEFAULT_PR_RESOURCE_KEYS,
	mergeAndSortPRResourceKeys,
} from "@/lib/prPermissions";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

function normalizeLegacyResourceKey(key: string) {
	const value = key.trim();
	if (value === "admin-daily-report") return "daily-report";
	return value;
}

async function validateAdminAccess(request: Request) {
	const authHeader = request.headers.get("authorization") || "";
	const token = authHeader.replace(/^Bearer\s+/i, "");
	if (!token) return { ok: false as const, status: 401, error: "missing auth token" };

	const { data: userData, error: userError } =
		await supabaseAdmin.auth.getUser(token);
	if (userError || !userData?.user?.id) {
		return { ok: false as const, status: 401, error: "invalid auth token" };
	}

	const userId = userData.user.id;
	const byId = await supabaseAdmin
		.from("pr_users")
		.select("role")
		.eq("id", userId)
		.maybeSingle();
	const roleById = byId.error ? null : byId.data?.role;
	if (roleById === "admin" || roleById === "dev") return { ok: true as const };

	const byAuthId = await supabaseAdmin
		.from("pr_users")
		.select("role")
		.eq("auth_id", userId)
		.maybeSingle();
	const roleByAuthId = byAuthId.error ? null : byAuthId.data?.role;
	if (roleByAuthId === "admin" || roleByAuthId === "dev") {
		return { ok: true as const };
	}

	return {
		ok: false as const,
		status: 403,
		error: "forbidden: admin/dev role required",
	};
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	if (!ADMIN_AVAILABLE) {
		return NextResponse.json(
			{ error: "Admin API not configured" },
			{ status: 500 },
		);
	}

	try {
		const access = await validateAdminAccess(request);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const { id } = await params;
		if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

		const { searchParams } = new URL(request.url);
		let companyId = searchParams.get("company_id");
		const projectId = searchParams.get("project_id");

		if (!companyId) {
			const { data: userRow } = await supabaseAdmin
				.from("pr_users")
				.select("company_id")
				.eq("id", id)
				.maybeSingle();
			companyId = userRow?.company_id || null;
		}

			if (!companyId) {
				return NextResponse.json(
					{
						permissions: [],
						available: DEFAULT_PR_RESOURCE_KEYS,
						company_id: null,
						project_id: null,
					},
					{ status: 200 },
				);
			}
			if (!projectId) {
				const globalRes = await supabaseAdmin
					.from("pr_user_permissions")
					.select("resource_key, can_view")
					.eq("user_id", id)
					.eq("company_id", companyId);
				if (globalRes.error) {
					return NextResponse.json(
						{ error: globalRes.error.message || globalRes.error },
						{ status: 500 },
					);
				}
				const globalAssigned = (globalRes.data || [])
					.filter((p) => p.can_view)
					.map((p) => p.resource_key)
					.filter(Boolean)
					.map((key) => normalizeLegacyResourceKey(String(key))) as string[];
				return NextResponse.json(
					{
						permissions: globalAssigned,
						available: mergeAndSortPRResourceKeys([
							...DEFAULT_PR_RESOURCE_KEYS,
							...globalAssigned,
						]),
						company_id: companyId,
						project_id: null,
					},
					{ status: 200 },
				);
			}

		const [assignedRes, catalogRes, globalRes] = await Promise.all([
			supabaseAdmin
				.from("pr_project_user_permissions")
				.select("resource_key, can_view")
				.eq("user_id", id)
				.eq("company_id", companyId)
				.eq("project_id", projectId),
			supabaseAdmin
				.from("pr_project_user_permissions")
				.select("resource_key")
				.eq("company_id", companyId)
				.eq("project_id", projectId),
			supabaseAdmin
				.from("pr_user_permissions")
				.select("resource_key, can_view")
				.eq("user_id", id)
				.eq("company_id", companyId),
		]);

		if (assignedRes.error) {
			return NextResponse.json(
				{ error: assignedRes.error.message || assignedRes.error },
				{ status: 500 },
			);
		}
		if (catalogRes.error) {
			return NextResponse.json(
				{ error: catalogRes.error.message || catalogRes.error },
				{ status: 500 },
			);
		}
		if (globalRes.error) {
			return NextResponse.json(
				{ error: globalRes.error.message || globalRes.error },
				{ status: 500 },
			);
		}

		const projectAssigned = (assignedRes.data || [])
			.filter((p) => p.can_view)
			.map((p) => p.resource_key)
			.filter(Boolean)
			.map((key) => normalizeLegacyResourceKey(String(key))) as string[];
		const globalAssigned = (globalRes.data || [])
			.filter((p) => p.can_view)
			.map((p) => p.resource_key)
			.filter(Boolean)
			.map((key) => normalizeLegacyResourceKey(String(key))) as string[];
		const catalog = ((catalogRes.data || []).map((p) => p.resource_key).filter(
			Boolean,
		).map((key) => normalizeLegacyResourceKey(String(key))) || []) as string[];

		const assigned = projectAssigned.length > 0 ? projectAssigned : globalAssigned;

		const available = mergeAndSortPRResourceKeys([
			...DEFAULT_PR_RESOURCE_KEYS,
			...catalog,
			...projectAssigned,
			...globalAssigned,
		]);

		return NextResponse.json(
			{
				permissions: assigned,
				available,
				company_id: companyId,
				project_id: projectId,
			},
			{ status: 200 },
		);
	} catch (err) {
		console.error("Unexpected admin PR permissions GET error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	if (!ADMIN_AVAILABLE) {
		return NextResponse.json(
			{ error: "Admin API not configured" },
			{ status: 500 },
		);
	}

	try {
		const access = await validateAdminAccess(request);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const { id } = await params;
		if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

		const body = await request.json();
		const companyId =
			typeof body?.company_id === "string" ? body.company_id : null;
		const projectId =
			typeof body?.project_id === "string" ? body.project_id : null;
		const permissions = Array.isArray(body?.permissions)
			? (body.permissions as unknown[])
					.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
					.map((p) => p.trim())
			: [];

		if (!companyId) {
			return NextResponse.json(
				{ error: "Missing company_id" },
				{ status: 400 },
			);
		}
		if (!projectId) {
			return NextResponse.json(
				{ error: "Missing project_id" },
				{ status: 400 },
			);
		}

		// Keep project assignment table in sync with permission assignments.
		// This avoids users showing "Sin acceso a proyectos" when permissions exist.
		const { error: assignmentErr } = await supabaseAdmin
			.from("pr_project_users")
			.upsert(
				[
					{
						user_id: id,
						company_id: companyId,
						project_id: projectId,
						status: "active",
					},
				],
				{ onConflict: "project_id,user_id" },
			);
		if (assignmentErr) {
			return NextResponse.json(
				{ error: assignmentErr.message || assignmentErr },
				{ status: 500 },
			);
		}

		const { error: deleteErr } = await supabaseAdmin
			.from("pr_project_user_permissions")
			.delete()
			.eq("user_id", id)
			.eq("company_id", companyId)
			.eq("project_id", projectId);

		if (deleteErr) {
			return NextResponse.json(
				{ error: deleteErr.message || deleteErr },
				{ status: 500 },
			);
		}

		if (permissions.length > 0) {
			const rows = permissions.map((resourceKey) => ({
				user_id: id,
				company_id: companyId,
				project_id: projectId,
				resource_key: resourceKey,
				can_view: true,
			}));

			const { error: insertErr } = await supabaseAdmin
				.from("pr_project_user_permissions")
				.insert(rows);

			if (insertErr) {
				return NextResponse.json(
					{ error: insertErr.message || insertErr },
					{ status: 500 },
				);
			}
		}

		return NextResponse.json(
			{
				success: true,
				permissions,
				company_id: companyId,
				project_id: projectId,
			},
			{ status: 200 },
		);
	} catch (err) {
		console.error("Unexpected admin PR permissions PATCH error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}
