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
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "warning":
				return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
			case "error":
				return <XCircle className="w-4 h-4 text-red-500" />;
			default:
				return <Activity className="w-4 h-4 text-gray-500" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "text-green-600 bg-green-100";
			case "inactive":
				return "text-red-600 bg-red-100";
			case "maintenance":
				return "text-yellow-600 bg-yellow-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Cargando panel PR...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 sm:p-6 dashboard-transition">
			{/* Header */}
			<div className="mb-6 sm:mb-8">
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-orange-100 rounded-lg">
						<Settings className="w-6 h-6 text-orange-600" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-title text-gray-900 dashboard-text">
						Panel Administrativo PR
					</h1>
				</div>
				<p className="text-sm sm:text-base text-gray-600 dashboard-text">
					Gestión y monitoreo del proyecto PR - pr.ingenit.cl
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
								Total Proyectos
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">
								{dashboardData.totalProjects}
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-orange-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
							<Database className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mobile-icon" />
						</div>
					</div>
				</div>

				<div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
								Proyectos Activos
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">
								{dashboardData.activeProjects}
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-green-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
							<CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mobile-icon" />
						</div>
					</div>
				</div>

				<div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
								En Mantenimiento
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">
								{dashboardData.maintenanceProjects}
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-yellow-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
							<AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mobile-icon" />
						</div>
					</div>
				</div>

				<div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
								Uptime
							</p>
							<p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">
								{dashboardData.systemMetrics.uptime}%
							</p>
						</div>
						<div className="p-2 sm:p-3 bg-blue-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
							<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mobile-icon" />
						</div>
					</div>
				</div>
			</div>

			{/* System Metrics */}
			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Server className="w-5 h-5 text-orange-600" />
					Métricas del Sistema
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="text-center p-4 bg-gray-50 rounded-lg">
						<p className="text-2xl font-bold text-gray-900">
							{dashboardData.systemMetrics.responseTime}ms
						</p>
						<p className="text-sm text-gray-600">Tiempo de Respuesta</p>
					</div>
					<div className="text-center p-4 bg-gray-50 rounded-lg">
						<p className="text-2xl font-bold text-gray-900">
							{dashboardData.systemMetrics.errorRate}%
						</p>
						<p className="text-sm text-gray-600">Tasa de Error</p>
					</div>
					<div className="text-center p-4 bg-gray-50 rounded-lg">
						<p className="text-2xl font-bold text-gray-900">
							{dashboardData.systemMetrics.totalDeployments}
						</p>
						<p className="text-sm text-gray-600">Total Despliegues</p>
					</div>
				</div>
			</div>

			{/* Navigation to Sub-sections */}
			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
					Módulos de Administración
				</h2>
				<div className="mb-6">
					<div className="flex items-center gap-2 mb-3">
						<Building2 className="w-5 h-5 text-orange-600" />
						<h3 className="text-sm sm:text-base font-semibold text-gray-900">
							Empresa (módulo padre)
						</h3>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<button
							type="button"
							onClick={() => router.push("/admin/pr/companies")}
							className="w-full p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-md border border-orange-200 transition-all duration-200 hover:shadow-md hover:scale-105"
						>
							<Building2 className="w-6 h-6 text-orange-600 mx-auto mb-2" />
							<p className="text-sm font-medium text-gray-900">Empresas</p>
							<p className="text-xs text-gray-600 mt-1">
								Entrada principal a sus módulos dependientes
							</p>
						</button>
					</div>
				</div>

				<div>
					<div className="flex items-center gap-2 mb-3">
						<Server className="w-5 h-5 text-gray-600" />
						<h3 className="text-sm sm:text-base font-semibold text-gray-900">
							Plataforma (transversal)
						</h3>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<button
							type="button"
							onClick={() => router.push("/admin/pr/analytics")}
							className="w-full p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-md border border-purple-200 transition-all duration-200 hover:shadow-md hover:scale-105"
						>
							<BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
							<p className="text-sm font-medium text-gray-900">Analytics</p>
							<p className="text-xs text-gray-600 mt-1">
								Análisis y métricas globales
							</p>
						</button>

						<button
							type="button"
							onClick={() => router.push("/admin/pr/settings")}
							className="w-full p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-md border border-gray-200 transition-all duration-200 hover:shadow-md hover:scale-105"
						>
							<Settings className="w-6 h-6 text-gray-600 mx-auto mb-2" />
							<p className="text-sm font-medium text-gray-900">Configuraciones</p>
							<p className="text-xs text-gray-600 mt-1">
								Parámetros generales del sistema PR
							</p>
						</button>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
					Acciones Rápidas
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<button
						type="button"
						onClick={() => window.open("https://pr.ingenit.cl", "_blank")}
						className="w-full p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-md border border-orange-200 transition-all duration-200 hover:shadow-md hover:scale-105"
					>
						<Globe className="w-6 h-6 text-orange-600 mx-auto mb-2" />
						<p className="text-sm font-medium text-gray-900">Sitio en Vivo</p>
					</button>

					<button
						type="button"
						onClick={() => console.log("Ver logs del sistema")}
						className="w-full p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-md border border-blue-200 transition-all duration-200 hover:shadow-md hover:scale-105"
					>
						<Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
						<p className="text-sm font-medium text-gray-900">Ver Logs</p>
					</button>

					<button
						type="button"
						onClick={() => console.log("Configurar sistema")}
						className="w-full p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-md border border-purple-200 transition-all duration-200 hover:shadow-md hover:scale-105"
					>
						<Settings className="w-6 h-6 text-purple-600 mx-auto mb-2" />
						<p className="text-sm font-medium text-gray-900">Configuración</p>
					</button>

					<button
						type="button"
						onClick={() => console.log("Ver estadísticas")}
						className="w-full p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-md border border-green-200 transition-all duration-200 hover:shadow-md hover:scale-105"
					>
						<TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
						<p className="text-sm font-medium text-gray-900">Estadísticas</p>
					</button>
				</div>
			</div>

			{/* Recent Projects */}
			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg sm:text-xl font-semibold text-gray-900">
						Proyectos Recientes
					</h2>
					<button
						type="button"
						onClick={() => setShowCreateModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
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
								className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-md"
							>
								<div className="flex-shrink-0">
									{getStatusIcon(project.health_status)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<p className="font-medium text-gray-900 text-sm sm:text-base truncate">
											{project.name}
										</p>
										<span
											className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}
										>
											{project.status}
										</span>
									</div>
									<p className="text-xs sm:text-sm text-gray-500">
										Entorno: {project.environment} • Último despliegue:{" "}
										{new Date(project.last_deployment).toLocaleString("es-CL")}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="text-center py-8">
							<Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500">No hay proyectos registrados</p>
							<p className="text-sm text-gray-400">
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
