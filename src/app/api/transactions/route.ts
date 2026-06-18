import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;
type AccountSnapshot = {
	id?: string;
	bank_id?: string | null;
	balance?: number | string | null;
	currency?: string | null;
};

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

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

async function getUserId(req: NextRequest) {
	const authHeader = req.headers.get("authorization") || "";
	const token = authHeader.replace("Bearer ", "").trim();
	if (!token || !SUPABASE_URL || !ANON_KEY) return null;
	try {
		const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
			headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
		});
		if (!r.ok) return null;
		const user = (await r.json()) as { id?: string };
		return user?.id || null;
	} catch {
		return null;
	}
}

async function getAccountSnapshot(
	accountId: string,
	userId: string,
): Promise<AccountSnapshot | null> {
	const withUser = await supabaseAdmin
		.from("rt_personal_accounts")
		.select("id, bank_id, balance, currency")
		.eq("id", accountId)
		.eq("user_id", userId)
		.maybeSingle();

	if (!withUser.error && withUser.data) {
		return withUser.data as AccountSnapshot;
	}

	// Fallback also when no row matched by user_id (legacy rows without owner).
	if (!withUser.data || withUser.error?.message?.includes("user_id")) {
		const fallback = await supabaseAdmin
			.from("rt_personal_accounts")
			.select("id, bank_id, balance, currency")
			.eq("id", accountId)
			.maybeSingle();
		if (!fallback.error && fallback.data) {
			return fallback.data as AccountSnapshot;
		}
	}

	return null;
}

// GET: devuelve bancos y transacciones del usuario autenticado
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const bank = searchParams.get("bank");
		const userId = await getUserId(req);
		if (!userId) {
			return NextResponse.json(
				{ success: false, error: "No autorizado" },
				{ status: 401 },
			);
		}

		const banksQuery = supabaseAdmin
			.from("rt_personal_banks")
			.select("id, name, created_at")
			.order("name", { ascending: true })
			.eq("user_id", userId);

		let { data: banks, error: banksError } = await banksQuery;
		if (banksError?.message?.includes("user_id")) {
			const fallback = await supabaseAdmin
				.from("rt_personal_banks")
				.select("id, name, created_at")
				.order("name", { ascending: true });
			banks = fallback.data || [];
			banksError = fallback.error;
		}
		if (banksError) {
			return NextResponse.json(
				{ success: false, error: banksError.message },
				{ status: 500 },
			);
		}

		let txQuery = supabaseAdmin
			.from("rt_personal_transactions")
			.select("*")
			.eq("user_id", userId)
			.order("date", { ascending: false });
		if (bank) txQuery = txQuery.eq("bank_id", bank);

		let { data: transactions, error: txError } = await txQuery;
		if (txError?.message?.includes("user_id")) {
			let fallback = supabaseAdmin
				.from("rt_personal_transactions")
				.select("*")
				.order("date", { ascending: false });
			if (bank) fallback = fallback.eq("bank_id", bank);
			const f = await fallback;
			transactions = f.data || [];
			txError = f.error;
		}
		if (txError) {
			return NextResponse.json(
				{ success: false, error: txError.message },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			banks: banks || [],
			transactions: transactions || [],
		});
	} catch (e: unknown) {
		return NextResponse.json(
			{ success: false, error: getErrorMessage(e) },
			{ status: 500 },
		);
	}
}

