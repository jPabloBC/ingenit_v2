import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createServerSupabase() {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { persistSession: false },
	});
}

export async function GET(req: Request) {
	try {
		const server = createServerSupabase();
		if (!server) {
			return NextResponse.json(
				{ error: "server missing SUPABASE_URL or SERVICE_ROLE_KEY" },
				{ status: 500 },
			);
		}

		const authHeader = req.headers.get("authorization") || "";
		const token = authHeader.replace(/^Bearer\s+/i, "");
		if (!token) {
			return NextResponse.json({ error: "missing auth token" }, { status: 401 });
		}

		const { data: userData, error: userError } = await server.auth.getUser(token);
		if (userError || !userData?.user?.id) {
			return NextResponse.json({ error: "invalid auth token" }, { status: 401 });
		}

		const { data, error } = await server
			.from("pr_companies")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) {
			return NextResponse.json(
				{ error: "failed to fetch companies", detail: error.message },
				{ status: 500 },
			);
		}

		return NextResponse.json({ companies: data || [] }, { status: 200 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export const runtime = "nodejs";
