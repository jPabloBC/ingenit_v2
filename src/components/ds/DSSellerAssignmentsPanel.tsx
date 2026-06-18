"use client";

import { useMemo, useState } from "react";
import type {
	DSCatalogProduct,
	DSSeller,
	DSSellerCatalogAssignment,
	DSServiceType,
} from "@/lib/ds/types";

type Row = {
	product: DSCatalogProduct;
	assignment: DSSellerCatalogAssignment | null;
};

type Draft = {
	price: string;
	stock: string;
	is_active: boolean;
	custom_name: string;
	custom_description: string;
};

type Props = {
	sellers: DSSeller[];
	serviceTypes: DSServiceType[];
	selectedSellerId: string;
	onSelectSeller: (sellerId: string) => void;
	rows: Row[];
	isLoading: boolean;
	onSaveRow: (
		sellerId: string,
		productId: string,
		draft: Draft,
	) => Promise<void>;
	onBulkPrice: (newPrice: number) => Promise<void>;
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

function priceRulesLabel(minPrice?: number | null, maxPrice?: number | null) {
	if (minPrice == null && maxPrice == null) return "Sin límites";
	if (minPrice != null && maxPrice != null) return `${minPrice} - ${maxPrice}`;
	if (minPrice != null) return `Mín: ${minPrice}`;
	return `Máx: ${maxPrice}`;
}

function buildDraft(assignment: DSSellerCatalogAssignment | null): Draft {
	return {
		price: String(assignment?.price ?? 0),
		stock: String(assignment?.stock ?? 0),
		is_active: assignment?.is_active ?? true,
		custom_name: String(assignment?.custom_name || ""),
		custom_description: String(assignment?.custom_description || ""),
	};
}

export default function DSSellerAssignmentsPanel({
	sellers,
	serviceTypes,
	selectedSellerId,
	onSelectSeller,
	rows,
	isLoading,
	onSaveRow,
	onBulkPrice,
}: Props) {
	const [drafts, setDrafts] = useState<Record<string, Draft>>({});
	const [savingRow, setSavingRow] = useState<string>("");
	const [bulkPrice, setBulkPrice] = useState("");
	const [bulkLoading, setBulkLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const selectedSeller = useMemo(
		() =>
			sellers.find((seller) => seller.seller_id === selectedSellerId) || null,
		[sellers, selectedSellerId],
	);

	const getDraft = (row: Row) =>
		drafts[row.product.id] || buildDraft(row.assignment);

	const handleDraftChange = (
		productId: string,
		next: Partial<Draft>,
		row: Row,
	) => {
		setDrafts((prev) => ({
			...prev,
			[productId]: { ...getDraft(row), ...next },
		}));
	};

	const handleSave = async (row: Row) => {
		if (!selectedSellerId) return;
		setError("");
		setSuccess("");
		const draft = getDraft(row);
		const minPrice = row.product.min_price ?? null;
		const maxPrice = row.product.max_price ?? null;
		const priceNum = Number(draft.price);
		if (minPrice !== null && priceNum < Number(minPrice)) {
			throw new Error(
				`El precio de "${row.product.name}" no puede ser menor a ${minPrice}`,
			);
		}
		if (maxPrice !== null && priceNum > Number(maxPrice)) {
			throw new Error(
				`El precio de "${row.product.name}" no puede ser mayor a ${maxPrice}`,
			);
		}
		setSavingRow(row.product.id);
		try {
			await onSaveRow(selectedSellerId, row.product.id, draft);
			setSuccess(`Asignación guardada para ${row.product.name}`);
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : String(saveError),
			);
		} finally {
			setSavingRow("");
		}
	};

	const handleBulkApply = async () => {
		const next = Number(bulkPrice);
		if (!Number.isFinite(next) || next < 0) {
			setError("El precio masivo debe ser un número >= 0");
			return;
		}
		setError("");
		setSuccess("");
		setBulkLoading(true);
		try {
			await onBulkPrice(next);
			setSuccess("Precio masivo aplicado");
		} catch (bulkError) {
			setError(
				bulkError instanceof Error ? bulkError.message : String(bulkError),
			);
		} finally {
			setBulkLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
			<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
				<div className="w-full lg:max-w-md">
					<label
						htmlFor="ds-selected-seller"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Vendedor
					</label>
					<select
						id="ds-selected-seller"
						value={selectedSellerId}
						onChange={(e) => onSelectSeller(e.target.value)}
						className="w-full border border-gray-300 rounded-md px-3 py-2"
					>
						<option value="">Seleccionar vendedor</option>
						{sellers.map((seller) => (
							<option key={seller.seller_id} value={seller.seller_id}>
								{seller.full_name} {seller.email ? `(${seller.email})` : ""}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-end gap-2">
					<div>
						<label
							htmlFor="ds-bulk-price"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Aplicar precio masivo
						</label>
						<input
							id="ds-bulk-price"
							type="number"
							min="0"
							step="0.01"
							value={bulkPrice}
							onChange={(e) => setBulkPrice(e.target.value)}
							className="w-40 border border-gray-300 rounded-md px-3 py-2"
							placeholder="Ej: 2990"
						/>
					</div>
					<button
						type="button"
						disabled={!selectedSellerId || bulkLoading || !bulkPrice}
						onClick={handleBulkApply}
						className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
					>
						{bulkLoading ? "Aplicando..." : "Aplicar"}
					</button>
				</div>
			</div>

			{selectedSeller ? (
				<p className="text-sm text-gray-600 mb-3">
					Editando asignaciones de{" "}
					<span className="font-medium text-gray-900">
						{selectedSeller.full_name}
					</span>
				</p>
			) : (
				<p className="text-sm text-gray-600 mb-3">
					Selecciona un vendedor para gestionar precios y stock.
				</p>
			)}

			{error ? <p className="text-sm text-red-700 mb-3">{error}</p> : null}
			{success ? (
				<p className="text-sm text-green-700 mb-3">{success}</p>
			) : null}

			<div className="overflow-x-auto">
				<table className="min-w-full">
					<thead className="bg-gray-50 border-y border-gray-200">
						<tr>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Producto
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Tipo
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Regla
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Límite precio
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Precio
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Stock
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Activo
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Custom name
							</th>
							<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Custom description
							</th>
							<th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
								Guardar
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={10}
									className="px-3 py-8 text-center text-sm text-gray-500"
								>
									Cargando asignaciones...
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td
									colSpan={10}
									className="px-3 py-8 text-center text-sm text-gray-500"
								>
									No hay productos para asignar.
								</td>
							</tr>
						) : (
							rows.map((row) => {
								const draft = getDraft(row);
								return (
									<tr
										key={row.product.id}
										className="border-b border-gray-100 align-top"
									>
										<td className="px-3 py-3 text-sm">
											<p className="font-medium text-gray-900">
												{row.product.name}
											</p>
											<p className="text-xs text-gray-500 font-mono">
												{row.product.sku}
											</p>
										</td>
										<td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
											{serviceTypeLabel(
												serviceTypes,
												String(row.product.service_type_id),
											)}
										</td>
										<td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
											{assignmentModeLabel(
												row.product.assignment_mode as string | null,
											)}
										</td>
										<td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
											{priceRulesLabel(
												row.product.min_price as number | null,
												row.product.max_price as number | null,
											)}
										</td>
										<td className="px-3 py-3">
											<input
												type="number"
												min="0"
												step="0.01"
												value={draft.price}
												onChange={(e) =>
													handleDraftChange(
														row.product.id,
														{ price: e.target.value },
														row,
													)
												}
												className="w-28 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
											/>
										</td>
										<td className="px-3 py-3">
											<input
												type="number"
												min="0"
												step="1"
												value={draft.stock}
												onChange={(e) =>
													handleDraftChange(
														row.product.id,
														{ stock: e.target.value },
														row,
													)
												}
												className="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
											/>
										</td>
										<td className="px-3 py-3">
											<input
												type="checkbox"
												checked={
													row.product.assignment_mode === "required"
														? true
														: draft.is_active
												}
												disabled={row.product.assignment_mode === "required"}
												onChange={(e) =>
													handleDraftChange(
														row.product.id,
														{ is_active: e.target.checked },
														row,
													)
												}
											/>
										</td>
										<td className="px-3 py-3">
											<input
												value={draft.custom_name}
												onChange={(e) =>
													handleDraftChange(
														row.product.id,
														{ custom_name: e.target.value },
														row,
													)
												}
												className="w-48 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												value={draft.custom_description}
												onChange={(e) =>
													handleDraftChange(
														row.product.id,
														{ custom_description: e.target.value },
														row,
													)
												}
												className="w-64 border border-gray-300 rounded-md px-2 py-1.5 text-sm min-h-[58px]"
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<button
												type="button"
												disabled={
													!selectedSellerId || savingRow === row.product.id
												}
												onClick={() => handleSave(row)}
												className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
											>
												{savingRow === row.product.id
													? "Guardando..."
													: "Guardar"}
											</button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
