"use client";
import {
	Activity,
	ArrowLeft,
	Calendar,
	Database,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface AnalyticsData {
	userGrowth: {
		current: number;
		previous: number;
		change: number;
	};
	activityMetrics: {
		dailyActiveUsers: number;
		weeklyActiveUsers: number;
		monthlyActiveUsers: number;
	};
	registrationTrend: Array<{
		date: string;
		count: number;
	}>;
	statusDistribution: {
		active: number;
		inactive: number;
		pending: number;
	};
}

export default function CNAnalyticsPage() {
	const [analytics, setAnalytics] = useState<AnalyticsData>({
		userGrowth: { current: 0, previous: 0, change: 0 },
		activityMetrics: {
			dailyActiveUsers: 0,
			weeklyActiveUsers: 0,
			monthlyActiveUsers: 0,
		},
		registrationTrend: [],
		statusDistribution: { active: 0, inactive: 0, pending: 0 },
	});
	const [isLoading, setIsLoading] = useState(true);
	const [dateRange, setDateRange] = useState<string>("30"); // días
	const router = useRouter();

	const loadAnalytics = useCallback(async () => {
		try {
			setIsLoading(true);
			console.log("📊 Cargando analíticas CN...");

			const res = await fetch("/api/admin/cn/users", { cache: "no-store" });
			const payload = await res.json().catch(() => null);
			if (!res.ok) {
				console.error("Error cargando analíticas CN desde admin API:", payload);
				setAnalytics({
					userGrowth: { current: 0, previous: 0, change: 0 },
					activityMetrics: {
						dailyActiveUsers: 0,
						weeklyActiveUsers: 0,
						monthlyActiveUsers: 0,
					},
					registrationTrend: [],
					statusDistribution: { active: 0, inactive: 0, pending: 0 },
				});
				return;
			}

			const users = payload?.users || [];
			if (users && users.length > 0) {
				// Calcular distribución de estados
				const statusDist = {
					active: users.filter((u) => u.status === "active").length,
					inactive: users.filter((u) => u.status === "inactive").length,
					pending: users.filter((u) => u.status === "pending").length,
				};

				// Calcular crecimiento (últimos 30 días vs anteriores 30 días)
				const now = new Date();
				const thirtyDaysAgo = new Date(
					now.getTime() - 30 * 24 * 60 * 60 * 1000,
				);
				const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

				const currentUsers = users.filter(
					(u) => new Date(u.created_at) >= thirtyDaysAgo,
				).length;
				const previousUsers = users.filter((u) => {
					const date = new Date(u.created_at);
					return date >= sixtyDaysAgo && date < thirtyDaysAgo;
				}).length;

				const change =
					previousUsers > 0
						? ((currentUsers - previousUsers) / previousUsers) * 100
						: 100;

				// Tendencia de registros (últimos 7 días)
				const registrationTrend = [];
				for (let i = 6; i >= 0; i--) {
					const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
					const dateStr = date.toISOString().split("T")[0];
					const count = users.filter((u) => {
						const userDate = new Date(u.created_at).toISOString().split("T")[0];
						return userDate === dateStr;
					}).length;
					registrationTrend.push({ date: dateStr, count });
				}

				setAnalytics({
					userGrowth: {
						current: currentUsers,
						previous: previousUsers,
						change: Math.round(change),
					},
					activityMetrics: {
						dailyActiveUsers: users.filter(
							(u) =>
								u.last_login &&
								new Date(u.last_login) >=
									new Date(now.getTime() - 24 * 60 * 60 * 1000),
						).length,
						weeklyActiveUsers: users.filter(
							(u) =>
								u.last_login &&
								new Date(u.last_login) >=
									new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
						).length,
						monthlyActiveUsers: users.filter(
							(u) =>
								u.last_login &&
								new Date(u.last_login) >=
									new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
						).length,
					},
					registrationTrend,
					statusDistribution: statusDist,
				});
			}
		} catch (error) {
			console.error("❌ Error general:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAnalytics();
	}, [loadAnalytics]);

	return (
		<div className="min-h-screen bg-gray10 p-2 sm:p-3 lg:p-4">
			<div className="w-full max-w-none">
				<div className="mb-4">
					<div className="mb-4 flex items-center justify-start">
						<button
							type="button"
							onClick={() => router.push("/admin/cn")}
							className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-sm font-medium text-gray3 shadow-sm transition-colors duration-200 hover:bg-gray10 hover:text-gray1"
						>
							<ArrowLeft className="h-4 w-4" />
							Volver atrás
						</button>
					</div>

					{/* Date Range Filter */}
					<div className="flex gap-2 rounded-md border border-gray9 bg-white p-4 shadow-sm">
						<button
							type="button"
							onClick={() => setDateRange("7")}
							className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
								dateRange === "7"
									? "bg-blue6 text-white"
									: "border border-gray9 bg-gray10 text-gray3 hover:bg-white"
							}`}
						>
							7 días
						</button>
						<button
							type="button"
							onClick={() => setDateRange("30")}
							className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
								dateRange === "30"
									? "bg-blue6 text-white"
									: "border border-gray9 bg-gray10 text-gray3 hover:bg-white"
							}`}
						>
							30 días
						</button>
						<button
							type="button"
							onClick={() => setDateRange("90")}
							className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
								dateRange === "90"
									? "bg-blue6 text-white"
									: "border border-gray9 bg-gray10 text-gray3 hover:bg-white"
							}`}
						>
							90 días
						</button>
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue6"></div>
					</div>
				) : (
					<>
						{/* Growth Metrics */}
						<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{/* User Growth */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-sm font-medium text-gray4">
										Crecimiento Usuarios
									</h3>
									{analytics.userGrowth.change >= 0 ? (
										<TrendingUp className="h-5 w-5 text-green2" />
									) : (
										<TrendingDown className="h-5 w-5 text-gold2" />
									)}
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-3xl font-bold text-gray1">
										{analytics.userGrowth.current}
									</span>
									<span
										className={`text-sm font-medium ${
											analytics.userGrowth.change >= 0
												? "text-green2"
												: "text-gold2"
										}`}
									>
										{analytics.userGrowth.change >= 0 ? "+" : ""}
										{analytics.userGrowth.change}%
									</span>
								</div>
								<p className="mt-2 text-xs text-gray5">
									vs período anterior ({analytics.userGrowth.previous} usuarios)
								</p>
							</div>

							{/* Daily Active Users */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-green2" />
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-sm font-medium text-gray4">
										Usuarios Activos Diarios
									</h3>
									<Activity className="h-5 w-5 text-green2" />
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-3xl font-bold text-gray1">
										{analytics.activityMetrics.dailyActiveUsers}
									</span>
								</div>
								<p className="mt-2 text-xs text-gray5">Últimas 24 horas</p>
							</div>

							{/* Weekly Active Users */}
							<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<div className="absolute inset-x-0 top-0 h-1 bg-gold3" />
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-sm font-medium text-gray4">
										Usuarios Activos Semanales
									</h3>
									<Calendar className="h-5 w-5 text-gold2" />
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-3xl font-bold text-gray1">
										{analytics.activityMetrics.weeklyActiveUsers}
									</span>
								</div>
								<p className="mt-2 text-xs text-gray5">Últimos 7 días</p>
							</div>
						</div>

						{/* Charts */}
						<div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
							{/* Registration Trend */}
							<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<h3 className="mb-4 text-lg font-semibold text-gray1">
									Tendencia de Registros
								</h3>
								<div className="space-y-3">
									{analytics.registrationTrend.map((day) => (
										<div key={day.date} className="flex items-center gap-3">
											<span className="w-24 text-xs text-gray5">
												{new Date(day.date).toLocaleDateString("es-CL", {
													month: "short",
													day: "numeric",
												})}
											</span>
											<div className="flex-1">
												<div className="h-8 overflow-hidden rounded-md bg-gray10">
													<div
														className="h-full bg-blue6 transition-all duration-300"
														style={{
															width: `${
																day.count > 0
																	? (
																			day.count /
																				Math.max(
																					...analytics.registrationTrend.map(
																						(d) => d.count,
																					),
																				)
																		) * 100
																	: 0
															}%`,
														}}
													/>
												</div>
											</div>
											<span className="w-8 text-right text-sm font-medium text-gray1">
												{day.count}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Status Distribution */}
							<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
								<h3 className="mb-4 text-lg font-semibold text-gray1">
									Distribución por Estado
								</h3>
								<div className="space-y-4">
									<div>
										<div className="flex items-center justify-between mb-2">
											<span className="flex items-center gap-2 text-sm text-gray4">
												<div className="h-3 w-3 rounded-full bg-green2"></div>
												Activos
											</span>
											<span className="text-sm font-semibold text-gray1">
												{analytics.statusDistribution.active}
											</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-gray10">
											<div
												className="h-full bg-green2"
												style={{
													width: `${
														(analytics.statusDistribution.active /
															(analytics.statusDistribution.active +
																analytics.statusDistribution.inactive +
																analytics.statusDistribution.pending)) *
														100
													}%`,
												}}
											/>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-2">
											<span className="flex items-center gap-2 text-sm text-gray4">
												<div className="h-3 w-3 rounded-full bg-gold3"></div>
												Pendientes
											</span>
											<span className="text-sm font-semibold text-gray1">
												{analytics.statusDistribution.pending}
											</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-gray10">
											<div
												className="h-full bg-gold3"
												style={{
													width: `${
														(analytics.statusDistribution.pending /
															(analytics.statusDistribution.active +
																analytics.statusDistribution.inactive +
																analytics.statusDistribution.pending)) *
														100
													}%`,
												}}
											/>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-2">
											<span className="flex items-center gap-2 text-sm text-gray4">
												<div className="h-3 w-3 rounded-full bg-gray6"></div>
												Inactivos
											</span>
											<span className="text-sm font-semibold text-gray1">
												{analytics.statusDistribution.inactive}
											</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-gray10">
											<div
												className="h-full bg-gray6"
												style={{
													width: `${
														(analytics.statusDistribution.inactive /
															(analytics.statusDistribution.active +
																analytics.statusDistribution.inactive +
																analytics.statusDistribution.pending)) *
														100
													}%`,
												}}
											/>
										</div>
									</div>
								</div>

								<div className="mt-6 border-t border-gray9 pt-6">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-gray4">
											Total Usuarios
										</span>
										<span className="text-2xl font-bold text-gray1">
											{analytics.statusDistribution.active +
												analytics.statusDistribution.inactive +
												analytics.statusDistribution.pending}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Additional Metrics */}
						<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
							<h3 className="mb-4 text-lg font-semibold text-gray1">
								Métricas Adicionales
							</h3>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div className="flex items-center gap-4">
									<div className="rounded-md bg-blue15 p-3">
										<Users className="h-6 w-6 text-blue6" />
									</div>
									<div>
										<p className="text-sm text-gray4">
											Usuarios Activos Mes
										</p>
										<p className="text-2xl font-bold text-gray1">
											{analytics.activityMetrics.monthlyActiveUsers}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-4">
									<div className="rounded-md bg-gray10 p-3">
										<Database className="h-6 w-6 text-blue7" />
									</div>
									<div>
										<p className="text-sm text-gray4">Tablas CN</p>
										<p className="text-2xl font-bold text-gray1">0</p>
										<p className="text-xs text-gray5">Configurar</p>
									</div>
								</div>

								<div className="flex items-center gap-4">
									<div className="rounded-md bg-green6 p-3">
										<Activity className="h-6 w-6 text-green2" />
									</div>
									<div>
										<p className="text-sm text-gray4">Tasa Actividad</p>
										<p className="text-2xl font-bold text-gray1">
											{analytics.statusDistribution.active > 0
												? Math.round(
														(analytics.activityMetrics.weeklyActiveUsers /
															analytics.statusDistribution.active) *
															100,
													)
												: 0}
											%
										</p>
									</div>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
