import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

// Middleware to call from API routes when you need to block non-active CN users.
export async function cnStatusMiddleware(req: NextRequest) {
	try {
		const authHeader = req.headers.get("authorization") || "";
		const token = authHeader.replace("Bearer ", "");
		if (!token)
			return NextResponse.json({ error: "No token" }, { status: 401 });

		const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
			token as string,
		);
		if (userErr || !userData?.user)
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });

		const userId = userData.user.id;
		const { data, error } = await supabaseAdmin
			.from("cn_users")
			.select("status")
			.eq("id", userId)
			.single();

		if (error || !data)
			return NextResponse.json({ error: "User not found" }, { status: 403 });
		if (data.status !== "active")
			return NextResponse.json(
				{ error: "Account not active", status: data.status },
				{ status: 403 },
			);

		return NextResponse.next();
	} catch (_e) {
		return NextResponse.json({ error: "Middleware error" }, { status: 500 });
	}
}
