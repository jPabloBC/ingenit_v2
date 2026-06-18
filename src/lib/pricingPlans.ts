export type PricingPlan = {
	id: "basic" | "pro" | "enterprise";
	name: string;
	monthlySupportHours: number;
	expectedMonthlyHours: number;
	hourlyRate: number;
	overageHourRate: number;
	externalCosts: number;
	marginPercent: number;
	minMonthly: number;
	description: string;
};

export const PRICING_PLANS: PricingPlan[] = [
	{
		id: "basic",
		name: "Plan Básico",
		monthlySupportHours: 5,
		expectedMonthlyHours: 8,
		hourlyRate: 30000,
		overageHourRate: 35000,
		externalCosts: 50000,
		marginPercent: 0.35,
		minMonthly: 300000,
		description: "Mantención básica para sitios simples",
	},
	{
		id: "pro",
		name: "Plan Pro",
		monthlySupportHours: 10,
		expectedMonthlyHours: 15,
		hourlyRate: 35000,
		overageHourRate: 40000,
		externalCosts: 80000,
		marginPercent: 0.4,
		minMonthly: 700000,
		description: "Soporte continuo para sistemas productivos",
	},
	{
		id: "enterprise",
		name: "Plan Enterprise",
		monthlySupportHours: 25,
		expectedMonthlyHours: 35,
		hourlyRate: 45000,
		overageHourRate: 50000,
		externalCosts: 150000,
		marginPercent: 0.5,
		minMonthly: 1500000,
		description: "Alta disponibilidad y soporte prioritario",
	},
];

