"use client";
import {
	Activity,
	ArrowUpRight,
	BarChart3,
	Bot,
	Briefcase,
	Building2,
	CalendarDays,
	Clock3,
	Database,
	ExternalLink,
	Globe,
	MessageCircle,
	MessageSquareText,
	Settings,
	ShieldCheck,
	Store,
	TrendingUp,
	Users,
	Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { trackDashboardInteraction } from "@/hooks/useVercelAnalytics";
import { supabase } from "@/lib/supabaseClient";
import VisitsStats from "./VisitsStats";

interface DashboardData {
	totalCompanies: number;
	totalUsers: number;
	totalMessages: number;
	unreadMessages: number;
	recentActivity: Array<{
		id: string;
		name: string;
		email: string;
		created_at: string;
		type: string;
	}>;
	projectVisits: Array<{
		project_code: string;
		project_url: string;
		total_visits: number;
		unique_visitors: number;
		today_visits: number;
		week_visits: number;
		month_visits: number;
		last_visit: string;
	}>;
}

export default function AdminDashboard() {
	const [dashboardData, setDashboardData] = useState<DashboardData>({
		totalCompanies: 0,
		totalUsers: 0,
		totalMessages: 0,
		unreadMessages: 0,
		recentActivity: [],
		projectVisits: [],
	});
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	const statCards = [
		{
			label: "Total Empresas",
			value: dashboardData.totalCompanies,
			helper: "Registros activos en PR",
			icon: Building2,
			color: "text-blue6",
			iconBg: "bg-blue15",
			accent: "bg-blue6",
		},
		{
			label: "Total Mensajes",
			value: dashboardData.totalMessages,
			helper: "Entrantes por WhatsApp",
			icon: MessageSquareText,
			color: "text-green2",
			iconBg: "bg-gray10",
			accent: "bg-green2",
		},
		{
			label: "Mensajes No Leídos",
			value: dashboardData.unreadMessages,
			helper: "Pendientes por revisar",
			icon: TrendingUp,
			color: "text-gold2",
			iconBg: "bg-gray10",
			accent: "bg-gold3",
		},
	];

	const projects = [
		{
			title: "IngenIT Principal",
			description: "ingenit.cl",
			icon: Globe,
			actionIcon: ExternalLink,
			tone: "blue",
			onClick: () => window.open("https://ingenit.cl", "_blank"),
		},
		{
			title: "MT - Mantenimiento",
			description: "mt.ingenit.cl",
			icon: Wrench,
			actionIcon: ExternalLink,
			tone: "blueMedium",
			onClick: () => {
				trackDashboardInteraction("project_click", "mt");
				window.open("https://mt.ingenit.cl", "_blank");
			},
		},
		{
			title: "HL",
			description: "Panel de administración",
			icon: Activity,
			actionIcon: Activity,
			tone: "blueLight",
			onClick: () => {
				trackDashboardInteraction("project_click", "hl");
				router.push("/admin/hl");
			},
		},
		{
			title: "WS - Web Services",
			description: "Tablas y datos ws_*",
			icon: Briefcase,
			actionIcon: ExternalLink,
			tone: "blueDark",
			onClick: () => {
				trackDashboardInteraction("project_click", "ws");
				router.push("/admin/ws");
			},
		},
		{
			title: "DS - Catálogo",
			description: "Productos base y asignación por vendedor",
			icon: Store,
			actionIcon: Store,
			tone: "blueSoft",
			onClick: () => {
				trackDashboardInteraction("project_click", "ds");
				router.push("/admin/ds");
			},
		},
		{
			title: "Proyectos",
			description: "Panel de administración",
			icon: Settings,
			actionIcon: Settings,
			tone: "gold",
			onClick: () => {
				trackDashboardInteraction("project_click", "pr");
				router.push("/admin/pr");
			},
		},
		{
			title: "CN - cn.ingenit.cl",
			description: "Gestión de usuarios y tablas CN",
			icon: Users,
			actionIcon: Users,
			tone: "blueMedium",
			onClick: () => {
				trackDashboardInteraction("project_click", "cn");
				router.push("/admin/cn");
			},
		},
	];

	const projectToneClasses: Record<string, string> = {
		blue: "border-blue13 bg-gray10 text-blue6 hover:bg-white",
		blueMedium:
			"border-blue13 bg-gray10 text-blue5 hover:bg-white",
		blueLight:
			"border-blue13 bg-gray10 text-blue8 hover:bg-white",
		blueDark:
			"border-blue13 bg-gray10 text-blue4 hover:bg-white",
		blueSoft:
			"border-blue13 bg-gray10 text-blue7 hover:bg-white",
		gold:
			"border-gold6 bg-gray10 text-gold2 hover:bg-white",
	};

	const projectAccentClasses: Record<string, string> = {
		blue: "bg-blue6",
		blueMedium: "bg-blue5",
		blueLight: "bg-blue8",
		blueDark: "bg-blue4",
		blueSoft: "bg-blue7",
		gold: "bg-gold2",
	};

	const quickActions = [
		{
			label: "Ver Chat",
			icon: MessageCircle,
			color: "text-blue6",
			onClick: () => router.push("/admin/chat"),
		},
		{
			label: "Conversaciones Chatbot",
			icon: Bot,
			color: "text-green2",
			onClick: () => router.push("/admin/chatbot-conversations"),
		},
		{
			label: "Configuración",
			icon: Settings,
			color: "text-gray4",
			onClick: () => router.push("/admin/settings"),
		},
	];

	const loadDashboardData = useCallback(async () => {
		try {
			// Contar empresas
			const { count: companiesCount } = await supabase
				.from("pr_companies")
				.select("*", { count: "exact", head: true });

			// Contar usuarios
			const { count: usersCount } = await supabase
				.from("pr_users")
				.select("*", { count: "exact", head: true });

			// Contar mensajes entrantes de WhatsApp (rt_messages, direction = 'in')
			let messagesCount = 0;
			try {
				const { count: totalMessages } = await supabase
					.from("rt_messages")
					.select("*", { count: "exact", head: true })
					.eq("direction", "in");
				messagesCount = totalMessages || 0;
			} catch {
				console.log("Tabla rt_messages no existe o no es accesible");
			}

			// Obtener actividad reciente de empresas y usuarios
			const { data: recentCompanies } = await supabase
				.from("pr_companies")
				.select("id, name, email, created_at")
				.order("created_at", { ascending: false })
				.limit(3);

			const { data: recentUsers } = await supabase
				.from("pr_users")
				.select("id, name, email, created_at")
				.order("created_at", { ascending: false })
				.limit(2);

			// Combinar actividad reciente
			const recentActivity = [
				...(recentCompanies || []).map((company) => ({
					...company,
					type: "company",
				})),
				...(recentUsers || []).map((user) => ({
					...user,
					type: "user",
				})),
			]
				.sort(
					(a, b) =>
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
				)
				.slice(0, 5);

			// Obtener estadísticas de visitas de proyectos
			let projectVisits: DashboardData["projectVisits"] = [];
			try {
				const { data: visitsData } = await supabase
					.from("project_visit_stats")
					.select("*")
					.order("total_visits", { ascending: false });
				projectVisits = visitsData || [];
			} catch {
				console.log("Vista project_visit_stats no disponible");
			}

			setDashboardData({
				totalCompanies: companiesCount || 0,
				totalUsers: usersCount || 0,
				totalMessages: messagesCount || 0,
				unreadMessages: 0,
				recentActivity,
				projectVisits,
			});
		} catch (error) {
			console.error("Error cargando datos del dashboard:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadDashboardData();

		// Suscripción en tiempo real a rt_messages (solo direction = 'in')
		const channel = supabase
			.channel("rt_messages_in_dashboard")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "rt_messages",
				},
				() => {
					// Recargar el dashboard ante cualquier cambio en rt_messages
					loadDashboardData();
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [loadDashboardData]);

	return (
		<div className="min-h-screen bg-gray10 p-2 sm:p-3 lg:p-4 dashboard-transition">
			{/* Stats Cards */}
			<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{statCards.map((card) => {
					const Icon = card.icon;
					return (
						<div
							key={card.label}
							className="dashboard-card relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm"
						>
							<div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
							<div className="flex items-start justify-between gap-5">
								<div className="min-w-0">
									<p className="text-sm font-medium text-gray4">{card.label}</p>
									<p className="mt-2 text-3xl font-bold leading-none text-gray1 stats-number">
										{card.value.toLocaleString("es-CL")}
									</p>
									<p className="mt-3 text-xs text-gray5">{card.helper}</p>
								</div>
								<div className={`rounded-md p-3 ${card.iconBg}`}>
									<Icon className={`h-6 w-6 ${card.color}`} />
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Project Visits Stats */}
			<div className="mb-4 rounded-md border border-gray9 bg-white p-4 shadow-sm">
				<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-gray1 sm:text-xl">
							Estadísticas de Visitas por Proyecto
						</h2>
						<p className="mt-1 text-sm text-gray5">
							Comparativo rápido de tráfico por origen.
						</p>
					</div>
					<BarChart3 className="hidden h-5 w-5 text-gray6 sm:block" />
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{["skeleton-1", "skeleton-2", "skeleton-3"].map((key) => (
							<div
								key={key}
								className="bg-gray10 rounded-md p-4 border border-gray9 animate-pulse"
							>
								<div className="h-4 w-32 bg-gray9 rounded mb-3" />
								<div className="space-y-2">
									<div className="h-3 w-full bg-gray9 rounded" />
									<div className="h-3 w-5/6 bg-gray9 rounded" />
									<div className="h-3 w-4/6 bg-gray9 rounded" />
									<div className="h-3 w-3/6 bg-gray9 rounded" />
								</div>
							</div>
						))}
					</div>
				) : dashboardData.projectVisits.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{dashboardData.projectVisits.map((project) => (
							<div
								key={`${project.project_code}-${project.project_url}`}
								className="bg-gray10 rounded-md p-4 border border-gray9"
							>
								<div className="flex items-center justify-between mb-3">
									<h3 className="font-semibold text-gray1 text-sm uppercase">
										{project.project_code === "main"
											? "IngenIT Principal"
											: project.project_code === "hl"
												? "HL"
												: project.project_code === "mt"
													? "MT - Mantenimiento"
													: project.project_code === "ws"
														? "WS - Web Services"
														: project.project_code === "pr"
															? "Proyectos"
															: project.project_code.toUpperCase()}
									</h3>
									<span className="text-xs text-gray5 font-mono">
										{project.project_code}
									</span>
								</div>

								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray4">Total Visitas:</span>
										<span className="font-semibold text-blue6">
											{project.total_visits.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray4">Hoy:</span>
										<span className="font-semibold text-green2">
											{project.today_visits.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray4">Esta Semana:</span>
										<span className="font-semibold text-gold2">
											{project.week_visits.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray4">Visitantes Únicos:</span>
										<span className="font-semibold text-blue7">
											{project.unique_visitors.toLocaleString()}
										</span>
									</div>
									<div className="pt-2 border-t border-gray9">
										<p className="text-xs text-gray5">
											Última visita:{" "}
											{new Date(project.last_visit).toLocaleString("es-CL")}
										</p>
										<p className="text-xs text-gray6 truncate">
											{project.project_url}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-gray8 bg-gray10 px-4 py-8 text-center text-gray5">
						<BarChart3 className="mb-3 h-8 w-8 text-gray7" />
						<p className="text-sm font-medium">No hay datos de visitas disponibles</p>
						<p className="mt-1 text-xs">
							Las estadísticas aparecerán cuando se registren visitas
						</p>
					</div>
				)}
			</div>

			{/* Projects Section */}
			<div className="mb-4 rounded-md border border-gray9 bg-white p-4 shadow-sm">
				<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-gray1 sm:text-xl">
							Control de Proyectos
						</h2>
						<p className="mt-1 text-sm text-gray5">
							Acceso directo a cada proyecto y sus datos específicos.
						</p>
					</div>
					<p className="text-xs font-medium uppercase tracking-wide text-gray6">
						{projects.length} accesos
					</p>
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{projects.map((project) => {
						const Icon = project.icon;
						const ActionIcon = project.actionIcon;

						return (
							<button
								key={project.title}
								type="button"
								onClick={project.onClick}
								className={`group relative min-h-28 w-full overflow-hidden rounded-md border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${projectToneClasses[project.tone]}`}
							>
								<div
									className={`absolute inset-x-0 top-0 h-1 ${projectAccentClasses[project.tone]}`}
								/>
								<div className="mb-4 flex items-center justify-between">
									<div
										className={`rounded-md p-2 text-white shadow-sm ${projectAccentClasses[project.tone]}`}
									>
										<Icon className="h-5 w-5" />
									</div>
									<ActionIcon className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
								</div>
								<h3 className="text-base font-semibold text-gray1">
									{project.title}
								</h3>
								<p className="mt-1 text-sm text-gray5">{project.description}</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* Recent Activity */}
			<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray1 sm:text-xl">
						Actividad Reciente
					</h2>
					<Clock3 className="h-5 w-5 text-gray6" />
				</div>
				<div className="space-y-3 sm:space-y-4">
					{dashboardData.recentActivity.length > 0 ? (
						dashboardData.recentActivity.map((activity) => (
							<div
								key={activity.id}
								className="flex items-center gap-3 rounded-md border border-gray9 bg-gray10 p-3 sm:gap-4 sm:p-4"
							>
								<div className="flex-shrink-0 rounded-md bg-white p-2 text-blue6 shadow-sm">
									{activity.type === "company" ? (
										<Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
									) : (
										<Users className="w-4 h-4 sm:w-5 sm:h-5" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="truncate text-sm font-medium text-gray1 sm:text-base">
										{activity.name || activity.email}
									</p>
									<p className="truncate text-xs text-gray5 sm:text-sm">
										{activity.type === "company"
											? "Nueva empresa"
											: "Nuevo usuario"}
									</p>
									<p className="text-xs text-gray6">
										{new Date(activity.created_at).toLocaleString("es-CL")}
									</p>
								</div>
								<div
									className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
										activity.type === "company"
											? "bg-blue15 text-blue5"
											: "bg-green6 text-green2"
									}`}
								>
									{activity.type === "company" ? "Empresa" : "Usuario"}
								</div>
							</div>
						))
					) : (
						<div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-gray8 bg-gray10 px-4 py-8 text-center text-gray5">
							<MessageCircle className="mb-3 h-9 w-9 text-gray7 sm:h-12 sm:w-12" />
							<p className="text-sm font-medium sm:text-base">
								No hay actividad reciente
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Quick Actions */}
			<div className="mt-4 grid grid-cols-1 gap-4 sm:gap-4 lg:grid-cols-2">
				<div className="rounded-md border border-gray9 bg-white p-6 shadow-sm">
					<h3 className="mb-4 text-base font-semibold text-gray1 sm:text-lg">
						Acciones Rápidas
					</h3>
					<div className="space-y-2">
						{quickActions.map((action) => {
							const Icon = action.icon;
							return (
								<button
									key={action.label}
									type="button"
									onClick={action.onClick}
									className="mobile-button touch-optimized flex w-full items-center justify-between gap-3 rounded-md border border-transparent p-3 text-left transition-colors duration-200 hover:border-gray9 hover:bg-gray10"
								>
									<span className="flex min-w-0 items-center gap-3">
										<Icon className={`h-5 w-5 flex-shrink-0 ${action.color}`} />
										<span className="truncate text-sm text-gray3 sm:text-base">
											{action.label}
										</span>
									</span>
									<ArrowUpRight className="h-4 w-4 text-gray6" />
								</button>
							);
						})}
					</div>
				</div>

				<div className="rounded-md border border-gray9 bg-white p-6 shadow-sm">
					<h3 className="mb-4 text-base font-semibold text-gray1 sm:text-lg">
						Información del Sistema
					</h3>
					<div className="space-y-3 text-sm">
						<div
							className="flex items-center justify-between gap-8 rounded-md border border-gray9 bg-gray10 p-3"
						>
							<span className="flex min-w-0 items-center gap-3 text-gray5">
								<span className="rounded-md bg-white p-2 text-blue6 shadow-sm">
									<Database className="h-4 w-4" />
								</span>
								<span className="truncate">Versión</span>
							</span>
							<span className="shrink-0 pr-1 font-medium text-gray1">1.0.0</span>
						</div>
						<div
							className="flex items-center justify-between gap-8 rounded-md border border-gray9 bg-gray10 p-3"
						>
							<span className="flex min-w-0 items-center gap-3 text-gray5">
								<span className="rounded-md bg-white p-2 text-green2 shadow-sm">
									<ShieldCheck className="h-4 w-4" />
								</span>
								<span className="truncate">Estado</span>
							</span>
							<span className="shrink-0 pr-1 font-medium text-green2">Activo</span>
						</div>
						<div
							className="flex items-center justify-between gap-8 rounded-md border border-gray9 bg-gray10 p-3"
						>
							<span className="flex min-w-0 items-center gap-3 text-gray5">
								<span className="rounded-md bg-white p-2 text-gold2 shadow-sm">
									<CalendarDays className="h-4 w-4" />
								</span>
								<span className="truncate">Última actualización</span>
							</span>
							<span className="shrink-0 pr-1 text-right font-medium text-gray1">
								{new Date().toLocaleDateString("es-CL")}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Visitas Stats Component */}
			<section className="mt-4">
				<h2 className="mb-3 text-xl font-semibold text-gray1">
					Visitas - Ingenit.cl
				</h2>
				<VisitsStats />
			</section>
		</div>
	);
}
