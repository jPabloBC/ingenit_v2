"use client";
import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	BarChart3,
	CheckCircle,
	Database,
	TrendingUp,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useVercelAnalytics } from "@/hooks/useVercelAnalytics";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

interface CNDashboardData {
	totalUsers: number;
	activeUsers: number;
	inactiveUsers: number;
	totalTables: number;
	recentActivity: Array<{
		id: string;
		action: string;
		user_email: string;
		table_name: string;
		created_at: string;
	}>;
	systemMetrics: {
		databaseSize: number;
		lastSync: string;
		errorRate: number;
		activeConnections: number;
	};
}

export default function CNAdminPage() {
	const [dashboardData, setDashboardData] = useState<CNDashboardData>({
		totalUsers: 0,
		activeUsers: 0,
		inactiveUsers: 0,
		totalTables: 0,
		recentActivity: [],
		systemMetrics: {
			databaseSize: 0,
			lastSync: new Date().toISOString(),
			errorRate: 0,
			activeConnections: 0,
		},
	});
	const [isLoading, setIsLoading] = useState(true);
	const [supabaseError, setSupabaseError] = useState<string | null>(null);
	const router = useRouter();

	// Rastrear visitas
	useVercelAnalytics();

	const loadCNData = useCallback(async () => {
		try {
			console.log("🔍 Iniciando carga de datos CN...");
			if (!isSupabaseConfigured()) {
				const msg =
					"Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.";
				console.error("❌ ", msg);
				setSupabaseError(msg);
				setIsLoading(false);
				return;
			}

			// Cargar usuarios CN mediante endpoint admin para evitar RLS recursiva
			try {
				const res = await fetch("/api/admin/cn/users");
				const payload = await res.json();
				if (!res.ok) {
					const msg =
						payload?.error ||
						JSON.stringify(payload) ||
						"Error desconocido al obtener usuarios";
					console.error(
						"❌ Error cargando usuarios CN desde admin API:",
						payload,
					);
					setSupabaseError(`Error cargando usuarios CN: ${msg}`);
					setIsLoading(false);
					return;
				}

				const users: Array<{ status?: string }> = payload.users || [];
				const totalUsers = users.length;
				const activeUsers =
					users.filter((u) => u.status === "active").length || 0;
				const inactiveUsers =
					users.filter((u) => u.status !== "active").length || 0;

				setDashboardData({
					totalUsers,
					activeUsers,
					inactiveUsers,
					totalTables: 0,
					recentActivity: [],
					systemMetrics: {
						databaseSize: 0,
						lastSync: new Date().toISOString(),
						errorRate: 0,
						activeConnections: 0,
					},
				});
			} catch (err) {
				console.error(
					"❌ Error inesperado cargando usuarios CN via admin API:",
					err,
				);
				setSupabaseError(String(err));
				setIsLoading(false);
				return;
			}

			// dashboard state already set from admin API response above
		} catch (error) {
			console.error("❌ Error general cargando datos CN:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCNData();
	}, [loadCNData]);

	return (
		<div className="min-h-screen bg-gray10 p-2 sm:p-3 lg:p-4">
			<div className="mb-4 flex items-center justify-start">
				<button
					type="button"
					onClick={() => router.back()}
					className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-sm font-medium text-gray3 shadow-sm transition-colors duration-200 hover:bg-gray10 hover:text-gray1"
				>
					<ArrowLeft className="h-4 w-4" />
					Volver atrás
				</button>
			</div>

			<div className="w-full max-w-none">
				{supabaseError && (
					<div className="mb-4 rounded-md border border-gold6 bg-gold7 p-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-gold1">
									Problema con Supabase
								</p>
								<p className="mt-1 whitespace-pre-wrap text-xs text-gold1">
									{supabaseError}
								</p>
							</div>
							<div className="flex-shrink-0">
								<button
									type="button"
									onClick={() => {
										setSupabaseError(null);
										loadCNData();
									}}
									className="rounded-md border border-gold6 bg-white px-3 py-1 text-sm text-gold1"
								>
									Reintentar
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Loading State */}
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue6"></div>
					</div>
				) : (
					<>
						{/* Stats Cards */}
						<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{/* Total Users */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray4">
											Total Usuarios
										</p>
										<p className="mt-2 text-3xl font-bold leading-none text-gray1">
											{dashboardData.totalUsers}
										</p>
									</div>
									<div className="rounded-md bg-blue15 p-3">
										<Users className="h-6 w-6 text-blue6" />
									</div>
								</div>
							</div>

							{/* Active Users */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-green2" />
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray4">
											Usuarios Activos
										</p>
										<p className="mt-2 text-3xl font-bold leading-none text-green2">
											{dashboardData.activeUsers}
										</p>
									</div>
									<div className="rounded-md bg-green6 p-3">
										<CheckCircle className="h-6 w-6 text-green2" />
									</div>
								</div>
							</div>

							{/* Inactive Users */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-gold3" />
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray4">
											Usuarios Inactivos
										</p>
										<p className="mt-2 text-3xl font-bold leading-none text-gold2">
											{dashboardData.inactiveUsers}
										</p>
									</div>
									<div className="rounded-md bg-gold7 p-3">
										<AlertTriangle className="h-6 w-6 text-gold2" />
									</div>
								</div>
							</div>

							{/* Total Tables */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray4">
											Tablas CN
										</p>
										<p className="mt-2 text-3xl font-bold leading-none text-blue7">
											{dashboardData.totalTables}
										</p>
									</div>
									<div className="rounded-md bg-gray10 p-3">
										<Database className="h-6 w-6 text-blue7" />
									</div>
								</div>
							</div>
						</div>

						{/* Quick Actions */}
						<div className="mb-4 rounded-md border border-gray9 bg-white p-4 shadow-sm">
							<h2 className="mb-4 text-lg font-semibold text-gray1 sm:text-xl">
								Acciones Rápidas
							</h2>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{/* Manage Users */}
								<button
									type="button"
									onClick={() => router.push("/admin/cn/users")}
									className="group relative min-h-28 w-full overflow-hidden rounded-md border border-blue13 bg-gray10 p-4 text-left text-blue6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
								>
									<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
									<div className="flex items-center gap-3 mb-2">
										<div className="rounded-md bg-blue6 p-2 text-white shadow-sm">
											<Users className="h-5 w-5" />
										</div>
										<h3 className="font-semibold text-gray1">
											Gestión de Usuarios
										</h3>
									</div>
									<p className="text-sm text-gray5">
										Administrar usuarios de cn.ingenit.cl
									</p>
								</button>

								{/* Database Management */}
								<button
									type="button"
									onClick={() => router.push("/admin/cn/database")}
									className="group relative min-h-28 w-full overflow-hidden rounded-md border border-blue13 bg-gray10 p-4 text-left text-blue7 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
								>
									<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
									<div className="flex items-center gap-3 mb-2">
										<div className="rounded-md bg-blue7 p-2 text-white shadow-sm">
											<Database className="h-5 w-5" />
										</div>
										<h3 className="font-semibold text-gray1">Tablas CN</h3>
									</div>
									<p className="text-sm text-gray5">Gestionar tablas cn_*</p>
								</button>

								{/* Analytics */}
								<button
									type="button"
									onClick={() => router.push("/admin/cn/analytics")}
									className="group relative min-h-28 w-full overflow-hidden rounded-md border border-blue13 bg-gray10 p-4 text-left text-green2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
								>
									<div className="absolute inset-x-0 top-0 h-1 bg-green2" />
									<div className="flex items-center gap-3 mb-2">
										<div className="rounded-md bg-green2 p-2 text-white shadow-sm">
											<BarChart3 className="h-5 w-5" />
										</div>
										<h3 className="font-semibold text-gray1">Analíticas</h3>
									</div>
									<p className="text-sm text-gray5">
										Estadísticas y reportes
									</p>
								</button>
							</div>
						</div>

						{/* System Status */}
						<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
							<h2 className="mb-4 text-lg font-semibold text-gray1 sm:text-xl">
								Estado del Sistema
							</h2>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-8 rounded-md border border-gray9 bg-gray10 p-3">
									<div className="flex items-center gap-3">
										<span className="rounded-md bg-white p-2 text-green2 shadow-sm">
											<Activity className="h-4 w-4" />
										</span>
										<span className="text-sm font-medium text-gray5">
											Conexiones Activas
										</span>
									</div>
									<span className="shrink-0 text-sm font-semibold text-gray1">
										{dashboardData.systemMetrics.activeConnections}
									</span>
								</div>

								<div className="flex items-center justify-between gap-8 rounded-md border border-gray9 bg-gray10 p-3">
									<div className="flex items-center gap-3">
										<span className="rounded-md bg-white p-2 text-blue7 shadow-sm">
											<Database className="h-4 w-4" />
										</span>
										<span className="text-sm font-medium text-gray5">
											Tamaño BD
										</span>
									</div>
									<span className="shrink-0 text-sm font-semibold text-gray1">
										{dashboardData.systemMetrics.databaseSize} MB
									</span>
								</div>

								<div className="flex items-center justify-between gap-8 rounded-md border border-gray9 bg-gray10 p-3">
									<div className="flex items-center gap-3">
										<span className="rounded-md bg-white p-2 text-blue6 shadow-sm">
											<TrendingUp className="h-4 w-4" />
										</span>
										<span className="text-sm font-medium text-gray5">
											Tasa de Error
										</span>
									</div>
									<span className="shrink-0 text-sm font-semibold text-gray1">
										{dashboardData.systemMetrics.errorRate}%
									</span>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
