"use client";
import {
	Activity,
	ArrowLeft,
	BarChart3,
	Download,
	Globe,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface AnalyticsData {
	totalVisits: number;
	uniqueUsers: number;
	bounceRate: number;
	avgSessionDuration: number;
	topPages: Array<{
		page: string;
		views: number;
		percentage: number;
	}>;
	trafficSources: Array<{
		source: string;
		visitors: number;
		percentage: number;
	}>;
	timeSeriesData: Array<{
		date: string;
		visits: number;
		users: number;
	}>;
}

export default function PRAnalyticsPage() {
	const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
		totalVisits: 0,
		uniqueUsers: 0,
		bounceRate: 0,
		avgSessionDuration: 0,
		topPages: [],
		trafficSources: [],
		timeSeriesData: [],
	});
	const [isLoading, setIsLoading] = useState(true);
	const [dateRange, setDateRange] = useState("7d");
	const router = useRouter();

	const loadAnalyticsData = useCallback(async () => {
		try {
			setIsLoading(true);
			console.log("🔍 Cargando datos de analytics PR...");

			// Intentar cargar datos reales de analytics desde Supabase
			// Por ahora, establecemos datos en cero ya que no hay tabla de analytics configurada
			const emptyData: AnalyticsData = {
				totalVisits: 0,
				uniqueUsers: 0,
				bounceRate: 0,
				avgSessionDuration: 0,
				topPages: [],
				trafficSources: [],
				timeSeriesData: [],
			};

			setAnalyticsData(emptyData);
		} catch (error) {
			console.error("❌ Error cargando analytics PR:", error);
			// En caso de error, mostrar datos vacíos
			setAnalyticsData({
				totalVisits: 0,
				uniqueUsers: 0,
				bounceRate: 0,
				avgSessionDuration: 0,
				topPages: [],
				trafficSources: [],
				timeSeriesData: [],
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAnalyticsData();
	}, [loadAnalyticsData]);

	const formatDuration = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue6"></div>
					<p className="text-gray4">Cargando analytics...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray10 p-2 sm:p-3 lg:p-4">
			<div className="mb-4">
				<div className="mb-4 flex items-center justify-start">
					<button
						type="button"
						onClick={() => router.push("/admin/pr")}
						className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-sm font-medium text-gray3 shadow-sm transition-colors duration-200 hover:bg-gray10 hover:text-gray1"
					>
						<ArrowLeft className="h-4 w-4" />
						Volver atrás
					</button>
				</div>

				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<select
							value={dateRange}
							onChange={(e) => setDateRange(e.target.value)}
							className="rounded-md border border-gray9 bg-white px-3 py-2 text-sm text-gray3 shadow-sm focus:border-blue6 focus:outline-none focus:ring-2 focus:ring-blue6/10"
						>
							<option value="7d">Últimos 7 días</option>
							<option value="30d">Últimos 30 días</option>
							<option value="90d">Últimos 90 días</option>
						</select>

						<button
							type="button"
							onClick={loadAnalyticsData}
							className="flex items-center gap-2 rounded-md bg-blue6 px-4 py-2 font-medium text-white transition-colors hover:bg-blue5"
						>
							<RefreshCw className="w-4 h-4" />
							Actualizar
						</button>

						<button
							type="button"
							className="flex items-center gap-2 rounded-md border border-gray9 bg-gray10 px-4 py-2 font-medium text-gray3 transition-colors hover:bg-white"
						>
							<Download className="w-4 h-4" />
							Exportar
						</button>
					</div>
				</div>
			</div>

			{/* Key Metrics */}
			<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray4">
								Visitas Totales
							</p>
							<p className="mt-2 text-3xl font-bold leading-none text-gray1">
								{analyticsData.totalVisits.toLocaleString()}
							</p>
							{analyticsData.totalVisits > 0 && (
								<p className="mt-2 text-xs text-green2">
									+12.5% vs período anterior
								</p>
							)}
						</div>
						<div className="rounded-md bg-blue15 p-3">
							<Globe className="h-6 w-6 text-blue6" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="absolute inset-x-0 top-0 h-1 bg-green2" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray4">
								Usuarios Únicos
							</p>
							<p className="mt-2 text-3xl font-bold leading-none text-gray1">
								{analyticsData.uniqueUsers.toLocaleString()}
							</p>
							{analyticsData.uniqueUsers > 0 && (
								<p className="mt-2 text-xs text-green2">
									+8.3% vs período anterior
								</p>
							)}
						</div>
						<div className="rounded-md bg-green6 p-3">
							<Users className="h-6 w-6 text-green2" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="absolute inset-x-0 top-0 h-1 bg-gold3" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray4">
								Tasa de Rebote
							</p>
							<p className="mt-2 text-3xl font-bold leading-none text-gray1">
								{analyticsData.bounceRate}%
							</p>
							{analyticsData.bounceRate > 0 && (
								<p className="mt-2 text-xs text-gold2">
									+2.1% vs período anterior
								</p>
							)}
						</div>
						<div className="rounded-md bg-gold7 p-3">
							<TrendingUp className="h-6 w-6 text-gold2" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray4">
								Duración Promedio
							</p>
							<p className="mt-2 text-3xl font-bold leading-none text-gray1">
								{formatDuration(analyticsData.avgSessionDuration)}
							</p>
							{analyticsData.avgSessionDuration > 0 && (
								<p className="mt-2 text-xs text-green2">
									+15.2% vs período anterior
								</p>
							)}
						</div>
						<div className="rounded-md bg-gray10 p-3">
							<Activity className="h-6 w-6 text-blue7" />
						</div>
					</div>
				</div>
			</div>

			{/* Charts Row */}
			<div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* Traffic Over Time */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<h2 className="mb-4 text-lg font-semibold text-gray1">
						Tráfico en el Tiempo
					</h2>
					<div className="h-64 flex items-end justify-between gap-2">
						{analyticsData.timeSeriesData.map((item) => (
							<div
								key={item.date}
								className="flex-1 flex flex-col items-center"
							>
								<div
									className="relative w-full rounded-t bg-blue15"
									style={{
										height: `${(item.visits / 2000) * 100}%`,
										minHeight: "4px",
									}}
								>
									<div
										className="w-full rounded-t bg-blue6"
										style={{ height: `${(item.users / item.visits) * 100}%` }}
									></div>
								</div>
								<span className="mt-1 origin-left rotate-45 transform text-xs text-gray5">
									{new Date(item.date).toLocaleDateString("es-CL", {
										month: "short",
										day: "numeric",
									})}
								</span>
							</div>
						))}
					</div>
					<div className="flex items-center justify-center gap-4 mt-4">
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded bg-blue6"></div>
							<span className="text-sm text-gray4">Usuarios</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded bg-blue15"></div>
							<span className="text-sm text-gray4">Visitas</span>
						</div>
					</div>
				</div>

				{/* Top Pages */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<h2 className="mb-4 text-lg font-semibold text-gray1">
						Páginas Más Visitadas
					</h2>
					{analyticsData.topPages.length > 0 ? (
						<div className="space-y-3">
							{analyticsData.topPages.map((page) => (
								<div
									key={page.page}
									className="flex items-center justify-between"
								>
									<div className="flex-1">
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm font-medium text-gray1">
												{page.page}
											</span>
											<span className="text-sm text-gray5">
												{page.views.toLocaleString()}
											</span>
										</div>
										<div className="h-2 w-full rounded-full bg-gray10">
											<div
												className="h-2 rounded-full bg-blue6"
												style={{ width: `${page.percentage}%` }}
											></div>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray7" />
							<p className="text-gray5">
								No hay datos de páginas disponibles
							</p>
							<p className="text-sm text-gray6">
								Los datos aparecerán cuando haya tráfico registrado
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Bottom Row */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* Traffic Sources */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<h2 className="mb-4 text-lg font-semibold text-gray1">
						Fuentes de Tráfico
					</h2>
					<div className="space-y-4">
						{analyticsData.trafficSources.map((source) => (
							<div
								key={source.source}
								className="flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div
										className="w-3 h-3 rounded-full"
										style={{
											backgroundColor: `hsl(${source.source.length * 17}, 70%, 50%)`,
										}}
									></div>
									<span className="text-sm font-medium text-gray1">
										{source.source}
									</span>
								</div>
								<div className="text-right">
									<span className="text-sm font-medium text-gray1">
										{source.visitors.toLocaleString()}
									</span>
									<span className="ml-2 text-xs text-gray5">
										({source.percentage}%)
									</span>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Recent Activity */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<h2 className="mb-4 text-lg font-semibold text-gray1">
						Actividad Reciente
					</h2>
					<div className="space-y-4">
						<div className="flex items-center gap-3 rounded-md border border-gray9 bg-gray10 p-3">
							<div className="rounded-md bg-white p-2 text-blue6 shadow-sm">
								<Users className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray1">
									Nuevo usuario registrado
								</p>
								<p className="text-xs text-gray5">Hace 2 minutos</p>
							</div>
						</div>

						<div className="flex items-center gap-3 rounded-md border border-gray9 bg-gray10 p-3">
							<div className="rounded-md bg-white p-2 text-green2 shadow-sm">
								<Activity className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray1">
									Pico de tráfico detectado
								</p>
								<p className="text-xs text-gray5">Hace 15 minutos</p>
							</div>
						</div>

						<div className="flex items-center gap-3 rounded-md border border-gray9 bg-gray10 p-3">
							<div className="rounded-md bg-white p-2 text-gold2 shadow-sm">
								<Globe className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray1">
									Nueva página indexada
								</p>
								<p className="text-xs text-gray5">Hace 1 hora</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
