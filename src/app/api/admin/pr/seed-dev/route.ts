import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
if (!ADMIN_AVAILABLE) {
	console.error(
		"Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin PR seed API",
	);
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

type JsonRecord = Record<string, unknown>;

export async function POST(req: Request) {
	if (!ADMIN_AVAILABLE)
		return NextResponse.json(
			{ error: "Admin API not configured" },
			{ status: 500 },
		);
	try {
		const body = await req.json().catch(() => ({}));
		const email = (body.email || "dev@ingenit.cl")
			.toString()
			.trim()
			.toLowerCase();
		const name = body.name || "Dev Superuser";

		// Try to find existing auth user via admin REST
		const adminAuthUrl = `${SUPABASE_URL?.replace(/\/+$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
		let authUserId: string | null = null;
		let createdAuth = false;

		try {
			const getExisting = await fetch(adminAuthUrl, {
				method: "GET",
				headers: {
					apikey: SERVICE_ROLE_KEY || "",
					Authorization: `Bearer ${SERVICE_ROLE_KEY || ""}`,
				},
			});
			if (getExisting.ok) {
				const json = await getExisting.json();
				let user: JsonRecord | null = null;
				if (Array.isArray(json) && json.length > 0) user = json[0];
				else if (
					json &&
					typeof json === "object" &&
					Array.isArray((json as { users?: unknown[] }).users) &&
					(json as { users: unknown[] }).users.length > 0
				)
					user = (json as { users: JsonRecord[] }).users[0];
				else if (json && typeof json === "object" && "id" in json)
					user = json as JsonRecord;
				if (typeof user?.id === "string") authUserId = user.id;
			}
		} catch (e) {
			console.warn("Could not query admin users list:", e);
		}

		if (!authUserId) {
			// create auth user
			const randomPassword = cryptoRandom();
			const { data: createData, error: createErr } =
				await supabaseAdmin.auth.admin.createUser({
					email,
					password: randomPassword,
					email_confirm: true,
				});
			if (createErr) {
				// If already exists race, try to fetch again
				if (createErr.message?.toLowerCase().includes("already")) {
					try {
						const getExisting2 = await fetch(adminAuthUrl, {
							method: "GET",
							headers: {
								apikey: SERVICE_ROLE_KEY || "",
								Authorization: `Bearer ${SERVICE_ROLE_KEY || ""}`,
							},
						});
						const json2 = await getExisting2.json();
						const user = Array.isArray(json2)
							? json2[0]
							: json2.users?.[0] || json2;
						if (user?.id) authUserId = user.id;
					} catch (e) {
						console.error(
							"Error fetching existing user after create error:",
							e,
						);
					}
				} else {
					return NextResponse.json(
						{ error: `Error creating auth user: ${createErr.message}` },
						{ status: 500 },
					);
				}
			} else if (createData?.user?.id) {
				authUserId = createData.user.id;
				createdAuth = true;
			}
		}

		if (!authUserId)
			return NextResponse.json(
				{ error: "Could not determine auth user id" },
				{ status: 500 },
			);

		// Ensure a pr_users row exists
		const payload: JsonRecord = {
			id: authUserId,
			auth_id: authUserId,
			company_id: null,
			name,
			email,
			phone: null,
			role: "dev",
			status: "active",
			is_active: true,
		};

		// Upsert pattern: try select then insert
		try {
			const { data: existing } = await supabaseAdmin
				.from("pr_users")
				.select("*")
				.eq("id", authUserId)
				.single();
			if (existing) {
				return NextResponse.json(
					{ ok: true, authUserId, createdAuth, pr_user: existing },
					{ status: 200 },
				);
			}
		} catch (_e) {
			// ignore
		}

		const { data: inserted, error: insertErr } = await supabaseAdmin
			.from("pr_users")
			.insert(payload)
			.select()
			.single();
		if (insertErr) {
			console.error("Error inserting pr_users for seed-dev:", insertErr);
			return NextResponse.json(
				{ error: insertErr.message || insertErr },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{ ok: true, authUserId, createdAuth, pr_user: inserted },
			{ status: 201 },
		);
	} catch (err) {
		console.error("Unexpected seed-dev error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

function cryptoRandom() {
	try {
		if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
			return crypto.randomUUID();
		}
	} catch (_e) {}
	return `pwd-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}
