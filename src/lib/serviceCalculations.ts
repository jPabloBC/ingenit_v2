export interface CalculationParams {
	quantity?: number;
	unit_count?: number;
	meters?: number;
	devices?: number;
	points?: number;
	rooms?: number;
	floors?: number;
	complexity?: "low" | "medium" | "high";
	location?: string;
	country?: string;
}

export interface ServiceCalculation {
	basePrice: number;
	unitPrice: number;
	totalPrice: number;
	monthlyMaintenance?: number;
	monthlyMaintenanceRate?: number;
	breakdown: string[];
}

export type QuotePricingMode = "one_time" | "monthly";

export interface PricingEngineInput {
	mode: QuotePricingMode;
	baseHours: number;
	hourlyRate: number;
	urgency?: "normal" | "high" | "critical";
	minPrice?: number;
	minMonthly?: number;
	monthlySupportHours?: number;
	expectedMonthlyHours?: number;
	overageHourRate?: number;
	complexityFactor: number;
	urgencyFactor: number;
	externalCosts: number;
	marginPercent: number;
	taxPercent: number;
}

export interface PricingEngineBreakdown {
	mode: QuotePricingMode;
	hourly_rate: number;
	base_hours: number;
	monthly_support_hours: number;
	expected_monthly_hours: number;
	overage_hour_rate: number;
	complexity_factor: number;
	urgency_factor: number;
	external_costs: number;
	margin_percent: number;
	tax_percent: number;
	subtotal: number;
	labor_subtotal: number;
	margin_amount: number;
	tax_amount: number;
	internal_labor: number;
	quantity: number;
	quantity_factor: number;
	quantity_discount_percent: number;
	price_before_quantity: number;
	price_after_quantity: number;
	total: number;
}

export interface PricingEngineResult {
	subtotal: number;
	margin: number;
	tax: number;
	total: number;
	breakdown: PricingEngineBreakdown;
}

export type QuantityPricingMode =
	| QuotePricingMode
	| "mixed"
	| "fixed"
	| "hourly";

export interface QuantityPricingInput {
	price: number;
	quantity?: number | null;
	pricingMode?: QuantityPricingMode;
}

export interface QuantityPricingResult {
	quantity: number;
	quantityFactor: number;
	quantityDiscountPercent: number;
	priceBeforeQuantity: number;
	priceAfterQuantity: number;
}

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const sanitizeQuantity = (quantity?: number | null): number => {
	const parsed = Number(quantity ?? 1);
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return Math.floor(parsed);
};

const getProgressiveUnitMultiplier = (unitIndex: number): number => {
	if (unitIndex <= 1) return 1;
	if (unitIndex === 2) return 0.9;
	if (unitIndex === 3) return 0.8;
	if (unitIndex === 4) return 0.7;
	return 0.6;
};

export const calculateProgressiveQuantityPrice = (
	basePrice: number,
	quantity: number,
) => {
	const safeBasePrice = Math.max(0, Number(basePrice || 0));
	const safeQuantity = sanitizeQuantity(quantity);
	let priceAfterQuantity = 0;

	for (let unitIndex = 1; unitIndex <= safeQuantity; unitIndex += 1) {
		priceAfterQuantity += safeBasePrice * getProgressiveUnitMultiplier(unitIndex);
	}

	const linearPrice = safeBasePrice * safeQuantity;
	const quantityFactor = safeBasePrice > 0 ? priceAfterQuantity / safeBasePrice : 1;
	const quantityDiscountPercentAverage =
		linearPrice > 0 ? 1 - priceAfterQuantity / linearPrice : 0;

	return {
		priceBeforeQuantity: roundCurrency(safeBasePrice),
		quantity: safeQuantity,
		priceAfterQuantity: roundCurrency(priceAfterQuantity),
		quantityFactor: roundCurrency(quantityFactor),
		quantityDiscountPercentAverage: roundCurrency(quantityDiscountPercentAverage),
	};
};

