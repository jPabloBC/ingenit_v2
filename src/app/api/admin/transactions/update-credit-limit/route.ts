import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.SUPABASE_ANON_KEY ||
	"";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

async function getUserIdFromRequest(request: Request) {
	const authHeader = request.headers.get("authorization") || "";
	const token = authHeader.replace("Bearer ", "").trim();
	if (!token || !SUPABASE_URL || !ANON_KEY) return null;
	try {
		const resp = await fetch(
			`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					apikey: ANON_KEY,
				},
			},
		);
		if (!resp.ok) return null;
		const user = (await resp.json()) as { id?: string };
		return user.id || null;
	} catch {
		return null;
	}
}

function isUuid(value: unknown): value is string {
	if (typeof value !== "string") return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value.trim(),
	);
}

export async function POST(request: Request) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		return NextResponse.json(
			{ success: false, error: "Admin API no configurada" },
			{ status: 500 },
		);
	}

	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json(
			{ success: false, error: "No autorizado" },
			{ status: 401 },
		);
	}

	try {
		const body = (await request.json().catch(() => ({}))) as {
			accountId?: string;
			creditLimit?: number | string;
		};

		const accountId = String(body.accountId || "").trim();
		if (!isUuid(accountId)) {
			return NextResponse.json(
				{ success: false, error: "Cuenta inválida" },
				{ status: 400 },
			);
		}

		const creditLimit = Number(body.creditLimit);
		if (!Number.isFinite(creditLimit) || creditLimit < 0) {
			return NextResponse.json(
				{
					success: false,
					error: "El cupo debe ser un número válido mayor o igual a 0",
				},
				{ status: 400 },
			);
		}

		let account: {
			id?: string;
			credit_limit?: number | null;
		} | null = null;
		let updateError: string | null = null;

		{
			const { data, error } = await supabaseAdmin
				.from("rt_personal_accounts")
				.update({ credit_limit: creditLimit })
				.eq("id", accountId)
				.eq("user_id", userId)
				.select("id, credit_limit")
				.single();

			if (!error && data) {
				account = data as { id?: string; credit_limit?: number | null };
			} else {
				updateError = error?.message || "No se pudo actualizar el cupo";
			}
		}

		// Schema compatibility: tables without user_id
		if (!account && updateError?.includes("user_id")) {
			const { data, error } = await supabaseAdmin
				.from("rt_personal_accounts")
				.update({ credit_limit: creditLimit })
				.eq("id", accountId)
				.select("id, credit_limit")
				.single();

			if (!error && data) {
				account = data as { id?: string; credit_limit?: number | null };
				updateError = null;
			} else {
				updateError = error?.message || updateError;
			}
		}

		if (!account) {
			return NextResponse.json(
				{
					success: false,
					error: updateError || "No se pudo actualizar el cupo",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, account });
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