// POST: crea una transacción y actualiza el saldo de la cuenta
export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as JsonRecord;
		const userId = await getUserId(req);
		if (!userId) {
			return NextResponse.json(
				{ success: false, error: "No autorizado" },
				{ status: 401 },
			);
		}

		let bankId =
			(typeof body.bankId === "string" && body.bankId) ||
			(typeof body.bank_id === "string" && body.bank_id) ||
			null;
		const accountId =
			(typeof body.accountId === "string" && body.accountId) ||
			(typeof body.account_id === "string" && body.account_id) ||
			null;

		let accountRowForSnapshot: AccountSnapshot | null = null;
		if (accountId) {
			accountRowForSnapshot = await getAccountSnapshot(accountId, userId);
			if (!bankId && accountRowForSnapshot?.bank_id) {
				bankId = String(accountRowForSnapshot.bank_id);
			}
		}

		const payload: JsonRecord = {
			date:
				(typeof body.date === "string" && body.date) ||
				new Date().toISOString(),
			type:
				(typeof body.type === "string" && body.type) ||
				(typeof body.tipo === "string" && body.tipo) ||
				null,
			metodo: (typeof body.metodo === "string" && body.metodo) || null,
			categoria: (typeof body.categoria === "string" && body.categoria) || null,
			amount:
				(typeof body.amount === "number" ? body.amount : null) ??
				(typeof body.monto === "number" ? body.monto : null),
			description:
				(typeof body.description === "string" && body.description) ||
				(typeof body.descripcion === "string" && body.descripcion) ||
				null,
			bank_id: bankId,
			account_id: accountId,
			user_id: userId,
			currency:
				(typeof body.currency === "string" && body.currency) ||
				(typeof body.moneda === "string" && body.moneda) ||
				null,
			balance_before:
				(typeof body.balance_before === "number"
					? body.balance_before
					: null) ??
				(typeof body.balanceBefore === "number" ? body.balanceBefore : null),
			balance_after:
				(typeof body.balance_after === "number" ? body.balance_after : null) ??
				(typeof body.balanceAfter === "number" ? body.balanceAfter : null),
		};

		let computedNewBalance: number | null = null;
		const amount = Number(payload.amount ?? 0) || 0;
		if (accountRowForSnapshot && !Number.isNaN(amount)) {
			const currentBal = Number(accountRowForSnapshot.balance ?? 0) || 0;
			const t = String(payload.type || "").toLowerCase();
			const delta = t === "egreso" ? -Math.abs(amount) : Math.abs(amount);
			computedNewBalance = currentBal + delta;
			payload.balance_before = currentBal;
			payload.balance_after = computedNewBalance;
			if (!payload.currency && accountRowForSnapshot.currency) {
				payload.currency = accountRowForSnapshot.currency;
			}
		}
		// Fallback: if snapshot could not be read, trust client-provided balance_after.
		if (computedNewBalance == null && accountId) {
			const clientAfterRaw =
				(typeof body.balance_after === "number" ? body.balance_after : null) ??
				(typeof body.balanceAfter === "number" ? body.balanceAfter : null);
			const clientBeforeRaw =
				(typeof body.balance_before === "number"
					? body.balance_before
					: null) ??
				(typeof body.balanceBefore === "number" ? body.balanceBefore : null);
			const t = String(payload.type || "").toLowerCase();
			if (
				typeof clientAfterRaw === "number" &&
				Number.isFinite(clientAfterRaw)
			) {
				computedNewBalance = clientAfterRaw;
			} else if (
				typeof clientBeforeRaw === "number" &&
				Number.isFinite(clientBeforeRaw) &&
				!Number.isNaN(amount)
			) {
				const delta = t === "egreso" ? -Math.abs(amount) : Math.abs(amount);
				computedNewBalance = clientBeforeRaw + delta;
			}
		}

		const inserted = await supabaseAdmin
			.from("rt_personal_transactions")
			.insert(payload)
			.select("*")
			.single();

		if (inserted.error) {
			console.error(
				"[API/transactions] Error inserting transaction:",
				inserted.error,
			);
			return NextResponse.json(
				{ success: false, error: inserted.error.message },
				{ status: 500 },
			);
		}

		if (accountId && computedNewBalance != null) {
			const updateWithUser = await supabaseAdmin
				.from("rt_personal_accounts")
				.update({ balance: computedNewBalance })
				.eq("id", accountId)
				.eq("user_id", userId)
				.select("id");

			const updatedRows = Array.isArray(updateWithUser.data)
				? updateWithUser.data.length
				: 0;

			// Fallback when schema has no user_id OR when 0 rows matched by owner.
			if (
				updateWithUser.error?.message?.includes("user_id") ||
				(!updateWithUser.error && updatedRows === 0)
			) {
				const fallbackUpdate = await supabaseAdmin
					.from("rt_personal_accounts")
					.update({ balance: computedNewBalance })
					.eq("id", accountId)
					.select("id");
				if (fallbackUpdate.error) {
					console.error(
						"[API/transactions] Error fallback updating account balance:",
						fallbackUpdate.error,
					);
				}
			}
		}

		return NextResponse.json({ success: true, transaction: inserted.data });
	} catch (e: unknown) {
		return NextResponse.json(
			{ success: false, error: getErrorMessage(e) },
			{ status: 500 },
		);
	}
}

// DELETE: elimina transacción por id del usuario autenticado
export async function DELETE(req: NextRequest) {
	try {
		const userId = await getUserId(req);
		if (!userId) {
			return NextResponse.json(
				{ success: false, error: "No autorizado" },
				{ status: 401 },
			);
		}

		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) {
			return NextResponse.json(
				{ success: false, error: "Missing id" },
				{ status: 400 },
			);
		}

		const delWithUser = await supabaseAdmin
			.from("rt_personal_transactions")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (delWithUser.error?.message?.includes("user_id")) {
			const fallback = await supabaseAdmin
				.from("rt_personal_transactions")
				.delete()
				.eq("id", id);
			if (fallback.error) {
				return NextResponse.json(
					{ success: false, error: fallback.error.message },
					{ status: 500 },
				);
			}
			return NextResponse.json({ success: true });
		}

		if (delWithUser.error) {
			return NextResponse.json(
				{ success: false, error: delWithUser.error.message },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (e: unknown) {
		return NextResponse.json(
			{ success: false, error: getErrorMessage(e) },
			{ status: 500 },
		);
	}
}
