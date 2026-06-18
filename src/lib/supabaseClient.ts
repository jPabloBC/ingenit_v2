import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
	console.error("❌ Missing Supabase environment variables:", {
		url: url ? "✅ SET" : "❌ MISSING",
		anonKey: anonKey ? "✅ SET" : "❌ MISSING",
	});
	console.error("📝 Please create a .env.local file with:");
	console.error("NEXT_PUBLIC_SUPABASE_URL=your_supabase_url");
	console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key");
}

export const supabase: SupabaseClient = createClient(
	url || "https://placeholder.supabase.co",
	anonKey || "placeholder-key",
);

// Función helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => {
	return !!(url && anonKey);
};
