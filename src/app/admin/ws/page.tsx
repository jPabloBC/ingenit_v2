"use client";

import {
	Activity,
	ArrowLeft,
	BarChart3,
	Clock,
	Columns3,
	Database,
	Eye,
	PieChart,
	RefreshCw,
	Search,
	Table,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type WsModuleInfo = {
	table_name: string;
	module_label: string;
	module_description: string;
	domain: string;
	row_count: number;
	preview_columns: number;
	last_activity: string | null;
};

const WS_DATA_MODULES: Array<
	Omit<WsModuleInfo, "row_count" | "preview_columns" | "last_activity">
> = [
	{
		table_name: "ws_active_sessions",
		module_label: "Sesiones Activas",
		module_description: "Control de sesiones abiertas y vigentes",
		domain: "Acceso",
	},
	{
		table_name: "ws_users",
		module_label: "Usuarios",
		module_description: "Usuarios y configuración base de acceso",
		domain: "Acceso",
	},
	{
		table_name: "ws_email_verifications",
		module_label: "Verificación de Email",
		module_description: "Estados de validación de correo",
		domain: "Acceso",
	},
	{
		table_name: "ws_businesses",
		module_label: "Negocios",
		module_description: "Empresas y unidades de negocio",
		domain: "Comercial",
	},
	{
		table_name: "ws_customers",
		module_label: "Clientes",
		module_description: "Clientes y perfiles asociados",
		domain: "Comercial",
	},
	{
		table_name: "ws_suppliers",
		module_label: "Proveedores",
		module_description: "Datos de proveedores y abastecimiento",
		domain: "Comercial",
	},
	{
		table_name: "ws_categories",
		module_label: "Categorías",
		module_description: "Clasificación de productos",
		domain: "Catálogo",
	},
	{
		table_name: "ws_products",
		module_label: "Productos",
		module_description: "Catálogo principal de productos",
		domain: "Catálogo",
	},
	{
		table_name: "ws_public_products",
		module_label: "Productos Públicos",
		module_description: "Productos enriquecidos y compartidos",
		domain: "Catálogo",
	},
	{
		table_name: "ws_stock_movements",
		module_label: "Movimientos de Stock",
		module_description: "Entradas y salidas de inventario",
		domain: "Inventario",
	},
	{
		table_name: "ws_sales",
		module_label: "Ventas",
		module_description: "Cabecera de transacciones de venta",
		domain: "Ventas",
	},
	{
		table_name: "ws_sale_items",
		module_label: "Ítems de Venta",
		module_description: "Detalle de productos vendidos",
		domain: "Ventas",
	},
	{
		table_name: "ws_payments",
		module_label: "Pagos",
		module_description: "Pagos registrados por operación",
		domain: "Finanzas",
	},
	{
		table_name: "ws_payment_history",
		module_label: "Historial de Pagos",
		module_description: "Evolución y eventos de cobro",
		domain: "Finanzas",
	},
	{
		table_name: "ws_plans",
		module_label: "Planes",
		module_description: "Planes comerciales y configuración",
		domain: "Suscripción",
	},
	{
		table_name: "ws_subscriptions",
		module_label: "Suscripciones",
		module_description: "Suscripciones activas y estados",
		domain: "Suscripción",
	},
	{
		table_name: "ws_electronic_invoices",
		module_label: "Facturas Electrónicas",
		module_description: "Documentos tributarios emitidos",
		domain: "Fiscal",
	},
	{
		table_name: "ws_electronic_invoice_items",
		module_label: "Ítems de Factura",
		module_description: "Detalle por línea de factura",
		domain: "Fiscal",
	},
	{
		table_name: "ws_sii_config",
		module_label: "Configuración SII",
		module_description: "Parámetros de integración fiscal",
		domain: "Fiscal",
	},
	{
		table_name: "ws_sii_logs",
		module_label: "Logs SII",
		module_description: "Trazas de envío y respuesta tributaria",
		domain: "Fiscal",
	},
	{
		table_name: "ws_usage",
		module_label: "Uso de Plataforma",
		module_description: "Métricas de uso y consumo",
		domain: "Analítica",
	},
];

export default function WSDatabasePage() {
	const router = useRouter();
	const [modules, setModules] = useState<WsModuleInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTable, setSelectedTable] = useState<string | null>(null);
	const [rows, setRows] = useState<Record<string, unknown>[]>([]);
	const [isLoadingRows, setIsLoadingRows] = useState(false);
	const [rowsError, setRowsError] = useState<string | null>(null);
	const [wsUsersRows, setWsUsersRows] = useState<Record<string, unknown>[]>([]);
	const [isLoadingWsUsers, setIsLoadingWsUsers] = useState(false);
	const [wsUsersError, setWsUsersError] = useState<string | null>(null);

	const filteredModules = useMemo(
		() =>
			modules.filter((m) =>
				`${m.module_label} ${m.module_description} ${m.domain}`
					.toLowerCase()
					.includes(searchQuery.toLowerCase()),
			),
		[modules, searchQuery],
	);

	const totalRows = useMemo(
		() => modules.reduce((acc, m) => acc + m.row_count, 0),
		[modules],
	);
	const modulesWithData = useMemo(
		() => modules.filter((m) => m.row_count > 0).length,
		[modules],
	);
	const modulesWithActivity = useMemo(
		() => modules.filter((m) => Boolean(m.last_activity)).length,
		[modules],
	);
	const wsUsersMetrics = useMemo(() => {
		const total = wsUsersRows.length;
		const verified = wsUsersRows.filter((u) =>
			Boolean(u?.email_verified),
		).length;
		const admins = wsUsersRows.filter(
			(u) => String(u?.role || "").toLowerCase() === "admin",
		).length;
		const freePlan = wsUsersRows.filter(
			(u) => String(u?.plan_type || "").toLowerCase() === "free",
		).length;
		return { total, verified, admins, freePlan };
	}, [wsUsersRows]);

	const domainStats = useMemo(() => {
		const domainMap = new Map<string, { modules: number; rows: number }>();
		modules.forEach((m) => {
			const current = domainMap.get(m.domain) || { modules: 0, rows: 0 };
			current.modules += 1;
			current.rows += m.row_count;
			domainMap.set(m.domain, current);
		});
		return Array.from(domainMap.entries())
			.map(([domain, info]) => ({ domain, ...info }))
			.sort((a, b) => b.rows - a.rows);
	}, [modules]);

	/* biome-ignore lint/correctness/useExhaustiveDependencies: initial load on mount */
	useEffect(() => {
		void loadModules();
		void loadWsUsersOverview();
	}, []);

	/* biome-ignore lint/correctness/useExhaustiveDependencies: rows depend on selected table only */
	useEffect(() => {
		if (!selectedTable) return;
		void loadRows(selectedTable);
	}, [selectedTable]);

	const parseDate = (value: unknown): Date | null => {
		if (!value) return null;
		if (!(typeof value === "string" || typeof value === "number")) return null;
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	};

	const _detectDateColumns = (data: Record<string, unknown>[]) => {
		if (!data.length) return [];
		const keys = Object.keys(data[0] || {});
		return keys.filter((key) => {
			if (!/(created_at|updated_at|timestamp|date|_at)$/i.test(key))
				return false;
			const sample = data.find((row) => row?.[key]);
			return Boolean(parseDate(sample?.[key]));
		});
	};

	const inferType = (values: unknown[]) => {
		const nonNull = values.filter((v) => v !== null && v !== undefined);
		if (!nonNull.length) return "unknown";
		if (nonNull.every((v) => typeof v === "number")) return "number";
		if (nonNull.every((v) => typeof v === "boolean")) return "boolean";
		if (
			nonNull.every(
				(v) => typeof v === "string" && !Number.isNaN(new Date(v).getTime()),
			)
		)
			return "datetime";
		if (nonNull.some((v) => typeof v === "object")) return "json/object";
		return "text";
	};

	async function loadModules() {
		try {
			setIsLoading(true);
			const resp = await fetch("/api/admin/ws?mode=modules", {
				cache: "no-store",
			});
			const json = await resp.json();
			if (!resp.ok)
				throw new Error(json?.error || "No se pudieron cargar módulos WS");

			const incomingModules = Array.isArray(json.modules) ? json.modules : [];
			const statsByTable = new Map<string, Record<string, unknown>>(
				incomingModules
					.filter(
						(m): m is Record<string, unknown> =>
							typeof m === "object" && m !== null,
					)
					.map((m) => [String(m.table_name || ""), m]),
			);
			const available = WS_DATA_MODULES.map((def) => {
				const stats = statsByTable.get(def.table_name);
				if (!stats) return null;
				return {
					...def,
					row_count: Number(stats.row_count || 0),
					preview_columns: Number(stats.preview_columns || 0),
					last_activity:
						typeof stats.last_activity === "string"
							? stats.last_activity
							: null,
				} as WsModuleInfo;
			}).filter(Boolean) as WsModuleInfo[];

			setModules(available);

			if (!selectedTable && available.length > 0) {
				const best = [...available].sort(
					(a, b) => b.row_count - a.row_count,
				)[0];
				setSelectedTable(best.table_name);
			}
		} finally {
			setIsLoading(false);
		}
	}

	async function loadRows(tableName: string) {
		setIsLoadingRows(true);
		setRowsError(null);
		try {
			const resp = await fetch(
				`/api/admin/ws?mode=rows&table=${encodeURIComponent(tableName)}`,
				{ cache: "no-store" },
			);
			const json = await resp.json();
			if (!resp.ok) {
				setRows([]);
				setRowsError(json?.error || "No se pudieron cargar datos");
				return;
			}

			setRows(
				Array.isArray(json.rows)
					? (json.rows as Record<string, unknown>[])
					: [],
			);
		} catch (error) {
			setRows([]);
			setRowsError(
				error instanceof Error ? error.message : "Error cargando datos",
			);
		} finally {
			setIsLoadingRows(false);
		}
	}

	async function loadWsUsersOverview() {
		setIsLoadingWsUsers(true);
		setWsUsersError(null);
		try {
			const resp = await fetch(`/api/admin/ws?mode=rows&table=ws_users`, {
				cache: "no-store",
			});
			const json = await resp.json();
			if (!resp.ok) {
				setWsUsersRows([]);
				setWsUsersError(json?.error || "No se pudieron cargar usuarios WS");
				return;
			}
			setWsUsersRows(
				Array.isArray(json.rows)
					? (json.rows as Record<string, unknown>[])
					: [],
			);
		} catch (error) {
			setWsUsersRows([]);
			setWsUsersError(
				error instanceof Error ? error.message : "Error cargando usuarios WS",
			);
		} finally {
			setIsLoadingWsUsers(false);
		}
	}

	const columns = useMemo(() => {
		if (!rows.length) return [];
		const keys = new Set<string>();
		rows.forEach((row) => {
			Object.keys(row || {}).forEach((k) => {
				keys.add(k);
			});
		});
		return Array.from(keys);
	}, [rows]);

	/* biome-ignore lint/correctness/useExhaustiveDependencies: inferType is a pure local helper */
	const columnStats = useMemo(() => {
		if (!rows.length || !columns.length) return [];
		return columns.map((column) => {
			const values = rows.map((r) => r?.[column]);
			const nonNull = values.filter(
				(v) => v !== null && v !== undefined && String(v).trim() !== "",
			);
			const unique = new Set(
				nonNull.map((v) =>
					typeof v === "object" ? JSON.stringify(v) : String(v),
				),
			);
			return {
				column,
				type: inferType(values),
				fillRate: Math.round((nonNull.length / rows.length) * 100),
				uniqueCount: unique.size,
			};
		});
	}, [rows, columns]);

	const lowCardinalityDistributions = useMemo(() => {
		return columnStats
			.filter(
				(c) =>
					c.uniqueCount > 1 && c.uniqueCount <= 8 && c.type !== "json/object",
			)
			.slice(0, 4)
			.map((stat) => {
				const countMap = new Map<string, number>();
				rows.forEach((row) => {
					const raw = row?.[stat.column];
					const key =
						raw === null || raw === undefined || String(raw).trim() === ""
							? "(vacío)"
							: String(raw);
					countMap.set(key, (countMap.get(key) || 0) + 1);
				});
				const items = Array.from(countMap.entries())
					.map(([label, count]) => ({ label, count }))
					.sort((a, b) => b.count - a.count);
				return { column: stat.column, items };
			});
	}, [columnStats, rows]);

	/* biome-ignore lint/correctness/useExhaustiveDependencies: parseDate is a pure local helper */
	const recentActivity = useMemo(() => {
		const dateCols = columns.filter((col) =>
			/(created_at|updated_at|timestamp|date|_at)$/i.test(col),
		);
		if (!dateCols.length) return [];
		const byDay = new Map<string, number>();
		rows.forEach((row) => {
			let best: Date | null = null;
			dateCols.forEach((col) => {
				const d = parseDate(row?.[col]);
				if (d && (!best || d > best)) best = d;
			});
			if (best) {
				const key = best.toISOString().slice(0, 10);
				byDay.set(key, (byDay.get(key) || 0) + 1);
			}
		});
		return Array.from(byDay.entries())
			.map(([day, count]) => ({ day, count }))
			.sort((a, b) => (a.day < b.day ? 1 : -1))
			.slice(0, 7);
	}, [rows, columns]);

	const selectedModule = useMemo(
		() => modules.find((m) => m.table_name === selectedTable) || null,
		[modules, selectedTable],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Cargando panel WS...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 sm:p-6 dashboard-transition">
			<div className="mb-6 sm:mb-8">
				<div className="flex items-center gap-3 mb-2">
					<button
						type="button"
						onClick={() => router.push("/admin/dashboard")}
						className="p-2 hover:bg-gray-100 rounded-md transition-colors"
					>
						<ArrowLeft className="w-5 h-5 text-gray-600" />
					</button>
					<div className="p-2 bg-purple-100 rounded-lg">
						<Database className="w-6 h-6 text-purple-600" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-title text-gray-900 dashboard-text">
						Panel WS
					</h1>
				</div>
				<p className="text-sm sm:text-base text-gray-600 dashboard-text">
					Análisis operativo con los módulos reales de Web Services (ventas,
					catálogo, fiscal, suscripción y acceso)
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<StatCard
					title="Módulos de Datos"
					value={modules.length}
					icon={<Table className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />}
					tone="purple"
				/>
				<StatCard
					title="Módulos con Datos"
					value={modulesWithData}
					icon={<Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />}
					tone="green"
				/>
				<StatCard
					title="Registros Totales"
					value={totalRows}
					icon={<BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />}
					tone="blue"
				/>
				<StatCard
					title="Módulos con Actividad"
					value={modulesWithActivity}
					icon={<Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />}
					tone="orange"
				/>
			</div>

			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
					Cobertura por dominio
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{domainStats.map((d) => (
						<div
							key={d.domain}
							className="p-3 rounded-md border border-gray-200 bg-gray-50"
						>
							<p className="text-sm font-semibold text-gray-900">{d.domain}</p>
							<p className="text-xs text-gray-600 mt-1">{d.modules} módulos</p>
							<p className="text-xs text-gray-600">{d.rows} registros</p>
						</div>
					))}
				</div>
			</div>

			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
					<div>
						<h2 className="text-lg sm:text-xl font-semibold text-gray-900">
							Usuarios WS
						</h2>
						<p className="text-xs sm:text-sm text-gray-600">
							Resumen y acceso rápido de usuarios registrados
						</p>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={loadWsUsersOverview}
							className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md text-sm"
						>
							<RefreshCw className="w-4 h-4" />
							Refrescar usuarios
						</button>
						<button
							type="button"
							onClick={() => setSelectedTable("ws_users")}
							className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm"
						>
							Ver módulo Usuarios
						</button>
					</div>
				</div>

				{isLoadingWsUsers ? (
					<p className="text-sm text-gray-500">Cargando usuarios WS...</p>
				) : wsUsersError ? (
					<p className="text-sm text-red-600">{wsUsersError}</p>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
							<MetricItem
								label="Total usuarios"
								value={String(wsUsersMetrics.total)}
							/>
							<MetricItem
								label="Emails verificados"
								value={String(wsUsersMetrics.verified)}
							/>
							<MetricItem
								label="Administradores"
								value={String(wsUsersMetrics.admins)}
							/>
							<MetricItem
								label="Plan free"
								value={String(wsUsersMetrics.freePlan)}
							/>
						</div>

						{wsUsersRows.length === 0 ? (
							<p className="text-sm text-gray-500">
								No hay usuarios WS para mostrar.
							</p>
						) : (
							<div className="overflow-auto max-h-[280px] border border-gray-200 rounded-md">
								<table className="min-w-full text-xs">
									<thead className="bg-gray-50 border-b border-gray-200">
										<tr>
											<th className="px-3 py-2 text-left font-semibold text-gray-700">
												Nombre
											</th>
											<th className="px-3 py-2 text-left font-semibold text-gray-700">
												Correo
											</th>
											<th className="px-3 py-2 text-left font-semibold text-gray-700">
												Rol
											</th>
											<th className="px-3 py-2 text-left font-semibold text-gray-700">
												Plan
											</th>
											<th className="px-3 py-2 text-left font-semibold text-gray-700">
												Teléfono
											</th>
											<th className="px-3 py-2 text-left font-semibold text-gray-700">
												Actualizado
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{wsUsersRows.slice(0, 30).map((user, idx) => (
											<tr
												key={`${user.user_id || idx}`}
												className="hover:bg-gray-50"
											>
												<td className="px-3 py-2 text-gray-800">
													{user.name || "-"}
												</td>
												<td className="px-3 py-2 text-gray-800">
													{user.email || "-"}
												</td>
												<td className="px-3 py-2 text-gray-800">
													{user.role || "-"}
												</td>
												<td className="px-3 py-2 text-gray-800">
													{user.plan_type || "-"}
												</td>
												<td className="px-3 py-2 text-gray-800">
													{user.phone || "-"}
												</td>
												<td className="px-3 py-2 text-gray-800">
													{user.updated_at
														? new Date(user.updated_at).toLocaleString("es-CL")
														: "-"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</>
				)}
			</div>

			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
					<div className="relative w-full sm:max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Buscar módulo o dominio..."
							className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
						/>
					</div>
					<button
						type="button"
						onClick={loadModules}
						className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md"
					>
						<RefreshCw className="w-4 h-4" />
						Recargar datos
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
					<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
						Módulos de datos
					</h2>
					{filteredModules.length === 0 ? (
						<p className="text-sm text-gray-500">
							No se encontraron módulos con ese criterio.
						</p>
					) : (
						<div className="space-y-2">
							{filteredModules.map((m) => {
								const isActive = selectedTable === m.table_name;
								return (
									<button
										type="button"
										key={m.table_name}
										onClick={() => setSelectedTable(m.table_name)}
										className={`w-full text-left p-3 rounded-md border transition-colors ${
											isActive
												? "border-purple-300 bg-purple-50"
												: "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-gray-900">
												{m.module_label}
											</span>
											<span className="text-xs text-gray-500">
												{m.row_count}
											</span>
										</div>
										<p className="text-[11px] text-gray-600 mt-1 truncate">
											{m.module_description}
										</p>
										<div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
											<span>{m.domain}</span>
											<span>
												{m.last_activity
													? new Date(m.last_activity).toLocaleDateString(
															"es-CL",
														)
													: "sin fecha"}
											</span>
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>

				<div className="lg:col-span-2 bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 overflow-hidden">
					<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
						{selectedModule
							? `Datos de ${selectedModule.module_label}`
							: "Selecciona un módulo de datos"}
					</h2>

					{isLoadingRows ? (
						<p className="text-sm text-gray-500">Cargando registros...</p>
					) : rowsError ? (
						<p className="text-sm text-red-600">{rowsError}</p>
					) : !selectedTable ? (
						<p className="text-sm text-gray-500">
							Selecciona un módulo para ver su análisis.
						</p>
					) : rows.length === 0 ? (
						<p className="text-sm text-gray-500">
							Este módulo no tiene registros.
						</p>
					) : (
						<div className="space-y-6">
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<MetricItem
									label="Registros analizados"
									value={String(rows.length)}
								/>
								<MetricItem
									label="Columnas detectadas"
									value={String(columns.length)}
								/>
								<MetricItem
									label="Última actividad"
									value={
										selectedModule?.last_activity
											? new Date(selectedModule.last_activity).toLocaleString(
													"es-CL",
												)
											: "Sin fecha"
									}
								/>
							</div>

							<div className="bg-white rounded-md border border-gray-200 p-4">
								<h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<Columns3 className="w-4 h-4 text-purple-600" />
									Perfil de columnas
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{columnStats.map((stat) => (
										<div
											key={stat.column}
											className="border border-gray-200 rounded-md p-3"
										>
											<p className="text-sm font-semibold text-gray-900 truncate">
												{stat.column}
											</p>
											<p className="text-xs text-gray-600 mt-1">
												Tipo: {stat.type}
											</p>
											<p className="text-xs text-gray-600">
												Cobertura: {stat.fillRate}%
											</p>
											<p className="text-xs text-gray-600">
												Únicos: {stat.uniqueCount}
											</p>
										</div>
									))}
								</div>
							</div>

							{lowCardinalityDistributions.length > 0 && (
								<div className="bg-white rounded-md border border-gray-200 p-4">
									<h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
										<PieChart className="w-4 h-4 text-blue-600" />
										Distribuciones relevantes
									</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{lowCardinalityDistributions.map((dist) => (
											<div
												key={dist.column}
												className="border border-gray-200 rounded-md p-3"
											>
												<p className="text-sm font-semibold text-gray-900 mb-2">
													{dist.column}
												</p>
												<div className="space-y-1">
													{dist.items.slice(0, 6).map((item) => (
														<div
															key={`${dist.column}-${item.label}`}
															className="flex items-center justify-between text-xs"
														>
															<span className="text-gray-700 truncate mr-2">
																{item.label}
															</span>
															<span className="font-semibold text-gray-900">
																{item.count}
															</span>
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{recentActivity.length > 0 && (
								<div className="bg-white rounded-md border border-gray-200 p-4">
									<h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
										<Activity className="w-4 h-4 text-green-600" />
										Actividad reciente
									</h3>
									<div className="space-y-1">
										{recentActivity.map((item) => (
											<div
												key={item.day}
												className="flex items-center justify-between text-sm"
											>
												<span className="text-gray-700">{item.day}</span>
												<span className="font-semibold text-gray-900">
													{item.count} registros
												</span>
											</div>
										))}
									</div>
								</div>
							)}

							<div className="bg-white rounded-md border border-gray-200 p-4">
								<h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<Eye className="w-4 h-4 text-orange-600" />
									Preview de filas
								</h3>
								<div className="overflow-auto max-h-[460px] border border-gray-200 rounded-md">
									<table className="min-w-full text-xs">
										<thead className="bg-gray-50 border-b border-gray-200">
											<tr>
												{columns.map((column) => (
													<th
														key={column}
														className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
													>
														{column}
													</th>
												))}
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100">
											{rows.map((row) => (
												<tr
													key={String(
														row?.id ??
															row?.uuid ??
															row?.created_at ??
															`${selectedTable || "table"}-${JSON.stringify(row)}`,
													)}
													className="hover:bg-gray-50"
												>
													{columns.map((column) => {
														const value = row?.[column];
														return (
															<td
																key={column}
																className="px-3 py-2 text-gray-800 align-top whitespace-nowrap"
															>
																{value === null || value === undefined
																	? "-"
																	: typeof value === "object"
																		? JSON.stringify(value)
																		: String(value)}
															</td>
														);
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	title,
	value,
	icon,
	tone,
}: {
	title: string;
	value: number;
	icon: ReactNode;
	tone: "purple" | "green" | "blue" | "orange";
}) {
	const toneClass =
		tone === "purple"
			? "bg-purple-500/10"
			: tone === "green"
				? "bg-green-500/10"
				: tone === "blue"
					? "bg-blue-500/10"
					: "bg-orange-500/10";
	return (
		<div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
			<div className="flex items-center justify-between">
				<div className="min-w-0 flex-1">
					<p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
						{title}
					</p>
					<p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">
						{value}
					</p>
				</div>
				<div
					className={`p-2 sm:p-3 ${toneClass} rounded-full flex-shrink-0 ml-3`}
				>
					{icon}
				</div>
			</div>
		</div>
	);
}

function MetricItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="p-4 rounded-md border border-gray-200 bg-gray-50">
			<p className="text-xs text-gray-600">{label}</p>
			<p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
		</div>
	);
}
