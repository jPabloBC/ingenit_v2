"use client";

import { CheckCircle2, Clock3 } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import SidebarAdmin from "./SidebarAdmin";

type AdminHeaderConfig = {
	title: string;
	description: string;
};

const ADMIN_HEADER_CONFIG: Record<string, AdminHeaderConfig> = {
	"/admin/dashboard": {
		title: "Panel de Administración",
		description: "",
	},
	"/admin/settings": {
		title: "Ajustes del Sistema",
		description: "Parámetros generales y credenciales operativas.",
	},
	"/admin/chat": {
		title: "Chat",
		description: "Conversaciones entrantes y atención en tiempo real.",
	},
	"/admin/chatbot-conversations": {
		title: "Conversaciones Chatbot",
		description: "Historial y seguimiento de interacciones automatizadas.",
	},
	"/admin/whatsapp-flows": {
		title: "Flujos de WhatsApp",
		description: "Edición y mantenimiento de flujos conversacionales.",
	},
	"/admin/hl": {
		title: "HL",
		description: "Panel de administración del proyecto HL.",
	},
	"/admin/ws": {
		title: "Web Services",
		description: "Tablas, datos y servicios del módulo WS.",
	},
	"/admin/pr": {
		title: "Proyectos",
		description: "",
	},
	"/admin/pr/users": {
		title: "Usuarios PR",
		description: "Gestión de usuarios, accesos y roles PR.",
	},
	"/admin/pr/companies": {
		title: "Empresas PR",
		description: "Clientes, datos comerciales y compañías del proyecto PR.",
	},
	"/admin/pr/projects": {
		title: "Proyectos PR",
		description: "Administración de proyectos y permisos asociados.",
	},
	"/admin/pr/settings": {
		title: "Configuración PR",
		description: "Ajustes específicos del proyecto PR.",
	},
	"/admin/pr/access": {
		title: "Accesos PR",
		description: "Control de disponibilidad y permisos administrativos.",
	},
	"/admin/pr/analytics": {
		title: "Analítica PR",
		description: "Indicadores y actividad del proyecto PR.",
	},
	"/admin/ds": {
		title: "Catálogo DS",
		description: "Productos base, servicios y asignaciones por vendedor.",
	},
	"/admin/cn": {
		title: "CN",
		description: "Gestión de usuarios, sesiones y datos CN.",
	},
	"/admin/cn/users": {
		title: "Usuarios CN",
		description: "Administración de usuarios y sesiones CN.",
	},
	"/admin/cn/database": {
		title: "Base de Datos CN",
		description: "Tablas y datos del módulo CN.",
	},
	"/admin/cn/analytics": {
		title: "Analítica CN",
		description: "Métricas y actividad del proyecto CN.",
	},
	"/admin/transactions": {
		title: "Transacciones",
		description: "Control de cuentas, bancos y movimientos personales.",
	},
	"/admin/print": {
		title: "Impresión",
		description: "Trabajos, tareas y asignaciones de impresión.",
	},
	"/admin/print/assignments": {
		title: "Asignaciones de Impresión",
		description: "Planificación y responsables de tareas de impresión.",
	},
	"/admin/print/image": {
		title: "Imágenes de Impresión",
		description: "Gestión de archivos e imágenes para trabajos impresos.",
	},
	"/admin/quotes": {
		title: "Cotizaciones",
		description: "Listado y seguimiento de cotizaciones.",
	},
	"/admin/quotes/create": {
		title: "Nueva Cotización",
		description: "Creación y cálculo de cotizaciones comerciales.",
	},
	"/admin/pricing-library": {
		title: "Biblioteca de Precios",
		description: "Catálogo y sincronización de precios base.",
	},
	"/admin/market-prices": {
		title: "Precios de Mercado",
		description: "Referencias y valores comerciales actualizados.",
	},
	"/admin/process-tracking": {
		title: "Seguimiento de Procesos",
		description: "Estados, responsables y avance de procesos internos.",
	},
	"/admin/ti-services": {
		title: "Servicios TI",
		description: "Administración de servicios técnicos y operativos.",
	},
	"/admin/automation-leads": {
		title: "Leads Automatizados",
		description: "Entradas y oportunidades generadas por automatización.",
	},
};

