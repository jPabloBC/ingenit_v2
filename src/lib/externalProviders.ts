export type ExternalProviderCategory =
	| "hosting"
	| "database"
	| "storage"
	| "domain"
	| "email"
	| "api"
	| "maps"
	| "payments";

export type ExternalProviderBillingType = "monthly" | "yearly" | "usage";

export interface ExternalProviderCost {
	id: string;
	name: string;
	category: ExternalProviderCategory;
	billingType: ExternalProviderBillingType;
	baseCost: number;
	currency: "USD" | "CLP";
	markupPercent: number;
	quantity: number;
	enabledByDefault: boolean;
	notes: string;
}

export interface ExternalProviderPricingLine extends ExternalProviderCost {
	clientUnitPriceCLP: number;
	subtotalCLP: number;
	baseCostCLP: number;
}

// Tipo de cambio referencial para cotización; debe ajustarse según mercado.
const USD_TO_CLP_REFERENCE = 950;

export const EXTERNAL_PROVIDERS_CATALOG: ExternalProviderCost[] = [
	{
		id: "supabase_pro",
		name: "Supabase Pro",
		category: "database",
		billingType: "monthly",
		baseCost: 25,
		currency: "USD",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo referencial mensual; puede variar por consumo de DB/storage/egress.",
	},
	{
		id: "vercel_pro_seat",
		name: "Vercel Pro Seat",
		category: "hosting",
		billingType: "monthly",
		baseCost: 20,
		currency: "USD",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo referencial por asiento mensual; puede variar según plan/equipo.",
	},
	{
		id: "cloudflare_r2_storage_100gb",
		name: "Cloudflare R2 (100GB estimado)",
		category: "storage",
		billingType: "monthly",
		baseCost: 1.5,
		currency: "USD",
		markupPercent: 1,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo referencial por uso; depende de almacenamiento y operaciones.",
	},
	{
		id: "dominio_cl",
		name: "Dominio .cl",
		category: "domain",
		billingType: "yearly",
		baseCost: 0,
		currency: "CLP",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo anual configurable según registrador y vigencia.",
	},
	{
		id: "email_hosting",
		name: "Email Hosting",
		category: "email",
		billingType: "monthly",
		baseCost: 0,
		currency: "CLP",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo mensual configurable según proveedor y cantidad de casillas.",
	},
	{
		id: "google_maps_api",
		name: "Google Maps API",
		category: "maps",
		billingType: "usage",
		baseCost: 0,
		currency: "CLP",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo variable por uso (requests); definir presupuesto mensual estimado.",
	},
	{
		id: "payment_gateway_admin",
		name: "Administración pasarela de pago",
		category: "payments",
		billingType: "monthly",
		baseCost: 0,
		currency: "CLP",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo mensual configurable; no incluye comisión transaccional.",
	},
	{
		id: "cloudflare_dns_security",
		name: "Cloudflare DNS/Security",
		category: "api",
		billingType: "monthly",
		baseCost: 0,
		currency: "CLP",
		markupPercent: 0.5,
		quantity: 1,
		enabledByDefault: false,
		notes: "Costo mensual configurable según nivel de protección.",
	},
];

export const toCLP = (amount: number, currency: "USD" | "CLP"): number => {
	if (currency === "CLP") return Math.max(0, Number(amount || 0));
	return Math.max(0, Number(amount || 0)) * USD_TO_CLP_REFERENCE;
};

export const calculateExternalProviderLine = (
	provider: ExternalProviderCost,
): ExternalProviderPricingLine => {
	const quantity = Math.max(1, Math.floor(Number(provider.quantity || 1)));
	const baseCostCLP = toCLP(provider.baseCost, provider.currency);
	const clientUnitPriceCLP = baseCostCLP * (1 + Math.max(0, provider.markupPercent));
	const subtotalCLP = clientUnitPriceCLP * quantity;

	return {
		...provider,
		quantity,
		baseCostCLP: Math.round(baseCostCLP),
		clientUnitPriceCLP: Math.round(clientUnitPriceCLP),
		subtotalCLP: Math.round(subtotalCLP),
	};
};

export const calculateExternalProvidersTotal = (
	providers: ExternalProviderCost[],
): { lines: ExternalProviderPricingLine[]; totalCLP: number } => {
	const lines = providers.map(calculateExternalProviderLine);
	return {
		lines,
		totalCLP: lines.reduce((sum, line) => sum + line.subtotalCLP, 0),
	};
};
