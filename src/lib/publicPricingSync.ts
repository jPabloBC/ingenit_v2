import { createClient } from "@supabase/supabase-js";

type PublicPricingRow = {
	service_id: string;
	service_name: string;
	category: string;
	country: string;
	currency?: string;
	base_price: number;
	unit_prices?: Record<string, number>;
	description?: string;
	is_active?: boolean;
};

type PublicPricingFeed =
	| PublicPricingRow[]
	| {
			items?: PublicPricingRow[];
	  };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const buildAdminClient = () => {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	}
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
};

const normalizeFeedRows = (payload: PublicPricingFeed): PublicPricingRow[] => {
	const rows = Array.isArray(payload) ? payload : payload.items || [];
	return rows
		.filter((r) => r?.service_id && r?.country && typeof r.base_price === "number")
		.map((r) => ({
			service_id: r.service_id.trim(),
			service_name: (r.service_name || r.service_id).trim(),
			category: (r.category || "general").trim(),
			country: r.country.trim(),
			currency: (r.currency || "CLP").trim(),
			base_price: Number(r.base_price),
			unit_prices: r.unit_prices || {},
			description: r.description || "",
			is_active: r.is_active !== false,
		}));
};

export const syncPublicPricingFeed = async (feedUrl: string) => {
	const response = await fetch(feedUrl, {
		method: "GET",
		headers: { Accept: "application/json" },
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(`Feed request failed: ${response.status} ${response.statusText}`);
	}

	const raw = (await response.json()) as PublicPricingFeed;
	const rows = normalizeFeedRows(raw);
	if (rows.length === 0) {
		throw new Error("Feed has no valid pricing rows");
	}

	const supabaseAdmin = buildAdminClient();
	const { error } = await supabaseAdmin.from("rt_pricing_library").upsert(rows, {
		onConflict: "service_id,country",
		ignoreDuplicates: false,
	});
	if (error) throw error;

	return {
		total: rows.length,
		countries: [...new Set(rows.map((r) => r.country))],
		services: [...new Set(rows.map((r) => r.service_id))].length,
	};
};

