import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

function adminConfigUnavailableResponse() {
	return NextResponse.json(
		{ error: "Admin API not configured" },
		{ status: 500 },
	);
}

export async function GET(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	const { searchParams } = new URL(request.url);
	const mode = searchParams.get("mode") || "all";

	if (mode === "accounts") {
		const { data, error } = await supabaseAdmin
			.from("rt_personal_accounts")
			.select("*");
		if (error) {
			return NextResponse.json(
				{ error: error.message || String(error) },
				{ status: 500 },
			);
		}
		return NextResponse.json({ success: true, accounts: data || [] });
	}

	if (mode === "transactions") {
		const { data, error } = await supabaseAdmin
			.from("rt_personal_transactions")
			.select("*")
			.order("date", { ascending: false });
		if (error) {
			return NextResponse.json(
				{ error: error.message || String(error) },
				{ status: 500 },
			);
		}
		return NextResponse.json({ success: true, transactions: data || [] });
	}

	if (mode === "banks") {
		const { data, error } = await supabaseAdmin
			.from("rt_personal_banks")
			.select("id, name, code, logo_url");
		if (error) {
			return NextResponse.json(
				{ error: error.message || String(error) },
				{ status: 500 },
			);
		}
		return NextResponse.json({ success: true, banks: data || [] });
	}

	const [accountsRes, txRes, banksRes] = await Promise.all([
		supabaseAdmin.from("rt_personal_accounts").select("*"),
		supabaseAdmin
			.from("rt_personal_transactions")
			.select("*")
			.order("date", { ascending: false }),
		supabaseAdmin.from("rt_personal_banks").select("id, name, code, logo_url"),
	]);

	if (accountsRes.error || txRes.error || banksRes.error) {
		return NextResponse.json(
			{
				error:
					accountsRes.error?.message ||
					txRes.error?.message ||
					banksRes.error?.message ||
					"Error loading admin transactions data",
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({
		success: true,
		accounts: accountsRes.data || [],
		transactions: txRes.data || [],
		banks: banksRes.data || [],
	});
}
