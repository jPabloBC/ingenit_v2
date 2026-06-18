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
			bankId?: string;
		};
		const bankId = String(body.bankId || "").trim();
		if (!bankId) {
			return NextResponse.json(
				{ success: false, error: "Banco inválido" },
				{ status: 400 },
			);
		}

		const { data: bankRow } = await supabaseAdmin
			.from("rt_personal_banks")
			.select("id, code")
			.eq("id", bankId)
			.limit(1)
			.maybeSingle();
		const bankCode = String(bankRow?.code || "").trim();

		const accountsQuery = supabaseAdmin
			.from("rt_personal_accounts")
			.select("id", { count: "exact", head: true })
			.eq("bank_id", bankId);
		const linkedByCodeQuery = bankCode
			? supabaseAdmin
					.from("rt_personal_accounts")
					.select("id", { count: "exact", head: true })
					.eq("bank_code", bankCode)
			: null;
		const [{ count: linkedAccounts, error: linkedError }, linkedByCode] =
			await Promise.all([accountsQuery, linkedByCodeQuery]);

		if (linkedError) {
			return NextResponse.json(
				{
					success: false,
					error: linkedError.message || "Error validando banco",
				},
				{ status: 500 },
			);
		}

		const linkedByCodeCount = linkedByCode?.count || 0;
		if ((linkedAccounts || 0) + linkedByCodeCount > 0) {
			return NextResponse.json(
				{
					success: false,
					error:
						"No se puede eliminar el banco mientras existan cuentas asociadas.",
				},
				{ status: 409 },
			);
		}

		let errorMessage: string | null = null;

		{
			const { error } = await supabaseAdmin
				.from("rt_personal_banks")
				.delete()
				.eq("id", bankId)
				.eq("user_id", userId);
			if (!error) {
				return NextResponse.json({ success: true });
			}
			errorMessage = error.message || "No se pudo eliminar el banco";
		}

		if (errorMessage?.includes("user_id")) {
			const { error } = await supabaseAdmin
				.from("rt_personal_banks")
				.delete()
				.eq("id", bankId);
			if (!error) {
				return NextResponse.json({ success: true });
			}
			errorMessage = error.message || errorMessage;
		}

		return NextResponse.json(
			{ success: false, error: errorMessage || "No se pudo eliminar el banco" },
			{ status: 500 },
		);
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
