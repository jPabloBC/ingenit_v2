import { NextResponse } from "next/server";
import supabaseAdmin, { validateCNUserStatus } from "@/lib/cnAuth";

export async function POST(request: Request) {
	try {
		const authHeader = request.headers.get("authorization") || "";
		const token = authHeader.replace("Bearer ", "");
		if (!token)
			return NextResponse.json({ error: "Missing token" }, { status: 401 });

		const { data: userData, error: userErr } =
			await supabaseAdmin.auth.getUser(token);
		if (userErr || !userData?.user)
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });

		const userId = userData.user.id;
		const res = await validateCNUserStatus(userId);
		if (!res.isValid)
			return NextResponse.json(
				{ error: res.message, status: res.status },
				{ status: 403 },
			);

		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("validate-status error", e);
		return NextResponse.json({ error: "Server error" }, { status: 500 });
	}
}
