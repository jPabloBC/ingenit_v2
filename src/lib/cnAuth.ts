import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

export async function validateCNUserStatus(userId: string) {
	if (!userId)
		return { isValid: false, status: null, message: "Missing user id" };
	try {
		const { data, error } = await supabaseAdmin
			.from("cn_users")
			.select("status")
			.eq("id", userId)
			.single();

		if (error) {
			return { isValid: false, status: null, message: String(error) };
		}

		if (!data)
			return { isValid: false, status: null, message: "User not found" };

		if (data.status !== "active") {
			const messages: Record<string, string> = {
				inactive: "Cuenta desactivada",
				pending: "Cuenta pendiente de activación",
			};
			return {
				isValid: false,
				status: data.status,
				message: messages[data.status] || "Access denied",
			};
		}

		return { isValid: true, status: data.status, message: "OK" };
	} catch (e) {
		return { isValid: false, status: null, message: String(e) };
	}
}

export default supabaseAdmin;
