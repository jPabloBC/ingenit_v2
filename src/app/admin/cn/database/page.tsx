"use client";
import { ArrowLeft, Database, RefreshCw, Search, Table } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface CNTable {
	table_name: string;
	row_count: number;
	last_modified: string;
}

export default function CNDatabasePage() {
	const [tables, setTables] = useState<CNTable[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const router = useRouter();

	const loadTables = useCallback(async () => {
		try {
			setIsLoading(true);
			console.log("📊 Cargando tablas CN...");

			// Query para obtener todas las tablas que empiezan con cn_
			const { data, error } = await supabase.rpc("get_cn_tables"); // Necesitarás crear esta función RPC en Supabase

			if (error) {
				console.error("❌ Error cargando tablas:", error);
				// Por ahora, usar lista mock
				setTables([
					{
						table_name: "cn_users",
						row_count: 0,
						last_modified: new Date().toISOString(),
					},
					{
						table_name: "cn_settings",
						row_count: 0,
						last_modified: new Date().toISOString(),
					},
					{
						table_name: "cn_logs",
						row_count: 0,
						last_modified: new Date().toISOString(),
					},
				]);
			} else {
				setTables(data || []);
			}
		} catch (error) {
			console.error("❌ Error general:", error);
			setTables([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadTables();
	}, [loadTables]);

	const filteredTables = tables.filter((table) =>
		table.table_name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

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

					{/* Search and Actions */}
					<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
						<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
							<div className="flex-1 w-full sm:max-w-md">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray6" />
									<input
										type="text"
										placeholder="Buscar tabla..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full rounded-md border border-gray9 bg-white py-2 pl-10 pr-4 text-sm text-gray3 shadow-sm placeholder:text-gray6 focus:border-blue6 focus:ring-2 focus:ring-blue6/10"
									/>
								</div>
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={loadTables}
									className="flex items-center gap-2 rounded-md border border-gray9 bg-gray10 px-4 py-2 font-medium text-gray3 transition-colors hover:bg-white"
								>
									<RefreshCw className="w-4 h-4" />
									Recargar
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Tables Grid */}
				<div className="overflow-hidden rounded-md border border-gray9 bg-white shadow-sm">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue6"></div>
						</div>
					) : filteredTables.length > 0 ? (
						<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
							{filteredTables.map((table) => (
								<button
									type="button"
									key={table.table_name}
									className="group relative min-h-32 cursor-pointer overflow-hidden rounded-md border border-blue13 bg-gray10 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
									onClick={() => {
										// TODO: Navegar a vista detallada de la tabla
										console.log("Tabla seleccionada:", table.table_name);
									}}
								>
									<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
									<div className="flex items-start justify-between mb-3">
										<div className="rounded-md bg-blue7 p-2 text-white shadow-sm">
											<Table className="h-5 w-5" />
										</div>
									</div>

									<h3 className="mb-2 text-lg font-semibold text-gray1">
										{table.table_name}
									</h3>

									<div className="space-y-1">
										<div className="flex items-center justify-between text-sm">
											<span className="text-gray4">Registros:</span>
											<span className="font-medium text-gray1">
												{table.row_count}
											</span>
										</div>
										<div className="flex items-center justify-between text-sm">
											<span className="text-gray4">
												Última modificación:
											</span>
											<span className="text-xs text-gray5">
												{new Date(table.last_modified).toLocaleDateString(
													"es-CL",
												)}
											</span>
										</div>
									</div>
								</button>
							))}
						</div>
					) : (
						<div className="text-center py-12">
							<Database className="mx-auto mb-4 h-12 w-12 text-gray7" />
							<p className="text-gray5">
								{searchQuery
									? "No se encontraron tablas con ese nombre"
									: "No hay tablas CN configuradas"}
							</p>
						</div>
					)}
				</div>

				{/* Info Box */}
				<div className="mt-4 rounded-md border border-blue13 bg-white p-4 shadow-sm">
					<h4 className="mb-2 text-sm font-semibold text-gray1">
						Información
					</h4>
					<p className="text-sm text-gray5">
						Esta sección muestra todas las tablas del proyecto CN (tablas que
						comienzan con{" "}
						<code className="rounded bg-gray10 px-1 py-0.5 text-blue6">cn_</code>).
						Puedes hacer clic en cada tabla para ver sus detalles y administrar
						sus datos.
					</p>
				</div>
			</div>
		</div>
	);
}
