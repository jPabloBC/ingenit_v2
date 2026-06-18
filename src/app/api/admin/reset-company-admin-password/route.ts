import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type GenericRecord = Record<string, unknown>;
type AuthUser = { id: string };

function isRecord(value: unknown): value is GenericRecord {
	return typeof value === "object" && value !== null;
}

function createServerSupabase() {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { persistSession: false },
	});
}

async function getUserFromToken(token: string) {
	const server = createServerSupabase();
	if (!server) return null;
	try {
		const { data, error } = await server.auth
			.getUser(token)
			.catch((e: unknown) => ({ data: null, error: e }));
		if (error) return null;
		const maybeUser = data?.user;
		if (maybeUser?.id) return maybeUser as AuthUser;
		return null;
	} catch {
		return null;
	}
}

async function hasAdminPrivileges(userId: string) {
	const server = createServerSupabase();
	if (!server) return false;

	const byId = await server
		.from("pr_users")
		.select("role")
		.eq("id", userId)
		.maybeSingle();
	if (!byId.error && byId.data?.role) {
		return byId.data.role === "admin" || byId.data.role === "dev";
	}

	const byAuthId = await server
		.from("pr_users")
		.select("role")
		.eq("auth_id", userId)
		.maybeSingle();
	if (!byAuthId.error && byAuthId.data?.role) {
		return byAuthId.data.role === "admin" || byAuthId.data.role === "dev";
	}

	return false;
}

export async function POST(req: Request) {
	try {
		if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
			return NextResponse.json(
				{ error: "server missing SUPABASE_URL or SERVICE_ROLE_KEY" },
				{ status: 500 },
			);
		}

		const body = await req.json();
		const companyId =
			isRecord(body) && typeof body.companyId === "string"
				? body.companyId
				: "";
		const newPassword =
			isRecord(body) && typeof body.newPassword === "string"
				? body.newPassword
				: "";
		const adminEmailRaw =
			isRecord(body) && typeof body.adminEmail === "string"
				? body.adminEmail
				: "";
		const adminEmail = adminEmailRaw.trim().toLowerCase();

		if (!companyId || !newPassword) {
			return NextResponse.json({ error: "missing fields" }, { status: 400 });
		}
		if (newPassword.length < 8) {
			return NextResponse.json(
				{ error: "password must be at least 8 characters" },
				{ status: 400 },
			);
		}

		const authHeader = req.headers.get("authorization") || "";
		const token = authHeader.replace(/^Bearer\s+/i, "");
		const createKeyFromHeader = req.headers.get("x-create-company-key") || "";
		const createKeyFromBody =
			isRecord(body) && typeof body.apikey === "string" ? body.apikey : "";
		const createKey = createKeyFromHeader || createKeyFromBody;
		const serverCreateKey = process.env.CREATE_COMPANY_KEY || "";

		let callerAny: AuthUser | null = null;
		if (token) callerAny = await getUserFromToken(token);

		const validKey =
			serverCreateKey && createKey && serverCreateKey === createKey;
		if (!callerAny && !validKey) {
			return NextResponse.json(
				{ error: "missing or invalid auth token or create key" },
				{ status: 401 },
			);
		}
		if (callerAny) {
			const allowed = await hasAdminPrivileges(callerAny.id);
			if (!allowed) {
				return NextResponse.json(
					{ error: "forbidden: admin/dev role required" },
					{ status: 403 },
				);
			}
		}

		const server = createServerSupabase();
		if (!server) {
			return NextResponse.json(
				{ error: "server missing supabase config" },
				{ status: 500 },
			);
		}

		let profileQuery = server
			.from("pr_users")
			.select("id, auth_id, email, role, company_id")
			.eq("company_id", companyId)
			.eq("role", "admin")
			.limit(1);
		if (adminEmail) {
			profileQuery = profileQuery.eq("email", adminEmail);
		}

		const { data: profiles, error: profileError } = await profileQuery;
		if (profileError) {
			return NextResponse.json(
				{
					error: "failed to find company admin profile",
					detail: profileError.message,
				},
				{ status: 500 },
			);
		}
		if (!profiles || profiles.length === 0) {
			return NextResponse.json(
				{ error: "admin profile not found for company" },
				{ status: 404 },
			);
		}

		const profile = profiles[0] as GenericRecord;
		const authUserId =
			(typeof profile.auth_id === "string" && profile.auth_id) ||
			(typeof profile.id === "string" && profile.id) ||
			"";
		if (!authUserId) {
			return NextResponse.json(
				{ error: "admin profile has no auth user id" },
				{ status: 500 },
			);
		}

		const { error: updateError } = await server.auth.admin.updateUserById(
			authUserId,
			{
				password: newPassword,
				email_confirm: true,
			},
		);
		if (updateError) {
			return NextResponse.json(
				{
					error: "failed to update admin password",
					detail: updateError.message,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			ok: true,
			adminUserId: authUserId,
			companyId,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export const runtime = "nodejs";
