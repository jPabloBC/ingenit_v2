import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_APP_ID =
	process.env.INGENIT_APP_ID ||
	process.env.NEXT_PUBLIC_INGENIT_APP_ID ||
	"f6afc182-3e8e-43a8-810d-d47509e7c8e1";

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
if (!ADMIN_AVAILABLE) {
	console.error(
		"Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin quotes API",
	);
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

const SANTIAGO_TZ = "America/Santiago";

function toYmdInSantiago(input: Date | string): string {
	const d = input instanceof Date ? input : new Date(input);
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: SANTIAGO_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(d);
}

function adminConfigUnavailableResponse() {
	return NextResponse.json(
		{ error: "Admin quotes API not configured" },
		{ status: 500 },
	);
}

function extractNumberFromQuoteId(quoteId: string): number {
	const match = quoteId.match(/^COTI(\d+)-\d{8}$/);
	if (!match) return 0;
	return Number.parseInt(match[1], 10);
}

function buildQuoteNumber(nextNumber: number): string {
	const today = new Date();
	const y = today.getFullYear();
	const m = String(today.getMonth() + 1).padStart(2, "0");
	const d = String(today.getDate()).padStart(2, "0");
	return `COTI${String(nextNumber).padStart(5, "0")}-${y}${m}${d}`;
}

export async function GET(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		if (id) {
			const { data, error } = await supabaseAdmin
				.from("rt_quotes")
				.select("*")
				.eq("id", id)
				.single();

			if (error) {
				console.error("Admin quotes GET by id error", error);
				return NextResponse.json(
					{ error: error.message || String(error) },
					{ status: 500 },
				);
			}

			return NextResponse.json({ quote: data });
		}

		const { data: quotes, error: quotesError } = await supabaseAdmin
			.from("rt_quotes")
			.select("*")
			.order("created_at", { ascending: false });

		if (quotesError) {
			console.error("Admin quotes GET error", quotesError);
			return NextResponse.json(
				{ error: quotesError.message || String(quotesError) },
				{ status: 500 },
			);
		}

		const quotesList = quotes || [];
		const quotesWithNumber = quotesList.filter(
			(quote) => typeof quote.quote_number === "string" && quote.quote_number,
		);

		const todayYmdSantiago = toYmdInSantiago(new Date());
		const todayCount = quotesList.filter((quote) => {
			const createdAt = (quote as { created_at?: unknown }).created_at;
			if (typeof createdAt !== "string" || !createdAt) return false;
			const createdYmdSantiago = toYmdInSantiago(createdAt);
			return createdYmdSantiago === todayYmdSantiago;
		}).length;

		const lastQuoteNumber = quotesWithNumber
			.map((quote) => extractNumberFromQuoteId(String(quote.quote_number)))
			.reduce((max, current) => Math.max(max, current), 0);

		return NextResponse.json({
			quotes: quotesList,
			statistics: {
				// Total real de cotizaciones, incluso si alguna no tiene quote_number legado.
				total: quotesList.length,
				lastNumber: lastQuoteNumber,
				todayCount,
			},
		});
	} catch (error) {
		console.error("Unexpected admin quotes GET error", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const body = (await request.json()) as {
			id?: string;
			changes?: Record<string, unknown>;
		};

		if (!body.id || !body.changes || Object.keys(body.changes).length === 0) {
			return NextResponse.json(
				{ error: "Missing id or changes" },
				{ status: 400 },
			);
		}

		const changes = {
			...body.changes,
			updated_at: new Date().toISOString(),
		};

		const { data, error } = await supabaseAdmin
			.from("rt_quotes")
			.update(changes)
			.eq("id", body.id)
			.select("*");

		if (error) {
			console.error("Admin quotes PATCH error", error);
			return NextResponse.json(
				{ error: error.message || String(error) },
				{ status: 500 },
			);
		}

		const updatedRows = Array.isArray(data) ? data : [];
		if (updatedRows.length === 0) {
			return NextResponse.json(
				{ error: "No se encontró la cotización para actualizar" },
				{ status: 404 },
			);
		}
		if (updatedRows.length > 1) {
			return NextResponse.json(
				{ error: "Actualización ambigua: se afectaron múltiples cotizaciones" },
				{ status: 409 },
			);
		}

		return NextResponse.json({ quote: updatedRows[0] });
	} catch (error) {
		console.error("Unexpected admin quotes PATCH error", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const body = (await request.json()) as {
			quote?: Record<string, unknown>;
		};

		if (!body.quote || Object.keys(body.quote).length === 0) {
			return NextResponse.json(
				{ error: "Missing quote payload" },
				{ status: 400 },
			);
		}

		const incomingAppId =
			typeof body.quote.app_id === "string" ? body.quote.app_id : "";
		const { data: quoteNumbers, error: numbersError } = await supabaseAdmin
			.from("rt_quotes")
			.select("quote_number")
			.not("quote_number", "is", null);

		if (numbersError) {
			console.error("Admin quotes POST quote_number error", numbersError);
			return NextResponse.json(
				{ error: numbersError.message || String(numbersError) },
				{ status: 500 },
			);
		}

		const maxNumber = (quoteNumbers || [])
			.map((row) =>
				extractNumberFromQuoteId(
					String((row as { quote_number?: string }).quote_number || ""),
				),
			)
			.reduce((max, current) => Math.max(max, current), 0);

		const quoteNumber = buildQuoteNumber(maxNumber + 1);

		const quote = {
			...body.quote,
			app_id: incomingAppId || DEFAULT_APP_ID,
			quote_number: quoteNumber,
			updated_at: new Date().toISOString(),
		};

		const { data, error } = await supabaseAdmin
			.from("rt_quotes")
			.insert(quote)
			.select("*")
			.single();

		if (error) {
			console.error("Admin quotes POST error", error);
			return NextResponse.json(
				{ error: error.message || String(error) },
				{ status: 500 },
			);
		}

		return NextResponse.json({ quote: data });
	} catch (error) {
		console.error("Unexpected admin quotes POST error", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("rt_quotes").delete().eq("id", id);

		if (error) {
			console.error("Admin quotes DELETE error", error);
			return NextResponse.json(
				{ error: error.message || String(error) },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Unexpected admin quotes DELETE error", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
