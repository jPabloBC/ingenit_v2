"use client";

import type {
	DSCatalogProduct,
	DSProductSubcategory,
	DSServiceType,
} from "@/lib/ds/types";

type Props = {
	rows: DSCatalogProduct[];
	serviceTypes: DSServiceType[];
	subcategories: DSProductSubcategory[];
	onEdit: (row: DSCatalogProduct) => void;
	onToggleActive: (row: DSCatalogProduct) => void;
	onDelete: (row: DSCatalogProduct) => void;
	isLoading?: boolean;
};

function serviceTypeLabel(serviceTypes: DSServiceType[], id: string) {
	const item = serviceTypes.find((type) => String(type.id) === String(id));
	const typeName = String(item?.name || id || "-");
	const groupName = String(item?.category_name || "").trim();
	return groupName ? `${groupName} / ${typeName}` : typeName;
}

function assignmentModeLabel(mode?: string | null) {
	if (mode === "required") return "Obligatorio";
	if (mode === "restricted") return "Restringido";
	return "Opcional";
}

function priceRangeLabel(minPrice?: number | null, maxPrice?: number | null) {
	if (minPrice == null && maxPrice == null) return "Sin límites";
	if (minPrice != null && maxPrice != null) return `${minPrice} - ${maxPrice}`;
	if (minPrice != null) return `Mín: ${minPrice}`;
	return `Máx: ${maxPrice}`;
}

export default function DSCatalogTable({
	rows,
	serviceTypes,
	subcategories,
	onEdit,
	onToggleActive,
	onDelete,
	isLoading,
}: Props) {
	const subcategoryLabel = (subcategoryId?: string | null) => {
		if (!subcategoryId) return "-";
		const row = subcategories.find(
			(item) => String(item.id) === String(subcategoryId),
		);
		return String(row?.name || row?.code || subcategoryId);
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
			<div className="overflow-x-auto">
				<table className="min-w-full">
					<thead className="bg-gray-50 border-b border-gray-200">
						<tr>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								SKU
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Nombre
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Tipo servicio
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Subgrupo
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Unidad
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Asignación
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Rango precio
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Estado
							</th>
							<th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3">
								Acciones
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									className="px-4 py-8 text-center text-sm text-gray-500"
									colSpan={9}
								>
									Cargando catálogo...
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td
									className="px-4 py-8 text-center text-sm text-gray-500"
									colSpan={9}
								>
									No hay productos para los filtros seleccionados.
								</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr
									key={row.id}
									className="border-b border-gray-100 hover:bg-gray-50/60"
								>
									<td className="px-4 py-3 text-sm text-gray-900 font-mono">
										{row.sku}
									</td>
									<td className="px-4 py-3 text-sm text-gray-900">
										<p className="font-medium">{row.name}</p>
										{row.description ? (
											<p className="text-xs text-gray-500 truncate max-w-[280px]">
												{row.description}
											</p>
										) : null}
									</td>
									<td className="px-4 py-3 text-sm text-gray-700">
										{serviceTypeLabel(
											serviceTypes,
											String(row.service_type_id),
										)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-700">
										{subcategoryLabel(row.subcategory_id as string | null)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-700">
										{row.unit || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-gray-700">
										{assignmentModeLabel(row.assignment_mode as string | null)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-700">
										{priceRangeLabel(
											row.min_price as number | null,
											row.max_price as number | null,
										)}
									</td>
									<td className="px-4 py-3 text-sm">
										<span
											className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
												row.is_active
													? "bg-green-100 text-green-700 border-green-200"
													: "bg-gray-100 text-gray-700 border-gray-200"
											}`}
										>
											{row.is_active ? "Activo" : "Inactivo"}
										</span>
									</td>
									<td className="px-4 py-3 text-right">
										<div className="inline-flex items-center gap-2">
											<button
												type="button"
												onClick={() => onEdit(row)}
												className="px-2.5 py-1.5 text-xs rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
											>
												Editar
											</button>
											<button
												type="button"
												onClick={() => onToggleActive(row)}
												className={`px-2.5 py-1.5 text-xs rounded-md border ${
													row.is_active
														? "border-orange-200 text-orange-700 hover:bg-orange-50"
														: "border-green-200 text-green-700 hover:bg-green-50"
												}`}
											>
												{row.is_active ? "Desactivar" : "Activar"}
											</button>
											<button
												type="button"
												onClick={() => onDelete(row)}
												className="px-2.5 py-1.5 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50"
											>
												Eliminar
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