export const applyQuantityPricing = ({
	price,
	quantity,
	pricingMode,
}: QuantityPricingInput): QuantityPricingResult => {
	const safePrice = Math.max(0, Number(price || 0));
	const safeQuantity = sanitizeQuantity(quantity);
	// Regla unificada progresiva para one_time, monthly y mixed.
	void pricingMode;
	const progressive = calculateProgressiveQuantityPrice(safePrice, safeQuantity);
	return {
		quantity: progressive.quantity,
		quantityFactor: progressive.quantityFactor,
		quantityDiscountPercent: progressive.quantityDiscountPercentAverage,
		priceBeforeQuantity: progressive.priceBeforeQuantity,
		priceAfterQuantity: progressive.priceAfterQuantity,
	};
};

export const calculatePricingEngine = (
	input: PricingEngineInput,
): PricingEngineResult => {
	const urgencyMap = {
		normal: 1,
		high: 1.25,
		critical: 1.5,
	} as const;

	const mode: QuotePricingMode = input.mode;
	const baseHours = Math.max(0, Number(input.baseHours || 0));
	const hourlyRate = Math.max(0, Number(input.hourlyRate || 0));
	const minPrice = Math.max(0, Number(input.minPrice || 0));
	const minMonthly = Math.max(0, Number(input.minMonthly || 0));
	const monthlySupportHours = Math.max(
		0,
		Number(input.monthlySupportHours ?? baseHours ?? 0),
	);
	const expectedMonthlyHours = Math.max(
		0,
		Number(input.expectedMonthlyHours ?? monthlySupportHours),
	);
	const overageHourRate = Math.max(
		0,
		Number(input.overageHourRate ?? hourlyRate),
	);
	const complexityFactor = Math.max(0, Number(input.complexityFactor || 1));
	const mappedUrgencyFactor =
		urgencyMap[input.urgency || "normal"] || Number(input.urgencyFactor || 1);
	const urgencyFactor = Math.max(0, Number(mappedUrgencyFactor || 1));
	const externalCosts = Math.max(0, Number(input.externalCosts || 0));
	const safeMargin = Math.min(Math.max(Number(input.marginPercent || 0), 0.2), 0.8);
	const taxPercent = Math.max(0, Number(input.taxPercent || 0));

	let laborSubtotal = 0;
	let internalLabor = 0;

	if (mode === "monthly") {
		const baseMonthly = Math.max(monthlySupportHours * hourlyRate, minMonthly);
		const overageHours = Math.max(0, expectedMonthlyHours - monthlySupportHours);
		const overageCost = overageHours * overageHourRate;
		internalLabor = baseMonthly + overageCost;
		laborSubtotal = internalLabor;
	} else {
		const labor = Math.max(baseHours * hourlyRate, minPrice || 0);
		const complexityAdj = labor * complexityFactor;
		const urgencyAdj = complexityAdj * urgencyFactor;
		internalLabor = urgencyAdj;
		laborSubtotal = internalLabor;
	}

	const quantityPricing = applyQuantityPricing({
		price: laborSubtotal,
		quantity: 1,
		pricingMode: mode,
	});
	const laborSubtotalWithQuantity = quantityPricing.priceAfterQuantity;
	const margin = laborSubtotalWithQuantity * safeMargin;
	const subtotal = laborSubtotalWithQuantity + externalCosts;
	const net = subtotal + margin;
	const tax = net * taxPercent;
	const total = net + tax;

	const normalizedLaborSubtotal = roundCurrency(laborSubtotalWithQuantity);
	const normalizedSubtotal = roundCurrency(subtotal);
	const normalizedMargin = roundCurrency(margin);
	const normalizedTax = roundCurrency(tax);
	const normalizedTotal = roundCurrency(total);

	return {
		subtotal: normalizedSubtotal,
		margin: normalizedMargin,
		tax: normalizedTax,
		total: normalizedTotal,
		breakdown: {
			mode,
			hourly_rate: hourlyRate,
			base_hours: baseHours,
			monthly_support_hours: monthlySupportHours,
			expected_monthly_hours: expectedMonthlyHours,
			overage_hour_rate: overageHourRate,
			complexity_factor: complexityFactor,
			urgency_factor: urgencyFactor,
			external_costs: roundCurrency(externalCosts),
			margin_percent: safeMargin,
			tax_percent: taxPercent,
			subtotal: normalizedSubtotal,
			labor_subtotal: normalizedLaborSubtotal,
			margin_amount: normalizedMargin,
			tax_amount: normalizedTax,
			internal_labor: roundCurrency(internalLabor),
			quantity: quantityPricing.quantity,
			quantity_factor: quantityPricing.quantityFactor,
			quantity_discount_percent: quantityPricing.quantityDiscountPercent,
			price_before_quantity: quantityPricing.priceBeforeQuantity,
			price_after_quantity: quantityPricing.priceAfterQuantity,
			total: normalizedTotal,
		},
	};
};

