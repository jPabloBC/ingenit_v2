import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

export async function GET(
	_request: Request,
	{ params }: { params: { userId: string } },
) {
	console.log(
		"GET /api/admin/cn/users/[userId]/sessions - ADMIN_AVAILABLE:",
		ADMIN_AVAILABLE,
	);

	if (!ADMIN_AVAILABLE) {
		console.error(
			"Admin API not configured - missing SUPABASE_URL or SERVICE_ROLE_KEY",
		);
		return NextResponse.json(
			{ error: "Admin API not configured" },
			{ status: 500 },
		);
	}

	try {
		const { userId } = await params;
		console.log("Fetching sessions for userId:", userId);
		if (!userId) {
			return NextResponse.json({ error: "Missing userId" }, { status: 400 });
		}

		// Fetch all sessions for the user ordered by most recent first
		const { data: sessions, error: sessError } = await supabaseAdmin
			.from("cn_sessions")
			.select("id, user_id, revoked, last_activity, issued_at")
			.eq("user_id", userId)
			.order("last_activity", { ascending: false });

		if (sessError) {
			console.error("Error fetching cn_sessions for user:", sessError);
			return NextResponse.json(
				{ error: sessError.message || sessError },
				{ status: 500 },
			);
		}

		return NextResponse.json({ sessions: sessions || [] });
	} catch (err) {
		console.error("Unexpected error fetching user sessions:", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: { userId: string } },
) {
	if (!ADMIN_AVAILABLE) {
		return NextResponse.json(
			{ error: "Admin API not configured" },
			{ status: 500 },
		);
	}

	try {
		const { userId } = await params;
		const { searchParams } = new URL(request.url);
		const sessionId = searchParams.get("sessionId");
		if (!userId || !sessionId) {
			return NextResponse.json(
				{ error: "Missing userId or sessionId" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabaseAdmin
			.from("cn_sessions")
			.delete()
			.eq("id", sessionId)
			.eq("user_id", userId)
			.select("id")
			.single();

		if (error) {
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		}

		return NextResponse.json({ deleted: data?.id || sessionId });
	} catch (err) {
		console.error("Unexpected error deleting session:", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}
