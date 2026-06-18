import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const WS_TABLES = [
	"ws_active_sessions",
	"ws_users",
	"ws_email_verifications",
	"ws_businesses",
	"ws_customers",
	"ws_suppliers",
	"ws_categories",
	"ws_products",
	"ws_public_products",
	"ws_stock_movements",
	"ws_sales",
	"ws_sale_items",
	"ws_payments",
	"ws_payment_history",
	"ws_plans",
	"ws_subscriptions",
	"ws_electronic_invoices",
	"ws_electronic_invoice_items",
	"ws_sii_config",
	"ws_sii_logs",
	"ws_usage",
];

function adminClient() {
	return createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
		auth: { persistSession: false },
	});
}

function parseDate(value: unknown): Date | null {
	if (!value) return null;
	if (!(typeof value === "string" || typeof value === "number")) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function detectDateColumns(data: Record<string, unknown>[]) {
	if (!data.length) return [];
	const keys = Object.keys(data[0] || {});
	return keys.filter((key) => {
		if (!/(created_at|updated_at|timestamp|date|_at)$/i.test(key)) return false;
		const sample = data.find((row) => row?.[key]);
		return Boolean(parseDate(sample?.[key]));
	});
}

function toJsonSafe(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map((v) => toJsonSafe(v));
	if (typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = toJsonSafe(v);
		return out;
	}
	return value;
}

export async function GET(req: NextRequest) {
	if (!ADMIN_AVAILABLE) {
		return NextResponse.json(
			{
				error: "Admin WS API not configured",
				details: {
					hasSupabaseUrl: Boolean(SUPABASE_URL),
					hasServiceRoleKey: Boolean(SERVICE_ROLE_KEY),
				},
			},
			{ status: 500 },
		);
	}

	const mode = req.nextUrl.searchParams.get("mode") || "modules";
	const supabaseAdmin = adminClient();

	if (mode === "rows") {
		const table = req.nextUrl.searchParams.get("table") || "";
		if (!WS_TABLES.includes(table)) {
			return NextResponse.json({ error: "Invalid table" }, { status: 400 });
		}

		try {
			const attempts: string[] = [];
			let response = await supabaseAdmin
				.from(table)
				.select("*")
				.order("created_at", { ascending: false })
				.limit(200);
			if (response.error) {
				attempts.push(`order(created_at): ${response.error.message}`);
				response = await supabaseAdmin
					.from(table)
					.select("*")
					.order("updated_at", { ascending: false })
					.limit(200);
			}
			if (response.error) {
				attempts.push(`order(updated_at): ${response.error.message}`);
				response = await supabaseAdmin.from(table).select("*").limit(200);
			}
			if (response.error) {
				attempts.push(`plain select: ${response.error.message}`);
			}

			if (response.error) {
				return NextResponse.json(
					{
						error: `Failed loading ${table}`,
						details: attempts,
					},
					{ status: 500 },
				);
			}

			const safeRows = (response.data || []).map((row) => toJsonSafe(row));
			return NextResponse.json({ rows: safeRows }, { status: 200 });
		} catch (error) {
			return NextResponse.json({ error: String(error) }, { status: 500 });
		}
	}

	try {
		const checks = await Promise.all(
			WS_TABLES.map(async (tableName) => {
				const { count, error } = await supabaseAdmin
					.from(tableName)
					.select("*", { count: "exact", head: true });
				if (error) {
					return {
						table_name: tableName,
						row_count: 0,
						preview_columns: 0,
						last_activity: null,
						_error: error.message,
					};
				}

				const previewResp = await supabaseAdmin
					.from(tableName)
					.select("*")
					.limit(30);
				const preview = (previewResp.data || []) as Record<string, unknown>[];
				const dateColumns = detectDateColumns(preview);
				let latest: Date | null = null;

				preview.forEach((row) => {
					dateColumns.forEach((col) => {
						const d = parseDate(row?.[col]);
						if (d && (!latest || d > latest)) latest = d;
					});
				});

				return {
					table_name: tableName,
					row_count: count || 0,
					preview_columns: preview.length
						? Object.keys(preview[0] || {}).length
						: 0,
					last_activity: latest ? latest.toISOString() : null,
				};
			}),
		);

		return NextResponse.json(
			{ modules: checks.filter(Boolean) },
			{ status: 200 },
		);
	} catch (error) {
		return NextResponse.json({ error: String(error) }, { status: 500 });
	}
}