const getMaintenanceRateByService = (serviceKey: string): number => {
	switch (serviceKey) {
		case "mantenimiento_sistemas":
			return 0.18;
		case "soporte_tecnico":
			return 0.2;
		case "consultoria_it":
			return 0.15;
		case "desarrollo_mobile":
			return 0.14;
		case "desarrollo_web":
		case "desarrollo_desktop":
			return 0.12;
		default:
			return 0.1;
	}
};

const withSuggestedMaintenance = (
	serviceKey: string,
	calc: ServiceCalculation,
): ServiceCalculation => {
	if (calc.totalPrice <= 0) return calc;
	const monthlyMaintenanceRate = getMaintenanceRateByService(serviceKey);
	const monthlyMaintenance = Math.round(calc.totalPrice * monthlyMaintenanceRate);
	return {
		...calc,
		monthlyMaintenance,
		monthlyMaintenanceRate,
		breakdown: [
			...calc.breakdown,
			`Mantención sugerida (${Math.round(monthlyMaintenanceRate * 100)}%): $${monthlyMaintenance.toLocaleString("es-CL")} / mes`,
		],
	};
};

import {
	calculatePriceFromPricing,
	getPricingForService,
} from "./pricingService";

export const calculateServicePrice = async (
	serviceId: string,
	params: CalculationParams,
	serviceCategory?: string,
): Promise<ServiceCalculation> => {
	try {
		// Fuente única de verdad: biblioteca de precios en BD.
		const pricing = await getPricingForService(
			serviceId,
			params.country || "Chile",
		);

		if (pricing) {
			const calculationFromLibrary = calculatePriceFromPricing(pricing, params);
			const calculatorKey =
				typeof serviceCategory === "string" && serviceCategory.trim().length > 0
					? serviceCategory.trim()
					: serviceId;
			return withSuggestedMaintenance(calculatorKey, calculationFromLibrary);
		}

		return {
			basePrice: 0,
			unitPrice: 0,
			totalPrice: 0,
			breakdown: [
				`No existe precio activo en rt_pricing_library para "${serviceId}" (${params.country || "Chile"}).`,
			],
		};
	} catch (error) {
		console.error("Error calculando precio:", error);
		return {
			basePrice: 0,
			unitPrice: 0,
			totalPrice: 0,
			breakdown: ["Error al calcular precio"],
		};
	}
};

