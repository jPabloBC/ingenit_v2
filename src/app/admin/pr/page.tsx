"use client";
import {
	Activity,
	AlertTriangle,
	BarChart3,
	Building2,
	CheckCircle,
	Database,
	Globe,
	Plus,
	Server,
	Settings,
	TrendingUp,
	XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CreatePRProjectModal from "@/components/CreatePRProjectModal";
import { useVercelAnalytics } from "@/hooks/useVercelAnalytics";
import { supabase } from "@/lib/supabaseClient";

interface PRProject {
	id: string;
	name: string;
	status: "active" | "inactive" | "maintenance";
	environment: "production" | "staging" | "development";
	created_at: string;
	last_deployment: string;
	health_status: "healthy" | "warning" | "error";
}

interface PRDashboardData {
	totalProjects: number;
	activeProjects: number;
	inactiveProjects: number;
	maintenanceProjects: number;
	recentProjects: PRProject[];
	systemMetrics: {
		uptime: number;
		responseTime: number;
		errorRate: number;
		totalDeployments: number;
	};
}

export default function PRAdminPage() {
	const [dashboardData, setDashboardData] = useState<PRDashboardData>({
		totalProjects: 0,
		activeProjects: 0,
		inactiveProjects: 0,
		maintenanceProjects: 0,
		recentProjects: [],
		systemMetrics: {
			uptime: 0,
			responseTime: 0,
			errorRate: 0,
			totalDeployments: 0,
		},
	});
	const [isLoading, setIsLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const router = useRouter();

	// Rastrear visitas
	useVercelAnalytics();

	const loadPRData = useCallback(async () => {
		try {
			console.log("🔍 Iniciando carga de datos PR...");

			// Cargar proyectos PR (pr_projects)
			console.log("📊 Cargando proyectos PR...");
			const { data: projects, error: projectsError } = await supabase
				.from("pr_projects")
				.select(`
          id, 
          name,
          status,
          environment,
          health_status,
          created_at,
          last_deployment
        `)
				.order("created_at", { ascending: false })
				.limit(10);

			console.log("📋 Resultado projects:", { projects, projectsError });

			if (projectsError) {
				console.error("❌ Error cargando proyectos PR:", projectsError);
				// Si es error de esquema no encontrado, mostrar datos vacíos
				if (
					projectsError.code === "PGRST116" ||
					projectsError.message?.includes("relation") ||
					projectsError.message?.includes("does not exist")
				) {
					console.log("📋 Esquema PR no configurado, mostrando datos vacíos");

					setDashboardData({
						totalProjects: 0,
						activeProjects: 0,
						inactiveProjects: 0,
						maintenanceProjects: 0,
						recentProjects: [],
						systemMetrics: {
							uptime: 0,
							responseTime: 0,
							errorRate: 0,
							totalDeployments: 0,
						},
					});
					setIsLoading(false);
					return;
				}
				throw projectsError;
			}

			// Procesar datos de proyectos
			const activeProjects =
				projects?.filter((p) => p.status === "active").length || 0;
			const inactiveProjects =
				projects?.filter((p) => p.status === "inactive").length || 0;
			const maintenanceProjects =
				projects?.filter((p) => p.status === "maintenance").length || 0;

			setDashboardData({
				totalProjects: projects?.length || 0,
				activeProjects,
				inactiveProjects,
				maintenanceProjects,
				recentProjects: projects || [],
				systemMetrics: {
					uptime: projects?.length ? 99.8 : 0,
					responseTime: projects?.length ? 120 : 0,
					errorRate: 0,
					totalDeployments: projects?.length || 0,
				},
			});
		} catch (error) {
			console.error("❌ Error cargando datos del panel PR:", error);
			// En caso de error, mostrar datos de ejemplo
			setDashboardData({
				totalProjects: 0,
				activeProjects: 0,
				inactiveProjects: 0,
				maintenanceProjects: 0,
				recentProjects: [],
				systemMetrics: {
					uptime: 0,
					responseTime: 0,
					errorRate: 0,
					totalDeployments: 0,
				},
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPRData();
	}, [loadPRData]);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "healthy":
				return <CheckCircle className="w-4 h-4 text-blue6" />;
			case "warning":
				return <AlertTriangle className="w-4 h-4 text-gold3" />;
			case "error":
				return <XCircle className="w-4 h-4 text-gold1" />;
			default:
				return <Activity className="w-4 h-4 text-blue7" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "text-white bg-blue6";
			case "inactive":
				return "text-white bg-gold1";
			case "maintenance":
				return "text-white bg-gold2";
			default:
				return "text-white bg-blue7";
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
					<p className="text-blue7">Cargando panel PR...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-2 sm:p-3 lg:p-4">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-blue7 truncate">
								Total Proyectos
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-blue1 stats-number">
								{dashboardData.totalProjects}
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-blue6 rounded-md flex-shrink-0 ml-3 mobile-icon-container">
							<Database className="w-6 h-6 sm:w-8 sm:h-8 text-white mobile-icon" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue5" />
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-blue7 truncate">
								Proyectos Activos
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-blue1 stats-number">
								{dashboardData.activeProjects}
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-blue5 rounded-md flex-shrink-0 ml-3 mobile-icon-container">
							<CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white mobile-icon" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-gold6">
					<div className="absolute inset-x-0 top-0 h-1 bg-gold2" />
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-gold1 truncate">
								En Mantenimiento
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-gold stats-number">
								{dashboardData.maintenanceProjects}
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-gold2 rounded-md flex-shrink-0 ml-3 mobile-icon-container">
							<AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-white mobile-icon" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-blue7 truncate">
								Uptime
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-blue1 stats-number">
								{dashboardData.systemMetrics.uptime}%
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-blue7 rounded-md flex-shrink-0 ml-3 mobile-icon-container">
							<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white mobile-icon" />
						</div>
					</div>
				</div>
			</div>

			{/* System Metrics */}
			<div className="bg-white rounded-md shadow-lg border border-blue13 p-4 mb-4">
				<h2 className="text-lg sm:text-xl font-semibold text-blue1 mb-4 flex items-center gap-2">
					<Server className="w-5 h-5 text-blue6" />
					Métricas del Sistema
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="relative overflow-hidden text-center p-4 bg-gray10 rounded-md border border-gray9">
						<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
						<p className="text-2xl font-bold text-blue1">
							{dashboardData.systemMetrics.responseTime}ms
						</p>
						<p className="text-sm text-blue7">Tiempo de Respuesta</p>
					</div>
					<div className="relative overflow-hidden text-center p-4 bg-gray10 rounded-md border border-gray9">
						<div className="absolute inset-x-0 top-0 h-1 bg-gold2" />
						<p className="text-2xl font-bold text-gold">
							{dashboardData.systemMetrics.errorRate}%
						</p>
						<p className="text-sm text-gold1">Tasa de Error</p>
					</div>
					<div className="relative overflow-hidden text-center p-4 bg-gray10 rounded-md border border-gray9">
						<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
						<p className="text-2xl font-bold text-blue1">
							{dashboardData.systemMetrics.totalDeployments}
						</p>
						<p className="text-sm text-blue7">Total Despliegues</p>
					</div>
				</div>
			</div>

			{/* Navigation to Sub-sections */}
			<div className="bg-white rounded-md shadow-lg border border-blue13 p-4 mb-4">
				<h2 className="text-lg sm:text-xl font-semibold text-blue1 mb-4">
					Módulos de Administración
				</h2>
				<div className="mb-4">
					<div className="flex items-center gap-2 mb-3">
						<Building2 className="w-5 h-5 text-blue6" />
						<h3 className="text-sm sm:text-base font-semibold text-blue2">
							Empresa (módulo padre)
						</h3>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<button
							type="button"
							onClick={() => router.push("/admin/pr/companies")}
							className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-blue13 hover:shadow-md text-left"
						>
							<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
							<div className="mb-3 inline-flex rounded-md bg-blue6 p-2 text-white">
								<Building2 className="w-5 h-5" />
							</div>
							<p className="text-sm font-semibold text-blue1">Empresas</p>
							<p className="text-xs text-blue7 mt-1">
								Entrada principal a sus módulos dependientes
							</p>
						</button>
					</div>
				</div>

				<div>
					<div className="flex items-center gap-2 mb-3">
						<Server className="w-5 h-5 text-gold2" />
						<h3 className="text-sm sm:text-base font-semibold text-blue2">
							Plataforma (transversal)
						</h3>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<button
							type="button"
							onClick={() => router.push("/admin/pr/analytics")}
							className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-gold6 hover:shadow-md text-left"
						>
							<div className="absolute inset-x-0 top-0 h-1 bg-gold2" />
							<div className="mb-3 inline-flex rounded-md bg-gold2 p-2 text-white">
								<BarChart3 className="w-5 h-5" />
							</div>
							<p className="text-sm font-semibold text-gold">Analytics</p>
							<p className="text-xs text-gold1 mt-1">
								Análisis y métricas globales
							</p>
						</button>

						<button
							type="button"
							onClick={() => router.push("/admin/pr/settings")}
							className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-blue13 hover:shadow-md text-left"
						>
							<div className="absolute inset-x-0 top-0 h-1 bg-blue5" />
							<div className="mb-3 inline-flex rounded-md bg-blue5 p-2 text-white">
								<Settings className="w-5 h-5" />
							</div>
							<p className="text-sm font-semibold text-blue1">Configuraciones</p>
							<p className="text-xs text-blue7 mt-1">
								Parámetros generales del sistema PR
							</p>
						</button>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white rounded-md shadow-lg border border-blue13 p-4 mb-4">
				<h2 className="text-lg sm:text-xl font-semibold text-blue1 mb-4">
					Acciones Rápidas
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<button
						type="button"
						onClick={() => window.open("https://pr.ingenit.cl", "_blank")}
						className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-blue13 hover:shadow-md text-left"
					>
						<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
						<div className="mb-3 inline-flex rounded-md bg-blue6 p-2 text-white">
							<Globe className="w-5 h-5" />
						</div>
						<p className="text-sm font-semibold text-blue1">Sitio en Vivo</p>
					</button>

					<button
						type="button"
						onClick={() => console.log("Ver logs del sistema")}
						className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-blue13 hover:shadow-md text-left"
					>
						<div className="absolute inset-x-0 top-0 h-1 bg-blue5" />
						<div className="mb-3 inline-flex rounded-md bg-blue5 p-2 text-white">
							<Activity className="w-5 h-5" />
						</div>
						<p className="text-sm font-semibold text-blue1">Ver Logs</p>
					</button>

					<button
						type="button"
						onClick={() => console.log("Configurar sistema")}
						className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-gold6 hover:shadow-md text-left"
					>
						<div className="absolute inset-x-0 top-0 h-1 bg-gold2" />
						<div className="mb-3 inline-flex rounded-md bg-gold2 p-2 text-white">
							<Settings className="w-5 h-5" />
						</div>
						<p className="text-sm font-semibold text-gold">Configuración</p>
					</button>

					<button
						type="button"
						onClick={() => console.log("Ver estadísticas")}
						className="relative w-full overflow-hidden p-4 bg-gray10 hover:bg-white rounded-md border border-blue13 hover:shadow-md text-left"
					>
						<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
						<div className="mb-3 inline-flex rounded-md bg-blue7 p-2 text-white">
							<TrendingUp className="w-5 h-5" />
						</div>
						<p className="text-sm font-semibold text-blue1">Estadísticas</p>
					</button>
				</div>
			</div>

			{/* Recent Projects */}
			<div className="bg-white rounded-md shadow-lg border border-blue13 p-4">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg sm:text-xl font-semibold text-blue1">
						Proyectos Recientes
					</h2>
					<button
						type="button"
						onClick={() => setShowCreateModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-blue6 text-white rounded-md hover:bg-blue5 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Nuevo Proyecto
					</button>
				</div>
				<div className="space-y-3 sm:space-y-4">
					{dashboardData.recentProjects.length > 0 ? (
						dashboardData.recentProjects.map((project) => (
							<div
								key={project.id}
								className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-blue6 rounded-md text-white"
							>
								<div className="flex-shrink-0">
									{getStatusIcon(project.health_status)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<p className="font-medium text-white text-sm sm:text-base truncate">
											{project.name}
										</p>
										<span
											className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}
										>
											{project.status}
										</span>
									</div>
									<p className="text-xs sm:text-sm text-white/75">
										Entorno: {project.environment} • Último despliegue:{" "}
										{new Date(project.last_deployment).toLocaleString("es-CL")}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="text-center py-8">
							<Database className="w-12 h-12 text-blue11 mx-auto mb-4" />
							<p className="text-blue7">No hay proyectos registrados</p>
							<p className="text-sm text-blue9">
								Los proyectos aparecerán aquí cuando estén configurados
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Modal para crear proyecto */}
			<CreatePRProjectModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onProjectCreated={loadPRData}
			/>
		</div>
	);
}