function getAdminHeaderConfig(pathname: string): AdminHeaderConfig {
	const exactMatch = ADMIN_HEADER_CONFIG[pathname];
	if (exactMatch) return exactMatch;

	const matchedPrefix = Object.keys(ADMIN_HEADER_CONFIG)
		.filter((route) => pathname.startsWith(`${route}/`))
		.sort((a, b) => b.length - a.length)[0];

	return matchedPrefix
		? ADMIN_HEADER_CONFIG[matchedPrefix]
		: {
				title: "Panel Administrativo",
				description: "Herramientas internas de gestión IngenIT.",
			};
}

function AdminPageHeader({
	config,
	isCollapsed,
}: {
	config: AdminHeaderConfig;
	isCollapsed: boolean;
}) {
	return (
		<header
			className={`fixed left-0 right-0 top-0 z-30 border-b border-gray9 bg-gray10/95 p-0 backdrop-blur transition-all duration-300 ${
				isCollapsed ? "lg:left-16" : "lg:left-64"
			}`}
		>
			<div className="overflow-hidden border-b border-gray9 bg-gradient-to-r from-blue1 via-blue5 to-blue2 px-4 py-3 text-white shadow-sm sm:px-5">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0">
						<h1 className="truncate text-xl font-normal tracking-normal text-blue15 sm:text-2xl">
							{config.title}
						</h1>
						{config.description && (
							<p className="mt-1 truncate text-sm text-blue15">
								{config.description}
							</p>
						)}
					</div>
					<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
						<div className="rounded-md border border-white/15 bg-white/10 px-3 py-2">
							<p className="text-xs text-blue15">Estado</p>
							<p className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
								<CheckCircle2 className="h-4 w-4 text-green6" />
								Activo
							</p>
						</div>
						<div className="rounded-md border border-white/15 bg-white/10 px-3 py-2">
							<p className="text-xs text-blue15">Actualizado</p>
							<p className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
								<Clock3 className="h-4 w-4 text-blue14" />
								{new Date().toLocaleDateString("es-CL")}
							</p>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { isCollapsed } = useSidebar();
	const headerConfig = getAdminHeaderConfig(pathname);

	// No aplicar layout especial para páginas de login
	const isLoginPage =
		pathname === "/admin/login" || pathname === "/admin/reset-password";

	// El chat y WhatsApp flows necesitan layout especial sin padding
	const isChatPage = pathname === "/admin/chat";
	const isWhatsAppFlowsPage = pathname === "/admin/whatsapp-flows";
	const needsFullHeight = isChatPage || isWhatsAppFlowsPage;

	if (isLoginPage) {
		return <>{children}</>;
	}

	return (
		<div
			className={`${needsFullHeight ? "h-screen" : "min-h-screen"} bg-gray10`}
		>
			{/* Sidebar dinámico */}
			<SidebarAdmin />

			{/* Contenido principal que se adapta al sidebar */}
			<div
				className={`${needsFullHeight ? "h-screen" : "min-h-screen"} transition-all duration-300 overflow-y-auto ${
					isCollapsed ? "lg:ml-16" : "lg:ml-72"
				}`}
			>
				{needsFullHeight ? (
					// Para el chat y WhatsApp flows, sin padding y altura completa
					<main className="h-full">{children}</main>
				) : (
					// Para otras páginas, con padding normal
					<>
						<AdminPageHeader
							config={headerConfig}
							isCollapsed={isCollapsed}
						/>
						<main className="p-0 pt-[96px] sm:pt-[98px] lg:pt-[82px]">
							{children}
						</main>
					</>
				)}
			</div>
		</div>
	);
}

export default function AdminLayoutWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<AdminLayoutContent>{children}</AdminLayoutContent>
		</SidebarProvider>
	);
}
