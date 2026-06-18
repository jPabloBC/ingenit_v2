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
			name?: string;
			code?: string;
		};
		const name = String(body.name || "").trim();
		const code = String(body.code || "").trim();
		if (!name) {
			return NextResponse.json(
				{ success: false, error: "Nombre de banco requerido" },
				{ status: 400 },
			);
		}

		let existing: {
			id: string;
			name?: string | null;
			code?: string | null;
		} | null = null;
		if (code) {
			const { data } = await supabaseAdmin
				.from("rt_personal_banks")
				.select("id, name, code")
				.eq("code", code)
				.limit(1)
				.maybeSingle();
			if (data?.id)
				existing = data as {
					id: string;
					name?: string | null;
					code?: string | null;
				};
		}
		if (!existing) {
			const { data } = await supabaseAdmin
				.from("rt_personal_banks")
				.select("id, name, code")
				.eq("name", name)
				.limit(1)
				.maybeSingle();
			if (data?.id)
				existing = data as {
					id: string;
					name?: string | null;
					code?: string | null;
				};
		}
		if (existing?.id) {
			return NextResponse.json({ success: true, bank: existing });
		}

		const payloadWithUser: { name: string; code?: string; user_id?: string } = {
			name,
		};
		if (code) payloadWithUser.code = code;
		payloadWithUser.user_id = userId;

		let created: {
			id: string;
			name?: string | null;
			code?: string | null;
		} | null = null;
		let createError: string | null = null;

		{
			const { data, error } = await supabaseAdmin
				.from("rt_personal_banks")
				.insert(payloadWithUser)
				.select("id, name, code")
				.single();
			if (!error && data?.id) {
				created = data as {
					id: string;
					name?: string | null;
					code?: string | null;
				};
			} else {
				createError = error?.message || "No se pudo crear banco";
			}
		}

		// Schema compatibility: rt_personal_banks may not have user_id.
		if (!created && createError?.includes("user_id")) {
			const payloadNoUser: { name: string; code?: string } = { name };
			if (code) payloadNoUser.code = code;
			const { data, error } = await supabaseAdmin
				.from("rt_personal_banks")
				.insert(payloadNoUser)
				.select("id, name, code")
				.single();
			if (!error && data?.id) {
				created = data as {
					id: string;
					name?: string | null;
					code?: string | null;
				};
				createError = null;
			} else {
				createError = error?.message || createError;
			}
		}

		if (!created?.id) {
			return NextResponse.json(
				{ success: false, error: createError || "No se pudo crear banco" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, bank: created });
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