// Cálculos específicos por servicio
const calculateNetworkInstallation = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	// Precios reales del mercado chileno (en CLP)
	const basePrice = 450000; // CLP - Instalación base
	const pricePerMeter = 2500; // CLP por metro de cable
	const pricePerDevice = 75000; // CLP por switch/router
	const pricePerPoint = 35000; // CLP por punto de red configurado

	const meters = params.meters || 0;
	const devices = params.devices || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice +
			meters * pricePerMeter +
			devices * pricePerDevice +
			points * pricePerPoint) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Instalación base: $${basePrice.toLocaleString("es-CL")} CLP`,
			`Cableado (${meters}m): $${(meters * pricePerMeter).toLocaleString("es-CL")} CLP`,
			`Dispositivos (${devices}): $${(devices * pricePerDevice).toLocaleString("es-CL")} CLP`,
			`Puntos de configuración (${points}): $${(points * pricePerPoint).toLocaleString("es-CL")} CLP`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateStructuredCabling = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	// Precios reales del mercado chileno (en CLP)
	const basePrice = 280000; // CLP - Instalación base
	const pricePerMeter = 1800; // CLP por metro de cable Cat6
	const pricePerPoint = 25000; // CLP por punto de red

	const meters = params.meters || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice + meters * pricePerMeter + points * pricePerPoint) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Instalación base: $${basePrice.toLocaleString("es-CL")} CLP`,
			`Cableado estructurado (${meters}m): $${(meters * pricePerMeter).toLocaleString("es-CL")} CLP`,
			`Puntos de red (${points}): $${(points * pricePerPoint).toLocaleString("es-CL")} CLP`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateWiFiEnterprise = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	// Precios reales del mercado chileno (en CLP)
	const basePrice = 350000; // CLP - Configuración base
	const pricePerAP = 120000; // CLP por Access Point
	const pricePerMeter = 1500; // CLP por metro de cable

	const devices = params.devices || 0;
	const meters = params.meters || 0;

	const totalPrice =
		(basePrice + devices * pricePerAP + meters * pricePerMeter) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración base: $${basePrice.toLocaleString("es-CL")} CLP`,
			`Access Points (${devices}): $${(devices * pricePerAP).toLocaleString("es-CL")} CLP`,
			`Cableado WiFi (${meters}m): $${(meters * pricePerMeter).toLocaleString("es-CL")} CLP`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateSwitchesEnterprise = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 380000;
	const pricePerSwitch = 210000;
	const pricePerPort = 18000;

	const devices = params.devices || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice + devices * pricePerSwitch + points * pricePerPort) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración base: $${basePrice}`,
			`Switches (${devices}): $${devices * pricePerSwitch}`,
			`Puertos configurados (${points}): $${points * pricePerPort}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateVPNEnterprise = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 420000;
	const pricePerUser = 22000;
	const pricePerSite = 180000;

	const devices = params.devices || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice + devices * pricePerUser + points * pricePerSite) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración VPN base: $${basePrice}`,
			`Usuarios VPN (${devices}): $${devices * pricePerUser}`,
			`Sitios remotos (${points}): $${points * pricePerSite}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateNetworkSecurity = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 520000;
	const pricePerDevice = 45000;
	const pricePerPolicy = 55000;

	const devices = params.devices || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice + devices * pricePerDevice + points * pricePerPolicy) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración seguridad base: $${basePrice}`,
			`Dispositivos protegidos (${devices}): $${devices * pricePerDevice}`,
			`Políticas de seguridad (${points}): $${points * pricePerPolicy}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateNetworkMonitoring = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 290000;
	const pricePerDevice = 26000;
	const pricePerAlert = 20000;

	const devices = params.devices || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice + devices * pricePerDevice + points * pricePerAlert) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración monitoreo base: $${basePrice}`,
			`Dispositivos monitoreados (${devices}): $${devices * pricePerDevice}`,
			`Alertas configuradas (${points}): $${points * pricePerAlert}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateBackupEnterprise = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 240000;
	const pricePerGB = 700;
	const pricePerServer = 145000;

	const devices = params.devices || 0;
	const points = params.points || 0; // GB de almacenamiento

	const totalPrice =
		(basePrice + devices * pricePerServer + points * pricePerGB) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración backup base: $${basePrice}`,
			`Servidores (${devices}): $${devices * pricePerServer}`,
			`Almacenamiento (${points}GB): $${points * pricePerGB}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateVoIPEnterprise = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 360000;
	const pricePerExtension = 35000;
	const pricePerTrunk = 130000;

	const devices = params.devices || 0;
	const points = params.points || 0;

	const totalPrice =
		(basePrice + devices * pricePerExtension + points * pricePerTrunk) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Configuración VoIP base: $${basePrice}`,
			`Extensiones (${devices}): $${devices * pricePerExtension}`,
			`Troncales (${points}): $${points * pricePerTrunk}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

// Cálculos para servicios de desarrollo
const calculateWebDevelopment = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 1800000;
	const pricePerPage = 220000;
	const pricePerFeature = 350000;

	const devices = params.devices || 0; // páginas
	const points = params.points || 0; // funcionalidades

	const totalPrice =
		(basePrice + devices * pricePerPage + points * pricePerFeature) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Desarrollo base: $${basePrice}`,
			`Páginas (${devices}): $${devices * pricePerPage}`,
			`Funcionalidades (${points}): $${points * pricePerFeature}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateMobileDevelopment = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 2600000;
	const pricePerScreen = 260000;
	const pricePerFeature = 420000;

	const devices = params.devices || 0; // pantallas
	const points = params.points || 0; // funcionalidades

	const totalPrice =
		(basePrice + devices * pricePerScreen + points * pricePerFeature) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Desarrollo base: $${basePrice}`,
			`Pantallas (${devices}): $${devices * pricePerScreen}`,
			`Funcionalidades (${points}): $${points * pricePerFeature}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateDesktopDevelopment = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 2200000;
	const pricePerModule = 380000;
	const pricePerReport = 180000;

	const devices = params.devices || 0; // módulos
	const points = params.points || 0; // reportes

	const totalPrice =
		(basePrice + devices * pricePerModule + points * pricePerReport) *
		multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Desarrollo base: $${basePrice}`,
			`Módulos (${devices}): $${devices * pricePerModule}`,
			`Reportes (${points}): $${points * pricePerReport}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

// Cálculos para servicios de mantenimiento y consultoría
const calculateSystemMaintenance = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 280000;
	const pricePerDevice = 55000;
	const pricePerHour = 60000;

	const devices = params.devices || 0;
	const points = params.points || 0; // horas

	const totalPrice =
		(basePrice + devices * pricePerDevice + points * pricePerHour) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Mantenimiento base: $${basePrice}`,
			`Dispositivos (${devices}): $${devices * pricePerDevice}`,
			`Horas de soporte (${points}): $${points * pricePerHour}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateITConsulting = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 320000;
	const pricePerHour = 95000;
	const pricePerReport = 180000;

	const devices = params.devices || 0; // horas
	const points = params.points || 0; // reportes

	const totalPrice =
		(basePrice + devices * pricePerHour + points * pricePerReport) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Consultoría base: $${basePrice}`,
			`Horas de consultoría (${devices}): $${devices * pricePerHour}`,
			`Reportes (${points}): $${points * pricePerReport}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};

const calculateTechnicalSupport = (
	params: CalculationParams,
	multiplier: number,
): ServiceCalculation => {
	const basePrice = 160000;
	const pricePerTicket = 45000;
	const pricePerHour = 60000;

	const devices = params.devices || 0; // tickets
	const points = params.points || 0; // horas

	const totalPrice =
		(basePrice + devices * pricePerTicket + points * pricePerHour) * multiplier;

	return {
		basePrice,
		unitPrice: totalPrice,
		totalPrice,
		breakdown: [
			`Soporte base: $${basePrice}`,
			`Tickets (${devices}): $${devices * pricePerTicket}`,
			`Horas de soporte (${points}): $${points * pricePerHour}`,
			`Multiplicador regional: ${multiplier.toFixed(2)}x`,
		],
	};
};
