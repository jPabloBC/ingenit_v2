import { supabase } from "@/lib/supabaseClient";

export interface MonthlyUsageRow {
	id: string;
	quote_id: string;
	service_id: string | null;
	period_month: string;
	hours_used: number;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface MonthlyUsageSummary {
	quoteId: string;
	periodMonth: string;
	hoursUsed: number;
	rows: MonthlyUsageRow[];
}

const normalizeMonthToPeriodDate = (month: string): string => {
	if (!month) return "";
	if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
	if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month;
	return "";
};

export const getMonthlyUsage = async (
	quoteId: string,
	month: string,
): Promise<MonthlyUsageSummary> => {
	const periodMonth = normalizeMonthToPeriodDate(month);
	if (!quoteId || !periodMonth) {
		return { quoteId, periodMonth, hoursUsed: 0, rows: [] };
	}

	const { data, error } = await supabase
		.from("rt_service_usage")
		.select("*")
		.eq("quote_id", quoteId)
		.eq("period_month", periodMonth)
		.order("created_at", { ascending: true });

	if (error) throw error;

	const rows = (data || []) as MonthlyUsageRow[];
	const hoursUsed = rows.reduce(
		(sum, row) => sum + Math.max(0, Number(row.hours_used || 0)),
		0,
	);

	return {
		quoteId,
		periodMonth,
		hoursUsed,
		rows,
	};
};

export const saveMonthlyUsageEntry = async (input: {
	quoteId: string;
	serviceId?: string | null;
	month: string;
	hoursUsed: number;
	notes?: string;
}) => {
	const periodMonth = normalizeMonthToPeriodDate(input.month);
	if (!input.quoteId || !periodMonth) {
		throw new Error("Datos de consumo mensual incompletos.");
	}

	const payload = {
		quote_id: input.quoteId,
		service_id: input.serviceId || "monthly_usage",
		period_month: periodMonth,
		hours_used: Math.max(0, Number(input.hoursUsed || 0)),
		notes: input.notes || null,
	};

	const { data, error } = await supabase
		.from("rt_service_usage")
		.insert(payload)
		.select()
		.single();

	if (error) throw error;
	return data as MonthlyUsageRow;
};
