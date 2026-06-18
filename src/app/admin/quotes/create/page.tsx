"use client";

import {
	ArrowLeft,
	ChevronDown,
	ChevronLeft,
	Edit,
	Eye,
	FileText,
	Mail,
	Minus,
	Plus,
	Save,
	Search,
	Send,
	User,
	XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalculationModal from "@/components/CalculationModal";
import {
	COMPLETE_GEO_DATA,
	getCommunesByRegion,
	getRegionsByCountry,
} from "@/lib/completeGeoData";
import { getCurrencyByCountry } from "@/lib/currencyData";
import {
	calculateActualMargin,
	calculateSalePrice,
	formatEquipmentPrice,
	getAllCategories,
} from "@/lib/equipmentPricing";
import {
	downloadProfessionalPDF,
	previewProfessionalPDF,
	sendProfessionalPDFByEmail,
} from "@/lib/pdfGeneratorProfessional";
import {
	calculateExternalProvidersTotal,
	type ExternalProviderCost,
	EXTERNAL_PROVIDERS_CATALOG,
} from "@/lib/externalProviders";
import { generateQuoteId } from "@/lib/quoteIdGenerator";
import {
	applyQuantityPricing,
	type CalculationParams,
	calculatePricingEngine,
	calculateServicePrice,
	type PricingEngineBreakdown,
	type ServiceCalculation,
} from "@/lib/serviceCalculations";
import { PRICING_PLANS } from "@/lib/pricingPlans";
import {
	getMonthlyUsage,
	saveMonthlyUsageEntry,
	type MonthlyUsageSummary,
} from "@/lib/monthlyUsage";
import { supabase } from "@/lib/supabaseClient";

const QUOTES_DEBUG = false;
const debugLog = (...args: unknown[]) => {
	if (QUOTES_DEBUG) console.log(...args);
};
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Service {
	id: string;
	name: string;
	description: string;
	price: number;
	category: string;
	pricingMode?: "fixed" | "hourly" | "monthly" | "mixed";
	recurring?: boolean;
	monthlyMaintenance?: number;
	monthlyMaintenanceBeforeQuantity?: number;
	monthlyMaintenanceAfterQuantity?: number;
	monthlyMaintenanceRate?: number;
	quantity?: number;
	quantityFactor?: number;
	quantityDiscountPercent?: number;
	priceBeforeQuantity?: number;
	priceAfterQuantity?: number;
	calculationParams?: CalculationParams;
	calculatedPrice?: ServiceCalculation;
	granularComponents?: unknown[];
	configurations?: unknown[];
	packageId?: string;
	packageName?: string;
	complexity?: string;
	estimatedDuration?: string;
	originalService?: unknown;
	linkedServiceId?: string;
	serviceKind?: "one_time" | "monthly_component";
}

const sanitizeQuantity = (value?: number | null): number => {
	const parsed = Number(value ?? 1);
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return Math.floor(parsed);
};

const resolveServicePricingMode = (service: Service): "one_time" | "monthly" | "mixed" => {
	if (service.pricingMode === "monthly" || service.recurring) return "monthly";
	if (service.pricingMode === "mixed") return "mixed";
	return "one_time";
};

const isRecurringLikeService = (service: Service): boolean =>
	service.serviceKind === "monthly_component" ||
	service.pricingMode === "monthly" ||
	service.recurring === true ||
	service.category === "servicios_mantencion";

const buildMonthlyCompanionService = (service: Service): Service | null => {
	const monthlyBase = Number(
		service.monthlyMaintenanceAfterQuantity ??
			service.monthlyMaintenance ??
			0,
	);
	if (monthlyBase <= 0) return null;
	const quantity = sanitizeQuantity(service.quantity);
	return {
		id: `${service.id}__monthly`,
		name: `Mantención ${service.name}`,
		description:
			(service.description || "").trim() ||
			"Servicio mensual de mantención asociado al servicio principal.",
		price: monthlyBase,
		category: "servicios_mantencion",
		pricingMode: "monthly",
		recurring: true,
		quantity,
		priceBeforeQuantity: Number(service.monthlyMaintenanceBeforeQuantity ?? monthlyBase),
		priceAfterQuantity: monthlyBase,
		linkedServiceId: service.id,
		serviceKind: "monthly_component",
	};
};

interface Equipment {
	id: string;
	name: string;
	description: string;
	internet_link: string;
	purchase_price: number;
	sale_price: number;
	quantity: number;
	category: string;
	notes?: string;
}

interface Client {
	id: string;
	rut: string;
	name: string;
	email: string;
	phone: string;
	phone_country: string;
	address: string;
	region: string;
	commune: string;
	country: string;
	created_at: string;
}

interface QuoteForm {
	client_rut: string;
	client_name: string;
	client_email: string;
	client_phone: string;
	client_phone_country: string;
	client_address: string;
	client_region: string;
	client_commune: string;
	client_country: string;
	project_title: string;
	project_description: string;
	selected_services: Service[];
	selected_equipment: Equipment[];
	total_amount: number;
	equipment_total: number;
	valid_until: string;
	notes: string;
	terms_conditions: string;
	discount_type: "percentage" | "amount" | "none";
	discount_value: number;
	discount_description: string;
	validity_message: string; // Mensaje personalizado de validez para el PDF
	subscription_enabled?: boolean;
	subscription_monthly?: number;
	subscription_description?: string;
	subscription_auto_from_services?: boolean;
	include_services_in_quote?: boolean;
	include_subscription_in_quote?: boolean;
	quote_type?: "one_time" | "monthly_recurring" | "mixed";
	pricing_breakdown?: PricingEngineBreakdown | Record<string, unknown> | null;
	pricing_hourly_rate?: number;
	pricing_base_hours?: number;
	pricing_monthly_support_hours?: number;
	pricing_expected_monthly_hours?: number;
	pricing_overage_hour_rate?: number;
	pricing_external_costs?: number;
	pricing_external_costs_manual_override?: boolean;
	pricing_margin_percent?: number;
	pricing_tax_percent?: number;
	pricing_urgency?: "normal" | "high" | "critical";
	pricing_plan_id?: "basic" | "pro" | "enterprise" | "manual";
	pricing_plan_name?: string;
	iva_included?: boolean;
}

interface MonthlyUsageState {
	periodMonth: string;
	hoursIncluded: number;
	hoursUsed: number;
	extraHours: number;
	overageHourRate: number;
	overageCost: number;
}

const COUNTRY_CODES = [
	{ code: "+56", name: "Chile", flag: "🇨🇱" },
	{ code: "+54", name: "Argentina", flag: "🇦🇷" },
	{ code: "+57", name: "Colombia", flag: "🇨🇴" },
	{ code: "+52", name: "México", flag: "🇲🇽" },
	{ code: "+51", name: "Perú", flag: "🇵🇪" },
	{ code: "+593", name: "Ecuador", flag: "🇪🇨" },
	{ code: "+58", name: "Venezuela", flag: "🇻🇪" },
	{ code: "+595", name: "Paraguay", flag: "🇵🇾" },
	{ code: "+598", name: "Uruguay", flag: "🇺🇾" },
	{ code: "+591", name: "Bolivia", flag: "🇧🇴" },
	{ code: "+1", name: "Estados Unidos", flag: "🇺🇸" },
	{ code: "+34", name: "España", flag: "🇪🇸" },
	{ code: "+33", name: "Francia", flag: "🇫🇷" },
	{ code: "+49", name: "Alemania", flag: "🇩🇪" },
	{ code: "+44", name: "Reino Unido", flag: "🇬🇧" },
	{ code: "+39", name: "Italia", flag: "🇮🇹" },
	{ code: "+55", name: "Brasil", flag: "🇧🇷" },
];

const SERVICE_CATEGORIES = {
	desarrollo_web: {
		name: "Desarrollo Web",
		services: [
			{
				id: "desarrollo_pagina_web",
				name: "Desarrollo Página Web",
				description: "Desarrollo por página web",
				price: 25000,
				category: "desarrollo_web",
			},
			{
				id: "desarrollo_landing_page",
				name: "Desarrollo Landing Page",
				description: "Landing page profesional",
				price: 150000,
				category: "desarrollo_web",
			},
			{
				id: "desarrollo_sitio_corporativo",
				name: "Desarrollo Sitio Corporativo",
				description: "Sitio web corporativo completo",
				price: 800000,
				category: "desarrollo_web",
			},
			{
				id: "desarrollo_ecommerce",
				name: "Desarrollo E-commerce",
				description: "Tienda online completa",
				price: 1200000,
				category: "desarrollo_web",
			},
			{
				id: "desarrollo_cms_wordpress",
				name: "Desarrollo CMS WordPress",
				description: "Sistema de gestión de contenido",
				price: 400000,
				category: "desarrollo_web",
			},
			{
				id: "desarrollo_portal_web",
				name: "Desarrollo Portal Web",
				description: "Portal web empresarial",
				price: 2000000,
				category: "desarrollo_web",
			},
			{
				id: "desarrollo_cms_personalizado",
				name: "Desarrollo CMS Personalizado",
				description: "CMS personalizado a medida",
				price: 800000,
				category: "desarrollo_web",
			},
		],
	},
	desarrollo_mobile: {
		name: "Desarrollo Móvil",
		services: [
			{
				id: "desarrollo_app_movil_ios",
				name: "Desarrollo App iOS",
				description: "Aplicación móvil para iOS",
				price: 2500000,
				category: "desarrollo_mobile",
			},
			{
				id: "desarrollo_app_movil_android",
				name: "Desarrollo App Android",
				description: "Aplicación móvil para Android",
				price: 2200000,
				category: "desarrollo_mobile",
			},
			{
				id: "desarrollo_app_hibrida",
				name: "Desarrollo App Híbrida",
				description: "Aplicación móvil multiplataforma",
				price: 1800000,
				category: "desarrollo_mobile",
			},
			{
				id: "desarrollo_app_react_native",
				name: "Desarrollo App React Native",
				description: "Aplicación con React Native",
				price: 2000000,
				category: "desarrollo_mobile",
			},
			{
				id: "desarrollo_app_flutter",
				name: "Desarrollo App Flutter",
				description: "Aplicación con Flutter",
				price: 1900000,
				category: "desarrollo_mobile",
			},
			{
				id: "desarrollo_app_web_progressive",
				name: "Desarrollo App Web Progressive",
				description: "Aplicación web progresiva",
				price: 800000,
				category: "desarrollo_mobile",
			},
		],
	},
	desarrollo_backend: {
		name: "Desarrollo Backend",
		services: [
			{
				id: "desarrollo_api_rest",
				name: "Desarrollo API REST",
				description: "API REST completa",
				price: 600000,
				category: "desarrollo_backend",
			},
			{
				id: "desarrollo_api_graphql",
				name: "Desarrollo API GraphQL",
				description: "API GraphQL completa",
				price: 800000,
				category: "desarrollo_backend",
			},
			{
				id: "desarrollo_microservicios",
				name: "Desarrollo Microservicios",
				description: "Arquitectura de microservicios",
				price: 1200000,
				category: "desarrollo_backend",
			},
			{
				id: "desarrollo_backend_nodejs",
				name: "Desarrollo Backend Node.js",
				description: "Backend con Node.js",
				price: 500000,
				category: "desarrollo_backend",
			},
			{
				id: "desarrollo_backend_python",
				name: "Desarrollo Backend Python",
				description: "Backend con Python",
				price: 600000,
				category: "desarrollo_backend",
			},
			{
				id: "desarrollo_backend_java",
				name: "Desarrollo Backend Java",
				description: "Backend con Java",
				price: 800000,
				category: "desarrollo_backend",
			},
			{
				id: "desarrollo_backend_php",
				name: "Desarrollo Backend PHP",
				description: "Backend con PHP",
				price: 400000,
				category: "desarrollo_backend",
			},
		],
	},
	desarrollo_frontend: {
		name: "Desarrollo Frontend",
		services: [
			{
				id: "desarrollo_frontend_react",
				name: "Desarrollo Frontend React",
				description: "Frontend con React",
				price: 400000,
				category: "desarrollo_frontend",
			},
			{
				id: "desarrollo_frontend_vue",
				name: "Desarrollo Frontend Vue",
				description: "Frontend con Vue.js",
				price: 350000,
				category: "desarrollo_frontend",
			},
			{
				id: "desarrollo_frontend_angular",
				name: "Desarrollo Frontend Angular",
				description: "Frontend con Angular",
				price: 500000,
				category: "desarrollo_frontend",
			},
			{
				id: "diseño_ui_ux",
				name: "Diseño UI/UX",
				description: "Diseño de interfaz de usuario",
				price: 80000,
				category: "desarrollo_frontend",
			},
			{
				id: "diseño_prototipo",
				name: "Diseño de Prototipo",
				description: "Prototipo interactivo",
				price: 120000,
				category: "desarrollo_frontend",
			},
			{
				id: "diseño_sistema_design",
				name: "Diseño Sistema Design",
				description: "Sistema de diseño completo",
				price: 200000,
				category: "desarrollo_frontend",
			},
			{
				id: "diseño_logo_branding",
				name: "Diseño Logo y Branding",
				description: "Logo y identidad visual",
				price: 150000,
				category: "desarrollo_frontend",
			},
		],
	},
	integracion_automatizacion: {
		name: "Integración y Automatización",
		services: [
			{
				id: "integracion_api_terceros",
				name: "Integración API Terceros",
				description: "Integración con APIs externas",
				price: 400000,
				category: "integracion_automatizacion",
			},
			{
				id: "integracion_payment_gateway",
				name: "Integración Payment Gateway",
				description: "Integración de pasarela de pago",
				price: 300000,
				category: "integracion_automatizacion",
			},
			{
				id: "integracion_crm",
				name: "Integración CRM",
				description: "Integración con sistema CRM",
				price: 500000,
				category: "integracion_automatizacion",
			},
			{
				id: "integracion_erp",
				name: "Integración ERP",
				description: "Integración con sistema ERP",
				price: 800000,
				category: "integracion_automatizacion",
			},
			{
				id: "automatizacion_procesos",
				name: "Automatización de Procesos",
				description: "Automatización de procesos empresariales",
				price: 600000,
				category: "integracion_automatizacion",
			},
			{
				id: "desarrollo_bot_chat",
				name: "Desarrollo Bot Chat",
				description: "Chatbot inteligente",
				price: 300000,
				category: "integracion_automatizacion",
			},
			{
				id: "integracion_webhook",
				name: "Integración Webhook",
				description: "Integración de webhooks",
				price: 200000,
				category: "integracion_automatizacion",
			},
		],
	},
	testing_quality: {
		name: "Testing y Calidad",
		services: [
			{
				id: "testing_unitario",
				name: "Testing Unitario",
				description: "Pruebas unitarias",
				price: 150000,
				category: "testing_quality",
			},
			{
				id: "testing_integracion",
				name: "Testing de Integración",
				description: "Pruebas de integración",
				price: 250000,
				category: "testing_quality",
			},
			{
				id: "testing_automation",
				name: "Testing Automation",
				description: "Automatización de pruebas",
				price: 400000,
				category: "testing_quality",
			},
			{
				id: "testing_seguridad",
				name: "Testing de Seguridad",
				description: "Auditoría de seguridad",
				price: 500000,
				category: "testing_quality",
			},
			{
				id: "testing_performance",
				name: "Testing de Performance",
				description: "Pruebas de rendimiento",
				price: 300000,
				category: "testing_quality",
			},
			{
				id: "testing_usabilidad",
				name: "Testing de Usabilidad",
				description: "Pruebas de usabilidad",
				price: 200000,
				category: "testing_quality",
			},
		],
	},
	devops_deployment: {
		name: "DevOps y Deployment",
		services: [
			{
				id: "configuracion_ci_cd",
				name: "Configuración CI/CD",
				description: "Pipeline de integración continua",
				price: 400000,
				category: "devops_deployment",
			},
			{
				id: "configuracion_docker",
				name: "Configuración Docker",
				description: "Contenedores Docker",
				price: 250000,
				category: "devops_deployment",
			},
			{
				id: "configuracion_kubernetes",
				name: "Configuración Kubernetes",
				description: "Cluster de Kubernetes",
				price: 600000,
				category: "devops_deployment",
			},
			{
				id: "configuracion_jenkins",
				name: "Configuración Jenkins",
				description: "Servidor Jenkins",
				price: 300000,
				category: "devops_deployment",
			},
			{
				id: "deployment_produccion",
				name: "Deployment a Producción",
				description: "Despliegue en producción",
				price: 200000,
				category: "devops_deployment",
			},
			{
				id: "monitoreo_aplicacion",
				name: "Monitoreo de Aplicación",
				description: "Monitoreo y alertas",
				price: 150000,
				category: "devops_deployment",
			},
		],
	},
	soluciones_empresariales: {
		name: "Soluciones Empresariales",
		services: [
			{
				id: "desarrollo_erp_personalizado",
				name: "Desarrollo ERP Personalizado",
				description: "Sistema ERP a medida",
				price: 5000000,
				category: "soluciones_empresariales",
			},
			{
				id: "desarrollo_crm_personalizado",
				name: "Desarrollo CRM Personalizado",
				description: "Sistema CRM a medida",
				price: 3000000,
				category: "soluciones_empresariales",
			},
			{
				id: "desarrollo_sistema_inventario",
				name: "Desarrollo Sistema Inventario",
				description: "Sistema de gestión de inventario",
				price: 2000000,
				category: "soluciones_empresariales",
			},
			{
				id: "desarrollo_sistema_facturacion",
				name: "Desarrollo Sistema Facturación",
				description: "Sistema de facturación",
				price: 1500000,
				category: "soluciones_empresariales",
			},
			{
				id: "desarrollo_sistema_contabilidad",
				name: "Desarrollo Sistema Contabilidad",
				description: "Sistema de contabilidad",
				price: 1800000,
				category: "soluciones_empresariales",
			},
			{
				id: "desarrollo_sistema_rrhh",
				name: "Desarrollo Sistema RRHH",
				description: "Sistema de recursos humanos",
				price: 2500000,
				category: "soluciones_empresariales",
			},
		],
	},
	desarrollo_especializado: {
		name: "Desarrollo Especializado",
		services: [
			{
				id: "desarrollo_ia_machine_learning",
				name: "Desarrollo IA/Machine Learning",
				description: "Sistemas de inteligencia artificial",
				price: 3000000,
				category: "desarrollo_especializado",
			},
			{
				id: "desarrollo_blockchain",
				name: "Desarrollo Blockchain",
				description: "Aplicaciones blockchain",
				price: 2500000,
				category: "desarrollo_especializado",
			},
			{
				id: "desarrollo_iot",
				name: "Desarrollo IoT",
				description: "Sistemas de Internet de las Cosas",
				price: 1800000,
				category: "desarrollo_especializado",
			},
			{
				id: "desarrollo_realidad_aumentada",
				name: "Desarrollo Realidad Aumentada",
				description: "Aplicaciones de realidad aumentada",
				price: 2000000,
				category: "desarrollo_especializado",
			},
			{
				id: "desarrollo_chatbot_ai",
				name: "Desarrollo Chatbot AI",
				description: "Chatbot con inteligencia artificial",
				price: 800000,
				category: "desarrollo_especializado",
			},
			{
				id: "desarrollo_sistema_recomendacion",
				name: "Desarrollo Sistema Recomendación",
				description: "Sistema de recomendaciones",
				price: 1500000,
				category: "desarrollo_especializado",
			},
		],
	},
	consultoria_planificacion: {
		name: "Consultoría y Planificación",
		services: [
			{
				id: "consultoria_arquitectura",
				name: "Consultoría Arquitectura",
				description: "Consultoría en arquitectura de software",
				price: 150000,
				category: "consultoria_planificacion",
			},
			{
				id: "consultoria_tecnologia",
				name: "Consultoría Tecnología",
				description: "Consultoría en tecnologías",
				price: 120000,
				category: "consultoria_planificacion",
			},
			{
				id: "planificacion_proyecto",
				name: "Planificación de Proyecto",
				description: "Planificación y gestión de proyectos",
				price: 100000,
				category: "consultoria_planificacion",
			},
			{
				id: "analisis_requerimientos",
				name: "Análisis de Requerimientos",
				description: "Análisis y documentación de requerimientos",
				price: 80000,
				category: "consultoria_planificacion",
			},
			{
				id: "documentacion_tecnica",
				name: "Documentación Técnica",
				description: "Documentación técnica del proyecto",
				price: 60000,
				category: "consultoria_planificacion",
			},
			{
				id: "capacitacion_usuarios",
				name: "Capacitación de Usuarios",
				description: "Capacitación y entrenamiento",
				price: 80000,
				category: "consultoria_planificacion",
			},
		],
	},
	servicios_ti: {
		name: "Servicios TI",
		services: [
			{
				id: "instalacion_redes",
				name: "Instalación de Redes",
				description: "Instalación completa de infraestructura de red",
				price: 550000,
				category: "servicios_ti",
			},
			{
				id: "cableado_estructurado",
				name: "Cableado Estructurado",
				description: "Instalación de cableado estructurado para redes",
				price: 250000,
				category: "servicios_ti",
			},
			{
				id: "wifi_enterprise",
				name: "WiFi Enterprise",
				description: "Configuración de redes WiFi empresariales",
				price: 400000,
				category: "servicios_ti",
			},
			{
				id: "switches_enterprise",
				name: "Switches Enterprise",
				description: "Configuración y gestión de switches empresariales",
				price: 350000,
				category: "servicios_ti",
			},
			{
				id: "vpn_enterprise",
				name: "VPN Enterprise",
				description: "Configuración de redes privadas virtuales",
				price: 300000,
				category: "servicios_ti",
			},
			{
				id: "seguridad_red",
				name: "Seguridad de Red",
				description: "Implementación de medidas de seguridad de red",
				price: 500000,
				category: "servicios_ti",
			},
			{
				id: "monitoreo_red",
				name: "Monitoreo de Red",
				description: "Sistemas de monitoreo y alertas de red",
				price: 200000,
				category: "servicios_ti",
			},
			{
				id: "backup_enterprise",
				name: "Backup Enterprise",
				description: "Sistemas de respaldo y recuperación de datos",
				price: 250000,
				category: "servicios_ti",
			},
			{
				id: "voip_enterprise",
				name: "VoIP Enterprise",
				description: "Configuración de telefonía IP empresarial",
				price: 300000,
				category: "servicios_ti",
			},
			{
				id: "mantenimiento_sistemas",
				name: "Mantenimiento de Sistemas",
				description: "Mantenimiento preventivo y correctivo de sistemas",
				price: 150000,
				category: "servicios_ti",
			},
			{
				id: "consultoria_it",
				name: "Consultoría IT",
				description: "Asesoramiento en tecnología y estrategia digital",
				price: 120000,
				category: "servicios_ti",
			},
			{
				id: "soporte_tecnico",
				name: "Soporte Técnico",
				description: "Soporte técnico especializado",
				price: 80000,
				category: "servicios_ti",
			},
		],
	},
	servicios_mantencion: {
		name: "Servicios de Mantención",
		services: [
			{
				id: "mantencion_web",
				name: "Mantención Web",
				description: "Mantención continua de sitio web y actualizaciones menores",
				price: 0,
				category: "servicios_mantencion",
				pricingMode: "monthly",
				recurring: true,
			},
			{
				id: "mantencion_app",
				name: "Mantención App",
				description: "Mantención mensual de app y soporte evolutivo",
				price: 0,
				category: "servicios_mantencion",
				pricingMode: "monthly",
				recurring: true,
			},
			{
				id: "mantencion_backend",
				name: "Mantención Backend",
				description: "Soporte y ajustes mensuales de backend y base de datos",
				price: 0,
				category: "servicios_mantencion",
				pricingMode: "monthly",
				recurring: true,
			},
			{
				id: "soporte_ti_mensual",
				name: "Soporte TI Mensual",
				description: "Bolsa mensual de soporte TI con atención recurrente",
				price: 0,
				category: "servicios_mantencion",
				pricingMode: "monthly",
				recurring: true,
			},
		],
	},
};

export default function CreateQuotePage() {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(1);
	const [selectedCategory, setSelectedCategory] = useState<string>("");
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [showCountryDropdown, setShowCountryDropdown] = useState(false);
	const [_showGeoDropdown, setShowGeoDropdown] = useState(false);
	const [phoneValidation, setPhoneValidation] = useState({
		isValid: false,
		message: "",
	});
	const [showCalculationModal, setShowCalculationModal] = useState(false);
	const [selectedServiceForCalculation, setSelectedServiceForCalculation] =
		useState<Service | null>(null);
	const [isViewMode, setIsViewMode] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
	// === FLAGS DE EDICIÓN / EQUIPOS ===
	const [loadedFromDB, setLoadedFromDB] = useState(false);
	const [equipmentDirty, setEquipmentDirty] = useState(false);
	const [selectedPlanId, setSelectedPlanId] = useState<
		"manual" | "basic" | "pro" | "enterprise"
	>("manual");
	const [showExternalProviders, setShowExternalProviders] = useState(false);
	const [usageMonth, setUsageMonth] = useState(
		new Date().toISOString().slice(0, 7),
	);
	const [usageHoursInput, setUsageHoursInput] = useState("0");
	const [usageNotesInput, setUsageNotesInput] = useState("");
	const [monthlyUsageSummary, setMonthlyUsageSummary] =
		useState<MonthlyUsageSummary | null>(null);
	const [usageSaving, setUsageSaving] = useState(false);
	const [externalProviders, setExternalProviders] = useState<ExternalProviderCost[]>(
		EXTERNAL_PROVIDERS_CATALOG.map((provider) => ({ ...provider })),
	);

	const [formData, setFormData] = useState<QuoteForm>({
		client_rut: "",
		client_name: "",
		client_email: "",
		client_phone: "",
		client_phone_country: "+56",
		client_address: "",
		client_region: "",
		client_commune: "",
		client_country: "Chile",
		project_title: "",
		project_description: "",
		selected_services: [] as Service[],
		selected_equipment: [] as Equipment[],
		total_amount: 0,
		equipment_total: 0,
		valid_until: "",
		notes: "",
		terms_conditions: "",
		discount_type: "none",
		discount_value: 0,
		discount_description: "",
		subscription_auto_from_services: true,
		include_services_in_quote: true,
		include_subscription_in_quote: true,
		quote_type: "one_time",
		pricing_breakdown: null,
		pricing_hourly_rate: 35000,
		pricing_base_hours: 10,
		pricing_monthly_support_hours: 10,
		pricing_expected_monthly_hours: 10,
		pricing_overage_hour_rate: 40000,
		pricing_external_costs: 0,
		pricing_external_costs_manual_override: true,
		pricing_margin_percent: 0.4,
		pricing_tax_percent: 0,
		pricing_urgency: "normal",
		pricing_plan_id: "manual",
		pricing_plan_name: "",
		validity_message:
			'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos',
	});

	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState<Client[]>([]);
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [rutValidation, setRutValidation] = useState({
		isValid: false,
		message: "",
	});

	// Estado para el formulario de equipos
	const [equipmentForm, setEquipmentForm] = useState({
		name: "",
		description: "",
		internet_link: "",
		category: "",
		purchase_price: "",
		sale_price: "",
		quantity: "1",
		notes: "",
	});

	// Estado para edición inline de equipos existentes
	const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(
		null,
	);
	const [equipmentEditForm, setEquipmentEditForm] = useState<
		Partial<Equipment>
	>({});

	const hydrateExternalProvidersFromBreakdown = useCallback(
		(breakdown: QuoteForm["pricing_breakdown"]) => {
			const raw = (breakdown as Record<string, unknown> | null)?.external_providers;
			if (!Array.isArray(raw) || raw.length === 0) return;

			setExternalProviders((prev) => {
				const normalizedRaw = raw
					.filter((item) => item && typeof item === "object")
					.map((item) => item as Record<string, unknown>);

				const usedRawIndexes = new Set<number>();

				const updatedCatalog = prev.map((provider) => {
					const foundIndex = normalizedRaw.findIndex((item, idx) => {
						if (usedRawIndexes.has(idx)) return false;
						const itemId = String(item.id || "").trim();
						const itemName = String(item.name || "").trim().toLowerCase();
						return (
							itemId === provider.id ||
							(itemName.length > 0 &&
								itemName === String(provider.name).trim().toLowerCase())
						);
					});

					if (foundIndex < 0) return provider;
					usedRawIndexes.add(foundIndex);

					const found = normalizedRaw[foundIndex];
					const nextProvider: ExternalProviderCost = {
						...provider,
						enabledByDefault: true,
						baseCost: Number(found.base_cost ?? provider.baseCost),
						markupPercent: Number(found.markup_percent ?? provider.markupPercent),
						quantity: Math.max(1, Number(found.quantity ?? provider.quantity)),
						currency:
							(found.currency === "USD" || found.currency === "CLP"
								? found.currency
								: provider.currency) as "USD" | "CLP",
					};
					return nextProvider;
				});

				const customProviders: ExternalProviderCost[] = normalizedRaw
					.map((item, idx) => ({ item, idx }))
					.filter(({ idx }) => !usedRawIndexes.has(idx))
					.map(({ item }, idx) => {
						const currency =
							item.currency === "USD" || item.currency === "CLP"
								? (item.currency as "USD" | "CLP")
								: "CLP";
						const billingTypeRaw = String(item.billing_type || "monthly");
						const billingType =
							billingTypeRaw === "yearly" || billingTypeRaw === "usage"
								? billingTypeRaw
								: "monthly";
						return {
							id: String(item.id || `external_custom_${idx}`),
							name: String(item.name || "Proveedor externo"),
							category: "api",
							billingType,
							baseCost: Math.max(0, Number(item.base_cost || 0)),
							currency,
							markupPercent: Math.max(0, Number(item.markup_percent || 0)),
							quantity: Math.max(1, Number(item.quantity || 1)),
							enabledByDefault: true,
							notes: String(item.notes || "Proveedor cargado desde cotización."),
						} satisfies ExternalProviderCost;
					});

				return [...updatedCatalog, ...customProviders];
			});
		},
		[],
	);

	const updateFormData = (field: keyof QuoteForm, value: unknown) => {
		debugLog(`🔄 ACTUALIZANDO: ${field} =`, value);

		setFormData((prev) => {
			// Usamos un casteo para permitir claves dinámicas (p. ej. "subscription_monthly")
			const updated = {
				...prev,
				[field]: value,
				...(field === "subscription_monthly"
					? { subscription_auto_from_services: false }
					: {}),
			};

			// Guardar inmediatamente en sessionStorage
			try {
				sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
				debugLog("💾 GUARDADO:", updated);
			} catch (error) {
				console.error("❌ ERROR GUARDANDO:", error);
			}
			setEquipmentDirty(true);

			return updated as QuoteForm;
		});
	};

	useEffect(() => {
		hydrateExternalProvidersFromBreakdown(formData.pricing_breakdown);
		const breakdown = formData.pricing_breakdown as Record<string, unknown> | null;
		const fromBreakdown = breakdown?.external_providers;
		if (
			Array.isArray(fromBreakdown) &&
			fromBreakdown.length > 0 &&
			formData.pricing_external_costs_manual_override !== false
		) {
			setFormData((prev) => ({
				...prev,
				pricing_external_costs_manual_override: false,
			}));
		}
	}, [
		formData.pricing_breakdown,
		formData.pricing_external_costs_manual_override,
		hydrateExternalProvidersFromBreakdown,
	]);

	const toggleExternalProvider = (providerId: string) => {
		setExternalProviders((prev) =>
			prev.map((provider) =>
				provider.id === providerId
					? { ...provider, enabledByDefault: !provider.enabledByDefault }
					: provider,
			),
		);
	};

	const updateExternalProviderField = (
		providerId: string,
		field: "baseCost" | "markupPercent" | "quantity",
		value: number,
	) => {
		setExternalProviders((prev) =>
			prev.map((provider) => {
				if (provider.id !== providerId) return provider;
				if (field === "quantity") {
					return { ...provider, quantity: Math.max(1, Math.floor(value || 1)) };
				}
				if (field === "markupPercent") {
					return { ...provider, markupPercent: Math.max(0, value || 0) };
				}
				return { ...provider, baseCost: Math.max(0, value || 0) };
			}),
		);
	};

	// Función de debug para verificar el estado actual
	const _debugFormData = () => {
		debugLog("=== DEBUG FORM DATA ===");
		debugLog("Estado actual de formData:", formData);
		debugLog("SessionStorage:", sessionStorage.getItem("quoteFormData"));
		debugLog("Servicios seleccionados:", formData.selected_services);
		debugLog("Equipos seleccionados:", formData.selected_equipment);
		debugLog("Total servicios:", formData.total_amount);
		debugLog("Total equipos:", formData.equipment_total);
		debugLog("Modo edición:", isEditMode);
		debugLog("ID de cotización actual:", currentQuoteId);
		debugLog("URL params:", window.location.search);
	};

	// Función para forzar recálculo manual
	const _forceRecalculate = () => {
		debugLog("🔄 FORZANDO RECÁLCULO MANUAL");
		recalculateTotals();
	};

	// Función para verificar modo edición
	const _checkEditMode = () => {
		const urlParams = new URLSearchParams(window.location.search);
		const urlEditMode = urlParams.get("edit") === "true";
		const urlQuoteId = urlParams.get("id");
		const sessionEditMode = sessionStorage.getItem("editMode") === "true";
		const sessionQuoteId = sessionStorage.getItem("editQuoteId");

		debugLog("🔍 VERIFICACIÓN MANUAL DE MODO EDICIÓN:", {
			urlEditMode,
			urlQuoteId,
			sessionEditMode,
			sessionQuoteId,
			isEditMode,
			currentQuoteId,
			finalDecision:
				(urlEditMode && urlQuoteId) || (sessionEditMode && sessionQuoteId),
		});
	};

	// Función para limpiar todos los datos de la cotización
	const clearQuoteData = () => {
		// Limpiar sessionStorage
		sessionStorage.removeItem("quoteFormData");
		sessionStorage.removeItem("tiQuoteData");
		sessionStorage.removeItem("selectedTIService");
		sessionStorage.removeItem("originalTIService");

		// Resetear el formulario
		setFormData({
			client_rut: "",
			client_name: "",
			client_email: "",
			client_phone: "",
			client_phone_country: "+56",
			client_address: "",
			client_region: "",
			client_commune: "",
			client_country: "",
			project_title: "",
			project_description: "",
			selected_services: [],
			selected_equipment: [],
			total_amount: 0,
			equipment_total: 0,
			valid_until: "",
			notes: "",
			terms_conditions: "",
			discount_type: "none",
			discount_value: 0,
			discount_description: "",
			subscription_auto_from_services: true,
			include_services_in_quote: true,
			include_subscription_in_quote: true,
			quote_type: "one_time",
			pricing_breakdown: null,
			pricing_hourly_rate: 35000,
			pricing_base_hours: 10,
			pricing_monthly_support_hours: 10,
			pricing_expected_monthly_hours: 10,
			pricing_overage_hour_rate: 40000,
			pricing_external_costs: 0,
			pricing_margin_percent: 0.4,
			pricing_tax_percent: 0,
			pricing_urgency: "normal",
			pricing_plan_id: "manual",
			pricing_plan_name: "",
			validity_message:
				'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos',
		});

		// Resetear el paso actual
		setCurrentStep(1);

		debugLog("🗑️ Todos los datos de la cotización han sido limpiados");
	};

	// Función para limpiar datos solo para nueva cotización real
	const clearForNewQuote = () => {
		debugLog("🆕 LIMPIANDO PARA NUEVA COTIZACIÓN REAL");
		clearQuoteData();

		// Limpiar modo edición
		sessionStorage.removeItem("editMode");
		sessionStorage.removeItem("editQuoteId");
		setIsEditMode(false);
		setCurrentQuoteId(null);
	};

	// Función para confirmar cancelación
	const confirmCancelQuote = () => {
		const hasData =
			formData.client_name ||
			formData.client_rut ||
			formData.project_title ||
			formData.selected_services.length > 0 ||
			formData.selected_equipment.length > 0;

		if (hasData) {
			const confirmed = window.confirm(
				"⚠️ ¿Estás seguro de que deseas cancelar esta cotización?\n\n" +
					"Se eliminarán todos los datos ingresados:\n" +
					"• Datos del cliente\n" +
					"• Servicios seleccionados\n" +
					"• Equipos seleccionados\n" +
					"• Cálculos realizados\n\n" +
					"Esta acción no se puede deshacer.",
			);

			if (confirmed) {
				clearQuoteData();
				// Redirigir a la lista de cotizaciones
				router.push("/admin/quotes");
			}
		} else {
			// Si no hay datos, ir directamente a la lista
			router.push("/admin/quotes");
		}
	};

	const addService = (service: Service) => {
		debugLog("➕ AGREGANDO SERVICIO:", service);

		setFormData((prev) => {
			if (prev.selected_services.find((s) => s.id === service.id)) {
				debugLog("⚠️ Servicio ya existe");
				return prev;
			}

			const normalizedService: Service = {
				...service,
				serviceKind: service.serviceKind || "one_time",
			};
			let newServices = [...prev.selected_services, normalizedService];
			if (
				normalizedService.serviceKind !== "monthly_component" &&
				normalizedService.pricingMode !== "monthly" &&
				normalizedService.recurring !== true
			) {
				const monthlyCompanion = buildMonthlyCompanionService(normalizedService);
				if (monthlyCompanion) {
					const existingMonthlyIndex = newServices.findIndex(
						(s) => s.id === monthlyCompanion.id,
					);
					if (existingMonthlyIndex >= 0) {
						newServices = newServices.map((s, idx) =>
							idx === existingMonthlyIndex ? monthlyCompanion : s,
						);
					} else {
						newServices = [...newServices, monthlyCompanion];
					}
				}
			}

			const updated = {
				...prev,
				selected_services: newServices,
			};

			// Guardar inmediatamente
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
			debugLog("✅ SERVICIO AGREGADO:", updated);
			setEquipmentDirty(true);

			return updated;
		});

		// Recalcular totales después de agregar
		setTimeout(() => recalculateTotals(), 0);
	};

	// Función para limpiar todos los servicios seleccionados
	const clearAllServices = () => {
		updateFormData("selected_services", []);
		updateFormData("total_amount", 0);
		debugLog("Todos los servicios han sido limpiados");
	};

	// Función para agregar paquete (reemplaza servicios existentes)
	const _addPackage = (packageServices: Service[]) => {
		debugLog("📦 AGREGANDO PAQUETE:", packageServices);

		setFormData((prev) => {
			const updated = {
				...prev,
				selected_services: packageServices,
			};

			// Guardar inmediatamente
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
			debugLog("✅ PAQUETE AGREGADO:", updated);
			setEquipmentDirty(true);

			return updated;
		});

		// Recalcular totales después de agregar paquete
		setTimeout(() => recalculateTotals(), 0);
	};

	const toggleService = (service: Service) => {
		debugLog(
			"🔄 toggleService llamado para:",
			service.name,
			"ID:",
			service.id,
		);

		// Mejorar la lógica de comparación para servicios editados
		const isSelected = formData.selected_services.find((s) => {
			// Comparar por ID exacto
			if (s.id === service.id) return true;
			// Comparar por nombre si los IDs no coinciden (para servicios editados)
			if (s.name === service.name && s.category === service.category)
				return true;
			return false;
		});

		debugLog(
			"🔍 Servicio encontrado como seleccionado:",
			isSelected ? "SÍ" : "NO",
		);

		if (isSelected) {
			debugLog("❌ Removiendo servicio:", service.name);
			removeService(service.id);
		} else {
			debugLog("➕ Agregando servicio:", service.name);
			const isMonthlyRecurringService =
				service.pricingMode === "monthly" || service.recurring === true;
			if (isMonthlyRecurringService) {
				updateFormData("quote_type", "monthly_recurring");
				if (selectedPlanId === "manual") {
					setSelectedPlanId("pro");
				}
				updateFormData("subscription_enabled", true);
			}

			// Para servicios TI, permitir agregar directamente si ya tiene precio
			if (service.category === "servicios_ti") {
				if (service.price && service.price > 0) {
					// Si ya tiene precio, agregarlo directamente
					addService(service);
				} else {
					// Si no tiene precio, redirigir al sistema granular
					sessionStorage.setItem("selectedTIService", JSON.stringify(service));
					sessionStorage.setItem("quoteFormData", JSON.stringify(formData));

					// Preservar parámetros de edición si estamos en modo edición
					const urlParams = new URLSearchParams(window.location.search);
					const editMode = urlParams.get("edit");
					const quoteId = urlParams.get("id");

					debugLog("🔍 DEBUG NAVEGACIÓN A TI-SERVICES:");
					debugLog("- URL actual:", window.location.href);
					debugLog("- editMode detectado:", editMode);
					debugLog("- quoteId detectado:", quoteId);
					debugLog("- isEditMode state:", isEditMode);
					debugLog("- currentQuoteId state:", currentQuoteId);

					let tiServicesUrl = "/admin/ti-services";
					if (editMode === "true" && quoteId) {
						tiServicesUrl += `?edit=true&id=${quoteId}`;
						debugLog(
							"🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE EDICIÓN:",
							{ editMode, quoteId },
						);
					} else if (isEditMode && currentQuoteId) {
						// Fallback: usar el estado si los parámetros de URL no están disponibles
						tiServicesUrl += `?edit=true&id=${currentQuoteId}`;
						debugLog(
							"🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE ESTADO:",
							{ editMode: "true", quoteId: currentQuoteId },
						);
					} else {
						debugLog("⚠️ NO SE DETECTARON PARÁMETROS DE EDICIÓN");
					}

					router.push(tiServicesUrl);
					return;
				}
			} else if (service.category === "servicios_mantencion") {
				// Servicios de mantención: se agregan directo como recurrentes y usan plan.
				addService({
					...service,
					price: Math.max(
						0,
						Number(pricingPreview.primary.total || formData.subscription_monthly || 0),
					),
				});
			} else {
				// Para otros servicios, usar el sistema de cálculo
				if (service.calculatedPrice) {
					addService(service);
				} else {
					// Si no tiene precio calculado, abrir el modal de cálculo
					openCalculationModal(service);
				}
			}
		}
	};

	const removeService = (serviceId: string) => {
		const newServices = formData.selected_services.filter(
			(s) => s.id !== serviceId,
		);
		updateFormData("selected_services", newServices);
		// Recalcular totales después de remover
		setTimeout(() => recalculateTotals(), 0);
	};

	const getCurrentCurrency = () => {
		return getCurrencyByCountry(formData.client_country);
	};

	const formatCurrencyLocal = (amount: number) => {
		return formatEquipmentPrice(amount, formData.client_country);
	};

	const parseMoneyInput = (rawValue: string): number => {
		const cleaned = rawValue
			.replace(/\./g, "")
			.replace(/,/g, ".")
			.replace(/[^0-9.-]/g, "");
		return Number.parseFloat(cleaned) || 0;
	};

	const formatMoneyInputValue = (value?: number): string => {
		const numericValue = Number(value || 0);
		if (!numericValue) return "";
		return formatCurrencyLocal(numericValue);
	};

	const getUrgencyFactor = (
		urgency: QuoteForm["pricing_urgency"],
	): number => {
		switch (urgency) {
			case "high":
				return 1.2;
			case "critical":
				return 1.5;
			case "normal":
			default:
				return 1.0;
		}
	};

	const selectedExternalProviders = useMemo(
		() => externalProviders.filter((provider) => provider.enabledByDefault),
		[externalProviders],
	);

	const externalProvidersPricing = useMemo(
		() => calculateExternalProvidersTotal(selectedExternalProviders),
		[selectedExternalProviders],
	);

	const effectiveExternalCosts = useMemo(() => {
		if (formData.pricing_external_costs_manual_override !== false) {
			return Number(formData.pricing_external_costs || 0);
		}
		return Number(externalProvidersPricing.totalCLP || 0);
	}, [
		formData.pricing_external_costs_manual_override,
		formData.pricing_external_costs,
		externalProvidersPricing.totalCLP,
	]);

	useEffect(() => {
		if (formData.pricing_external_costs_manual_override !== false) return;
		const nextValue = Number(externalProvidersPricing.totalCLP || 0);
		if (Number(formData.pricing_external_costs || 0) === nextValue) return;
		setFormData((prev) => ({
			...prev,
			pricing_external_costs: nextValue,
		}));
	}, [
		formData.pricing_external_costs_manual_override,
		formData.pricing_external_costs,
		externalProvidersPricing.totalCLP,
	]);

	const usageState = useMemo<MonthlyUsageState>(() => {
		const baseBreakdown =
			(formData.pricing_breakdown as Record<string, unknown> | null) || {};
		const hoursIncluded =
			Number(
				(baseBreakdown.monthly_support_hours as number | undefined) ??
					formData.pricing_monthly_support_hours ??
					0,
			) || 0;
		const overageHourRate =
			Number(
				(baseBreakdown.overage_hour_rate as number | undefined) ??
					formData.pricing_overage_hour_rate ??
					0,
			) || 0;
		const hoursUsed = Number(monthlyUsageSummary?.hoursUsed || 0);
		const extraHours = Math.max(0, hoursUsed - hoursIncluded);
		const overageCost = extraHours * overageHourRate;
		return {
			periodMonth: usageMonth,
			hoursIncluded,
			hoursUsed,
			extraHours,
			overageHourRate,
			overageCost,
		};
	}, [
		formData.pricing_breakdown,
		formData.pricing_monthly_support_hours,
		formData.pricing_overage_hour_rate,
		monthlyUsageSummary?.hoursUsed,
		usageMonth,
	]);

	const refreshMonthlyUsage = useCallback(async () => {
		if (!currentQuoteId) {
			setMonthlyUsageSummary(null);
			return;
		}
		try {
			const data = await getMonthlyUsage(currentQuoteId, usageMonth);
			setMonthlyUsageSummary(data);
		} catch (error) {
			console.error("Error cargando consumo mensual:", error);
		}
	}, [currentQuoteId, usageMonth]);

	useEffect(() => {
		refreshMonthlyUsage();
	}, [refreshMonthlyUsage]);

	const handleSaveMonthlyUsage = async () => {
		if (!currentQuoteId) {
			alert("Primero guarda la cotización para registrar consumo mensual.");
			return;
		}
		try {
			setUsageSaving(true);
			await saveMonthlyUsageEntry({
				quoteId: currentQuoteId,
				month: usageMonth,
				hoursUsed: Number(usageHoursInput || 0),
				notes: usageNotesInput,
			});
			setUsageHoursInput("0");
			setUsageNotesInput("");
			await refreshMonthlyUsage();
			alert("✅ Consumo mensual guardado");
		} catch (error) {
			console.error("Error guardando consumo mensual:", error);
			alert("❌ No se pudo guardar el consumo mensual");
		} finally {
			setUsageSaving(false);
		}
	};

	const buildExternalProvidersForBreakdown = useCallback(() => {
		return externalProvidersPricing.lines.map((line) => ({
			id: line.id,
			name: line.name,
			category: line.category,
			billing_type: line.billingType,
			base_cost: line.baseCost,
			currency: line.currency,
			markup_percent: line.markupPercent,
			quantity: line.quantity,
			client_price: line.clientUnitPriceCLP,
			subtotal: line.subtotalCLP,
			notes: line.notes,
		}));
	}, [externalProvidersPricing.lines]);

	const pricingBreakdownForOutput = useMemo(() => {
		const base =
			(formData.pricing_breakdown as Record<string, unknown> | null) || {};
		const usageHoursIncluded =
			Number(
				(base.monthly_support_hours as number | undefined) ??
					formData.pricing_monthly_support_hours ??
					0,
			) || 0;
		const usageOverageRate =
			Number(
				(base.overage_hour_rate as number | undefined) ??
					formData.pricing_overage_hour_rate ??
					0,
			) || 0;
		const usageHoursUsed = Number(monthlyUsageSummary?.hoursUsed || 0);
		const usageExtraHours = Math.max(0, usageHoursUsed - usageHoursIncluded);
		const usageOverageCost = usageExtraHours * usageOverageRate;
		return {
			...base,
			external_providers: buildExternalProvidersForBreakdown(),
			external_costs: Number(effectiveExternalCosts || 0),
			monthly_usage:
				usageHoursUsed > 0
					? {
							period_month: usageMonth,
							hours_included: usageHoursIncluded,
							hours_used: usageHoursUsed,
							extra_hours: usageExtraHours,
							overage_hour_rate: usageOverageRate,
							overage_cost: usageOverageCost,
						}
					: null,
		};
	}, [
		formData.pricing_breakdown,
		formData.pricing_monthly_support_hours,
		formData.pricing_overage_hour_rate,
		buildExternalProvidersForBreakdown,
		effectiveExternalCosts,
		monthlyUsageSummary?.hoursUsed,
		usageMonth,
	]);

	const quoteSummary = useMemo(() => {
		const services = formData.selected_services || [];
		const includeServices = formData.include_services_in_quote !== false;
		const includeSubscription = formData.include_subscription_in_quote !== false;

		const oneTimeLines: Array<{
			id: string;
			name: string;
			category: string;
			quantity: number;
			basePrice: number;
			lineTotal: number;
		}> = [];
		const monthlyLines: Array<{
			id: string;
			name: string;
			category: string;
			quantity: number;
			baseMonthly: number;
			lineTotalMonthly: number;
			planName?: string;
			description?: string;
		}> = [];

		for (const service of services) {
			const quantity = sanitizeQuantity(service.quantity);
			const serviceMode = resolveServicePricingMode(service);
			const hasMonthlyProfile =
				service.pricingMode === "monthly" ||
				service.recurring === true ||
				service.category === "servicios_mantencion" ||
				service.serviceKind === "monthly_component";

			const oneTimeBase = Number(service.priceBeforeQuantity ?? service.price ?? 0);
			const oneTimeTotal =
				typeof service.priceAfterQuantity === "number" &&
				Number.isFinite(service.priceAfterQuantity)
					? Number(service.priceAfterQuantity || 0)
					: applyQuantityPricing({
							price: oneTimeBase,
							quantity,
							pricingMode: serviceMode === "mixed" ? "one_time" : serviceMode,
						}).priceAfterQuantity;

			const monthlyBase = Number(
				service.monthlyMaintenanceBeforeQuantity ??
					service.monthlyMaintenance ??
					(serviceMode === "monthly" ? service.priceBeforeQuantity ?? service.price : 0) ??
					0,
			);
			const monthlyTotal =
				typeof service.monthlyMaintenanceAfterQuantity === "number" &&
				Number.isFinite(service.monthlyMaintenanceAfterQuantity)
					? Number(service.monthlyMaintenanceAfterQuantity || 0)
					: monthlyBase > 0
						? applyQuantityPricing({
								price: monthlyBase,
								quantity,
								pricingMode: "monthly",
							}).priceAfterQuantity
						: 0;

			const categoryLabel = String(service.category || "general");

			if (includeServices && (serviceMode === "one_time" || serviceMode === "mixed")) {
				oneTimeLines.push({
					id: service.id,
					name: service.name,
					category: categoryLabel,
					quantity,
					basePrice: oneTimeBase,
					lineTotal: oneTimeTotal,
				});
			}

			if (includeSubscription && (hasMonthlyProfile || serviceMode === "mixed")) {
				const resolvedMonthly =
					monthlyTotal > 0
						? monthlyTotal
						: serviceMode === "monthly"
							? oneTimeTotal
							: 0;
				if (resolvedMonthly > 0) {
					monthlyLines.push({
						id: service.id,
						name: service.name,
						category: categoryLabel,
						quantity,
						baseMonthly: monthlyBase > 0 ? monthlyBase : oneTimeBase,
						lineTotalMonthly: resolvedMonthly,
						planName:
							formData.pricing_plan_id && formData.pricing_plan_id !== "manual"
								? (formData.pricing_plan_name || formData.pricing_plan_id)
								: undefined,
						description: service.description || "",
					});
				}
			}
		}

		const externalProvidersRaw = (
			pricingBreakdownForOutput as Record<string, unknown>
		).external_providers;
		const externalProviderLines = Array.isArray(externalProvidersRaw)
			? externalProvidersRaw.map((provider) => {
					const item = provider as Record<string, unknown>;
					return {
						id: String(item.id || ""),
						name: String(item.name || item.id || "Proveedor"),
						currency: String(item.currency || "CLP"),
						baseCost: Number(item.base_cost || 0),
						markupPercent: Number(item.markup_percent || 0),
						quantity: Math.max(1, Number(item.quantity || 1)),
						subtotal: Number(item.subtotal || 0),
					};
				})
			: [];

		const usage = (
			pricingBreakdownForOutput as Record<string, unknown>
		).monthly_usage as Record<string, unknown> | null;
		const usageOverageTotal = usage ? Number(usage.overage_cost || 0) : 0;

		const oneTimeServicesTotal = oneTimeLines.reduce(
			(sum, line) => sum + Number(line.lineTotal || 0),
			0,
		);
		const monthlyServicesTotal = monthlyLines.reduce(
			(sum, line) => sum + Number(line.lineTotalMonthly || 0),
			0,
		);
		const externalProvidersTotal =
			externalProviderLines.length > 0
				? externalProviderLines.reduce(
						(sum, line) => sum + Number(line.subtotal || 0),
						0,
					)
				: 0;

		const monthlyFinalTotal =
			includeSubscription
				? monthlyServicesTotal + externalProvidersTotal + usageOverageTotal
				: 0;
		const oneTimeTotalWithEquipment =
			oneTimeServicesTotal + Number(formData.equipment_total || 0);
		const quoteGrandTotal = oneTimeTotalWithEquipment + monthlyFinalTotal;

		return {
			oneTimeLines,
			monthlyLines,
			externalProviderLines,
			monthlyUsage: usage,
			oneTimeServicesTotal,
			oneTimeTotalWithEquipment,
			monthlyServicesTotal,
			externalProvidersTotal,
			usageOverageTotal,
			monthlyFinalTotal,
			quoteGrandTotal,
			includeServices,
			includeSubscription,
		};
	}, [
		formData.selected_services,
		formData.equipment_total,
		formData.pricing_plan_id,
		formData.pricing_plan_name,
		formData.include_services_in_quote,
		formData.include_subscription_in_quote,
		pricingBreakdownForOutput,
		effectiveExternalCosts,
	]);

	const quoteSummaryForBreakdown = useMemo(
		() => ({
			one_time_total: quoteSummary.oneTimeServicesTotal,
			one_time_total_with_equipment: quoteSummary.oneTimeTotalWithEquipment,
			monthly_services_total: quoteSummary.monthlyServicesTotal,
			external_providers_total: quoteSummary.externalProvidersTotal,
			usage_overage_total: quoteSummary.usageOverageTotal,
			monthly_final_total: quoteSummary.monthlyFinalTotal,
			quote_grand_total: quoteSummary.quoteGrandTotal,
		}),
		[quoteSummary],
	);

	const pricingPreview = useMemo(() => {
		const quoteType = formData.quote_type || "one_time";
		const urgencyFactor = getUrgencyFactor(formData.pricing_urgency);
		const baseInput = {
			baseHours: Number(formData.pricing_base_hours || 0),
			hourlyRate: Number(formData.pricing_hourly_rate || 0),
			monthlySupportHours: Number(formData.pricing_monthly_support_hours || 0),
			expectedMonthlyHours: Number(formData.pricing_expected_monthly_hours || 0),
			overageHourRate: Number(formData.pricing_overage_hour_rate || 0),
			complexityFactor: 1,
			urgencyFactor,
			urgency: formData.pricing_urgency || "normal",
			externalCosts: Number(effectiveExternalCosts || 0),
			marginPercent: Number(formData.pricing_margin_percent || 0),
			taxPercent: Number(formData.pricing_tax_percent || 0),
			minPrice: 0,
			minMonthly: 0,
		} as const;

		const oneTime = calculatePricingEngine({
			mode: "one_time",
			...baseInput,
		});
		const monthly = calculatePricingEngine({
			mode: "monthly",
			...baseInput,
		});

		if (quoteType === "monthly_recurring") {
			return { mode: "monthly_recurring" as const, primary: monthly };
		}
		if (quoteType === "mixed") {
			return { mode: "mixed" as const, primary: monthly, secondary: oneTime };
		}
		return { mode: "one_time" as const, primary: oneTime };
	}, [
		formData.pricing_hourly_rate,
		formData.pricing_base_hours,
		formData.pricing_monthly_support_hours,
		formData.pricing_expected_monthly_hours,
		formData.pricing_overage_hour_rate,
		effectiveExternalCosts,
		formData.pricing_margin_percent,
		formData.pricing_tax_percent,
		formData.pricing_urgency,
		formData.quote_type,
	]);

	useEffect(() => {
		if (selectedPlanId === "manual") {
			setFormData((prev) => {
				if (
					prev.pricing_plan_id === "manual" &&
					(prev.pricing_plan_name ?? "") === ""
				) {
					return prev;
				}
				return {
					...prev,
					pricing_plan_id: "manual",
					pricing_plan_name: "",
				};
			});
			return;
		}

		const plan = PRICING_PLANS.find((p) => p.id === selectedPlanId);
		if (!plan) return;

		setFormData((prev) => {
			const next = {
				...prev,
				pricing_monthly_support_hours: plan.monthlySupportHours,
				pricing_expected_monthly_hours: plan.expectedMonthlyHours,
				pricing_hourly_rate: plan.hourlyRate,
				pricing_overage_hour_rate: plan.overageHourRate,
				pricing_external_costs: plan.externalCosts,
				pricing_margin_percent: plan.marginPercent,
				pricing_plan_id: plan.id,
				pricing_plan_name: plan.name,
			};
			const unchanged =
				prev.pricing_monthly_support_hours === next.pricing_monthly_support_hours &&
				prev.pricing_expected_monthly_hours ===
					next.pricing_expected_monthly_hours &&
				prev.pricing_hourly_rate === next.pricing_hourly_rate &&
				prev.pricing_overage_hour_rate === next.pricing_overage_hour_rate &&
				prev.pricing_external_costs === next.pricing_external_costs &&
				prev.pricing_margin_percent === next.pricing_margin_percent &&
				prev.pricing_plan_id === next.pricing_plan_id &&
				prev.pricing_plan_name === next.pricing_plan_name;
			return unchanged ? prev : next;
		});
	}, [selectedPlanId]);

	useEffect(() => {
		const hasRecurringMaintenance = formData.selected_services.some(
			(s) => s.pricingMode === "monthly" || s.recurring === true,
		);
		if (!hasRecurringMaintenance) return;
		if ((formData.quote_type || "one_time") !== "monthly_recurring") {
			setFormData((prev) => ({ ...prev, quote_type: "monthly_recurring" }));
		}
		if (selectedPlanId === "manual") {
			setSelectedPlanId("pro");
		}
	}, [formData.selected_services, formData.quote_type, selectedPlanId]);

	useEffect(() => {
		const fromData = formData.pricing_plan_id || "manual";
		setSelectedPlanId((prev) => (prev === fromData ? prev : fromData));
	}, [formData.pricing_plan_id]);

	// Función para calcular el descuento
	const includedServicesTotal = quoteSummary.oneTimeServicesTotal;
	const includedEquipmentTotal = formData.equipment_total || 0;
	const includedSubscriptionMonthly = quoteSummary.monthlyFinalTotal;
	const monthlySelectedServices = quoteSummary.monthlyLines;

	const calculateDiscount = () => {
		const subtotal = includedServicesTotal + includedEquipmentTotal;

		if (
			formData.discount_type === "percentage" &&
			formData.discount_value > 0
		) {
			return (subtotal * formData.discount_value) / 100;
		} else if (
			formData.discount_type === "amount" &&
			formData.discount_value > 0
		) {
			return formData.discount_value;
		}
		return 0;
	};

	// Función para calcular el total final con descuento
	const calculateFinalTotal = () => {
		const subtotal = includedServicesTotal + includedEquipmentTotal;
		const discount = calculateDiscount();
		return subtotal - discount;
	};

	// Función para calcular el IVA (19%)
	const calculateIVA = () => {
		const subtotal = includedServicesTotal + includedEquipmentTotal;
		const discount = calculateDiscount();
		const totalSinIVA = subtotal - discount;
		return totalSinIVA * 0.19;
	};

	// Función para calcular el total final con IVA
	const calculateTotalWithIVA = () => {
		const subtotal = includedServicesTotal + includedEquipmentTotal;
		const discount = calculateDiscount();
		const totalSinIVA = subtotal - discount;
		const iva = totalSinIVA * 0.19;
		return totalSinIVA + iva;
	};

	const validatePhoneNumber = (phone: string, countryCode: string) => {
		// Remover espacios y caracteres especiales
		const cleanPhone = phone.replace(/\s+/g, "").replace(/[()-]/g, "");

		// Validaciones específicas por país
		if (countryCode === "+56") {
			// Chile
			// Números chilenos: 9 dígitos para móviles, 8 para fijos
			const mobilePattern = /^9[0-9]{8}$/;
			const landlinePattern = /^[2-9][0-9]{7}$/;

			if (mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone)) {
				return { isValid: true, message: "Número válido" };
			} else {
				return {
					isValid: false,
					message:
						"Número chileno inválido (móvil: 9 dígitos, fijo: 8 dígitos)",
				};
			}
		} else if (countryCode === "+54") {
			// Argentina
			const pattern = /^[0-9]{10,11}$/;
			if (pattern.test(cleanPhone)) {
				return { isValid: true, message: "Número válido" };
			} else {
				return {
					isValid: false,
					message: "Número argentino inválido (10-11 dígitos)",
				};
			}
		} else if (countryCode === "+57") {
			// Colombia
			const pattern = /^[0-9]{10}$/;
			if (pattern.test(cleanPhone)) {
				return { isValid: true, message: "Número válido" };
			} else {
				return {
					isValid: false,
					message: "Número colombiano inválido (10 dígitos)",
				};
			}
		} else {
			// Validación general para otros países
			const pattern = /^[0-9]{7,15}$/;
			if (pattern.test(cleanPhone)) {
				return { isValid: true, message: "Número válido" };
			} else {
				return { isValid: false, message: "Número inválido (7-15 dígitos)" };
			}
		}
	};

	const handlePhoneChange = (phone: string) => {
		updateFormData("client_phone", phone);
		const validation = validatePhoneNumber(
			phone,
			formData.client_phone_country,
		);
		setPhoneValidation(validation);
	};

	const validateRut = (rut: string) => {
		// Limpiar el RUT de puntos y guión
		const cleanRut = rut.replace(/\./g, "").replace(/-/g, "");

		// Verificar longitud mínima (8 dígitos: 7 números + 1 dígito verificador)
		if (cleanRut.length < 8) {
			return { isValid: false, message: "RUT incompleto (faltan dígitos)" };
		}

		// Verificar longitud máxima (9 dígitos: 8 números + 1 dígito verificador)
		if (cleanRut.length > 9) {
			return { isValid: false, message: "RUT demasiado largo" };
		}

		// Separar número y dígito verificador
		const number = cleanRut.slice(0, -1);
		const dv = cleanRut.slice(-1).toUpperCase();

		// Verificar que el número solo contenga dígitos y tenga la longitud correcta
		if (!/^\d+$/.test(number) || number.length < 7 || number.length > 8) {
			return { isValid: false, message: "Número de RUT inválido" };
		}

		// Verificar que el dígito verificador sea válido
		if (!/^[0-9kK]$/.test(dv)) {
			return { isValid: false, message: "Dígito verificador inválido" };
		}

		// Solo validar si el RUT está completo (8 o 9 dígitos)
		if (cleanRut.length >= 8) {
			// Calcular dígito verificador
			let sum = 0;
			let multiplier = 2;

			for (let i = number.length - 1; i >= 0; i--) {
				sum += parseInt(number[i], 10) * multiplier;
				multiplier = multiplier === 7 ? 2 : multiplier + 1;
			}

			const expectedDv = 11 - (sum % 11);
			const calculatedDv =
				expectedDv === 11
					? "0"
					: expectedDv === 10
						? "K"
						: expectedDv.toString();

			if (calculatedDv === dv) {
				return { isValid: true, message: "RUT válido" };
			} else {
				return { isValid: false, message: "Dígito verificador incorrecto" };
			}
		}

		// Si no está completo, no mostrar error pero tampoco validar como correcto
		return { isValid: false, message: "RUT incompleto" };
	};

	const formatRut = (rut: string) => {
		// Remover todos los caracteres no numéricos excepto 'k' y 'K'
		let cleanRut = rut.replace(/[^0-9kK]/g, "");

		if (cleanRut.length === 0) return "";

		// Convertir a mayúscula
		cleanRut = cleanRut.toUpperCase();

		// Si tiene menos de 2 caracteres, solo retornar el número
		if (cleanRut.length < 2) {
			return cleanRut;
		}

		// Separar número y dígito verificador
		const number = cleanRut.slice(0, -1);
		const dv = cleanRut.slice(-1);

		// Formatear número con puntos
		let formattedNumber = "";
		for (let i = number.length - 1, j = 0; i >= 0; i--, j++) {
			if (j > 0 && j % 3 === 0) {
				formattedNumber = `.${formattedNumber}`;
			}
			formattedNumber = number[i] + formattedNumber;
		}

		// Solo agregar guión si hay al menos un dígito verificador
		if (cleanRut.length >= 2) {
			return `${formattedNumber}-${dv}`;
		}

		return formattedNumber;
	};

	const handleRutChange = (rut: string) => {
		const formattedRut = formatRut(rut);
		updateFormData("client_rut", formattedRut);
		const validation = validateRut(formattedRut);
		setRutValidation(validation);
	};

	const handleRutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Permitir solo números, 'k', 'K', backspace, delete, tab, enter, arrow keys
		const allowedKeys = [
			"Backspace",
			"Delete",
			"Tab",
			"Enter",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
		];
		const allowedChars = /[0-9kK]/;

		if (!allowedKeys.includes(e.key) && !allowedChars.test(e.key)) {
			e.preventDefault();
		}
	};

	// Fallback: si no existe tabla `clients`, buscar en `quotes` y armar clientes únicos
	const searchClientsFromQuotes = async (term: string) => {
		const { data, error } = await supabase
			.from("rt_quotes")
			.select(
				"client_rut, client_name, client_email, client_phone, client_phone_country, client_address, client_region, client_commune, client_country",
			)
			.or(
				`client_rut.ilike.%${term}%,client_name.ilike.%${term}%,client_email.ilike.%${term}%`,
			)
			.limit(50);

		if (error) throw error;
		// Deduplicar por RUT o email
		const uniqueMap = new Map<string, Client>();
		(data || []).forEach((row) => {
			const key = row.client_rut || row.client_email || `${row.client_name}`;
			if (!uniqueMap.has(key)) {
				uniqueMap.set(key, {
					id: key,
					rut: row.client_rut || "",
					name: row.client_name || "",
					email: row.client_email || "",
					phone: row.client_phone || "",
					phone_country: row.client_phone_country || "",
					address: row.client_address || "",
					region: row.client_region || "",
					commune: row.client_commune || "",
					country: row.client_country || "",
					created_at: new Date().toISOString(),
				});
			}
		});
		return Array.from(uniqueMap.values());
	};

	const searchClients = async (term: string) => {
		if (term.length < 3) {
			setSearchResults([]);
			return;
		}

		try {
			const { data, error } = await supabase
				.from("rt_clients")
				.select("*")
				.or(`rut.ilike.%${term}%,name.ilike.%${term}%,email.ilike.%${term}%`)
				.limit(10);

			if (error) {
				// Si la tabla no existe, intentar fallback desde `quotes`
				// Postgres error 42P01: relation does not exist
				if (
					typeof error === "object" &&
					error !== null &&
					"code" in error &&
					error.code === "42P01"
				) {
					const fallback = await searchClientsFromQuotes(term);
					setSearchResults(fallback);
					return;
				}
				throw error;
			}
			// Si existe tabla pero viene vacía, intentar fallback para aprovechar históricos
			if (!data || data.length === 0) {
				const fallback = await searchClientsFromQuotes(term);
				setSearchResults(fallback);
				return;
			}
			setSearchResults(data || []);
		} catch (error) {
			console.error("Error buscando clientes:", error);
			// Último intento: fallback desde quotes
			try {
				const fallback = await searchClientsFromQuotes(term);
				setSearchResults(fallback);
			} catch (_e) {
				setSearchResults([]);
			}
		}
	};

	const handleSearchChange = (term: string) => {
		setSearchTerm(term);
		searchClients(term);
		setShowSearchResults(true);
	};

	const selectClient = (client: Client) => {
		updateFormData("client_rut", client.rut);
		updateFormData("client_name", client.name);
		updateFormData("client_email", client.email);
		updateFormData("client_phone", client.phone);
		updateFormData("client_phone_country", client.phone_country);
		updateFormData("client_address", client.address);
		updateFormData("client_region", client.region);
		updateFormData("client_commune", client.commune);
		updateFormData("client_country", client.country);

		setSearchTerm("");
		setSearchResults([]);
		setShowSearchResults(false);
	};

	const handleCountryChange = (countryCode: string) => {
		updateFormData("client_phone_country", countryCode);
		setShowCountryDropdown(false);
		// Re-validar el número con el nuevo código de país
		if (formData.client_phone) {
			const validation = validatePhoneNumber(
				formData.client_phone,
				countryCode,
			);
			setPhoneValidation(validation);
		}
	};

	const _handleGeoCountryChange = (countryCode: string) => {
		debugLog("🌍 Seleccionando país:", countryCode);
		const country = COMPLETE_GEO_DATA.find((c) => c.code === countryCode);
		if (country) {
			debugLog("✅ País encontrado:", country.name);
			updateFormData("client_country", country.name);
			updateFormData("client_region", "");
			updateFormData("client_commune", "");
		} else {
			debugLog("❌ País no encontrado para código:", countryCode);
		}
		setShowGeoDropdown(false);
	};

	const openCalculationModal = (service: Service) => {
		setSelectedServiceForCalculation(service);
		setShowCalculationModal(true);
	};

	const calculateServiceWithParams = async (params: CalculationParams) => {
		if (!selectedServiceForCalculation) return;

		try {
			const calculation = await calculateServicePrice(
				selectedServiceForCalculation.id,
				{
					...params,
					country: formData.client_country,
					location: formData.client_region,
				},
				selectedServiceForCalculation.category,
			);
			if ((calculation.totalPrice || 0) <= 0) {
				const reason =
					calculation.breakdown?.[0] ||
					"No se encontró un precio activo en la librería.";
				alert(`No se puede calcular este servicio.\n${reason}`);
				return;
			}

			const quantity = sanitizeQuantity(params.quantity ?? 1);
			const pricingMode = resolveServicePricingMode(selectedServiceForCalculation);
			const quantityPricing = applyQuantityPricing({
				price: calculation.totalPrice,
				quantity,
				pricingMode,
			});
			const monthlyQuantityPricing = applyQuantityPricing({
				price: calculation.monthlyMaintenance || 0,
				quantity,
				pricingMode: "monthly",
			});

			// Actualizar el servicio con el precio calculado
			const updatedService = {
				...selectedServiceForCalculation,
				price: quantityPricing.priceAfterQuantity,
				monthlyMaintenance: monthlyQuantityPricing.priceAfterQuantity,
				monthlyMaintenanceBeforeQuantity:
					monthlyQuantityPricing.priceBeforeQuantity,
				monthlyMaintenanceAfterQuantity:
					monthlyQuantityPricing.priceAfterQuantity,
				monthlyMaintenanceRate: calculation.monthlyMaintenanceRate || 0,
				quantity: quantityPricing.quantity,
				quantityFactor: quantityPricing.quantityFactor,
				quantityDiscountPercent: quantityPricing.quantityDiscountPercent,
				priceBeforeQuantity: quantityPricing.priceBeforeQuantity,
				priceAfterQuantity: quantityPricing.priceAfterQuantity,
				calculationParams: params,
				calculatedPrice: calculation,
			};

			// Verificar si el servicio ya está en la lista seleccionada
			const existingServiceIndex = formData.selected_services.findIndex(
				(s) => s.id === selectedServiceForCalculation.id,
			);

			if (existingServiceIndex >= 0) {
				// Actualizar servicio existente usando la nueva función
				updateService(selectedServiceForCalculation.id, updatedService);
			} else {
				// Agregar nuevo servicio
				addService(updatedService);
			}

			setShowCalculationModal(false);
			setSelectedServiceForCalculation(null);
		} catch (error) {
			console.error("Error calculando precio:", error);
		}
	};

	// Cerrar dropdown al hacer click fuera
	const handleClickOutside = useCallback((event: MouseEvent) => {
		const target = event.target as Element;
		debugLog("🖱️ Click fuera detectado, target:", target);
		debugLog(
			"🔍 Verificando country-dropdown:",
			target.closest(".country-dropdown"),
		);
		debugLog(
			"🔍 Verificando geo-dropdown:",
			target.closest(".geo-dropdown"),
		);

		if (!target.closest(".country-dropdown")) {
			debugLog("❌ Cerrando country dropdown");
			setShowCountryDropdown(false);
		}
		if (!target.closest(".geo-dropdown")) {
			debugLog("❌ Cerrando geo dropdown");
			setShowGeoDropdown(false);
		}
	}, []);

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [handleClickOutside]);

	// CARGA AUTORITATIVA DESDE DB EN MODO EDICIÓN o VISUALIZACIÓN
	useEffect(() => {
		const url = new URLSearchParams(window.location.search);
		const isEdit = url.get("edit") === "true";
		const isView = url.get("view") === "true";
		const quoteId = (url.get("id") || "").trim();

		if (!(isEdit || isView) || !quoteId) return;
		if (!UUID_REGEX.test(quoteId)) {
			debugLog("⚠️ ID de cotización inválido en URL, omitiendo carga:", quoteId);
			setLoadedFromDB(true);
			return;
		}

		(async () => {
			try {
				let { data, error } = await supabase
					.from("rt_quotes")
					.select("*")
					.eq("id", quoteId)
					.single();

				if (error || !data) {
					const response = await fetch(
						`/api/admin/quotes?id=${encodeURIComponent(quoteId)}`,
					);
					const result = (await response.json()) as {
						error?: string;
						quote?: Record<string, unknown>;
					};
					if (!response.ok || result.error || !result.quote) {
						throw new Error(result.error || "Admin API GET by id failed");
					}
					data = result.quote as typeof data;
					error = null;
				}

				if (error || !data) throw error || new Error("Quote not found");

				const formDataFromQuote = {
					client_rut: data.client_rut || "",
					client_name: data.client_name || "",
					client_email: data.client_email || "",
					client_phone: (data.client_phone || "")
						.replace(data.client_phone_country || "", "")
						.trim(),
					client_phone_country: data.client_phone_country || "+56",
					client_address: data.client_address || "",
					client_region: data.client_region || "",
					client_commune: data.client_commune || "",
					client_country: data.client_country || "",
					project_title: data.project_title || "",
					project_description: data.project_description || "",
					selected_services: Array.isArray(data.services) ? data.services : [],
					selected_equipment: Array.isArray(data.equipment)
						? data.equipment
						: [],
					total_amount: data.total_amount || 0,
					equipment_total: data.equipment_total || 0,
					valid_until: data.valid_until || "",
					notes: data.notes || "",
					terms_conditions: data.terms_conditions || "",
					discount_type: data.discount_type || "none",
					discount_value: data.discount_value || 0,
					discount_description: data.discount_description || "",
					validity_message:
						data.validity_message ||
						'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos',
					// Suscripción
					subscription_enabled: data.subscription_enabled === true,
					subscription_monthly: data.subscription_monthly || 0,
					subscription_description: data.subscription_description || "",
					quote_type: data.quote_type || "one_time",
					pricing_breakdown: data.pricing_breakdown || null,
					pricing_hourly_rate: data.pricing_hourly_rate ?? 35000,
					pricing_base_hours: data.pricing_base_hours ?? 10,
					pricing_monthly_support_hours:
						data.pricing_monthly_support_hours ?? 10,
					pricing_expected_monthly_hours:
						data.pricing_expected_monthly_hours ?? 10,
					pricing_overage_hour_rate: data.pricing_overage_hour_rate ?? 40000,
					pricing_external_costs: data.pricing_external_costs ?? 0,
					pricing_margin_percent: data.pricing_margin_percent ?? 0.4,
					pricing_tax_percent: data.pricing_tax_percent ?? 0,
					pricing_urgency: data.pricing_urgency || "normal",
					pricing_plan_id: data.pricing_plan_id || "manual",
					pricing_plan_name: data.pricing_plan_name || "",
					iva_included: data.iva_included === true,
				} as unknown as QuoteForm;

				setFormData(formDataFromQuote);
				hydrateExternalProvidersFromBreakdown(
					formDataFromQuote.pricing_breakdown,
				);
				if (isEdit) {
					setIsEditMode(true);
					sessionStorage.setItem(
						"quoteFormData",
						JSON.stringify(formDataFromQuote),
					);
					sessionStorage.setItem("editMode", "true");
					sessionStorage.setItem("editQuoteId", quoteId);
					sessionStorage.removeItem("viewQuoteData");
				} else if (isView) {
					setIsViewMode(true);
					// asegurar que viewQuoteData contiene campos de suscripción
					sessionStorage.setItem(
						"viewQuoteData",
						JSON.stringify({
							...data,
							subscription_enabled: data.subscription_enabled ?? false,
							subscription_monthly: data.subscription_monthly ?? 0,
							subscription_description: data.subscription_description ?? "",
							quote_type: data.quote_type ?? "one_time",
							pricing_breakdown: data.pricing_breakdown ?? null,
							pricing_hourly_rate: data.pricing_hourly_rate ?? 35000,
							pricing_base_hours: data.pricing_base_hours ?? 10,
							pricing_monthly_support_hours:
								data.pricing_monthly_support_hours ?? 10,
							pricing_expected_monthly_hours:
								data.pricing_expected_monthly_hours ?? 10,
							pricing_overage_hour_rate: data.pricing_overage_hour_rate ?? 40000,
							pricing_external_costs: data.pricing_external_costs ?? 0,
							pricing_margin_percent: data.pricing_margin_percent ?? 0.4,
							pricing_tax_percent: data.pricing_tax_percent ?? 0,
							pricing_urgency: data.pricing_urgency ?? "normal",
							pricing_plan_id: data.pricing_plan_id ?? "manual",
							pricing_plan_name: data.pricing_plan_name ?? "",
							iva_included: data.iva_included ?? false,
						}),
					);
					sessionStorage.removeItem("editQuoteData");
				}
				setCurrentQuoteId(quoteId);
				setCurrentStep(4);
				setLoadedFromDB(true);
			} catch (e) {
				const err = e as { message?: string; code?: string; details?: string };
				console.warn("⚠️ Carga de cotización omitida por error:", {
					message: err?.message || "unknown",
					code: err?.code || null,
					details: err?.details || null,
				});
				setLoadedFromDB(true);
			}
		})();
	}, []);

	// SIMPLE DATA RESTORATION - NO COMPLEXITY
	useEffect(() => {
		if (loadedFromDB) return; // ya cargado desde DB, no tocar

		debugLog("🚀 INICIANDO RESTAURACIÓN DE DATOS");
		const urlParams = new URLSearchParams(window.location.search);
		const urlIsEdit = urlParams.get("edit") === "true";
		const urlIsView = urlParams.get("view") === "true";
		const urlQuoteId = (urlParams.get("id") || "").trim();

		// 1. Check for edit/view data first
		const editQuoteData = sessionStorage.getItem("editQuoteData");
		const viewQuoteData = sessionStorage.getItem("viewQuoteData");
		const safeParse = (raw: string | null) => {
			if (!raw) return null;
			try {
				return JSON.parse(raw);
			} catch {
				return null;
			}
		};
		const parsedEdit = safeParse(editQuoteData);
		const parsedView = safeParse(viewQuoteData);
		const editMatchesUrl =
			Boolean(urlIsEdit && urlQuoteId) &&
			String(parsedEdit?.id || "") === urlQuoteId;
		const viewMatchesUrl =
			Boolean(urlIsView && urlQuoteId) &&
			String(parsedView?.id || "") === urlQuoteId;

		if (editQuoteData && editMatchesUrl) {
			debugLog("📝 MODO EDICIÓN DETECTADO");
			try {
				const quoteData = parsedEdit;
				const formDataFromQuote = {
					client_rut: quoteData.client_rut || "",
					client_name: quoteData.client_name || "",
					client_email: quoteData.client_email || "",
					client_phone:
						quoteData.client_phone
							?.replace(quoteData.client_phone_country || "", "")
							.trim() || "",
					client_phone_country: quoteData.client_phone_country || "+56",
					client_address: quoteData.client_address || "",
					client_region: quoteData.client_region || "",
					client_commune: quoteData.client_commune || "",
					client_country: quoteData.client_country || "",
					project_title: quoteData.project_title || "",
					project_description: quoteData.project_description || "",
					selected_services: Array.isArray(quoteData.selected_services)
						? quoteData.selected_services
						: Array.isArray(quoteData.services)
							? quoteData.services
							: [],
					selected_equipment: Array.isArray(quoteData.selected_equipment)
						? quoteData.selected_equipment
						: Array.isArray(quoteData.equipment)
							? quoteData.equipment
							: [],
					total_amount: quoteData.total_amount || 0,
					equipment_total: quoteData.equipment_total || 0,
					valid_until: quoteData.valid_until || "",
					notes: quoteData.notes || "",
					terms_conditions: quoteData.terms_conditions || "",
					discount_type: quoteData.discount_type || "none",
					discount_value: quoteData.discount_value || 0,
					discount_description: quoteData.discount_description || "",
					validity_message:
						quoteData.validity_message ||
						'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos',
					// Suscripción
					subscription_enabled: quoteData.subscription_enabled === true,
					subscription_monthly: quoteData.subscription_monthly || 0,
					subscription_description: quoteData.subscription_description || "",
					quote_type: quoteData.quote_type || "one_time",
					pricing_breakdown: quoteData.pricing_breakdown || null,
					pricing_hourly_rate: quoteData.pricing_hourly_rate ?? 35000,
					pricing_base_hours: quoteData.pricing_base_hours ?? 10,
					pricing_monthly_support_hours:
						quoteData.pricing_monthly_support_hours ?? 10,
					pricing_expected_monthly_hours:
						quoteData.pricing_expected_monthly_hours ?? 10,
					pricing_overage_hour_rate:
						quoteData.pricing_overage_hour_rate ?? 40000,
					pricing_external_costs: quoteData.pricing_external_costs ?? 0,
					pricing_margin_percent: quoteData.pricing_margin_percent ?? 0.4,
					pricing_tax_percent: quoteData.pricing_tax_percent ?? 0,
					pricing_urgency: quoteData.pricing_urgency || "normal",
					pricing_plan_id: quoteData.pricing_plan_id || "manual",
					pricing_plan_name: quoteData.pricing_plan_name || "",
					iva_included: quoteData.iva_included === true,
				};

				setFormData(formDataFromQuote);
				hydrateExternalProvidersFromBreakdown(
					formDataFromQuote.pricing_breakdown,
				);
				setIsEditMode(true);
				setCurrentQuoteId(quoteData.id);
				setCurrentStep(4);
				sessionStorage.removeItem("editQuoteData");
				debugLog("✅ DATOS DE EDICIÓN CARGADOS:", formDataFromQuote);
				debugLog(
					"🔧 EQUIPOS CARGADOS EN EDICIÓN:",
					formDataFromQuote.selected_equipment,
				);
				debugLog(
					"🔧 TOTAL EQUIPOS EN EDICIÓN:",
					formDataFromQuote.equipment_total,
				);
				return;
			} catch (error) {
				console.error("❌ Error en modo edición:", error);
			}
		}

		if (viewQuoteData && viewMatchesUrl) {
			debugLog("👁️ MODO VISUALIZACIÓN DETECTADO");
			try {
				const quoteData = parsedView;
				const formDataFromQuote = {
					client_rut: quoteData.client_rut || "",
					client_name: quoteData.client_name || "",
					client_email: quoteData.client_email || "",
					client_phone:
						quoteData.client_phone
							?.replace(quoteData.client_phone_country || "", "")
							.trim() || "",
					client_phone_country: quoteData.client_phone_country || "+56",
					client_address: quoteData.client_address || "",
					client_region: quoteData.client_region || "",
					client_commune: quoteData.client_commune || "",
					client_country: quoteData.client_country || "",
					project_title: quoteData.project_title || "",
					project_description: quoteData.project_description || "",
					selected_services: Array.isArray(quoteData.selected_services)
						? quoteData.selected_services
						: Array.isArray(quoteData.services)
							? quoteData.services
							: [],
					selected_equipment: Array.isArray(quoteData.selected_equipment)
						? quoteData.selected_equipment
						: Array.isArray(quoteData.equipment)
							? quoteData.equipment
							: [],
					total_amount: quoteData.total_amount || 0,
					equipment_total: quoteData.equipment_total || 0,
					valid_until: quoteData.valid_until || "",
					notes: quoteData.notes || "",
					terms_conditions: quoteData.terms_conditions || "",
					discount_type: quoteData.discount_type || "none",
					discount_value: quoteData.discount_value || 0,
					discount_description: quoteData.discount_description || "",
					validity_message:
						quoteData.validity_message ||
						'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos',
					// Suscripción
					subscription_enabled: quoteData.subscription_enabled === true,
					subscription_monthly: quoteData.subscription_monthly || 0,
					subscription_description: quoteData.subscription_description || "",
					quote_type: quoteData.quote_type || "one_time",
					pricing_breakdown: quoteData.pricing_breakdown || null,
					pricing_hourly_rate: quoteData.pricing_hourly_rate ?? 35000,
					pricing_base_hours: quoteData.pricing_base_hours ?? 10,
					pricing_monthly_support_hours:
						quoteData.pricing_monthly_support_hours ?? 10,
					pricing_expected_monthly_hours:
						quoteData.pricing_expected_monthly_hours ?? 10,
					pricing_overage_hour_rate:
						quoteData.pricing_overage_hour_rate ?? 40000,
					pricing_external_costs: quoteData.pricing_external_costs ?? 0,
					pricing_margin_percent: quoteData.pricing_margin_percent ?? 0.4,
					pricing_tax_percent: quoteData.pricing_tax_percent ?? 0,
					pricing_urgency: quoteData.pricing_urgency || "normal",
					pricing_plan_id: quoteData.pricing_plan_id || "manual",
					pricing_plan_name: quoteData.pricing_plan_name || "",
					iva_included: quoteData.iva_included === true,
				};

				setFormData(formDataFromQuote);
				hydrateExternalProvidersFromBreakdown(
					formDataFromQuote.pricing_breakdown,
				);
				setIsViewMode(true);
				setCurrentQuoteId(quoteData.id);
				setCurrentStep(4);
				sessionStorage.removeItem("viewQuoteData");
				debugLog("✅ DATOS DE VISUALIZACIÓN CARGADOS:", formDataFromQuote);
				return;
			} catch (error) {
				console.error("❌ Error en modo visualización:", error);
			}
		}

		// 2. Check for saved form data - ONLY if not a real new quote
		const isRealNewQuote =
			!urlIsEdit &&
			!urlIsView &&
			!urlParams.get("edit") &&
			!urlParams.get("view") &&
			!urlParams.get("step");

		// En modo edición/visualización siempre cargar por ID (DB/API), nunca desde quoteFormData.
		if (urlIsEdit || urlIsView) {
			sessionStorage.removeItem("quoteFormData");
		}

		if (isRealNewQuote) {
			debugLog("🆕 NUEVA COTIZACIÓN REAL - LIMPIANDO TODO");
			sessionStorage.removeItem("quoteFormData");
			sessionStorage.removeItem("tiQuoteData");
			sessionStorage.removeItem("originalTIService");
			sessionStorage.removeItem("selectedTIService");
		} else {
			// Solo cargar datos guardados si NO estamos en modo edición o visualización por URL
			if (!urlIsEdit && !urlIsView && !editQuoteData && !viewQuoteData) {
				const savedFormData = sessionStorage.getItem("quoteFormData");
				if (savedFormData) {
					debugLog("💾 DATOS GUARDADOS ENCONTRADOS");
					try {
						const restoredData = JSON.parse(savedFormData);
						debugLog(
							"🔧 EQUIPOS EN DATOS RESTAURADOS:",
							restoredData.selected_equipment,
						);
						debugLog(
							"🔧 TOTAL EQUIPOS EN DATOS RESTAURADOS:",
							restoredData.equipment_total,
						);

						// VERIFICAR SI LOS DATOS RESTAURADOS ESTÁN VACÍOS Y ESTAMOS EN MODO EDICIÓN
						const urlParams = new URLSearchParams(window.location.search);
						const urlEditMode = urlParams.get("edit") === "true";
						const urlQuoteId = urlParams.get("id");

						if (
							urlEditMode &&
							urlQuoteId &&
							(!restoredData.selected_equipment ||
								restoredData.selected_equipment.length === 0)
						) {
							debugLog(
								"🔒 DETECTADO: Datos vacíos en sessionStorage pero estamos en modo edición",
							);
							debugLog("🔒 NO SOBRESCRIBIENDO formData con datos vacíos");
							return; // NO SOBRESCRIBIR EL FORM DATA
						}

						setFormData(restoredData);
						debugLog("✅ DATOS RESTAURADOS:", restoredData);
					} catch (error) {
						console.error("❌ Error restaurando datos:", error);
					}
				} else {
					debugLog("📝 CONTINUANDO COTIZACIÓN - SIN DATOS PREVIOS");
				}
			} else {
				debugLog(
					"🔒 MODO EDICIÓN/VISUALIZACIÓN - NO CARGAR DATOS GUARDADOS",
				);
			}
		}

		// 3. SI ESTAMOS EN MODO EDICIÓN POR URL, RECARGAR TODO DESDE SUPABASE
		if (urlIsEdit && urlQuoteId && !loadedFromDB) {
			if (!UUID_REGEX.test(urlQuoteId)) {
				debugLog(
					"⚠️ ID inválido en URL para recarga de edición, omitiendo:",
					urlQuoteId,
				);
				return;
			}
			const quoteId = urlQuoteId;
			debugLog(
				"🔒 MODO EDICIÓN DETECTADO - RECARGANDO DESDE SUPABASE:",
				quoteId,
			);

			// Limpiar datos TI
			sessionStorage.removeItem("tiQuoteData");
			sessionStorage.removeItem("originalTIService");
			sessionStorage.removeItem("selectedTIService");

			// Recargar desde Supabase
				(async () => {
					try {
						let { data: quoteData, error } = await supabase
							.from("rt_quotes")
							.select("*")
							.eq("id", quoteId)
							.single();

						if (error || !quoteData) {
							const response = await fetch(
								`/api/admin/quotes?id=${encodeURIComponent(quoteId)}`,
							);
							const result = (await response.json()) as {
								error?: string;
								quote?: Record<string, unknown>;
							};
							if (!response.ok || result.error || !result.quote) {
								throw new Error(result.error || "Admin API GET by id failed");
							}
							quoteData = result.quote as typeof quoteData;
							error = null;
						}

					if (error || !quoteData) throw error || new Error("Quote not found");

					const formDataFromQuote: QuoteForm = {
						client_rut: quoteData.client_rut || "",
						client_name: quoteData.client_name || "",
						client_email: quoteData.client_email || "",
						client_phone: (quoteData.client_phone || "")
							.replace(quoteData.client_phone_country || "", "")
							.trim(),
						client_phone_country: quoteData.client_phone_country || "+56",
						client_address: quoteData.client_address || "",
						client_region: quoteData.client_region || "",
						client_commune: quoteData.client_commune || "",
						client_country: quoteData.client_country || "",
						project_title: quoteData.project_title || "",
						project_description: quoteData.project_description || "",
						selected_services: Array.isArray(quoteData.services)
							? quoteData.services
							: [],
						selected_equipment: Array.isArray(quoteData.equipment)
							? quoteData.equipment
							: [],
						total_amount: quoteData.total_amount || 0,
						equipment_total: quoteData.equipment_total || 0,
						valid_until: quoteData.valid_until || "",
						notes: quoteData.notes || "",
						terms_conditions: quoteData.terms_conditions || "",
						discount_type: quoteData.discount_type || "none",
						discount_value: quoteData.discount_value || 0,
						discount_description: quoteData.discount_description || "",
						validity_message:
							quoteData.validity_message ||
							'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos',
						// Suscripción + pricing
						subscription_enabled: quoteData.subscription_enabled === true,
						subscription_monthly: quoteData.subscription_monthly || 0,
						subscription_description: quoteData.subscription_description || "",
						quote_type: quoteData.quote_type || "one_time",
						pricing_breakdown: quoteData.pricing_breakdown || null,
						pricing_hourly_rate: quoteData.pricing_hourly_rate ?? 35000,
						pricing_base_hours: quoteData.pricing_base_hours ?? 10,
						pricing_monthly_support_hours:
							quoteData.pricing_monthly_support_hours ?? 10,
						pricing_expected_monthly_hours:
							quoteData.pricing_expected_monthly_hours ?? 10,
						pricing_overage_hour_rate:
							quoteData.pricing_overage_hour_rate ?? 40000,
						pricing_external_costs: quoteData.pricing_external_costs ?? 0,
						pricing_margin_percent: quoteData.pricing_margin_percent ?? 0.4,
						pricing_tax_percent: quoteData.pricing_tax_percent ?? 0,
						pricing_urgency: quoteData.pricing_urgency || "normal",
						pricing_plan_id: quoteData.pricing_plan_id || "manual",
						pricing_plan_name: quoteData.pricing_plan_name || "",
						iva_included: quoteData.iva_included === true,
					};

					setFormData(formDataFromQuote);
					hydrateExternalProvidersFromBreakdown(
						formDataFromQuote.pricing_breakdown,
					);
					setIsEditMode(true);
					setCurrentQuoteId(quoteId);
					sessionStorage.setItem(
						"quoteFormData",
						JSON.stringify(formDataFromQuote),
					);

					debugLog("✅ DATOS RECARGADOS DESDE SUPABASE:", formDataFromQuote);
				} catch (e) {
					const err = e as { message?: string; code?: string; details?: string };
					console.warn("⚠️ Recarga de edición omitida por error:", {
						message: err?.message || "unknown",
						code: err?.code || null,
						details: err?.details || null,
					});
				}
			})();
		} else {
			// Limpiar datos TI para nuevas cotizaciones
			sessionStorage.removeItem("tiQuoteData");
			sessionStorage.removeItem("originalTIService");
			sessionStorage.removeItem("selectedTIService");
		}

		debugLog("🏁 RESTAURACIÓN COMPLETADA");
	}, [currentQuoteId, isEditMode, loadedFromDB]);

	// Handle URL step parameter
	/* biome-ignore lint/correctness/useExhaustiveDependencies: updateTIService is intentionally used as current render callback for TI merge logic */
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const stepParam = urlParams.get("step");
		if (stepParam) {
			const step = parseInt(stepParam, 10);
			if (step >= 1 && step <= 3) {
				setCurrentStep(step);
				debugLog("Paso establecido desde URL:", step);
			}
		}

		// Verificar si hay datos TI cuando cambia la URL (cuando regresas de la página TI)
		const tiQuoteData = sessionStorage.getItem("tiQuoteData");
		if (tiQuoteData) {
			debugLog("🔄 DETECTADO REGRESO DE PÁGINA TI - VERIFICANDO DATOS");
			try {
				const updatedData = JSON.parse(tiQuoteData);
				debugLog("🔄 DATOS TI ENCONTRADOS AL REGRESAR:", updatedData);

				// Actualizar servicios TI específicamente
				if (
					updatedData.selected_services &&
					updatedData.selected_services.length > 0
				) {
					updatedData.selected_services.forEach((service: Service) => {
						if (service.category === "servicios_ti") {
							debugLog("🔄 ACTUALIZANDO SERVICIO TI AL REGRESAR:", service);
							updateTIService(service as Service);
						}
					});
				}

				// Limpiar los datos TI del sessionStorage
				sessionStorage.removeItem("tiQuoteData");
				sessionStorage.removeItem("originalTIService");
				sessionStorage.removeItem("selectedTIService");

				debugLog("✅ SERVICIOS TI ACTUALIZADOS AL REGRESAR");
			} catch (error) {
				console.error("❌ Error procesando datos TI al regresar:", error);
			}
		}
	}, []);

	// Auto-select category when services are already selected (for editing)
	useEffect(() => {
		debugLog(
			"🔍 useEffect - Verificando servicios seleccionados:",
			formData.selected_services.length,
		);
		debugLog("🔍 useEffect - Categoría actual:", selectedCategory);
		debugLog("🔍 useEffect - Servicios:", formData.selected_services);

		if (formData.selected_services.length > 0 && !selectedCategory) {
			// Get the category of the first selected service
			const firstServiceCategory = formData.selected_services[0].category;
			debugLog(
				"🔍 Auto-seleccionando categoría:",
				firstServiceCategory,
				"para servicios existentes",
			);
			setSelectedCategory(firstServiceCategory);
		}
	}, [formData.selected_services, selectedCategory]);

	// Verificar y restaurar modo edición después de procesar tiQuoteData
	useEffect(() => {
		if (typeof window === "undefined") return;

		const urlParams = new URLSearchParams(window.location.search);
		const urlEditMode = urlParams.get("edit") === "true";
		const urlQuoteId = urlParams.get("id");

		// También verificar sessionStorage para modo edición
		const sessionEditMode = sessionStorage.getItem("editMode") === "true";
		const sessionQuoteId = sessionStorage.getItem("editQuoteId");

		if ((urlEditMode && urlQuoteId) || (sessionEditMode && sessionQuoteId)) {
			const quoteId = urlQuoteId || sessionQuoteId;
			if (quoteId) {
				debugLog("🔒 VERIFICACIÓN POST-TI: Restaurando modo edición:", {
					urlEditMode,
					urlQuoteId,
					sessionEditMode,
					sessionQuoteId,
					isEditMode,
					currentQuoteId,
					finalQuoteId: quoteId,
				});
				setIsEditMode(true);
				setCurrentQuoteId(quoteId);

				// Persistir en sessionStorage
				sessionStorage.setItem("editMode", "true");
				sessionStorage.setItem("editQuoteId", quoteId as string);
			}
		}
	}, [isEditMode, currentQuoteId]);

	// Recalcular totales cuando se cargan datos en modo edición
	/* biome-ignore lint/correctness/useExhaustiveDependencies: recalculateTotals is intentionally invoked from current render after edit hydration */
	useEffect(() => {
		if (
			isEditMode &&
			loadedFromDB &&
			(formData.selected_services.length > 0 ||
				formData.selected_equipment.length > 0)
		) {
			debugLog("🔄 RECALCULANDO TOTALES EN MODO EDICIÓN");
			setTimeout(() => recalculateTotals(), 200);
		}
	}, [
		isEditMode,
		loadedFromDB,
		formData.selected_services.length,
		formData.selected_equipment.length,
	]);

	// Recalcular totales cuando cambian los servicios o equipos
	/* biome-ignore lint/correctness/useExhaustiveDependencies: recalculateTotals must run with latest state while deps are scoped to data changes */
	useEffect(() => {
		if (
			formData.selected_services.length > 0 ||
			formData.selected_equipment.length > 0
		) {
			debugLog("🔄 SERVICIOS O EQUIPOS CAMBIARON - RECALCULANDO TOTALES");
			debugLog("Servicios actuales:", formData.selected_services);
			debugLog("Equipos actuales:", formData.selected_equipment);

			// Recalcular inmediatamente
			recalculateTotals();
		}
	}, [
		formData.selected_services,
		formData.selected_equipment, // Recalcular inmediatamente
	]);

	// Manejar actualizaciones de servicios TI cuando se regresa de la página de servicios TI
	/* biome-ignore lint/correctness/useExhaustiveDependencies: TI polling intentionally uses current callbacks while interval depends on selected services */
	useEffect(() => {
		const checkTIData = () => {
			const tiQuoteData = sessionStorage.getItem("tiQuoteData");
			if (tiQuoteData) {
				try {
					const updatedData = JSON.parse(tiQuoteData);
					debugLog(
						"🔄 ACTUALIZACIÓN DE SERVICIOS TI DETECTADA:",
						updatedData,
					);

					// Verificar si los servicios han cambiado
					const currentServices = formData.selected_services;
					const newServices = updatedData.selected_services;

					debugLog("🔍 COMPARANDO SERVICIOS:");
					debugLog("Servicios actuales:", currentServices);
					debugLog("Servicios nuevos:", newServices);

					// Actualizar servicios TI específicamente
					if (newServices && newServices.length > 0) {
						newServices.forEach((service: Service) => {
							if (service.category === "servicios_ti") {
								debugLog(
									"🔄 ACTUALIZANDO SERVICIO TI DESDE TIQUOTEDATA:",
									service,
								);
								updateTIService(service as Service);
							}
						});
					} else {
						// Actualizar el formData con los nuevos datos
						setFormData((prevData) => {
							const newData = {
								...prevData,
								...updatedData,
							};

							debugLog("🔄 FORM DATA ACTUALIZADO:", newData);

							// Guardar inmediatamente en sessionStorage
							sessionStorage.setItem("quoteFormData", JSON.stringify(newData));

							return newData;
						});

						// Recalcular totales después de la actualización con delay
						setTimeout(() => {
							debugLog(
								"🔄 RECALCULANDO TOTALES DESPUÉS DE ACTUALIZACIÓN TI",
							);
							recalculateTotals();
						}, 200);
					}

					// Limpiar los datos TI del sessionStorage
					sessionStorage.removeItem("tiQuoteData");
					sessionStorage.removeItem("originalTIService");
					sessionStorage.removeItem("selectedTIService");

					debugLog("✅ SERVICIOS TI ACTUALIZADOS Y TOTALES RECALCULADOS");
				} catch (error) {
					console.error(
						"❌ Error procesando actualización de servicios TI:",
						error,
					);
				}
			}
		};

		// Verificar inmediatamente
		checkTIData();

		// Verificar cada 500ms para detectar cuando regresas de la página TI
		const interval = setInterval(checkTIData, 500);

		return () => clearInterval(interval);
	}, [formData.selected_services]);

	// Verificar datos TI cuando cambia el paso (cuando regresas de la página TI)
	/* biome-ignore lint/correctness/useExhaustiveDependencies: step transition check intentionally calls current TI updater */
	useEffect(() => {
		debugLog("🔄 VERIFICANDO DATOS TI EN PASO:", currentStep);
		const tiQuoteData = sessionStorage.getItem("tiQuoteData");
		if (tiQuoteData) {
			debugLog("🔄 DATOS TI ENCONTRADOS EN PASO", currentStep);
			forceUpdateFromTIData();
		}
	}, [currentStep]);

	// Verificar constantemente el modo edición
	useEffect(() => {
		const checkEditMode = () => {
			const urlParams = new URLSearchParams(window.location.search);
			const urlEditMode = urlParams.get("edit") === "true";
			const urlQuoteId = urlParams.get("id");
			const sessionEditMode = sessionStorage.getItem("editMode") === "true";
			const sessionQuoteId = sessionStorage.getItem("editQuoteId");

			if ((urlEditMode && urlQuoteId) || (sessionEditMode && sessionQuoteId)) {
				const quoteId = urlQuoteId || sessionQuoteId;
				if (quoteId && (!isEditMode || currentQuoteId !== quoteId)) {
					debugLog("🔒 VERIFICACIÓN CONSTANTE: Restaurando modo edición:", {
						urlEditMode,
						urlQuoteId,
						sessionEditMode,
						sessionQuoteId,
						isEditMode,
						currentQuoteId,
						finalQuoteId: quoteId,
					});
					setIsEditMode(true);
					setCurrentQuoteId(quoteId);
				}
			}
		};

		// Verificar inmediatamente
		checkEditMode();

		// Verificar cada segundo
		const interval = setInterval(checkEditMode, 1000);

		return () => clearInterval(interval);
	}, [isEditMode, currentQuoteId]);

	// Verificar datos TI al montar el componente
	/* biome-ignore lint/correctness/useExhaustiveDependencies: mount check intentionally uses current callbacks without retriggering */
	useEffect(() => {
		debugLog("🚀 VERIFICANDO DATOS TI AL MONTAR COMPONENTE");
		const tiQuoteData = sessionStorage.getItem("tiQuoteData");
		if (tiQuoteData) {
			debugLog("🚀 DATOS TI ENCONTRADOS AL MONTAR");
			setTimeout(() => {
				forceUpdateFromTIData();
			}, 1000);
		} else {
			debugLog("🚀 NO HAY DATOS TI AL MONTAR - VERIFICANDO QUOTEFORMDATA");
			// Verificar si hay datos en quoteFormData que necesiten actualización
			const quoteFormData = sessionStorage.getItem("quoteFormData");
			if (quoteFormData) {
				try {
					const formData = JSON.parse(quoteFormData);
					if (
						formData.selected_services &&
						formData.selected_services.length > 0
					) {
						debugLog(
							"🚀 SERVICIOS ENCONTRADOS EN QUOTEFORMDATA:",
							formData.selected_services,
						);

						// FORZAR ACTUALIZACIÓN DEL ESTADO DESDE SESSIONSTORAGE
						debugLog("🚀 FORZANDO ACTUALIZACIÓN DEL ESTADO AL MONTAR");
						setFormData(formData);

						// Recalcular totales para asegurar que estén actualizados
						setTimeout(() => {
							recalculateTotals();
							debugLog("✅ TOTALES RECALCULADOS AL MONTAR");
						}, 500);
					}
				} catch (error) {
					console.error("❌ Error verificando quoteFormData al montar:", error);
				}
			}
		}
	}, []);

	const handlePreviewPDF = async () => {
		try {
			// Asegurar número de cotización en formato COTI00000-fecha para preview si no existe
			const previewQuoteNumber = formData as unknown as {
				quote_number?: string;
			};
			let quoteNumberValue = previewQuoteNumber?.quote_number
				? previewQuoteNumber.quote_number
				: "";
			if (!quoteNumberValue) {
				try {
					quoteNumberValue = await generateQuoteId();
				} catch {}
			}
			// Preparar datos para el PDF
			const pdfData = {
				client_rut: formData.client_rut,
				client_name: formData.client_name,
				client_email: formData.client_email,
				client_phone: `${formData.client_phone_country} ${formData.client_phone}`,
				client_address: formData.client_address,
				client_region: formData.client_region,
				client_commune: formData.client_commune,
				project_title: formData.project_title,
				project_description: formData.project_description,
				selected_services: formData.selected_services || [],
				selected_equipment: formData.selected_equipment || [],
				total_amount: quoteSummary.oneTimeServicesTotal || 0,
				equipment_total: formData.equipment_total || 0,
				valid_until: formData.valid_until,
				notes: formData.notes,
				terms_conditions: formData.terms_conditions,
				discount_type: formData.discount_type,
				discount_value: formData.discount_value,
				discount_description: formData.discount_description,
				validity_message: formData.validity_message,
				final_total: calculateFinalTotal(),
				// Suscripción
				subscription_enabled:
					(formData.include_subscription_in_quote !== false &&
						(formData.subscription_enabled ?? false)) ||
					quoteSummary.monthlyFinalTotal > 0,
				subscription_monthly:
					formData.include_subscription_in_quote !== false
						? quoteSummary.monthlyFinalTotal
						: 0,
				subscription_description: formData.subscription_description ?? "",
				quote_type: formData.quote_type ?? "one_time",
				pricing_breakdown: {
					...(pricingBreakdownForOutput as Record<string, unknown>),
					quote_summary: quoteSummaryForBreakdown,
				},
				pricing_plan_id: formData.pricing_plan_id ?? "manual",
				pricing_plan_name: formData.pricing_plan_name ?? "",
				iva_included: formData.iva_included ?? false,
				quote_number: quoteNumberValue,
				created_at: new Date().toISOString(),
			};

			// Debug: Mostrar datos de descuento que se envían al PDF
			debugLog("=== DATOS DE DESCUENTO PARA PDF (PREVIEW) ===");
			debugLog("discount_type:", pdfData.discount_type);
			debugLog("discount_value:", pdfData.discount_value);
			debugLog("discount_description:", pdfData.discount_description);
			debugLog("validity_message:", pdfData.validity_message);
			debugLog("final_total:", pdfData.final_total);
			debugLog("total_amount:", pdfData.total_amount);
			debugLog("equipment_total:", pdfData.equipment_total);
			debugLog(
				"Subtotal calculado:",
				pdfData.total_amount + pdfData.equipment_total,
			);
			debugLog("Descuento calculado:", calculateDiscount());
			debugLog("Total final calculado:", calculateFinalTotal());

			await previewProfessionalPDF(pdfData);
		} catch (error) {
			console.error("Error generando preview del PDF:", error);
			alert("❌ Error generando el preview del PDF");
		}
	};

	const handleGeneratePDF = async () => {
		try {
			// Asegurar número de cotización
			const previewQuoteNumber = formData as unknown as {
				quote_number?: string;
			};
			let quoteNumberValue = previewQuoteNumber?.quote_number
				? previewQuoteNumber.quote_number
				: "";
			if (!quoteNumberValue) {
				try {
					quoteNumberValue = await generateQuoteId();
				} catch {}
			}
			// Preparar datos para el PDF
			const pdfData = {
				client_rut: formData.client_rut,
				client_name: formData.client_name,
				client_email: formData.client_email,
				client_phone: `${formData.client_phone_country} ${formData.client_phone}`,
				client_address: formData.client_address,
				client_region: formData.client_region,
				client_commune: formData.client_commune,
				project_title: formData.project_title,
				project_description: formData.project_description,
				selected_services: formData.selected_services || [],
				selected_equipment: formData.selected_equipment || [],
				total_amount: quoteSummary.oneTimeServicesTotal || 0,
				equipment_total: formData.equipment_total || 0,
				valid_until: formData.valid_until,
				notes: formData.notes,
				terms_conditions: formData.terms_conditions,
				discount_type: formData.discount_type,
				discount_value: formData.discount_value,
				discount_description: formData.discount_description,
				validity_message: formData.validity_message,
				final_total: calculateFinalTotal(),
				// Suscripción
				subscription_enabled:
					(formData.include_subscription_in_quote !== false &&
						(formData.subscription_enabled ?? false)) ||
					quoteSummary.monthlyFinalTotal > 0,
				subscription_monthly:
					formData.include_subscription_in_quote !== false
						? quoteSummary.monthlyFinalTotal
						: 0,
				subscription_description: formData.subscription_description ?? "",
				quote_type: formData.quote_type ?? "one_time",
				pricing_breakdown: {
					...(pricingBreakdownForOutput as Record<string, unknown>),
					quote_summary: quoteSummaryForBreakdown,
				},
				pricing_plan_id: formData.pricing_plan_id ?? "manual",
				pricing_plan_name: formData.pricing_plan_name ?? "",
				iva_included: formData.iva_included ?? false,
				quote_number: quoteNumberValue,
				created_at: new Date().toISOString(),
			};

			// Debug: Mostrar datos de descuento que se envían al PDF
			debugLog("=== DATOS DE DESCUENTO PARA PDF (DOWNLOAD) ===");
			debugLog("discount_type:", pdfData.discount_type);
			debugLog("discount_value:", pdfData.discount_value);
			debugLog("discount_description:", pdfData.discount_description);
			debugLog("validity_message:", pdfData.validity_message);
			debugLog("final_total:", pdfData.final_total);
			debugLog("total_amount:", pdfData.total_amount);
			debugLog("equipment_total:", pdfData.equipment_total);
			debugLog(
				"Subtotal calculado:",
				pdfData.total_amount + pdfData.equipment_total,
			);
			debugLog("Descuento calculado:", calculateDiscount());
			debugLog("Total final calculado:", calculateFinalTotal());

			await downloadProfessionalPDF(pdfData);
			alert("✅ PDF generado y descargado exitosamente");
		} catch (error) {
			console.error("Error generando PDF:", error);
			alert("❌ Error generando el PDF");
		}
	};

	const handleSendPDFByEmail = async () => {
		try {
			const email = prompt(
				"Ingrese el email del cliente para enviar la cotización:",
			);
			if (!email) return;

			// Asegurar número de cotización
			const previewQuoteNumber = formData as unknown as {
				quote_number?: string;
			};
			let quoteNumberValue = previewQuoteNumber?.quote_number
				? previewQuoteNumber.quote_number
				: "";
			if (!quoteNumberValue) {
				try {
					quoteNumberValue = await generateQuoteId();
				} catch {}
			}
			// Preparar datos para el PDF
			const pdfData = {
				client_rut: formData.client_rut,
				client_name: formData.client_name,
				client_email: formData.client_email,
				client_phone: `${formData.client_phone_country} ${formData.client_phone}`,
				client_address: formData.client_address,
				client_region: formData.client_region,
				client_commune: formData.client_commune,
				project_title: formData.project_title,
				project_description: formData.project_description,
				selected_services: formData.selected_services || [],
				selected_equipment: formData.selected_equipment || [],
				total_amount: quoteSummary.oneTimeServicesTotal || 0,
				equipment_total: formData.equipment_total || 0,
				valid_until: formData.valid_until,
				notes: formData.notes,
				terms_conditions: formData.terms_conditions,
				discount_type: formData.discount_type,
				discount_value: formData.discount_value,
				discount_description: formData.discount_description,
				validity_message: formData.validity_message,
				final_total: calculateTotalWithIVA(),
				// Suscripción
				subscription_enabled:
					(formData.include_subscription_in_quote !== false &&
						(formData.subscription_enabled ?? false)) ||
					quoteSummary.monthlyFinalTotal > 0,
				subscription_monthly:
					formData.include_subscription_in_quote !== false
						? quoteSummary.monthlyFinalTotal
						: 0,
				subscription_description: formData.subscription_description ?? "",
				quote_type: formData.quote_type ?? "one_time",
				pricing_breakdown: {
					...(pricingBreakdownForOutput as Record<string, unknown>),
					quote_summary: quoteSummaryForBreakdown,
				},
				pricing_plan_id: formData.pricing_plan_id ?? "manual",
				pricing_plan_name: formData.pricing_plan_name ?? "",
				iva_included: formData.iva_included ?? false,
				quote_number: quoteNumberValue,
				created_at: new Date().toISOString(),
			};

			// Debug: Mostrar datos de descuento que se envían al PDF
			debugLog("=== DATOS DE DESCUENTO PARA PDF (EMAIL) ===");
			debugLog("discount_type:", pdfData.discount_type);
			debugLog("discount_value:", pdfData.discount_value);
			debugLog("discount_description:", pdfData.discount_description);
			debugLog("final_total:", pdfData.final_total);
			debugLog("total_amount:", pdfData.total_amount);
			debugLog("equipment_total:", pdfData.equipment_total);
			debugLog(
				"Subtotal calculado:",
				pdfData.total_amount + pdfData.equipment_total,
			);
			debugLog("Descuento calculado:", calculateDiscount());
			debugLog("Total final calculado:", calculateTotalWithIVA());

			await sendProfessionalPDFByEmail(pdfData, email);
		} catch (error) {
			console.error("Error enviando PDF por email:", error);
			alert("❌ Error enviando el PDF por email");
		}
	};

	// Función para validar el paso 1
	const validateStep1 = () => {
		const camposRequeridos = [];

		if (!formData.client_name || formData.client_name.trim() === "") {
			camposRequeridos.push("Nombre del Cliente");
		}

		if (!formData.project_title || formData.project_title.trim() === "") {
			camposRequeridos.push("Título del Proyecto");
		}

		if (!formData.client_rut || formData.client_rut.trim() === "") {
			camposRequeridos.push("RUT del Cliente");
		}

		if (camposRequeridos.length > 0) {
			alert(
				`Por favor completa los siguientes campos requeridos:\n${camposRequeridos.join("\n")}`,
			);
			return false;
		}

		return true;
	};

	const handleSaveInternal = async (action: "draft" | "create" = "draft") => {
		try {
			debugLog("=== INICIANDO GUARDADO ===");
			debugLog("formData:", formData);

			const quoteType = formData.quote_type || "one_time";
			const hourlyRate = Number(formData.pricing_hourly_rate || 0);
			const margin = Number(formData.pricing_margin_percent || 0);
			const monthlySupportHours = Number(
				formData.pricing_monthly_support_hours || 0,
			);

			if (hourlyRate < 10000) {
				alert("Tarifa hora inválida: debe ser mayor o igual a 10.000.");
				return;
			}
			if (margin < 0.2) {
				alert("Margen inválido: debe ser mayor o igual a 0.2 (20%).");
				return;
			}
			if (
				(quoteType === "monthly_recurring" || quoteType === "mixed") &&
				monthlySupportHours <= 0
			) {
				alert("Para cotización mensual, las horas de soporte mensual deben ser mayores a 0.");
				return;
			}

			// Verificar si estamos editando una cotización existente
			const urlParams = new URLSearchParams(window.location.search);
			const urlEditMode = urlParams.get("edit") === "true";
			const urlQuoteId = urlParams.get("id");

			// VERIFICAR SESSIONSTORAGE PARA MODO EDICIÓN
			const sessionEditMode = sessionStorage.getItem("editMode") === "true";
			const sessionQuoteId = sessionStorage.getItem("editQuoteId");

			// Modo edición estricto: solo si viene explícito en URL
			const isEdit = urlEditMode && !!urlQuoteId;
			const quoteId = urlQuoteId;

			// FORZAR MODO EDICIÓN SI HAY PARÁMETROS EN URL
			if (urlEditMode && urlQuoteId) {
				debugLog("🔒 FORZANDO MODO EDICIÓN DESDE URL:", {
					urlEditMode,
					urlQuoteId,
				});
				setIsEditMode(true);
				setCurrentQuoteId(urlQuoteId);
			}

			// FORZAR MODO EDICIÓN SI HAY ID EN SESSIONSTORAGE
			if (sessionQuoteId) {
				debugLog(
					"🔒 FORZANDO MODO EDICIÓN DESDE SESSIONSTORAGE:",
					sessionQuoteId,
				);
				setIsEditMode(true);
				setCurrentQuoteId(sessionQuoteId);
			}

			// FORZAR MODO EDICIÓN SI HAY PARÁMETROS EN URL
			if (urlEditMode && urlQuoteId) {
				debugLog("🔒 FORZANDO MODO EDICIÓN:", { urlEditMode, urlQuoteId });
				setIsEditMode(true);
				setCurrentQuoteId(urlQuoteId);
			}

			debugLog("🔍 DETECCIÓN MODO EDICIÓN:", {
				urlEditMode,
				isEditMode,
				sessionEditMode,
				currentQuoteId,
				urlQuoteId,
				sessionQuoteId,
				isEdit,
				quoteId,
			});

			// RESTAURAR MODO EDICIÓN SI SE DETECTA EN URL
			if (urlEditMode && urlQuoteId) {
				setIsEditMode(true);
				setCurrentQuoteId(urlQuoteId);
			}

			debugLog("🔍 DEBUG MODO EDICIÓN:");
			debugLog('- urlParams.get("edit"):', urlParams.get("edit"));
			debugLog("- isEditMode:", isEditMode);
			debugLog("- isEdit (final):", isEdit);
			debugLog('- urlParams.get("id"):', urlParams.get("id"));
			debugLog("- currentQuoteId:", currentQuoteId);
			debugLog("- quoteId (final):", quoteId);

			// Asegurar que la fecha tenga un valor válido
			const validUntil =
				formData.valid_until ||
				new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];

			// Validación completa de datos requeridos
			const camposRequeridos = [];

			debugLog("🔍 Validando datos del cliente:");
			debugLog("- client_name:", formData.client_name);
			debugLog("- client_rut:", formData.client_rut);
			debugLog("- project_title:", formData.project_title);

			if (!formData.client_name || formData.client_name.trim() === "") {
				camposRequeridos.push("Nombre del Cliente");
				debugLog("❌ Nombre del cliente faltante");
			}

			if (!formData.project_title || formData.project_title.trim() === "") {
				camposRequeridos.push("Título del Proyecto");
				debugLog("❌ Título del proyecto faltante");
			}

			if (!formData.client_rut || formData.client_rut.trim() === "") {
				camposRequeridos.push("RUT del Cliente");
				debugLog("❌ RUT del cliente faltante");
			}

			if (camposRequeridos.length > 0) {
				debugLog("❌ Campos faltantes:", camposRequeridos);
				alert(
					`Por favor completa los siguientes campos requeridos:\n${camposRequeridos.join("\n")}`,
				);
				return;
			}

			debugLog("✅ Todos los campos requeridos están completos");

			// Determinar el status basado en la acción
			const status = action === "create" ? "created" : "draft";
			debugLog(`📋 Guardando como: ${status} (acción: ${action})`);

			// Generar número de cotización solo para nuevas cotizaciones
			let quoteNumber = "";
			if (!isEdit || !quoteId) {
				try {
					quoteNumber = await generateQuoteId();
					debugLog("📝 Número de cotización generado:", quoteNumber);
				} catch (error) {
					console.error("❌ Error generando número de cotización:", error);
				}
			}

			// Recalcular totales antes de guardar para asegurar que estén actualizados
			debugLog("🔄 RECALCULANDO TOTALES ANTES DE GUARDAR");
			recalculateTotals();

			// Esperar un momento para que se actualice el estado
			await new Promise((resolve) => setTimeout(resolve, 200));

			debugLog("📊 ESTADO FINAL ANTES DE GUARDAR:", {
				total_amount: formData.total_amount,
				equipment_total: formData.equipment_total,
				services_count: formData.selected_services.length,
				equipment_count: formData.selected_equipment.length,
			});

			const quoteTypeResolved = quoteType;
			const urgencyFactor = getUrgencyFactor(formData.pricing_urgency);
			const complexityFactor = 1.0;

			const oneTimeResult = calculatePricingEngine({
				mode: "one_time",
				baseHours:
					Number(formData.pricing_base_hours || 0) ||
					Math.max(1, formData.selected_services.length) * 8,
				hourlyRate: Number(formData.pricing_hourly_rate || 0) || 35000,
				complexityFactor,
				urgencyFactor,
				externalCosts: Number(effectiveExternalCosts || 0),
				marginPercent: Number(formData.pricing_margin_percent || 0),
				taxPercent: Number(formData.pricing_tax_percent || 0),
			});

			const monthlyResult = calculatePricingEngine({
				mode: "monthly",
				baseHours:
					Number(formData.pricing_base_hours || 0) ||
					Math.max(1, formData.selected_services.length) * 8,
				hourlyRate: Number(formData.pricing_hourly_rate || 0) || 35000,
				monthlySupportHours:
					Number(formData.pricing_monthly_support_hours || 0) || 10,
				expectedMonthlyHours:
					Number(formData.pricing_expected_monthly_hours || 0) || 10,
				overageHourRate:
					Number(formData.pricing_overage_hour_rate || 0) ||
					Number(formData.pricing_hourly_rate || 0) ||
					35000,
				complexityFactor,
				urgencyFactor,
				externalCosts: Number(effectiveExternalCosts || 0),
				marginPercent: Number(formData.pricing_margin_percent || 0),
				taxPercent: Number(formData.pricing_tax_percent || 0),
			});

			const pricingBreakdownByType: Record<string, unknown> =
				quoteTypeResolved === "mixed"
					? {
							mode: "mixed",
							one_time: oneTimeResult.breakdown as unknown as Record<
								string,
								unknown
							>,
							monthly: monthlyResult.breakdown as unknown as Record<
								string,
								unknown
							>,
						}
					: (quoteTypeResolved === "monthly_recurring"
							? (monthlyResult.breakdown as unknown as Record<string, unknown>)
							: (oneTimeResult.breakdown as unknown as Record<string, unknown>));

			const totalQuantity = (formData.selected_services || []).reduce(
				(sum, service) => sum + sanitizeQuantity(service.quantity),
				0,
			);
			const selectedCount = Math.max(1, (formData.selected_services || []).length);
			const aggregateQuantityFactor =
				quoteTypeResolved === "monthly_recurring"
					? totalQuantity
					: 1 + ((totalQuantity / selectedCount - 1) * 0.2);
			const aggregateQuantityDiscountPercent =
				quoteTypeResolved === "monthly_recurring"
					? totalQuantity >= 5
						? 0.15
						: totalQuantity >= 3
							? 0.1
							: 0
					: 0;
			const pricingBreakdownWithQuantity: Record<string, unknown> = {
				...pricingBreakdownByType,
				external_providers: buildExternalProvidersForBreakdown(),
				external_costs: Number(effectiveExternalCosts || 0),
				quote_summary: quoteSummaryForBreakdown,
				monthly_usage:
					usageState.hoursUsed > 0
						? {
								period_month: usageState.periodMonth,
								hours_included: usageState.hoursIncluded,
								hours_used: usageState.hoursUsed,
								extra_hours: usageState.extraHours,
								overage_hour_rate: usageState.overageHourRate,
								overage_cost: usageState.overageCost,
							}
						: null,
				quantity: totalQuantity,
				quantity_factor: aggregateQuantityFactor,
				quantity_discount_percent: aggregateQuantityDiscountPercent,
				price_before_quantity:
					quoteTypeResolved === "monthly_recurring"
						? monthlyResult.subtotal
						: oneTimeResult.subtotal,
				price_after_quantity: Number(includedServicesTotal || 0),
			};

			const computedTotalAmount = Number(quoteSummary.oneTimeServicesTotal || 0);
			const computedSubscriptionMonthly = Number(
				formData.include_subscription_in_quote !== false
					? quoteSummary.monthlyFinalTotal
					: 0,
			);

			const servicesForSave = (formData.selected_services || []).filter((service) => {
				const recurringLike = isRecurringLikeService(service);
				if (formData.include_services_in_quote === false && !recurringLike) return false;
				if (formData.include_subscription_in_quote === false && recurringLike)
					return false;
				return true;
			});
			const quoteAppId =
				(typeof (formData as { app_id?: unknown }).app_id === "string" &&
				(formData as { app_id?: string }).app_id) ||
				process.env.NEXT_PUBLIC_INGENIT_APP_ID ||
				"f6afc182-3e8e-43a8-810d-d47509e7c8e1";

			const datosAGuardar: Record<string, unknown> = {
				app_id: quoteAppId,
				client_rut: formData.client_rut || "",
				client_name: formData.client_name,
				client_email: formData.client_email || "",
				client_phone:
					`${formData.client_phone_country || ""} ${formData.client_phone || ""}`.trim(),
				client_phone_country: formData.client_phone_country || "",
				client_address: formData.client_address || "",
				client_region: formData.client_region || "",
				client_commune: formData.client_commune || "",
				client_country: formData.client_country || "Chile",
				project_title: formData.project_title,
				project_description: formData.project_description || "",
				services: servicesForSave,
				equipment: formData.selected_equipment || [],
				total_amount: computedTotalAmount,
				equipment_total: formData.equipment_total || 0,
				valid_until: validUntil,
				notes: formData.notes || "",
				terms_conditions: formData.terms_conditions || "",
				discount_type: formData.discount_type || "none",
				discount_value: formData.discount_value || 0,
				discount_description: formData.discount_description || "",
				final_total: calculateFinalTotal(),
				// Campos de suscripción (accesos casted para evitar errores si QuoteForm no declara estos campos)
				subscription_enabled:
					formData.include_subscription_in_quote !== false &&
					(formData.subscription_enabled === true ||
						quoteTypeResolved === "monthly_recurring" ||
						quoteTypeResolved === "mixed"),
				subscription_monthly: computedSubscriptionMonthly,
				subscription_description: formData.subscription_description || "",
				quote_type: quoteTypeResolved,
				pricing_breakdown: pricingBreakdownWithQuantity,
				pricing_plan_id: formData.pricing_plan_id || "manual",
				pricing_plan_name: formData.pricing_plan_name || "",
				iva_included: formData.iva_included === true,
				status: status,
			};

			// Si estoy editando y NO toqué equipos, no enviar campos de equipos ni recalcular total
			if (isEdit && !equipmentDirty) {
				delete datosAGuardar.equipment;
				delete datosAGuardar.equipment_total;
				delete datosAGuardar.final_total; // evita sobreescribir con cálculos basados en un equipment_total no cargado
			}

			// Incluir quote_number solo cuando se creó una nueva cotización
			if (quoteNumber) {
				datosAGuardar.quote_number = quoteNumber;
			}

			debugLog("=== DATOS A GUARDAR ===");
			debugLog("Servicios:", datosAGuardar.services);
			debugLog("Equipos:", datosAGuardar.equipment);
			debugLog("Total servicios:", datosAGuardar.total_amount);
			debugLog("Total equipos:", datosAGuardar.equipment_total);
			debugLog("Suscripción enabled:", datosAGuardar.subscription_enabled);
			debugLog("Suscripción mensual:", datosAGuardar.subscription_monthly);
			debugLog("Suscripción desc:", datosAGuardar.subscription_description);
			debugLog("Suscripción IVA incluido?:", datosAGuardar.iva_included);
			debugLog("Datos completos:", datosAGuardar);
			debugLog("🔍 DEBUG FINAL:");
			debugLog("- isEdit:", isEdit);
			debugLog("- quoteId:", quoteId);
			debugLog("- currentQuoteId:", currentQuoteId);
			debugLog("- URL params:", window.location.search);

			debugLog("🔍 DECISIÓN FINAL:");
			debugLog("- isEdit:", isEdit);
			debugLog("- quoteId:", quoteId);
			debugLog("- ¿Actualizar?:", isEdit && quoteId);
			debugLog("- ¿Crear nueva?:", !isEdit || !quoteId);

			const sanitizePayloadBySchemaError = (
				payload: Record<string, unknown>,
				error: unknown,
			) => {
				const msg = String((error as { message?: string })?.message || "")
					.toLowerCase()
					.trim();
				const sanitized = { ...payload };

				// Nunca eliminar pricing_breakdown: contiene external_providers.
				if (msg.includes("quote_type")) {
					delete sanitized.quote_type;
				}
				if (msg.includes("pricing_external_costs")) {
					delete sanitized.pricing_external_costs;
				}

				return sanitized;
			};

			const shouldRetryLegacy = (error: unknown) => {
				const msg = String((error as { message?: string })?.message || "")
					.toLowerCase()
					.trim();
				return msg.includes("schema cache") || msg.includes("could not find the");
			};
			const saveViaAdminApi = async (
				payload: Record<string, unknown>,
				mode: "insert" | "update",
			) => {
				if (mode === "update" && quoteId) {
					const response = await fetch("/api/admin/quotes", {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							id: quoteId,
							changes: payload,
						}),
					});
					const result = (await response.json()) as {
						error?: string;
						quote?: Record<string, unknown>;
					};
					if (!response.ok || result.error) {
						const patchError = new Error(
							result.error || `Admin API PATCH failed (${response.status})`,
						) as Error & { status?: number };
						patchError.status = response.status;
						throw patchError;
					}
					return result.quote;
				}

				const response = await fetch("/api/admin/quotes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ quote: payload }),
				});
				const result = (await response.json()) as {
					error?: string;
					quote?: Record<string, unknown>;
				};
				if (!response.ok || result.error) {
					const postError = new Error(
						result.error || `Admin API POST failed (${response.status})`,
					) as Error & { status?: number };
					postError.status = response.status;
					throw postError;
				}
				return result.quote;
			};

			if (isEdit && quoteId) {
				debugLog("🔄 ACTUALIZANDO COTIZACIÓN EXISTENTE:", quoteId);
				let updatedQuote: Record<string, unknown> | undefined;
				try {
					updatedQuote = await saveViaAdminApi(datosAGuardar, "update");
				} catch (adminError) {
					const status = (adminError as { status?: number })?.status;
					if (status === 404) {
						debugLog(
							"↩️ Cotización no encontrada en update; guardando como nueva cotización",
						);
						updatedQuote = await saveViaAdminApi(datosAGuardar, "insert");
					}
					if (!updatedQuote && shouldRetryLegacy(adminError)) {
						debugLog(
							"↩️ Reintentando Admin API update con payload legacy-compatible",
						);
						const legacySafePayload = sanitizePayloadBySchemaError(
							datosAGuardar,
							adminError,
						);
						try {
							updatedQuote = await saveViaAdminApi(legacySafePayload, "update");
						} catch (legacyUpdateError) {
							const legacyStatus = (legacyUpdateError as { status?: number })
								?.status;
							if (legacyStatus === 404) {
								debugLog(
									"↩️ Update legacy no encontró cotización; guardando como nueva",
								);
								updatedQuote = await saveViaAdminApi(legacySafePayload, "insert");
							} else {
								throw legacyUpdateError;
							}
						}
					} else if (!updatedQuote) {
						throw adminError;
					}
				}

				if (!updatedQuote || !updatedQuote.id) {
					throw new Error("No se confirmó la actualización de la cotización");
				}

				debugLog("✅ Cotización actualizada exitosamente:", updatedQuote);
				debugLog("📋 Servicios actualizados:", updatedQuote.services);
				debugLog("🔧 Equipos actualizados:", updatedQuote.equipment);
				debugLog("💰 Total actualizado:", updatedQuote.total_amount);
				debugLog("🔧 Total equipos actualizado:", updatedQuote.equipment_total);
				alert("✅ Cotización actualizada exitosamente");
			} else {
				debugLog("🆕 CREANDO NUEVA COTIZACIÓN");
				let createdQuote: Record<string, unknown> | undefined;
				try {
					createdQuote = await saveViaAdminApi(datosAGuardar, "insert");
				} catch (adminError) {
					if (shouldRetryLegacy(adminError)) {
						debugLog(
							"↩️ Reintentando Admin API insert con payload legacy-compatible",
						);
						const legacySafePayload = sanitizePayloadBySchemaError(
							datosAGuardar,
							adminError,
						);
						createdQuote = await saveViaAdminApi(legacySafePayload, "insert");
					} else {
						throw adminError;
					}
				}

				if (!createdQuote || !createdQuote.id) {
					throw new Error("No se confirmó el guardado de la cotización");
				}

				debugLog("✅ Cotización guardada exitosamente:", createdQuote);
				debugLog("📋 Servicios guardados:", createdQuote.services);
				debugLog("🔧 Equipos guardados:", createdQuote.equipment);
				debugLog("💰 Total guardado:", createdQuote.total_amount);
				debugLog("🔧 Total equipos guardado:", createdQuote.equipment_total);
				alert("✅ Cotización guardada exitosamente");
			}

			router.push("/admin/quotes");
		} catch (error) {
			console.error("Error guardando cotización:", error);
			const errorMessage =
				(error as { message?: string })?.message ||
				(error as { code?: string })?.code ||
				"Error desconocido";
			alert(`❌ Error al guardar la cotización: ${errorMessage}`);
		}
	};

	// Funciones wrapper para los botones
	const handleSaveDraft = () => handleSaveInternal("draft");
	const handleSendQuote = () => handleSaveInternal("create");

	const renderStep1 = () => (
		<div className="space-y-6">
			{/* Búsqueda de Cliente */}
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Buscar Cliente Existente
				</h3>
				<div className="relative">
					<div className="flex items-center gap-2">
						<Search className="w-5 h-5 text-gray-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Buscar por RUT, nombre o email..."
						/>
					</div>

					{showSearchResults && searchResults.length > 0 && (
						<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
							{searchResults.map((client) => (
								<button
									type="button"
									key={client.id}
									onClick={() => selectClient(client)}
									className="w-full p-3 hover:bg-gray-50 text-left border-b last:border-b-0"
								>
									<div className="flex items-center gap-3">
										<User className="w-5 h-5 text-blue8" />
										<div>
											<div className="font-medium text-gray-900">
												{client.name}
											</div>
											<div className="text-sm text-gray-600">
												{client.rut} • {client.email}
											</div>
										</div>
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Información del Cliente */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">
						Información del Cliente
					</h3>
					{formData.client_country && (
						<div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
							<span className="text-sm text-blue8 font-medium">
								Moneda: {getCurrentCurrency().name} (
								{getCurrentCurrency().symbol})
							</span>
						</div>
					)}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							RUT del Cliente *
						</p>
						<input
							type="text"
							value={formData.client_rut}
							onChange={(e) => handleRutChange(e.target.value)}
							onKeyDown={handleRutKeyDown}
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8 ${
								formData.client_rut && rutValidation.isValid
									? "border-green-300 focus:ring-green-500"
									: formData.client_rut &&
											!rutValidation.message.includes("incompleto")
										? "border-red-300 focus:ring-red-500"
										: "border-gray-300"
							}`}
							placeholder="12.345.678-9"
							maxLength={12}
						/>
						{formData.client_rut && (
							<div
								className={`text-xs mt-1 ${
									rutValidation.isValid
										? "text-green-600"
										: rutValidation.message.includes("incompleto")
											? "text-gray-500"
											: "text-red-600"
								}`}
							>
								{rutValidation.message}
							</div>
						)}
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Nombre del Cliente *
						</p>
						<input
							type="text"
							value={formData.client_name}
							onChange={(e) => updateFormData("client_name", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Ingrese el nombre del cliente"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Email del Cliente
						</p>
						<input
							type="email"
							value={formData.client_email}
							onChange={(e) => updateFormData("client_email", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="cliente@ejemplo.com"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Teléfono del Cliente
						</p>
						<div className="flex gap-2">
							{/* Selector de código de país */}
							<div className="relative country-dropdown">
								<button
									type="button"
									onClick={() => setShowCountryDropdown(!showCountryDropdown)}
									className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue8 min-w-[100px]"
								>
									<span className="text-lg">
										{
											COUNTRY_CODES.find(
												(c) => c.code === formData.client_phone_country,
											)?.flag
										}
									</span>
									<span className="text-sm font-medium">
										{formData.client_phone_country}
									</span>
									<ChevronDown className="w-4 h-4" />
								</button>

								{showCountryDropdown && (
									<div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
										{COUNTRY_CODES.map((country) => (
											<button
												type="button"
												key={country.code}
												onClick={() => handleCountryChange(country.code)}
												className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
											>
												<span className="text-lg">{country.flag}</span>
												<span className="text-sm font-medium">
													{country.code}
												</span>
												<span className="text-xs text-gray-500">
													{country.name}
												</span>
											</button>
										))}
									</div>
								)}
							</div>

							{/* Campo de teléfono */}
							<div className="flex-1">
								<input
									type="tel"
									value={formData.client_phone}
									onChange={(e) => handlePhoneChange(e.target.value)}
									className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8 ${
										formData.client_phone && !phoneValidation.isValid
											? "border-red-300 focus:ring-red-500"
											: "border-gray-300"
									}`}
									placeholder={
										formData.client_phone_country === "+56"
											? "9 1234 5678"
											: "Número de teléfono"
									}
								/>
								{formData.client_phone && (
									<div
										className={`text-xs mt-1 ${
											phoneValidation.isValid
												? "text-green-600"
												: "text-red-600"
										}`}
									>
										{phoneValidation.message}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Dirección del Cliente */}
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Dirección del Cliente
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Dirección
						</p>
						<input
							type="text"
							value={formData.client_address}
							onChange={(e) => updateFormData("client_address", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Calle, número, departamento..."
						/>
					</div>

					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">País</p>
						<select
							value={formData.client_country || ""}
							onChange={(e) => {
								const selectedValue = e.target.value;
								debugLog("🌍 País seleccionado:", selectedValue);
								const updated = {
									...formData,
									client_country: selectedValue,
									client_region: "",
									client_commune: "",
								};
								setFormData(updated);
								sessionStorage.setItem(
									"quoteFormData",
									JSON.stringify(updated),
								);
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						>
							<option value="">Seleccionar país</option>
							{COMPLETE_GEO_DATA.map((country) => (
								<option key={country.code} value={country.name}>
									{country.flag} {country.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Región/Estado/Departamento
						</p>
						<select
							value={formData.client_region || ""}
							onChange={(e) => {
								const selectedValue = e.target.value;
								debugLog("🏛️ Región seleccionada:", selectedValue);
								const updated = {
									...formData,
									client_region: selectedValue,
									client_commune: "",
								};
								setFormData(updated);
								sessionStorage.setItem(
									"quoteFormData",
									JSON.stringify(updated),
								);
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						>
							<option value="">Seleccionar región</option>
							{getRegionsByCountry(
								COMPLETE_GEO_DATA.find(
									(c) => c.name === formData.client_country,
								)?.code || "CL",
							).map((region) => (
								<option key={region.id} value={region.name}>
									{region.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Comuna/Ciudad/Municipio
						</p>
						<select
							value={formData.client_commune || ""}
							onChange={(e) => {
								const selectedValue = e.target.value;
								debugLog("🏘️ Comuna seleccionada:", selectedValue);
								const updated = {
									...formData,
									client_commune: selectedValue,
								};
								setFormData(updated);
								sessionStorage.setItem(
									"quoteFormData",
									JSON.stringify(updated),
								);
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						>
							<option value="">Seleccionar comuna</option>
							{getCommunesByRegion(
								COMPLETE_GEO_DATA.find(
									(c) => c.name === formData.client_country,
								)?.code || "CL",
								getRegionsByCountry(
									COMPLETE_GEO_DATA.find(
										(c) => c.name === formData.client_country,
									)?.code || "CL",
								).find((r) => r.name === formData.client_region)?.id || "",
							).map((commune) => (
								<option key={commune} value={commune}>
									{commune}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Información del Proyecto */}
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Información del Proyecto
				</h3>
				<div className="space-y-4">
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Título del Proyecto *
						</p>
						<input
							type="text"
							value={formData.project_title}
							onChange={(e) => updateFormData("project_title", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Ej: Desarrollo de plataforma web"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Descripción del Proyecto
						</p>
						<textarea
							value={formData.project_description}
							onChange={(e) =>
								updateFormData("project_description", e.target.value)
							}
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Describa los detalles del proyecto..."
						/>
					</div>
				</div>
			</div>
		</div>
	);

	const renderStep2 = () => (
		<div className="space-y-6">
			{/* Información del flujo */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
				<div className="flex items-start gap-3">
					<div className="w-6 h-6 bg-blue8 text-white rounded-full flex items-center justify-center text-sm font-bold">
						1
					</div>
					<div className="flex-1">
						<h4 className="font-semibold text-blue8 mb-1">
							Flujo de Cotización
						</h4>
						<p className="text-sm text-blue8">
							<strong>Para Servicios TI:</strong> Selecciona &quot;Servicios
							TI&quot; → Te llevará al sistema granular
						</p>
						<p className="text-sm text-blue8 mt-1">
							<strong>Para Otros Servicios:</strong> Selecciona categoría →
							Elige servicio → Calcula precio
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							// Preservar parámetros de edición si estamos en modo edición
							const urlParams = new URLSearchParams(window.location.search);
							const editMode = urlParams.get("edit");
							const quoteId = urlParams.get("id");

							debugLog("🔍 DEBUG NAVEGACIÓN A TI-SERVICES (BOTÓN):");
							debugLog("- URL actual:", window.location.href);
							debugLog("- editMode detectado:", editMode);
							debugLog("- quoteId detectado:", quoteId);
							debugLog("- isEditMode state:", isEditMode);
							debugLog("- currentQuoteId state:", currentQuoteId);

							let tiServicesUrl = "/admin/ti-services";
							if (editMode === "true" && quoteId) {
								tiServicesUrl += `?edit=true&id=${quoteId}`;
								debugLog(
									"🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE EDICIÓN:",
									{ editMode, quoteId },
								);
							} else if (isEditMode && currentQuoteId) {
								// Fallback: usar el estado si los parámetros de URL no están disponibles
								tiServicesUrl += `?edit=true&id=${currentQuoteId}`;
								debugLog(
									"🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE ESTADO:",
									{ editMode: "true", quoteId: currentQuoteId },
								);
							} else {
								debugLog("⚠️ NO SE DETECTARON PARÁMETROS DE EDICIÓN");
							}

							router.push(tiServicesUrl);
						}}
						className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 text-sm font-medium"
					>
						Ir a Servicios TI
					</button>
				</div>
			</div>

			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Seleccionar Categoría de Servicios
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{Object.entries(SERVICE_CATEGORIES)
						.filter(([key]) => key !== "servicios_mantencion")
						.map(([key, category]) => {
						const servicesInCategory = formData.selected_services.filter(
							(s) => s.category === key,
						).length;
						return (
							<button
								type="button"
								key={key}
								onClick={() => {
									// Solo limpiar servicios si NO estamos en modo edición y NO hay servicios ya seleccionados
									if (
										selectedCategory !== key &&
										!isEditMode &&
										formData.selected_services.length === 0
									) {
										clearAllServices();
										debugLog(
											"🔄 Categoría cambiada, servicios limpiados (nueva cotización)",
										);
									} else if (selectedCategory !== key) {
										debugLog(
											"🔄 Categoría cambiada, manteniendo servicios existentes (modo edición)",
										);
									}
									setSelectedCategory(key);
									setIsCategoryModalOpen(true);
								}}
								className={`p-4 border-2 rounded-lg text-left transition-all ${
									selectedCategory === key
										? "border-blue8 bg-blue8 text-white"
										: "border-gray-300 hover:border-blue8 hover:bg-blue-50"
								}`}
							>
								<div className="flex justify-between items-start">
									<div>
										<h4 className="font-semibold mb-2">{category.name}</h4>
										<p className="text-sm opacity-80">
											{key === "servicios_ti"
												? `${category.services.length} servicios con sistema granular`
												: key === "servicios_mantencion"
													? `${category.services.length} servicios recurrentes mensuales`
												: `${category.services.length} servicios con cálculo dinámico`}
										</p>
										{key === "servicios_ti" && (
											<p
												className={`text-xs mt-1 ${
													selectedCategory === key
														? "text-blue-100"
														: "text-blue-600"
												}`}
											>
												🔧 Sistema de componentes individuales
											</p>
										)}
										{key === "servicios_mantencion" && (
											<p
												className={`text-xs mt-1 ${
													selectedCategory === key
														? "text-blue-100"
														: "text-green-700"
												}`}
											>
												📅 Facturación mensual recurrente
											</p>
										)}
									</div>
									{servicesInCategory > 0 && (
										<span
											className={`text-xs px-2 py-1 rounded-full ${
												selectedCategory === key
													? "bg-white text-blue8"
													: "bg-blue8 text-white"
											}`}
										>
											{servicesInCategory}
										</span>
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{selectedCategory && isCategoryModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200">
						<div className="flex items-center justify-between p-6 border-b border-gray-200">
							<div>
								<h3 className="text-lg font-semibold text-gray-900 ml-6 mt-2">
									Servicios de{" "}
									{
										SERVICE_CATEGORIES[
											selectedCategory as keyof typeof SERVICE_CATEGORIES
										].name
									}
								</h3>
								<p className="text-sm text-gray-600 ml-6">
									{formData.selected_services.length} servicios seleccionados
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsCategoryModalOpen(false)}
								className="text-gray-500 hover:text-gray-700 pr-6"
								aria-label="Cerrar modal"
							>
								<XCircle className="w-6 h-6" />
							</button>
						</div>
						<div className="px-6 py-2 overflow-y-auto max-h-[calc(90vh-84px)]">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{SERVICE_CATEGORIES[
									selectedCategory as keyof typeof SERVICE_CATEGORIES
								].services.map((rawService) => {
							const service = rawService as Service;
							// Mejorar la lógica de comparación para servicios editados
							const isSelected = formData.selected_services.find((s) => {
								// Comparar por ID exacto
								if (s.id === service.id) return true;
								// Comparar por nombre si los IDs no coinciden (para servicios editados)
								if (s.name === service.name && s.category === service.category)
									return true;
								return false;
							});

							// Debug log para servicios seleccionados
							if (isSelected) {
								debugLog(
									"✅ Servicio encontrado como seleccionado:",
									service.name,
									"ID:",
									service.id,
								);
							}

							// Debug log para todos los servicios en la grilla
							debugLog(
								"🔍 Servicio en grilla:",
								service.name,
								"ID:",
								service.id,
								"Categoría:",
								service.category,
							);
							debugLog(
								"🔍 Servicios seleccionados:",
								formData.selected_services.map((s) => ({
									name: s.name,
									id: s.id,
									category: s.category,
								})),
							);

									return (
									<div
										key={service.id}
										role="button"
										tabIndex={0}
										className={`p-4 border-2 rounded-lg transition-colors cursor-pointer ${
											isSelected
												? "border-blue8 bg-blue-50"
												: "border-gray-300 hover:border-blue8"
										}`}
										onClick={() => toggleService(service)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												toggleService(service);
											}
										}}
									>
									<div className="flex justify-between items-start mb-2">
										<div className="flex items-center gap-3">
											<h4 className="font-semibold text-gray-900">
												{service.name}
											</h4>
											{isSelected && (
												<span className="text-xs bg-blue8 text-white px-2 py-1 rounded">
													Seleccionado
												</span>
											)}
										</div>
										<span className="text-sm font-medium text-blue8">
											{isSelected
												? formatCurrencyLocal(service.price)
												: "Calcular"}
										</span>
									</div>
									<p className="text-sm text-gray-600">{service.description}</p>
									{(service.pricingMode === "monthly" ||
										service.recurring === true) && (
										<p className="text-xs text-green-700 mt-1 font-medium">
											Este servicio se factura mensualmente
										</p>
									)}

									{/* Botón Calcular */}
									<div className="mt-3">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												openCalculationModal(service);
											}}
											className="text-xs bg-blue8 text-white px-3 py-1 rounded hover:bg-blue6 transition-colors"
										>
											{service.category === "servicios_mantencion"
												? isSelected
													? "Actualizar con plan"
													: "Agregar mensual"
												: isSelected
												? "Recalcular"
												: "Calcular Precio"}
										</button>
									</div>
									</div>
									);
								})}
							</div>
						</div>
						<div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
							<p className="text-sm text-gray-600 mx-6 my-2 ml-4">
								Selecciona y calcula los servicios que quieras incluir.
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setIsCategoryModalOpen(false)}
									className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 my-2"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={() => setIsCategoryModalOpen(false)}
									className="px-4 py-2 text-sm rounded-lg bg-blue8 text-white hover:bg-blue6 mx-6 my-2"
								>
									Guardar y cerrar
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Pricing Engine (mínimo) */}
			<div className="mt-6 p-4 bg-white rounded-lg border">
				<h4 className="font-semibold mb-2">Motor de Pricing</h4>
				<div className="mb-3">
					<label className="text-sm font-medium text-gray-700">
						Plan de Mantención
					</label>
					<select
						value={selectedPlanId}
						onChange={(e) =>
							setSelectedPlanId(
								e.target.value as "manual" | "basic" | "pro" | "enterprise",
							)
						}
						className="w-full md:w-80 mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
					>
						<option value="manual">Manual</option>
						<option value="basic">Plan Básico</option>
						<option value="pro">Plan Pro</option>
						<option value="enterprise">Plan Enterprise</option>
					</select>
					{selectedPlanId !== "manual" && (
						<div className="mt-2 text-sm text-gray-700">
							<div className="inline-flex items-center gap-2">
								<span>
									{
										PRICING_PLANS.find((p) => p.id === selectedPlanId)
											?.description
									}
								</span>
								{selectedPlanId === "pro" && (
									<span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">
										Recomendado
									</span>
								)}
							</div>
						</div>
					)}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<label className="text-sm font-medium text-gray-700">
							Tipo de cotización
						</label>
						<select
							value={formData.quote_type || "one_time"}
							onChange={(e) =>
								updateFormData(
									"quote_type",
									e.target.value as QuoteForm["quote_type"],
								)
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						>
							<option value="one_time">Proyecto único</option>
							<option value="monthly_recurring">Mantención mensual</option>
							<option value="mixed">Modo mixto</option>
						</select>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">
							Tarifa hora
						</label>
						<input
							type="text"
							inputMode="numeric"
							value={formatMoneyInputValue(formData.pricing_hourly_rate ?? 35000)}
							onChange={(e) =>
								updateFormData("pricing_hourly_rate", parseMoneyInput(e.target.value))
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">
							Horas base
						</label>
						<input
							type="number"
							min={0}
							value={formData.pricing_base_hours ?? 10}
							onChange={(e) =>
								updateFormData("pricing_base_hours", Number(e.target.value || 0))
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">
							Costos externos
						</label>
						<input
							type="text"
							inputMode="numeric"
							value={formatMoneyInputValue(
								formData.pricing_external_costs_manual_override !== false
									? (formData.pricing_external_costs ?? 0)
									: externalProvidersPricing.totalCLP,
							)}
							onChange={(e) =>
								updateFormData("pricing_external_costs", parseMoneyInput(e.target.value))
							}
							disabled={formData.pricing_external_costs_manual_override === false}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						/>
						<label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
							<input
								type="checkbox"
								checked={formData.pricing_external_costs_manual_override !== false}
								onChange={(e) =>
									updateFormData(
										"pricing_external_costs_manual_override",
										e.target.checked,
									)
								}
							/>
							Usar costo externo manual (si se desactiva, se calcula desde proveedores)
						</label>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">
							Margen (%)
						</label>
						<input
							type="number"
							min={0}
							step="0.01"
							value={formData.pricing_margin_percent ?? 0.4}
							onChange={(e) =>
								updateFormData(
									"pricing_margin_percent",
									Number(e.target.value || 0),
								)
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">
							Urgencia
						</label>
						<select
							value={formData.pricing_urgency || "normal"}
							onChange={(e) =>
								updateFormData(
									"pricing_urgency",
									e.target.value as QuoteForm["pricing_urgency"],
								)
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						>
							<option value="normal">Normal</option>
							<option value="high">Alta</option>
							<option value="critical">Crítica</option>
						</select>
					</div>
				</div>

				<div className="mt-4 p-4 border rounded-lg bg-gray-50">
					<button
						type="button"
						onClick={() => setShowExternalProviders((prev) => !prev)}
						className="w-full flex items-center justify-between text-left"
					>
						<p className="text-sm font-semibold text-gray-800">
							Proveedores externos administrados
						</p>
						<div className="flex items-center gap-3">
							<p className="text-xs text-gray-500">
								Total referencial: {formatCurrencyLocal(externalProvidersPricing.totalCLP)}
							</p>
							<ChevronDown
								className={`w-4 h-4 text-gray-500 transition-transform ${showExternalProviders ? "rotate-180" : ""}`}
							/>
						</div>
					</button>

					{showExternalProviders && (
						<>
							<p className="text-xs text-gray-500 mt-3 mb-3">
								Valores referenciales. Los costos reales pueden variar por consumo, plan
								contratado y tipo de cambio.
							</p>
							<div className="space-y-2">
								{externalProviders.map((provider) => (
									<div
										key={provider.id}
										className="p-3 bg-white border rounded-md grid grid-cols-1 md:grid-cols-12 gap-2"
									>
										<div className="md:col-span-4">
											<label className="flex items-center gap-2 text-sm font-medium text-gray-800">
												<input
													type="checkbox"
													checked={provider.enabledByDefault}
													onChange={() => toggleExternalProvider(provider.id)}
												/>
												{provider.name}
											</label>
											<p className="text-xs text-gray-500">
												{provider.category} • {provider.billingType}
											</p>
											<p className="text-xs text-gray-500">{provider.notes}</p>
										</div>
										<div className="md:col-span-2">
											<label className="text-xs text-gray-600">Costo base</label>
											<input
												type="text"
												inputMode="numeric"
												value={formatMoneyInputValue(provider.baseCost)}
												onChange={(e) =>
													updateExternalProviderField(
														provider.id,
														"baseCost",
														parseMoneyInput(e.target.value),
													)
												}
												className="w-full px-2 py-1 border rounded"
											/>
										</div>
										<div className="md:col-span-1">
											<label className="text-xs text-gray-600">Moneda</label>
											<p className="text-sm py-1">{provider.currency}</p>
										</div>
										<div className="md:col-span-2">
											<label className="text-xs text-gray-600">Markup</label>
											<input
												type="number"
												min={0}
												step="0.01"
												value={provider.markupPercent}
												onChange={(e) =>
													updateExternalProviderField(
														provider.id,
														"markupPercent",
														Number(e.target.value || 0),
													)
												}
												className="w-full px-2 py-1 border rounded"
											/>
										</div>
										<div className="md:col-span-1">
											<label className="text-xs text-gray-600">Cantidad</label>
											<input
												type="number"
												min={1}
												step={1}
												value={provider.quantity}
												onChange={(e) =>
													updateExternalProviderField(
														provider.id,
														"quantity",
														Number(e.target.value || 1),
													)
												}
												className="w-full px-2 py-1 border rounded"
											/>
										</div>
										<div className="md:col-span-2">
											<label className="text-xs text-gray-600">Cobro cliente (CLP)</label>
											<p className="text-sm py-1">
												{formatCurrencyLocal(
													calculateExternalProvidersTotal([provider]).totalCLP,
												)}
											</p>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
				{(formData.quote_type || "one_time") !== "one_time" && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
						<div>
							<label className="text-sm font-medium text-gray-700">
								Horas soporte mensual
							</label>
							<input
								type="number"
								min={0}
								value={formData.pricing_monthly_support_hours ?? 10}
								onChange={(e) =>
									updateFormData(
										"pricing_monthly_support_hours",
										Number(e.target.value || 0),
									)
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-gray-700">
								Horas estimadas reales
							</label>
							<input
								type="number"
								min={0}
								value={formData.pricing_expected_monthly_hours ?? 10}
								onChange={(e) =>
									updateFormData(
										"pricing_expected_monthly_hours",
										Number(e.target.value || 0),
									)
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							/>
						</div>
						<div>
						<label className="text-sm font-medium text-gray-700">
							Costo hora adicional
						</label>
						<input
							type="text"
							inputMode="numeric"
							value={formatMoneyInputValue(formData.pricing_overage_hour_rate ?? 40000)}
							onChange={(e) =>
								updateFormData(
									"pricing_overage_hour_rate",
									parseMoneyInput(e.target.value),
								)
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						/>
						</div>
					</div>
				)}
				{(formData.quote_type || "one_time") !== "one_time" && (
					<div className="mt-4 p-4 border rounded-lg bg-gray-50">
						<p className="text-sm font-semibold text-gray-800 mb-3">
							Consumo mensual
						</p>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
							<div>
								<label className="text-sm font-medium text-gray-700">Mes</label>
								<input
									type="month"
									value={usageMonth}
									onChange={(e) => setUsageMonth(e.target.value)}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
								/>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-700">
									Horas usadas
								</label>
								<input
									type="number"
									min={0}
									step="0.1"
									value={usageHoursInput}
									onChange={(e) => setUsageHoursInput(e.target.value)}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
								/>
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-gray-700">Notas</label>
								<input
									type="text"
									value={usageNotesInput}
									onChange={(e) => setUsageNotesInput(e.target.value)}
									placeholder="Detalle del consumo mensual"
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
								/>
							</div>
						</div>
						<div className="mt-3">
							<button
								type="button"
								onClick={handleSaveMonthlyUsage}
								disabled={usageSaving}
								className={`px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 ${usageSaving ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								{usageSaving ? "Guardando..." : "Guardar consumo"}
							</button>
						</div>
						<div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
							<div className="p-3 bg-white border rounded">
								<p className="text-gray-500">Horas incluidas</p>
								<p className="font-semibold">
									{usageState.hoursIncluded.toLocaleString("es-CL")}
								</p>
							</div>
							<div className="p-3 bg-white border rounded">
								<p className="text-gray-500">Horas usadas</p>
								<p className="font-semibold">
									{usageState.hoursUsed.toLocaleString("es-CL")}
								</p>
							</div>
							<div className="p-3 bg-white border rounded">
								<p className="text-gray-500">Horas extra</p>
								<p className="font-semibold">
									{usageState.extraHours.toLocaleString("es-CL")}
								</p>
							</div>
							<div className="p-3 bg-white border rounded">
								<p className="text-gray-500">Costo extra</p>
								<p className="font-semibold text-blue8">
									{formatCurrencyLocal(usageState.overageCost)}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="mt-6 p-4 bg-white rounded-lg border">
				<h4 className="font-semibold mb-2">
					Suscripción (facturación mensual)
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
					<div>
						<label
							htmlFor="subscription_monthly"
							className="text-sm font-medium text-gray-700"
						>
							Monto mensual
						</label>
						<input
							id="subscription_monthly"
							type="text"
							inputMode="numeric"
							value={
								formData.subscription_monthly
									? formatCurrencyLocal(formData.subscription_monthly)
									: ""
							}
							onChange={(e) => {
								const num = parseMoneyInput(e.target.value);
								updateFormData("subscription_monthly", num);
								updateFormData("subscription_enabled", true);
							}}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Ej: 100000"
						/>
						<div className="text-xs text-gray-500 mt-1">
							Formato: {formatCurrencyLocal(formData.subscription_monthly || 0)}
						</div>
					</div>

					<div className="md:col-span-2">
						<label
							htmlFor="subscription_description"
							className="text-sm font-medium text-gray-700"
						>
							Descripción
						</label>
						<input
							id="subscription_description"
							type="text"
							value={formData.subscription_description || ""}
							onChange={(e) =>
								updateFormData("subscription_description", e.target.value)
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Ej: Plan de soporte mensual"
						/>

						<div className="mt-2 text-sm flex gap-4 items-center">
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name="iva_included"
									checked={formData.iva_included === true}
									onChange={() => updateFormData("iva_included", true)}
									className="accent-blue-600"
								/>
								IVA incluido
							</label>
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name="iva_included"
									checked={formData.iva_included === false}
									onChange={() => updateFormData("iva_included", false)}
									className="accent-blue-600"
								/>
								+ IVA
							</label>
						</div>
					</div>
				</div>
			</div>

			{/* Vista previa separada de servicios seleccionados */}
			{formData.selected_services.length > 0 && (
				<div className="mt-8 p-4 bg-gray-50 rounded-lg space-y-4">
					<div>
						<h4 className="font-semibold text-gray-900 mb-3">
							Servicios de proyecto
						</h4>
						<div className="space-y-2">
							{formData.selected_services
								.filter((service) => service.serviceKind !== "monthly_component")
								.map((service) => (
									<div key={service.id} className="p-3 bg-white rounded border">
										<div className="flex items-center justify-between text-sm">
											<div>
												<p className="font-medium text-gray-900">{service.name}</p>
												<p className="text-gray-500">{service.category}</p>
											</div>
											<div className="text-right">
												<p className="font-medium text-blue8">
													{formatCurrencyLocal(service.price)}
												</p>
												<p className="text-gray-600">
													Cantidad: {sanitizeQuantity(service.quantity)}
												</p>
											</div>
										</div>
										{!isViewMode && (
											<div className="mt-2 flex items-center gap-3 text-xs">
												<button
													type="button"
													onClick={() => removeService(service.id)}
													className="text-red-600 hover:text-red-800"
												>
													Eliminar
												</button>
												{service.pricingMode !== "monthly" &&
													service.category !== "servicios_mantencion" && (
														<button
															type="button"
															onClick={() => openCalculationModal(service)}
															className="bg-blue8 text-white px-2 py-1 rounded hover:bg-blue6 transition-colors"
														>
															Recalcular
														</button>
													)}
											</div>
										)}
									</div>
								))}
						</div>
					</div>
					<div>
						<h4 className="font-semibold text-emerald-900 mb-3">
							Servicios mensuales asociados
						</h4>
						<div className="space-y-2">
							{formData.selected_services
								.filter((service) => service.serviceKind === "monthly_component")
								.map((service) => (
									<div
										key={service.id}
										className="p-3 bg-emerald-50 border border-emerald-200 rounded"
									>
										<div className="flex items-center justify-between text-sm">
											<div>
												<p className="font-medium text-emerald-900">{service.name}</p>
												<p className="text-emerald-700">{service.category}</p>
											</div>
											<div className="text-right">
												<p className="font-medium text-emerald-900">
													{formatCurrencyLocal(service.price)} /mes
												</p>
												<p className="text-emerald-700">
													Cantidad: {sanitizeQuantity(service.quantity)}
												</p>
											</div>
										</div>
										{!isViewMode && (
											<div className="mt-2">
												<button
													type="button"
													onClick={() => removeService(service.id)}
													className="text-red-600 hover:text-red-800 text-xs"
												>
													Eliminar
												</button>
											</div>
										)}
									</div>
								))}
							{formData.selected_services.filter(
								(service) => service.serviceKind === "monthly_component",
							).length === 0 && (
								<p className="text-sm text-gray-500">
									No hay servicios mensuales asociados.
								</p>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Modal de Cálculo */}
			{showCalculationModal && selectedServiceForCalculation && (
				<CalculationModal
					service={selectedServiceForCalculation}
					onCalculate={calculateServiceWithParams}
					onClose={() => setShowCalculationModal(false)}
					country={formData.client_country}
					region={formData.client_region}
				/>
			)}
		</div>
	);

	const renderStep3 = () => (
		<div className="space-y-6">
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Equipos y Materiales
				</h3>
				<p className="text-sm text-gray-600">
					Agrega los equipos y materiales necesarios para el proyecto. Incluye
					enlaces de compra y precios.
				</p>
			</div>

			{/* Formulario para agregar equipos */}
			<div className="bg-gray-50 rounded-lg p-6">
				<h4 className="font-medium text-gray-900 mb-4">Agregar Nuevo Equipo</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Nombre del Equipo *
						</p>
						<input
							type="text"
							value={equipmentForm.name}
							onChange={(e) => updateEquipmentForm("name", e.target.value)}
							placeholder="Ej: Switch Cisco 24 puertos"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Descripción
						</p>
						<input
							type="text"
							value={equipmentForm.description}
							onChange={(e) =>
								updateEquipmentForm("description", e.target.value)
							}
							placeholder="Descripción breve del equipo"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Enlace de Compra
						</p>
						<input
							type="url"
							value={equipmentForm.internet_link}
							onChange={(e) =>
								updateEquipmentForm("internet_link", e.target.value)
							}
							placeholder="https://ejemplo.com/producto"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Categoría
						</p>
						<select
							value={equipmentForm.category}
							onChange={(e) => {
								updateEquipmentForm("category", e.target.value);
								// Recalcular precio de venta si hay precio de compra
								if (equipmentForm.purchase_price && e.target.value) {
									const pricing = calculateSalePrice(
										parseFloat(equipmentForm.purchase_price),
										e.target.value,
									);
									updateEquipmentForm(
										"sale_price",
										pricing.salePrice.toString(),
									);
								}
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Seleccionar categoría</option>
							{getAllCategories().map((category) => (
								<option key={category.id} value={category.id}>
									{category.name} ({category.margin}% margen)
								</option>
							))}
						</select>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Precio de Compra *
						</p>
						<input
							type="text"
							inputMode="numeric"
							value={formatMoneyInputValue(Number(equipmentForm.purchase_price || 0))}
							onChange={(e) => {
								const parsedValue = parseMoneyInput(e.target.value);
								updateEquipmentForm("purchase_price", String(parsedValue || ""));
								// Recalcular precio de venta si hay categoría seleccionada
								if (parsedValue && equipmentForm.category) {
									const pricing = calculateSalePrice(
										parsedValue,
										equipmentForm.category,
									);
									updateEquipmentForm(
										"sale_price",
										pricing.salePrice.toString(),
									);
								}
							}}
							placeholder="0"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Precio de Venta * (calculado automáticamente)
						</p>
						<input
							type="text"
							inputMode="numeric"
							value={formatMoneyInputValue(Number(equipmentForm.sale_price || 0))}
							onChange={(e) =>
								updateEquipmentForm(
									"sale_price",
									String(parseMoneyInput(e.target.value) || ""),
								)
							}
							placeholder="0"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
						/>
						{equipmentForm.purchase_price &&
							equipmentForm.sale_price &&
							equipmentForm.category && (
								<p className="text-xs text-gray-500 mt-1">
									Margen:{" "}
									{calculateActualMargin(
										parseFloat(equipmentForm.purchase_price),
										parseFloat(equipmentForm.sale_price),
									)}
									%
								</p>
							)}
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Cantidad
						</p>
						<input
							type="number"
							min="1"
							value={equipmentForm.quantity}
							onChange={(e) => updateEquipmentForm("quantity", e.target.value)}
							placeholder="1"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div className="md:col-span-2">
						<p className="block text-sm font-medium text-gray-700 mb-1">
							Notas Adicionales
						</p>
						<textarea
							value={equipmentForm.notes}
							onChange={(e) => updateEquipmentForm("notes", e.target.value)}
							placeholder="Notas sobre el equipo, especificaciones, etc."
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>
				<div className="mt-4">
					<button
						type="button"
						onClick={handleAddEquipment}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Agregar Equipo
					</button>
				</div>
			</div>

			{/* Lista de equipos seleccionados */}
			{(() => {
				debugLog(
					"🔧 RENDER STEP 3 - EQUIPOS EN FORM DATA:",
					formData.selected_equipment,
				);
				debugLog(
					"🔧 RENDER STEP 3 - CANTIDAD DE EQUIPOS:",
					formData.selected_equipment?.length || 0,
				);
				return null;
			})()}
			{(formData.selected_equipment?.length || 0) > 0 && (
				<div className="bg-white border border-gray-200 rounded-lg">
					<div className="px-6 py-4 border-b border-gray-200">
						<h4 className="font-medium text-gray-900">
							Equipos Seleccionados ({formData.selected_equipment?.length || 0})
						</h4>
					</div>
					<div className="p-6">
						<div className="space-y-4">
							{(formData.selected_equipment || []).map((equipment) => (
								<div
									key={equipment.id}
									className="p-4 border border-gray-200 rounded-lg"
								>
									{editingEquipmentId === equipment.id ? (
										<div className="space-y-3">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Nombre
													</p>
													<input
														type="text"
														defaultValue={equipment.name}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																name: e.target.value,
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Descripción
													</p>
													<input
														type="text"
														defaultValue={equipment.description}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																description: e.target.value,
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Enlace
													</p>
													<input
														type="text"
														defaultValue={equipment.internet_link}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																internet_link: e.target.value,
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Categoría
													</p>
													<select
														defaultValue={equipment.category || ""}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																category: e.target.value as string,
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
													>
														<option value="" disabled>
															Seleccionar categoría
														</option>
														{getAllCategories().map((category) => (
															<option key={category.id} value={category.id}>
																{category.name} ({category.margin}% margen)
															</option>
														))}
													</select>
												</div>
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Precio Compra
													</p>
													<input
														type="text"
														inputMode="numeric"
														value={formatMoneyInputValue(
															Number(
																equipmentEditForm.purchase_price ??
																	equipment.purchase_price ??
																	0,
															),
														)}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																purchase_price: parseMoneyInput(e.target.value),
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Precio Venta
													</p>
													<input
														type="text"
														inputMode="numeric"
														value={formatMoneyInputValue(
															Number(
																equipmentEditForm.sale_price ??
																	equipment.sale_price ??
																	0,
															),
														)}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																sale_price: parseMoneyInput(e.target.value),
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<p className="block text-xs text-gray-500 mb-1">
														Cantidad
													</p>
													<input
														type="number"
														min={1}
														defaultValue={equipment.quantity}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																quantity: parseInt(e.target.value || "1", 10),
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div className="md:col-span-2">
													<p className="block text-xs text-gray-500 mb-1">
														Notas
													</p>
													<input
														type="text"
														defaultValue={equipment.notes || ""}
														onChange={(e) =>
															setEquipmentEditForm((prev) => ({
																...prev,
																notes: e.target.value,
															}))
														}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
											</div>
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() => setEditingEquipmentId(null)}
													className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
												>
													Cancelar
												</button>
												<button
													type="button"
													onClick={() => {
														const current = formData.selected_equipment || [];
														const updatedList = current.map((e) =>
															e.id === equipment.id
																? ({ ...e, ...equipmentEditForm } as Equipment)
																: e,
														);
														const newTotal = updatedList.reduce(
															(sum, e) => sum + e.sale_price * e.quantity,
															0,
														);
														updateFormData("selected_equipment", updatedList);
														updateFormData("equipment_total", newTotal);
														setEditingEquipmentId(null);
														setEquipmentEditForm({});
													}}
													className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
												>
													Guardar
												</button>
											</div>
										</div>
									) : (
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<h5 className="font-medium text-gray-900">
													{equipment.name}
												</h5>
												<p className="text-sm text-gray-600">
													{equipment.description}
												</p>
												<div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
													<span>Cantidad: {equipment.quantity}</span>
													<span>
														Compra:{" "}
														{formatEquipmentPrice(
															equipment.purchase_price || 0,
															formData.client_country,
														)}
													</span>
													<span>
														Venta:{" "}
														{formatEquipmentPrice(
															equipment.sale_price || 0,
															formData.client_country,
														)}
													</span>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() =>
														updateEquipmentQuantity(
															equipment.id,
															equipment.quantity - 1,
														)
													}
													className="p-1 text-gray-600 hover:text-gray-800"
												>
													<Minus className="w-4 h-4" />
												</button>
												<input
													type="number"
													min="1"
													value={equipment.quantity}
													onChange={(e) => {
														const newQuantity =
															parseInt(e.target.value, 10) || 1;
														updateEquipmentQuantity(equipment.id, newQuantity);
													}}
													className="w-12 text-center text-sm font-medium border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
													style={{
														WebkitAppearance: "none",
														MozAppearance: "textfield",
														appearance: "none",
													}}
												/>
												<button
													type="button"
													onClick={() =>
														updateEquipmentQuantity(
															equipment.id,
															equipment.quantity + 1,
														)
													}
													className="p-1 text-gray-600 hover:text-gray-800"
												>
													<Plus className="w-4 h-4" />
												</button>
												<span className="text-sm font-medium text-gray-900 ml-2">
													{formatEquipmentPrice(
														(equipment.sale_price || 0) *
															(equipment.quantity || 1),
														formData.client_country,
													)}
												</span>
												<button
													type="button"
													onClick={() => {
														setEditingEquipmentId(equipment.id);
														setEquipmentEditForm(equipment);
													}}
													className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-200 rounded"
												>
													Editar
												</button>
												<button
													type="button"
													onClick={() => removeEquipment(equipment.id)}
													className="text-red-500 hover:text-red-700"
												>
													<svg
														className="w-4 h-4"
														aria-hidden="true"
														focusable="false"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
											</div>
										</div>
									)}
								</div>
							))}

							<div className="pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between">
									<span className="text-lg font-medium text-gray-900">
										Total Equipos:
									</span>
									<span className="text-lg font-bold text-gray-900">
										{formatEquipmentPrice(
											formData.equipment_total || 0,
											formData.client_country,
										)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Resumen de totales */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h4 className="font-medium text-blue-900 mb-2">Resumen de Totales</h4>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-blue-800">Total Servicios:</span>
						<span className="font-medium">
							{formatEquipmentPrice(
								includedServicesTotal,
								formData.client_country,
							)}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-blue-800">Total Equipos:</span>
						<span className="font-medium">
							{formatEquipmentPrice(
								formData.equipment_total || 0,
								formData.client_country,
							)}
						</span>
					</div>
					<div className="flex justify-between border-t border-blue-200 pt-2">
						<span className="text-blue-900 font-medium">Total General:</span>
						<span className="text-blue-900 font-bold">
							{formatEquipmentPrice(
								includedServicesTotal + (formData.equipment_total || 0),
								formData.client_country,
							)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);

	const renderStep4 = () => {
		const quoteType = formData.quote_type || "one_time";
		const isMonthlyOnly = quoteType === "monthly_recurring";
		const isOneTimeOnly = quoteType === "one_time";
		const isMixed = quoteType === "mixed";
		return (
			<div className="space-y-6">
			{/* Se removieron bloques de recuperación TI y debug para una UI limpia */}
			<div className="bg-white border border-gray-300 rounded-lg p-4">
				<h3 className="text-lg font-semibold text-gray-900 mb-3">
					Qué incluir en esta cotización
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="checkbox"
							checked={formData.include_services_in_quote !== false}
							onChange={(e) =>
								updateFormData("include_services_in_quote", e.target.checked)
							}
						/>
						Incluir servicios del proyecto
					</label>
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="checkbox"
							checked={formData.include_subscription_in_quote !== false}
							onChange={(e) =>
								updateFormData("include_subscription_in_quote", e.target.checked)
							}
						/>
						Incluir suscripción / costos mensuales
					</label>
				</div>
			</div>

			<div className="space-y-4">
				{(!isMonthlyOnly || quoteSummary.oneTimeLines.length > 0) && (
					<div className="bg-white border border-gray-300 rounded-lg p-4">
					<h3 className="text-lg font-semibold text-gray-900 mb-3">
						{isMonthlyOnly
							? "A) Resumen pago único (referencia)"
							: "A) Servicios de cobro único"}
					</h3>
					{!quoteSummary.includeServices ? (
						<p className="text-sm text-gray-500">
							Sección excluida en Paso 4.
						</p>
					) : quoteSummary.oneTimeLines.length === 0 ? (
						<p className="text-sm text-gray-500">
							No hay servicios de cobro único seleccionados.
						</p>
					) : (
						<div className="space-y-2">
							{quoteSummary.oneTimeLines.map((line) => (
								<div
									key={`ot-${line.id}`}
									className="p-3 border border-gray-200 rounded-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium text-gray-900">{line.name}</p>
											<p className="text-xs text-gray-500">{line.category}</p>
										</div>
										<div className="text-right text-sm">
											<p>Cantidad: {line.quantity}</p>
											<p>Base: {formatCurrencyLocal(line.basePrice)}</p>
											<p className="font-semibold text-blue8">
												Total línea: {formatCurrencyLocal(line.lineTotal)}
											</p>
										</div>
									</div>
								</div>
							))}
							<div className="pt-2 border-t flex justify-between font-semibold">
								<span>Total cobro único (servicios):</span>
								<span>{formatCurrencyLocal(quoteSummary.oneTimeServicesTotal)}</span>
							</div>
						</div>
					)}
					</div>
				)}

				{(!isOneTimeOnly || monthlySelectedServices.length > 0) && (
					<div className="bg-white border border-emerald-300 rounded-lg p-4">
					<h3 className="text-lg font-semibold text-emerald-900 mb-3">
						{isMonthlyOnly ? "B) Resumen mensual" : "B) Servicios mensuales / mantención"}
					</h3>
					{!quoteSummary.includeSubscription ? (
						<p className="text-sm text-gray-500">
							Sección excluida en Paso 4.
						</p>
					) : monthlySelectedServices.length === 0 ? (
						<p className="text-sm text-gray-500">
							No hay servicios mensuales seleccionados.
						</p>
					) : (
						<div className="space-y-2">
							{monthlySelectedServices.map((line) => (
								<div
									key={`mn-${line.id}`}
									className="p-3 border border-emerald-200 bg-emerald-50 rounded-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium text-emerald-900">{line.name}</p>
											<p className="text-xs text-emerald-700">{line.category}</p>
											{line.planName && (
												<p className="text-xs text-emerald-700">
													Plan: {line.planName}
												</p>
											)}
											{line.description && (
												<p className="text-xs text-emerald-800 mt-1">
													{line.description}
												</p>
											)}
										</div>
										<div className="text-right text-sm">
											<p>Cantidad: {line.quantity}</p>
											<p>Mensual base: {formatCurrencyLocal(line.baseMonthly)}</p>
											<p className="font-semibold text-emerald-900">
												Total mensual línea:{" "}
												{formatCurrencyLocal(line.lineTotalMonthly)}
											</p>
										</div>
									</div>
								</div>
							))}
							<div className="pt-2 border-t border-emerald-300 flex justify-between font-semibold text-emerald-900">
								<span>Total mensual servicios:</span>
								<span>{formatCurrencyLocal(quoteSummary.monthlyServicesTotal)}</span>
							</div>
						</div>
					)}
					</div>
				)}

				{(!isOneTimeOnly || quoteSummary.externalProviderLines.length > 0) && (
					<div className="bg-white border border-indigo-300 rounded-lg p-4">
					<h3 className="text-lg font-semibold text-indigo-900 mb-3">
						C) Infraestructura administrada
					</h3>
					{quoteSummary.externalProviderLines.length === 0 ? (
						<p className="text-sm text-gray-500">
							No hay proveedores externos seleccionados.
						</p>
					) : (
						<div className="space-y-2">
							{quoteSummary.externalProviderLines.map((line) => (
								<div
									key={`ext-${line.id}`}
									className="p-3 border border-indigo-200 rounded-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium text-indigo-900">{line.name}</p>
											<p className="text-xs text-indigo-700">
												Moneda: {line.currency} | Costo base:{" "}
												{line.baseCost.toLocaleString("es-CL")}
											</p>
											<p className="text-xs text-indigo-700">
												Markup: {(line.markupPercent * 100).toFixed(0)}% | Cantidad:{" "}
												{line.quantity}
											</p>
										</div>
										<p className="font-semibold text-indigo-900">
											{formatCurrencyLocal(line.subtotal)}
										</p>
									</div>
								</div>
							))}
							<div className="pt-2 border-t border-indigo-300 flex justify-between font-semibold text-indigo-900">
								<span>Total infraestructura mensual:</span>
								<span>{formatCurrencyLocal(quoteSummary.externalProvidersTotal)}</span>
							</div>
						</div>
					)}
					</div>
				)}

				{(!isOneTimeOnly ||
					(quoteSummary.monthlyUsage &&
						Number(quoteSummary.monthlyUsage.hours_used || 0) > 0)) && (
					<div className="bg-white border border-amber-300 rounded-lg p-4">
					<h3 className="text-lg font-semibold text-amber-900 mb-3">
						D) Consumo mensual
					</h3>
					{quoteSummary.monthlyUsage &&
					Number(quoteSummary.monthlyUsage.hours_used || 0) > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
							<div>
								<p className="text-gray-500">Mes</p>
								<p className="font-semibold">
									{String(quoteSummary.monthlyUsage.period_month || usageMonth)}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Horas incluidas</p>
								<p className="font-semibold">
									{Number(
										quoteSummary.monthlyUsage.hours_included || 0,
									).toLocaleString("es-CL")}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Horas usadas</p>
								<p className="font-semibold">
									{Number(quoteSummary.monthlyUsage.hours_used || 0).toLocaleString(
										"es-CL",
									)}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Horas extra</p>
								<p className="font-semibold">
									{Number(quoteSummary.monthlyUsage.extra_hours || 0).toLocaleString(
										"es-CL",
									)}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Costo extra</p>
								<p className="font-semibold text-amber-900">
									{formatCurrencyLocal(quoteSummary.usageOverageTotal)}
								</p>
							</div>
						</div>
					) : (
						<p className="text-sm text-gray-500">
							Sin sobreconsumo mensual registrado.
						</p>
					)}
					</div>
				)}
			</div>

			{/* Sección de Equipos */}
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Equipos Seleccionados
					{(formData.selected_equipment?.length || 0) > 0 && (
						<span className="ml-2 text-sm font-normal text-green-600">
							({formData.selected_equipment?.length || 0} equipo
							{(formData.selected_equipment?.length || 0) !== 1 ? "s" : ""})
						</span>
					)}
				</h3>
				{(formData.selected_equipment?.length || 0) === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<p>No hay equipos seleccionados</p>
						<p className="text-sm mt-2">Agrega equipos en el paso 3</p>
					</div>
				) : (
					<div className="space-y-3">
						{(formData.selected_equipment || []).map((equipment) => (
							<div
								key={equipment.id}
								className="bg-white border border-gray-300 rounded-lg p-4"
							>
								<div className="flex justify-between items-start">
									<div className="flex-1">
										<h4 className="font-semibold text-gray-900">
											{equipment.name}
										</h4>
										<p className="text-sm text-gray-600 mt-1">
											{equipment.description}
										</p>
										<div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
											<span>Cantidad: {equipment.quantity}</span>
											<span>
												Compra:{" "}
												{formatEquipmentPrice(
													equipment.purchase_price || 0,
													formData.client_country,
												)}
											</span>
											<span>
												Venta:{" "}
												{formatEquipmentPrice(
													equipment.sale_price || 0,
													formData.client_country,
												)}
											</span>
											<span>Categoría: {equipment.category}</span>
										</div>
										{equipment.notes && (
											<p className="text-xs text-gray-500 mt-2">
												Notas: {equipment.notes}
											</p>
										)}
									</div>
									<div className="text-right">
										<span className="font-medium text-green-600">
											{formatEquipmentPrice(
												(equipment.sale_price || 0) * (equipment.quantity || 1),
												formData.client_country,
											)}
										</span>
										{!isViewMode && (
											<button
												type="button"
												onClick={() => removeEquipment(equipment.id)}
												className="text-red-600 hover:text-red-800 text-sm mt-2 block"
											>
												Eliminar
											</button>
										)}
									</div>
								</div>
							</div>
						))}
						<div className="border-t pt-4">
							<div className="flex justify-between items-center text-lg font-semibold">
								<span>Total Equipos:</span>
								<span className="text-green-600">
									{formatEquipmentPrice(
										formData.equipment_total || 0,
										formData.client_country,
									)}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Resumen Final */}
			<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
				<h4 className="font-medium text-gray-900 mb-3">Resumen Final</h4>
				<div className="space-y-2 text-sm">
					{quoteSummary.includeServices &&
						quoteSummary.oneTimeLines.length > 0 && (
						<>
							<div className="flex justify-between">
								<span className="text-gray-700">Total cobro único:</span>
								<span className="font-medium">
									{formatCurrencyLocal(quoteSummary.oneTimeServicesTotal)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-700">Costos únicos (equipos):</span>
								<span className="font-medium">
									{formatEquipmentPrice(
										includedEquipmentTotal,
										formData.client_country,
									)}
								</span>
							</div>
							<div className="flex justify-between border-t border-gray-300 pt-2">
								<span className="text-gray-900 font-semibold">Total único:</span>
								<span className="font-medium">
									{formatCurrencyLocal(quoteSummary.oneTimeTotalWithEquipment)}
								</span>
							</div>
						</>
					)}

					<div className="flex justify-between">
						<span className="text-gray-700">Total mensual servicios:</span>
						<span className="font-medium">
							{formatCurrencyLocal(quoteSummary.monthlyServicesTotal)}
						</span>
					</div>
					<div className="flex justify-between text-sm text-gray-700 mt-1">
						<span>Total infraestructura mensual:</span>
						<span className="font-medium">
							{formatCurrencyLocal(quoteSummary.externalProvidersTotal)}
						</span>
					</div>
					<div className="flex justify-between text-sm text-gray-700">
						<span>Sobreconsumo mensual:</span>
						<span className="font-medium">
							{formatCurrencyLocal(quoteSummary.usageOverageTotal)}
						</span>
					</div>
					<div className="flex justify-between border-t border-dashed border-gray-300 pt-2">
						<span className="text-gray-900 font-semibold">Total mensual final:</span>
						<span className="font-semibold">
							{formatCurrencyLocal(quoteSummary.monthlyFinalTotal)}
						</span>
					</div>

					{/* Mostrar descuento si existe */}
					{formData.discount_type !== "none" && formData.discount_value > 0 && (
						<>
							<div className="flex justify-between text-green-600">
								<span>
									Descuento (
									{formData.discount_type === "percentage"
										? `${formData.discount_value}%`
										: formatCurrencyLocal(formData.discount_value)}
									):
								</span>
								<span className="font-medium">
									-{formatCurrencyLocal(calculateDiscount())}
								</span>
							</div>
							{formData.discount_description &&
								formData.discount_description.trim() !==
									"Aplica a suscripción mensual" && (
									<div className="text-xs text-gray-500 italic">
										{formData.discount_description}
									</div>
								)}
						</>
					)}

					{quoteSummary.includeServices &&
						quoteSummary.oneTimeLines.length > 0 && (
						<>
							<div className="flex justify-between">
								<span className="text-gray-900 font-semibold">Total único sin IVA:</span>
								<span className="font-medium">
									{formatCurrencyLocal(calculateFinalTotal())}
								</span>
							</div>

							<div className="flex justify-between">
								<span className="text-gray-900 font-semibold">IVA 19%:</span>
								<span className="font-medium">
									{formatCurrencyLocal(calculateIVA())}
								</span>
							</div>

							<div className="flex justify-between border-t border-gray-300 pt-2">
								<span className="text-gray-900 font-semibold">
									{isOneTimeOnly ? "Total proyecto" : "Total final único c/IVA"}
								</span>
								<span className="text-gray-900 font-bold text-lg">
									{formatCurrencyLocal(calculateTotalWithIVA())}
								</span>
							</div>
						</>
					)}
					<div className="flex justify-between border-t border-gray-300 pt-2">
						<span className="text-gray-900 font-semibold">
							{isMonthlyOnly
								? "Total mensual"
								: isMixed
									? "Total general (único + mensual)"
									: "Total general a presentar"}
						</span>
						<span className="text-gray-900 font-bold text-lg">
							{formatCurrencyLocal(
								isMonthlyOnly
									? quoteSummary.monthlyFinalTotal
									: calculateTotalWithIVA() + quoteSummary.monthlyFinalTotal,
							)}
						</span>
					</div>
					{/* Mostrar suscripción separada del total final */}
					{formData.include_subscription_in_quote !== false &&
						(formData.subscription_enabled === true ||
							(formData.subscription_monthly || 0) > 0 ||
							quoteSummary.monthlyFinalTotal > 0) && (
						<div className="mt-3 border-t border-dashed border-gray-200 pt-3">
							<div className="flex justify-between items-start">
								<div>
									<div className="text-gray-700 font-medium">
										Suscripción (mensual)
									</div>
									{formData.subscription_description && (
										<div className="text-xs text-gray-500">
											{formData.subscription_description}
										</div>
									)}
								</div>
								<div className="text-right">
									<div className="font-medium subscription-amount">
										{formatCurrencyLocal(includedSubscriptionMonthly)}
									</div>
									{formData.iva_included && (
										<div className="text-xs text-gray-500">IVA incluido</div>
									)}
									{/* Desglose: mostrar IVA y total mensual con IVA */}
									{includedSubscriptionMonthly > 0 &&
										(() => {
											const sub = Number(includedSubscriptionMonthly || 0);
											const ivaAmount = formData.iva_included
												? 0
												: Math.round(sub * 0.19);
											const totalWithIva = sub + ivaAmount;
											return (
												<div className="mt-2 text-sm text-right text-gray-700">
													{!formData.iva_included && (
														<div className="text-xs">
															IVA (19%):{" "}
															<span className="font-medium">
																{formatCurrencyLocal(ivaAmount)}
															</span>
														</div>
													)}
													<div className="font-semibold">
														Total mensual:{" "}
														<span className="ml-2">
															{formatCurrencyLocal(totalWithIva)}
														</span>
													</div>
												</div>
											);
										})()}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Detalles Adicionales
				</h3>
				<div className="space-y-4">
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Fecha de Validez
						</p>
						<input
							type="date"
							value={formData.valid_until}
							onChange={(e) => updateFormData("valid_until", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
						/>
					</div>

					{/* Sistema de Descuentos */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<h4 className="font-medium text-blue-900 mb-3">
							Descuento Personalizado
						</h4>
						<div className="space-y-3">
							<div>
								<label
									htmlFor="discount_type"
									className="block text-sm font-medium text-blue-800 mb-2"
								>
									Tipo de Descuento
								</label>
								<select
									id="discount_type"
									value={formData.discount_type}
									onChange={(e) => {
										const newType = e.target.value as
											| "percentage"
											| "amount"
											| "none";
										updateFormData("discount_type", newType);
										if (newType === "none") {
											updateFormData("discount_value", 0);
											updateFormData("discount_description", "");
										}
									}}
									className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
								>
									<option value="none">Sin descuento</option>
									<option value="percentage">Porcentaje (%)</option>
									<option value="amount">Monto fijo</option>
								</select>
							</div>

							{formData.discount_type !== "none" && (
								<>
									<div>
										<label
											htmlFor="discount_value"
											className="block text-sm font-medium text-blue-800 mb-2"
										>
											{formData.discount_type === "percentage"
												? "Porcentaje de Descuento"
												: "Monto de Descuento"}
										</label>
										<div className="flex items-center gap-2">
											<input
												id="discount_value"
												type={
													formData.discount_type === "percentage" ? "number" : "text"
												}
												inputMode={
													formData.discount_type === "percentage"
														? undefined
														: "numeric"
												}
												min={formData.discount_type === "percentage" ? "0" : undefined}
												max={
													formData.discount_type === "percentage"
														? "100"
														: undefined
												}
												step={
													formData.discount_type === "percentage" ? "0.01" : "1"
												}
												value={
													formData.discount_type === "percentage"
														? formData.discount_value
														: formatMoneyInputValue(formData.discount_value)
												}
												onChange={(e) =>
													updateFormData(
														"discount_value",
														formData.discount_type === "percentage"
															? (Number.parseFloat(e.target.value) || 0)
															: parseMoneyInput(e.target.value),
													)
												}
												className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder={
													formData.discount_type === "percentage" ? "0.00" : "0"
												}
											/>
											<span className="text-sm font-medium text-blue-800">
												{formData.discount_type === "percentage"
													? "%"
													: getCurrentCurrency().symbol}
											</span>
										</div>
										{formData.discount_type === "percentage" &&
											formData.discount_value > 100 && (
												<p className="text-xs text-red-600 mt-1">
													El porcentaje no puede ser mayor al 100%
												</p>
											)}
									</div>

									<div>
										<label
											htmlFor="discount_description"
											className="block text-sm font-medium text-blue-800 mb-2"
										>
											Descripción del Descuento
										</label>
										<input
											id="discount_description"
											type="text"
											value={formData.discount_description}
											onChange={(e) =>
												updateFormData("discount_description", e.target.value)
											}
											className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Ej: Descuento por cliente frecuente, promoción especial, etc."
										/>
									</div>

									{/* Vista previa del descuento */}
									{formData.discount_value > 0 && (
										<div className="bg-white border border-blue-300 rounded-lg p-3">
											<div className="space-y-1 text-sm text-gray-800">
												<div className="flex justify-between">
													<span className="text-gray-700">Subtotal:</span>
													<span className="font-medium">
														{formatCurrencyLocal(
															(formData.total_amount || 0) +
																(formData.equipment_total || 0),
														)}
													</span>
												</div>
												<div className="flex justify-between text-green-600">
													<span>
														Descuento (
														{formData.discount_type === "percentage"
															? `${formData.discount_value}%`
															: formatCurrencyLocal(formData.discount_value)}
														):
													</span>
													<span className="font-medium">
														-{formatCurrencyLocal(calculateDiscount())}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-gray-700">Total sin IVA:</span>
													<span className="font-medium">
														{formatCurrencyLocal(calculateFinalTotal())}
													</span>
												</div>
												<div className="flex justify-between text-sm text-gray-700">
													<span>Total sin descuento (incluye IVA):</span>
													<span className="font-medium">
														{formatCurrencyLocal(
															((formData.total_amount || 0) +
																(formData.equipment_total || 0)) *
																1.19,
														)}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-gray-700">IVA 19%:</span>
													<span className="font-medium">
														{formatCurrencyLocal(calculateIVA())}
													</span>
												</div>
												<div className="flex justify-between border-t border-blue-200 pt-1">
													<span className="text-gray-900 font-semibold">
														Total Final:
													</span>
													<span className="text-lg font-semibold">
														{formatCurrencyLocal(calculateTotalWithIVA())}
													</span>
												</div>
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>

					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Notas Adicionales
						</p>
						<textarea
							value={formData.notes}
							onChange={(e) => updateFormData("notes", e.target.value)}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Notas adicionales para el cliente..."
						/>
					</div>
					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Términos y Condiciones
						</p>
						<textarea
							value={formData.terms_conditions}
							onChange={(e) =>
								updateFormData("terms_conditions", e.target.value)
							}
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Términos y condiciones de la cotización..."
						/>
					</div>

					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Mensaje de Validez del PDF
						</p>
						<textarea
							value={formData.validity_message}
							onChange={(e) =>
								updateFormData("validity_message", e.target.value)
							}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
							placeholder="Mensaje que aparecerá en el PDF después de los totales..."
						/>
						<p className="text-xs text-gray-500 mt-1">
							💡 Usa {"{fecha}"} para que se reemplace automáticamente con la
							fecha de validez. Ejemplo: "Cotización válida hasta {"{fecha}"}{" "}
							por disponibilidad de equipos"
						</p>
					</div>
				</div>
			</div>
		</div>
		);
	};

	// Funciones para manejar equipos
	const addEquipment = (equipment: Equipment) => {
		debugLog("🔧 AGREGANDO EQUIPO:", equipment);

		setFormData((prev) => {
			const currentEquipment = prev.selected_equipment || [];

			if (currentEquipment.find((e) => e.id === equipment.id)) {
				debugLog("⚠️ Equipo ya existe");
				return prev;
			}

			const newEquipment = [...currentEquipment, equipment];

			const updated = {
				...prev,
				selected_equipment: newEquipment,
			};

			// Guardar inmediatamente
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
			debugLog("✅ EQUIPO AGREGADO:", updated);
			setEquipmentDirty(true);

			return updated;
		});

		// Recalcular totales después de agregar equipo
		setTimeout(() => recalculateTotals(), 0);
	};

	const removeEquipment = (equipmentId: string) => {
		const currentEquipment = formData.selected_equipment || [];
		const newEquipment = currentEquipment.filter((e) => e.id !== equipmentId);
		updateFormData("selected_equipment", newEquipment);
		// Recalcular totales después de remover equipo
		setTimeout(() => recalculateTotals(), 0);
	};

	const updateEquipmentQuantity = (equipmentId: string, quantity: number) => {
		const currentEquipment = formData.selected_equipment || [];
		const newEquipment = currentEquipment.map((e) =>
			e.id === equipmentId ? { ...e, quantity: Math.max(1, quantity) } : e,
		);
		updateFormData("selected_equipment", newEquipment);
		// Recalcular totales después de actualizar cantidad
		setTimeout(() => recalculateTotals(), 0);
	};

	// Funciones para manejar el formulario de equipos
	const updateEquipmentForm = (field: string, value: string) => {
		setEquipmentForm((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleAddEquipment = () => {
		// Validar campos requeridos
		if (
			!equipmentForm.name ||
			!equipmentForm.purchase_price ||
			!equipmentForm.sale_price
		) {
			alert(
				"Por favor completa los campos requeridos: Nombre, Precio de Compra y Precio de Venta",
			);
			return;
		}

		// Crear nuevo equipo
		const newEquipment: Equipment = {
			id: `equipment_${Date.now()}`,
			name: equipmentForm.name,
			description: equipmentForm.description,
			internet_link: equipmentForm.internet_link,
			purchase_price: parseFloat(equipmentForm.purchase_price),
			sale_price: parseFloat(equipmentForm.sale_price),
			quantity: parseInt(equipmentForm.quantity, 10),
			category: equipmentForm.category,
			notes: equipmentForm.notes,
		};

		// Agregar equipo a la lista
		addEquipment(newEquipment);

		// Limpiar formulario
		setEquipmentForm({
			name: "",
			description: "",
			internet_link: "",
			category: "",
			purchase_price: "",
			sale_price: "",
			quantity: "1",
			notes: "",
		});

		debugLog("Equipo agregado:", newEquipment);
	};

	// Función para recalcular totales cuando se modifican servicios
	function recalculateTotals() {
		debugLog("🔄 INICIANDO RECÁLCULO DE TOTALES");

		// Usar el estado actual del formData
		setFormData((prev) => {
			debugLog("Servicios actuales:", prev.selected_services);
			debugLog("Equipos actuales:", prev.selected_equipment);

			const servicesTotal = prev.selected_services.reduce((sum, service) => {
				const isRecurringService =
					service.pricingMode === "monthly" ||
					service.recurring === true ||
					service.category === "servicios_mantencion" ||
					service.serviceKind === "monthly_component";
				if (isRecurringService) {
					return sum;
				}
				const hasPriceAfterQuantity =
					typeof service.priceAfterQuantity === "number" &&
					Number.isFinite(service.priceAfterQuantity);
				if (hasPriceAfterQuantity) {
					const servicePrice = Number(service.priceAfterQuantity || 0);
					debugLog(`Servicio ${service.name}: $${servicePrice}`);
					return sum + servicePrice;
				}

				const hasQuantityBase =
					typeof service.priceBeforeQuantity === "number" &&
					Number.isFinite(service.priceBeforeQuantity);
				const serviceQuantity = hasQuantityBase
					? sanitizeQuantity(service.quantity)
					: 1;
				const serviceMode = resolveServicePricingMode(service);
				const quantityPricing = applyQuantityPricing({
					price: hasQuantityBase ? service.priceBeforeQuantity || 0 : service.price || 0,
					quantity: serviceQuantity,
					pricingMode: serviceMode,
				});
				const servicePrice = quantityPricing.priceAfterQuantity;
				debugLog(`Servicio ${service.name}: $${servicePrice}`);
				return sum + servicePrice;
			}, 0);
			const suggestedSubscription = prev.selected_services.reduce(
				(sum, service) => {
					const isRecurringService =
						service.pricingMode === "monthly" ||
						service.recurring === true ||
						service.category === "servicios_mantencion" ||
						service.serviceKind === "monthly_component";
					if (!isRecurringService) return sum;

					const hasMonthlyAfterQuantity =
						typeof service.monthlyMaintenanceAfterQuantity === "number" &&
						Number.isFinite(service.monthlyMaintenanceAfterQuantity);
					if (hasMonthlyAfterQuantity) {
						return sum + Number(service.monthlyMaintenanceAfterQuantity || 0);
					}

					const hasMonthlyBase =
						typeof service.monthlyMaintenanceBeforeQuantity === "number" &&
						Number.isFinite(service.monthlyMaintenanceBeforeQuantity) &&
						typeof service.quantity === "number";
					const serviceQuantity = hasMonthlyBase
						? sanitizeQuantity(service.quantity)
						: 1;
					const monthlyBaseCandidate =
						hasMonthlyBase
							? service.monthlyMaintenanceBeforeQuantity || 0
							: Number(service.monthlyMaintenance || 0) > 0
								? service.monthlyMaintenance || 0
								: service.priceBeforeQuantity || service.price || 0;
					const monthlyQuantityPricing = applyQuantityPricing({
						price: monthlyBaseCandidate,
						quantity: serviceQuantity,
						pricingMode: "monthly",
					});
					return sum + monthlyQuantityPricing.priceAfterQuantity;
				},
				0,
			);

			const equipmentTotal = prev.selected_equipment.reduce(
				(sum, equipment) => {
					const equipmentPrice =
						(equipment.sale_price || 0) * (equipment.quantity || 1);
					debugLog(
						`Equipo ${equipment.name}: $${equipment.sale_price} × ${equipment.quantity} = $${equipmentPrice}`,
					);
					return sum + equipmentPrice;
				},
				0,
			);

			debugLog("🔄 TOTALES CALCULADOS:", {
				servicesTotal,
				equipmentTotal,
				finalTotal: servicesTotal + equipmentTotal,
			});

			const updated = {
				...prev,
				total_amount: servicesTotal,
				equipment_total: equipmentTotal,
				...(prev.subscription_auto_from_services !== false
					? {
							subscription_enabled: suggestedSubscription > 0,
							subscription_monthly: suggestedSubscription,
							subscription_description:
								"Mantención mensual sugerida según servicios seleccionados",
						}
					: {}),
			};

			// Guardar inmediatamente en sessionStorage
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));

			return updated;
		});
	}

	// Función para actualizar un servicio existente y recalcular totales
	const updateService = (serviceId: string, updatedService: Service) => {
		debugLog("🔄 ACTUALIZANDO SERVICIO:", serviceId, updatedService);

		setFormData((prev) => {
			let updatedServices = prev.selected_services.map((s) =>
				s.id === serviceId ? updatedService : s,
			);
			const monthlyCompanion = buildMonthlyCompanionService(updatedService);
			const monthlyCompanionId = `${serviceId}__monthly`;
			const existingMonthlyIndex = updatedServices.findIndex(
				(s) => s.id === monthlyCompanionId,
			);
			if (monthlyCompanion) {
				if (existingMonthlyIndex >= 0) {
					updatedServices = updatedServices.map((s, idx) =>
						idx === existingMonthlyIndex ? monthlyCompanion : s,
					);
				} else {
					updatedServices = [...updatedServices, monthlyCompanion];
				}
			} else if (existingMonthlyIndex >= 0) {
				updatedServices = updatedServices.filter((s) => s.id !== monthlyCompanionId);
			}

			const updated = {
				...prev,
				selected_services: updatedServices,
			};

			// Guardar inmediatamente
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
			setEquipmentDirty(true);

			debugLog("✅ SERVICIO ACTUALIZADO EN ESTADO");
			debugLog("Servicios actualizados:", updatedServices);

			return updated;
		});

		// Recalcular totales después de actualizar
		setTimeout(() => {
			debugLog("🔄 RECALCULANDO TOTALES DESPUÉS DE ACTUALIZAR SERVICIO");
			recalculateTotals();
		}, 100);
	};

	useEffect(() => {
		setFormData((prev) => {
			if (!prev.selected_services || prev.selected_services.length === 0) return prev;
			let changed = false;
			let nextServices = [...prev.selected_services];

			for (const service of prev.selected_services) {
				if (isRecurringLikeService(service)) continue;
				const monthlyCompanion = buildMonthlyCompanionService(service);
				if (!monthlyCompanion) continue;
				const existingMonthlyIndex = nextServices.findIndex(
					(s) => s.id === monthlyCompanion.id,
				);
				if (existingMonthlyIndex >= 0) {
					const existing = nextServices[existingMonthlyIndex];
					if (
						existing.price !== monthlyCompanion.price ||
						existing.quantity !== monthlyCompanion.quantity ||
						existing.priceBeforeQuantity !== monthlyCompanion.priceBeforeQuantity
					) {
						nextServices = nextServices.map((s, idx) =>
							idx === existingMonthlyIndex ? monthlyCompanion : s,
						);
						changed = true;
					}
				} else {
					nextServices = [...nextServices, monthlyCompanion];
					changed = true;
				}
			}

			if (!changed) return prev;
			const updated = { ...prev, selected_services: nextServices };
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
			return updated;
		});
	}, [formData.selected_services]);

	// Función específica para actualizar servicios TI
	function updateTIService(updatedService: Service) {
		debugLog("🔄 ACTUALIZANDO SERVICIO TI:", updatedService);

		setFormData((prev) => {
			const updatedServices = prev.selected_services.map((s) =>
				s.id === updatedService.id ? updatedService : s,
			);

			const updated = {
				...prev,
				selected_services: updatedServices,
			};

			// Guardar inmediatamente
			sessionStorage.setItem("quoteFormData", JSON.stringify(updated));
			setEquipmentDirty(true);

			debugLog("✅ SERVICIO TI ACTUALIZADO EN ESTADO");
			debugLog("Servicios actualizados:", updatedServices);

			return updated;
		});

		// Recalcular totales inmediatamente
		setTimeout(() => {
			debugLog("🔄 RECALCULANDO TOTALES DESPUÉS DE ACTUALIZAR SERVICIO TI");
			recalculateTotals();
		}, 50);
	}

	// Función para forzar actualización desde tiQuoteData
	function forceUpdateFromTIData() {
		debugLog("🔧 FORZANDO ACTUALIZACIÓN DESDE DATOS TI");
		const tiQuoteData = sessionStorage.getItem("tiQuoteData");
		if (tiQuoteData) {
			try {
				const updatedData = JSON.parse(tiQuoteData);
				debugLog("🔧 DATOS TI ENCONTRADOS:", updatedData);

				if (
					updatedData.selected_services &&
					updatedData.selected_services.length > 0
				) {
					debugLog(
						"🔧 ACTUALIZANDO SERVICIOS TI:",
						updatedData.selected_services,
					);

					// Actualizar cada servicio TI
					updatedData.selected_services.forEach((service: Service) => {
						if (service.category === "servicios_ti") {
							debugLog(
								"🔧 FORZANDO ACTUALIZACIÓN DE SERVICIO TI:",
								service.name,
								"Precio:",
								service.price,
							);
							updateTIService(service as Service);
						}
					});

					// Limpiar datos TI después de actualizar
					setTimeout(() => {
						sessionStorage.removeItem("tiQuoteData");
						sessionStorage.removeItem("originalTIService");
						sessionStorage.removeItem("selectedTIService");
						debugLog("✅ DATOS TI LIMPIADOS DESPUÉS DE ACTUALIZACIÓN");
					}, 500);

					debugLog("✅ ACTUALIZACIÓN FORZADA COMPLETADA");
				} else {
					debugLog("❌ No hay servicios en los datos TI");
				}
			} catch (error) {
				console.error("❌ Error en actualización forzada:", error);
			}
		} else {
			debugLog("❌ No hay datos TI para actualizar");

			// Verificar si hay datos en quoteFormData que necesiten actualización
			const quoteFormData = sessionStorage.getItem("quoteFormData");
			if (quoteFormData) {
				try {
					const formData = JSON.parse(quoteFormData);
					debugLog(
						"🔧 VERIFICANDO DATOS EN QUOTEFORMDATA:",
						formData.selected_services,
					);

					// FORZAR ACTUALIZACIÓN DEL ESTADO DESDE SESSIONSTORAGE
					debugLog(
						"🔧 FORZANDO ACTUALIZACIÓN DEL ESTADO DESDE SESSIONSTORAGE",
					);
					setFormData(formData);

					// Recalcular totales para asegurar que estén actualizados
					setTimeout(() => {
						recalculateTotals();
						debugLog("✅ TOTALES RECALCULADOS DESDE QUOTEFORMDATA");
					}, 100);
				} catch (error) {
					console.error("❌ Error verificando quoteFormData:", error);
				}
			}
		}
	}

	return (
		<div className="p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => router.push("/admin/quotes")}
						className="p-2 text-gray-600 hover:text-gray-800"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							{isViewMode
								? "Ver Cotización"
								: isEditMode
									? "Editar Cotización"
									: "Nueva Cotización"}
						</h1>
						<p className="text-gray-600">
							{isViewMode
								? "Visualizar cotización existente"
								: isEditMode
									? "Modificar cotización existente"
									: "Crear una nueva cotización para el cliente"}
						</p>
						{isViewMode && (
							<div className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full inline-flex items-center gap-1.5">
								<Eye className="w-4 h-4" />
								<span>Modo Solo Lectura</span>
							</div>
						)}
						{isEditMode && (
							<div className="mt-2 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full inline-flex items-center gap-1.5">
								<Edit className="w-4 h-4" />
								<span>Modo Edición</span>
							</div>
						)}
					</div>
				</div>

				{/* Botones de acción */}
				<div className="flex items-center gap-2">
					{/* Botón Nueva Cotización */}
					{!isViewMode && !isEditMode && (
						<button
							type="button"
							onClick={clearForNewQuote}
							className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm"
							title="Iniciar una nueva cotización desde cero"
						>
							<Plus className="w-4 h-4" />
							Nueva Cotización
						</button>
					)}

					{/* Botón Cancelar */}
					{!isViewMode && (
						<button
							type="button"
							onClick={confirmCancelQuote}
							className="px-4 py-2 text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm"
						>
							<XCircle className="w-4 h-4" />
							Cancelar
						</button>
					)}
				</div>
			</div>

			{/* Progress Steps */}
			<div className="mb-8">
				<div className="flex items-center justify-center">
					{[1, 2, 3, 4].map((step) => (
						<div key={step} className="flex items-center">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									currentStep >= step
										? "bg-blue8 text-white"
										: "bg-gray-200 text-gray-600"
								}`}
							>
								{step}
							</div>
							{step < 4 && (
								<div
									className={`w-16 h-1 mx-2 ${
										currentStep > step ? "bg-blue8" : "bg-gray-200"
									}`}
								/>
							)}
						</div>
					))}
				</div>
				<div className="flex justify-center mt-2">
					<span className="text-sm text-gray-600">
						{currentStep === 1 && "Información del Cliente"}
						{currentStep === 2 && "Selección de Servicios"}
						{currentStep === 3 && "Equipos y Materiales"}
						{currentStep === 4 && "Revisión y Finalización"}
					</span>
				</div>
			</div>

			{/* Form Content */}
			<div className="bg-white rounded-lg shadow-sm border p-6">
				{currentStep === 1 && renderStep1()}
				{currentStep === 2 && renderStep2()}
				{currentStep === 3 && renderStep3()}
				{currentStep === 4 && renderStep4()}

				{/* Navigation Buttons */}
				<div className="mt-8 pt-6 border-t">
					{currentStep === 4 && QUOTES_DEBUG && (
						<div className="mb-4 p-4 bg-gray-50 border rounded-lg">
							<h4 className="font-semibold text-gray-900 mb-2">
								Detalle técnico interno (Pricing Engine)
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
								<div>
									<div className="text-gray-500">Subtotal</div>
									<div className="font-semibold">
										{formatCurrencyLocal(pricingPreview.primary.subtotal)}
									</div>
								</div>
								<div>
									<div className="text-gray-500">Margen</div>
									<div className="font-semibold">
										{formatCurrencyLocal(pricingPreview.primary.margin)}
									</div>
								</div>
								<div>
									<div className="text-gray-500">Impuestos</div>
									<div className="font-semibold">
										{formatCurrencyLocal(pricingPreview.primary.tax)}
									</div>
								</div>
								<div>
									<div className="text-gray-500">Total</div>
									<div className="font-bold text-blue8">
										{formatCurrencyLocal(pricingPreview.primary.total)}
									</div>
								</div>
							</div>
							<div className="mt-2 text-sm">
								{pricingPreview.mode === "monthly_recurring" ? (
									<div className="font-semibold text-green-700">
										Total mensual: {formatCurrencyLocal(pricingPreview.primary.total)}
									</div>
								) : (
									<div className="font-semibold text-blue-700">
										Total proyecto: {formatCurrencyLocal(pricingPreview.primary.total)}
									</div>
								)}
								{pricingPreview.mode === "mixed" && pricingPreview.secondary && (
									<div className="text-gray-700 mt-1">
										Proyecto único (referencia):{" "}
										{formatCurrencyLocal(pricingPreview.secondary.total)}
									</div>
								)}
								{pricingPreview.primary.total < 300000 && (
									<div className="text-amber-700 mt-1">
										Precio bajo, revisar configuración.
									</div>
								)}
								{pricingPreview.primary.total > 10000000 && (
									<div className="text-purple-700 mt-1">
										Proyecto de alta complejidad.
									</div>
								)}
							</div>
						</div>
					)}
					{/* Botones de navegación - Una sola fila */}
					<div className="flex flex-wrap items-center gap-3 justify-between">
						<div className="flex flex-wrap items-center gap-3">
							{currentStep > 1 && (
								<button
									type="button"
									onClick={() => setCurrentStep(1)}
									className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
								>
									<ChevronLeft className="w-4 h-4" />
									Editar Cliente
								</button>
							)}
							{currentStep > 2 && (
								<button
									type="button"
									onClick={() => setCurrentStep(2)}
									className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
								>
									<ChevronLeft className="w-4 h-4" />
									Editar Servicios
								</button>
							)}
							{currentStep > 3 && (
								<button
									type="button"
									onClick={() => setCurrentStep(3)}
									className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
								>
									<ChevronLeft className="w-4 h-4" />
									Editar Equipos
								</button>
							)}
						</div>

						<div className="flex flex-wrap items-center gap-3">
							{currentStep < 4 ? (
								<>
									{/* Botón "Guardar y Volver" para modo edición en paso 1 */}
									{isEditMode && currentStep === 1 && (
										<button
											type="button"
											onClick={async () => {
												// Guardar los cambios del cliente
												await handleSaveDraft();
												// Volver al resumen (paso 4)
												setCurrentStep(4);
											}}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Save className="w-4 h-4" />
											Guardar Cliente
										</button>
									)}
									{/* Botón "Guardar y Volver" para modo edición en paso 2 */}
									{isEditMode && currentStep === 2 && (
										<button
											type="button"
											onClick={async () => {
												// Guardar los cambios de servicios
												await handleSaveDraft();
												// Volver al resumen (paso 4)
												setCurrentStep(4);
											}}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Save className="w-4 h-4" />
											Guardar Servicios
										</button>
									)}
									{/* Botón "Guardar y Volver" para modo edición en paso 3 */}
									{isEditMode && currentStep === 3 && (
										<button
											type="button"
											onClick={async () => {
												// Guardar los cambios de equipos
												await handleSaveDraft();
												// Volver al resumen (paso 4)
												setCurrentStep(4);
											}}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Save className="w-4 h-4" />
											Guardar Equipos
										</button>
									)}
									<button
										type="button"
										onClick={() => {
											if (currentStep === 1) {
												if (validateStep1()) {
													setCurrentStep(currentStep + 1);
												}
											} else {
												setCurrentStep(currentStep + 1);
											}
										}}
										className="px-6 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 transition-colors flex items-center gap-2 text-sm"
									>
										Siguiente
										<ChevronDown className="w-4 h-4" />
									</button>
								</>
							) : null}
							{currentStep === 4 &&
								(isViewMode ? (
									<>
										<button
											type="button"
											onClick={handlePreviewPDF}
											className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Eye className="w-4 h-4" />
											Preview PDF
										</button>
										<button
											type="button"
											onClick={handleGeneratePDF}
											className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 transition-colors flex items-center gap-2 text-sm"
										>
											<FileText className="w-4 h-4" />
											Generar PDF
										</button>
										<button
											type="button"
											onClick={handleSendPDFByEmail}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Mail className="w-4 h-4" />
											Enviar Email
										</button>
										<button
											type="button"
											onClick={() => {
												setIsViewMode(false);
												setIsEditMode(true);
												// Agregar parámetro edit=true a la URL para que se guarde como edición
												const url = new URL(window.location.href);
												url.searchParams.set("edit", "true");
												url.searchParams.set("view", "false");
												if (currentQuoteId) {
													url.searchParams.set("id", currentQuoteId);
												}
												window.history.replaceState({}, "", url.toString());
											}}
											className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Edit className="w-4 h-4" />
											Editar
										</button>
									</>
								) : (
									<>
										<button
											type="button"
											onClick={handleSaveDraft}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
										>
											<Save className="w-4 h-4" />
											Guardar Borrador
										</button>
										<button
											type="button"
											onClick={handleSendQuote}
											className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 transition-colors flex items-center gap-2 text-sm"
										>
											<Send className="w-4 h-4" />
											Guardar Cotización
										</button>
									</>
								))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
