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
			bank_id?: string;
			type?: string;
			name?: string;
			balance?: number;
			credit_limit?: number | null;
		};

		const bankId = String(body.bank_id || "").trim();
		const type = String(body.type || "").trim();
		const name = String(body.name || "").trim();

		if (!bankId || !type || !name) {
			return NextResponse.json(
				{ success: false, error: "Faltan campos requeridos" },
				{ status: 400 },
			);
		}

		const payloadWithUser: {
			bank_id: string;
			type: string;
			name: string;
			balance: number;
			credit_limit: number | null;
			user_id?: string;
		} = {
			bank_id: bankId,
			type,
			name,
			balance: Number(body.balance || 0),
			credit_limit:
				body.credit_limit === null || body.credit_limit === undefined
					? null
					: Number(body.credit_limit),
			user_id: userId,
		};

		let insertError: string | null = null;
		let account: Record<string, unknown> | null = null;

		{
			const { data, error } = await supabaseAdmin
				.from("rt_personal_accounts")
				.insert(payloadWithUser)
				.select("*")
				.single();
			if (!error && data) {
				account = data as Record<string, unknown>;
			} else {
				insertError = error?.message || "No se pudo crear la cuenta";
			}
		}

		// Schema compatibility: table without user_id
		if (!account && insertError?.includes("user_id")) {
			const payloadNoUser = {
				bank_id: bankId,
				type,
				name,
				balance: Number(body.balance || 0),
				credit_limit:
					body.credit_limit === null || body.credit_limit === undefined
						? null
						: Number(body.credit_limit),
			};
			const { data, error } = await supabaseAdmin
				.from("rt_personal_accounts")
				.insert(payloadNoUser)
				.select("*")
				.single();
			if (!error && data) {
				account = data as Record<string, unknown>;
				insertError = null;
			} else {
				insertError = error?.message || insertError;
			}
		}

		if (!account) {
			return NextResponse.json(
				{ success: false, error: insertError || "No se pudo crear la cuenta" },
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
