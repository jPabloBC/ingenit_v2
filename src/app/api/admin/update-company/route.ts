import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type GenericRecord = Record<string, unknown>;

function isRecord(value: unknown): value is GenericRecord {
	return typeof value === "object" && value !== null;
}

function summarizeErrorPayload(errorPayload: unknown): string | null {
	if (!isRecord(errorPayload)) return null;
	const code = typeof errorPayload.code === "string" ? errorPayload.code : null;
	const message =
		typeof errorPayload.message === "string" ? errorPayload.message : null;
	const details =
		typeof errorPayload.details === "string" ? errorPayload.details : null;
	const hint = typeof errorPayload.hint === "string" ? errorPayload.hint : null;
	const pieces = [code, message, details, hint].filter(
		(v): v is string => Boolean(v && v.trim()),
	);
	return pieces.length > 0 ? pieces.join(" | ") : null;
}

async function getUserFromToken(token: string) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
	try {
		const response = await fetch(
			`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`,
			{
				headers: {
					apikey: SERVICE_ROLE_KEY,
					Authorization: `Bearer ${token}`,
				},
			},
		);
		const user: unknown = await response.json().catch(() => null);
		if (
			response.ok &&
			isRecord(user) &&
			typeof user.id === "string" &&
			user.id.length > 0
		) {
			return user;
		}
		return null;
	} catch {
		return null;
	}
}

async function hasAdminPrivileges(userId: string) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
	const baseUrl = SUPABASE_URL.replace(/\/+$/, "");
	const headers = {
		apikey: SERVICE_ROLE_KEY,
		Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
	};

	const byIdRes = await fetch(
		`${baseUrl}/rest/v1/pr_users?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
		{ headers },
	);
	const byIdJson: unknown = await byIdRes.json().catch(() => null);
	if (byIdRes.ok && Array.isArray(byIdJson) && byIdJson.length > 0) {
		const role = isRecord(byIdJson[0]) ? byIdJson[0].role : null;
		if (role === "admin" || role === "dev") return true;
	}

	const byAuthIdRes = await fetch(
		`${baseUrl}/rest/v1/pr_users?select=role&auth_id=eq.${encodeURIComponent(userId)}&limit=1`,
		{ headers },
	);
	const byAuthIdJson: unknown = await byAuthIdRes.json().catch(() => null);
	if (byAuthIdRes.ok && Array.isArray(byAuthIdJson) && byAuthIdJson.length > 0) {
		const role = isRecord(byAuthIdJson[0]) ? byAuthIdJson[0].role : null;
		if (role === "admin" || role === "dev") return true;
	}

	return false;
}

async function tryUpdateWithFallback(
	endpoint: string,
	serviceRoleKey: string,
	payloadToUpdate: GenericRecord,
) {
	const payload = { ...payloadToUpdate };
	const removedColumns: string[] = [];

	for (let attempt = 0; attempt < 8; attempt++) {
		const response = await fetch(endpoint, {
			method: "PATCH",
			headers: {
				apikey: serviceRoleKey,
				Authorization: `Bearer ${serviceRoleKey}`,
				"Content-Type": "application/json",
				Prefer: "return=representation",
			},
			body: JSON.stringify(payload),
		});
		const body: unknown = await response.json().catch(() => null);
		if (response.ok) {
			return { ok: true, status: response.status, body, removedColumns };
		}

		if (
			isRecord(body) &&
			typeof body.message === "string" &&
			body.message.includes("column of") &&
			body.message.includes("schema cache")
		) {
			const match = body.message.match(/'([a-zA-Z0-9_]+)'\s+column/i);
			const missingColumn = match?.[1];
			if (missingColumn && missingColumn in payload) {
				delete payload[missingColumn];
				removedColumns.push(missingColumn);
				continue;
			}
		}

		return { ok: false, status: response.status, body, removedColumns };
	}

	return {
		ok: false,
		status: 500,
		body: { error: "max update retries reached" },
		removedColumns,
	};
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
			isRecord(body) && typeof body.companyId === "string" ? body.companyId : "";
		const payloadFields =
			isRecord(body) && isRecord(body.payloadFields)
				? { ...body.payloadFields }
				: null;
		if (!companyId || !payloadFields) {
			return NextResponse.json({ error: "missing fields" }, { status: 400 });
		}

		const authHeader = req.headers.get("authorization") || "";
		const token = authHeader.replace(/^Bearer\s+/i, "");
		const createKeyFromHeader = req.headers.get("x-create-company-key") || "";
		const createKeyFromBody =
			isRecord(body) && typeof body.apikey === "string" ? body.apikey : "";
		const createKey = createKeyFromHeader || createKeyFromBody;
		const serverCreateKey = process.env.CREATE_COMPANY_KEY || "";
		const validKey =
			serverCreateKey && createKey && serverCreateKey === createKey;

		let callerAny: unknown = null;
		if (token) callerAny = await getUserFromToken(token);
		if (!callerAny && !validKey) {
			return NextResponse.json(
				{ error: "missing or invalid auth token or create key" },
				{ status: 401 },
			);
		}
		if (callerAny && isRecord(callerAny) && typeof callerAny.id === "string") {
			const allowed = await hasAdminPrivileges(callerAny.id);
			if (!allowed) {
				return NextResponse.json(
					{ error: "forbidden: admin/dev role required" },
					{ status: 403 },
				);
			}
		}

		delete payloadFields.id;
		delete payloadFields.created_at;
		delete payloadFields.updated_at;

		const updateResult = await tryUpdateWithFallback(
			`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/pr_companies?id=eq.${encodeURIComponent(companyId)}`,
			SERVICE_ROLE_KEY,
			payloadFields,
		);

		if (!updateResult.ok) {
			return NextResponse.json(
				{
					error: "update company failed",
					detail: updateResult.body,
					status: updateResult.status,
					message:
						summarizeErrorPayload(updateResult.body) || "Unknown update error",
					removedColumns: updateResult.removedColumns,
				},
				{ status: 500 },
			);
		}

		const updated =
			Array.isArray(updateResult.body) && updateResult.body.length > 0
				? updateResult.body[0]
				: null;

		return NextResponse.json({ company: updated || null }, { status: 200 });
	} catch (err: unknown) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

export const runtime = "nodejs";
