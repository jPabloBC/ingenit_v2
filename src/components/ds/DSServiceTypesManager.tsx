"use client";

import { useMemo, useState } from "react";
import type { DSProductSubcategory, DSServiceType } from "@/lib/ds/types";

type CreatePayload = {
	name: string;
	slug: string;
	icon: string;
	category_code: string;
	category_name: string;
	sort_order: number;
	is_active: boolean;
};

type UpdatePayload = {
	id: string;
	name: string;
	slug: string;
	icon: string;
	category_code: string;
	category_name: string;
	sort_order: number;
};

type Props = {
	open: boolean;
	embedded?: boolean;
	onClose: () => void;
	rows: DSServiceType[];
	subcategories: DSProductSubcategory[];
	onCreate: (payload: CreatePayload) => Promise<void>;
	onUpdate: (payload: UpdatePayload) => Promise<void>;
	onToggle: (id: string, isActive: boolean) => Promise<void>;
	onCreateSubcategory: (payload: {
		service_type_id: string;
		name: string;
		code: string;
		sort_order: number;
		is_active: boolean;
	}) => Promise<void>;
	onToggleSubcategory: (id: string, isActive: boolean) => Promise<void>;
};

const ICON_OPTIONS = [
	"flame",
	"droplets",
	"package",
	"shopping-basket",
	"wrench",
	"truck",
	"bolt",
	"leaf",
];

const MARKET_PRESETS: Array<{
	name: string;
	slug: string;
	icon: string;
	category_code: string;
	category_name: string;
	sort_order: number;
}> = [
	{
		name: "Restaurantes",
		slug: "restaurantes",
		icon: "flame",
		category_code: "alimentos",
		category_name: "Alimentos",
		sort_order: 10,
	},
	{
		name: "Comida rápida",
		slug: "comida-rapida",
		icon: "flame",
		category_code: "alimentos",
		category_name: "Alimentos",
		sort_order: 20,
	},
	{
		name: "Farmacias",
		slug: "farmacias",
		icon: "leaf",
		category_code: "salud",
		category_name: "Salud",
		sort_order: 30,
	},
	{
		name: "Almacenes",
		slug: "almacenes",
		icon: "shopping-basket",
		category_code: "compras",
		category_name: "Compras",
		sort_order: 40,
	},
	{
		name: "Supermercados",
		slug: "supermercados",
		icon: "shopping-basket",
		category_code: "compras",
		category_name: "Compras",
		sort_order: 50,
	},
	{
		name: "Minimarkets",
		slug: "minimarkets",
		icon: "shopping-basket",
		category_code: "compras",
		category_name: "Compras",
		sort_order: 60,
	},
	{
		name: "Courier y encomiendas",
		slug: "courier-encomiendas",
		icon: "truck",
		category_code: "logistica",
		category_name: "Logística",
		sort_order: 70,
	},
];

function slugify(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

function categoryCode(value: string): string {
	return slugify(value).replace(/-/g, "_");
}

export default function DSServiceTypesManager({
	open,
	embedded = false,
	onClose,
	rows,
	subcategories,
	onCreate,
	onUpdate,
	onToggle,
	onCreateSubcategory,
	onToggleSubcategory,
}: Props) {
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [icon, setIcon] = useState("package");
	const [categoryName, setCategoryName] = useState("");
	const [categoryCodeInput, setCategoryCodeInput] = useState("");
	const [sortOrder, setSortOrder] = useState("100");
	const [isActive, setIsActive] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [editId, setEditId] = useState("");
	const [editName, setEditName] = useState("");
	const [editSlug, setEditSlug] = useState("");
	const [editIcon, setEditIcon] = useState("package");
	const [editCategoryName, setEditCategoryName] = useState("");
	const [editCategoryCode, setEditCategoryCode] = useState("");
	const [editSortOrder, setEditSortOrder] = useState("100");
	const [slugTouched, setSlugTouched] = useState(false);
	const [loadingPresets, setLoadingPresets] = useState(false);

	const [subServiceTypeId, setSubServiceTypeId] = useState("");
	const [subName, setSubName] = useState("");
	const [subCode, setSubCode] = useState("");
	const [subSortOrder, setSubSortOrder] = useState("100");
	const [subIsActive, setSubIsActive] = useState(true);

	const sorted = useMemo(
		() =>
			[...rows].sort((a, b) => {
				const ao = Number(a.sort_order ?? 100);
				const bo = Number(b.sort_order ?? 100);
				if (ao !== bo) return ao - bo;
				const ac = String(a.category_name || "");
				const bc = String(b.category_name || "");
				if (ac !== bc)
					return ac.localeCompare(bc, "es", { sensitivity: "base" });
				return String(a.name || "").localeCompare(String(b.name || ""), "es", {
					sensitivity: "base",
				});
			}),
		[rows],
	);

	const sortedSubcategories = useMemo(
		() =>
			[...subcategories].sort((a, b) => {
				const ao = Number(a.sort_order ?? 100);
				const bo = Number(b.sort_order ?? 100);
				if (ao !== bo) return ao - bo;
				return String(a.name || "").localeCompare(String(b.name || ""), "es", {
					sensitivity: "base",
				});
			}),
		[subcategories],
	);

	if (!embedded && !open) return null;

	const resetForm = () => {
		setName("");
		setSlug("");
		setIcon("package");
		setCategoryName("");
		setCategoryCodeInput("");
		setSortOrder("100");
		setIsActive(true);
		setEditId("");
		setEditName("");
		setEditSlug("");
		setEditIcon("package");
		setEditCategoryName("");
		setEditCategoryCode("");
		setEditSortOrder("100");
		setSubServiceTypeId("");
		setSubName("");
		setSubCode("");
		setSubSortOrder("100");
		setSubIsActive(true);
		setSlugTouched(false);
		setError("");
	};

	const submitCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		const nextName = name.trim();
		const nextSlug = slugify((slug || name).trim());
		const nextCategoryName = categoryName.trim();
		const nextCategoryCode = categoryCode(categoryCodeInput || categoryName);
		const nextSortOrder = Math.max(0, Math.floor(Number(sortOrder) || 0));

		if (!nextName) return setError("El nombre es requerido");
		if (!nextSlug) return setError("El slug es requerido");
		if (!nextCategoryName) return setError("La familia es requerida");
		if (!nextCategoryCode) return setError("El código de familia es requerido");

		setSaving(true);
		try {
			await onCreate({
				name: nextName,
				slug: nextSlug,
				icon,
				category_code: nextCategoryCode,
				category_name: nextCategoryName,
				sort_order: nextSortOrder,
				is_active: isActive,
			});
			resetForm();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const submitEdit = async () => {
		if (!editId) return;
		setError("");
		const nextName = editName.trim();
		const nextSlug = slugify(editSlug.trim());
		const nextCategoryName = editCategoryName.trim();
		const nextCategoryCode = categoryCode(editCategoryCode || editCategoryName);
		const nextSortOrder = Math.max(0, Math.floor(Number(editSortOrder) || 0));
		if (!nextName) return setError("El nombre es requerido");
		if (!nextSlug) return setError("El slug es requerido");
		if (!nextCategoryName) return setError("La familia es requerida");
		if (!nextCategoryCode) return setError("El código de familia es requerido");

		setSaving(true);
		try {
			await onUpdate({
				id: editId,
				name: nextName,
				slug: nextSlug,
				icon: editIcon,
				category_code: nextCategoryCode,
				category_name: nextCategoryName,
				sort_order: nextSortOrder,
			});
			setEditId("");
			setEditName("");
			setEditSlug("");
			setEditIcon("package");
			setEditCategoryName("");
			setEditCategoryCode("");
			setEditSortOrder("100");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const submitCreateSubcategory = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		const nextServiceTypeId = subServiceTypeId.trim();
		const nextName = subName.trim();
		const nextCode = categoryCode(subCode || subName);
		const nextSortOrder = Math.max(0, Math.floor(Number(subSortOrder) || 0));
		if (!nextServiceTypeId) return setError("Selecciona una categoría");
		if (!nextName) return setError("El nombre de la subcategoría es requerido");
		if (!nextCode) return setError("El código de la subcategoría es requerido");

		setSaving(true);
		try {
			await onCreateSubcategory({
				service_type_id: nextServiceTypeId,
				name: nextName,
				code: nextCode,
				sort_order: nextSortOrder,
				is_active: subIsActive,
			});
			setSubName("");
			setSubCode("");
			setSubSortOrder("100");
			setSubIsActive(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const applyMarketPresets = async () => {
		setError("");
		setLoadingPresets(true);
		try {
			const existingSlugs = new Set(
				rows.map((row) => String(row.slug || "").toLowerCase()).filter(Boolean),
			);
			for (const preset of MARKET_PRESETS) {
				if (existingSlugs.has(preset.slug.toLowerCase())) continue;
				await onCreate({ ...preset, is_active: true });
				existingSlugs.add(preset.slug.toLowerCase());
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoadingPresets(false);
		}
	};

	const body = (
		<div className="bg-white w-full rounded-xl border border-gray-200 shadow-sm">
			<div className="px-6 pt-6 pb-2 border-b border-gray-100 flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Categorías y Subcategorías
					</h2>
					<p className="text-xs text-gray-600 mt-1">
						Estructura clara: Categoría (nivel 1) y Subcategoría (nivel 2).
					</p>
				</div>
				{!embedded ? (
					<button
						type="button"
						onClick={onClose}
						className="text-sm text-gray-500 hover:text-gray-700"
					>
						Cerrar
					</button>
				) : null}
			</div>

			<div className="p-6 space-y-6">
				<div className="bg-gray-50 border border-gray-200 rounded-md p-4">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
						<div>
							<h3 className="font-medium text-gray-900">Biblioteca base</h3>
							<p className="text-xs text-gray-600 mt-1">
								Carga categorías iniciales de mercado para acelerar la
								configuración.
							</p>
						</div>
						<button
							type="button"
							onClick={() => void applyMarketPresets()}
							disabled={loadingPresets || saving}
							className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-black disabled:opacity-50"
						>
							{loadingPresets ? "Cargando..." : "Cargar base recomendada"}
						</button>
					</div>
				</div>

				<form
					onSubmit={submitCreate}
					className="bg-indigo-50/50 border border-indigo-100 rounded-md p-4"
				>
					<h3 className="font-medium text-gray-900 mb-3">Crear categoría</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
						<div>
							<label
								htmlFor="ds-category-name"
								className="block text-xs text-gray-600 mb-1"
							>
								Categoría
							</label>
							<input
								id="ds-category-name"
								value={name}
								onChange={(e) => {
									const v = e.target.value;
									setName(v);
									if (!slugTouched) setSlug(slugify(v));
								}}
								placeholder="Ej: Restaurantes"
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-category-slug"
								className="block text-xs text-gray-600 mb-1"
							>
								Slug
							</label>
							<input
								id="ds-category-slug"
								value={slug}
								onChange={(e) => {
									setSlugTouched(true);
									setSlug(slugify(e.target.value));
								}}
								placeholder="restaurantes"
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full font-mono"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-category-family"
								className="block text-xs text-gray-600 mb-1"
							>
								Familia
							</label>
							<input
								id="ds-category-family"
								value={categoryName}
								onChange={(e) => setCategoryName(e.target.value)}
								placeholder="Alimentos"
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-category-code"
								className="block text-xs text-gray-600 mb-1"
							>
								Código familia
							</label>
							<input
								id="ds-category-code"
								value={categoryCodeInput}
								onChange={(e) => setCategoryCodeInput(e.target.value)}
								placeholder="alimentos"
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full font-mono"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-category-order"
								className="block text-xs text-gray-600 mb-1"
							>
								Orden
							</label>
							<input
								id="ds-category-order"
								type="number"
								min={0}
								value={sortOrder}
								onChange={(e) => setSortOrder(e.target.value)}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-category-icon"
								className="block text-xs text-gray-600 mb-1"
							>
								Icono
							</label>
							<select
								id="ds-category-icon"
								value={icon}
								onChange={(e) => setIcon(e.target.value)}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							>
								{ICON_OPTIONS.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="mt-3 flex items-center justify-between gap-3">
						<label className="inline-flex items-center gap-2 text-sm text-gray-700">
							<input
								type="checkbox"
								checked={isActive}
								onChange={(e) => setIsActive(e.target.checked)}
							/>
							Activo
						</label>
						<button
							type="submit"
							disabled={saving}
							className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
						>
							{saving ? "Guardando..." : "Crear categoría"}
						</button>
					</div>
				</form>

				<form
					onSubmit={submitCreateSubcategory}
					className="bg-emerald-50/50 border border-emerald-100 rounded-md p-4"
				>
					<h3 className="font-medium text-gray-900 mb-3">Crear subcategoría</h3>
					<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
						<div>
							<label
								htmlFor="ds-subcategory-service-type"
								className="block text-xs text-gray-600 mb-1"
							>
								Categoría
							</label>
							<select
								id="ds-subcategory-service-type"
								value={subServiceTypeId}
								onChange={(e) => setSubServiceTypeId(e.target.value)}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							>
								<option value="">Seleccionar</option>
								{sorted.map((row) => (
									<option key={String(row.id)} value={String(row.id)}>
										{String(row.name || row.id)}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="ds-subcategory-name"
								className="block text-xs text-gray-600 mb-1"
							>
								Subcategoría
							</label>
							<input
								id="ds-subcategory-name"
								value={subName}
								onChange={(e) => setSubName(e.target.value)}
								placeholder="Ej: Pizzas"
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-subcategory-code"
								className="block text-xs text-gray-600 mb-1"
							>
								Código
							</label>
							<input
								id="ds-subcategory-code"
								value={subCode}
								onChange={(e) => setSubCode(e.target.value)}
								placeholder="pizzas"
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full font-mono"
							/>
						</div>
						<div>
							<label
								htmlFor="ds-subcategory-order"
								className="block text-xs text-gray-600 mb-1"
							>
								Orden
							</label>
							<input
								id="ds-subcategory-order"
								type="number"
								min={0}
								value={subSortOrder}
								onChange={(e) => setSubSortOrder(e.target.value)}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
							/>
						</div>
						<div className="flex items-end justify-between gap-3">
							<label className="inline-flex items-center gap-2 text-sm text-gray-700">
								<input
									type="checkbox"
									checked={subIsActive}
									onChange={(e) => setSubIsActive(e.target.checked)}
								/>
								Activo
							</label>
							<button
								type="submit"
								disabled={saving}
								className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
							>
								{saving ? "Guardando..." : "Crear subcategoría"}
							</button>
						</div>
					</div>
				</form>

				{error ? <p className="text-sm text-red-700">{error}</p> : null}

				<div className="overflow-x-auto border border-gray-200 rounded-md">
					<table className="min-w-full">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Categoría
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Familia
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Orden
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Slug
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Icono
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Estado
								</th>
								<th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((row) => {
								const rowId = String(row.id);
								const editing = editId === rowId;
								return (
									<tr key={rowId} className="border-b border-gray-100">
										<td className="px-3 py-2 text-sm">
											{editing ? (
												<input
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
													className="border border-gray-300 rounded px-2 py-1 w-full"
												/>
											) : (
												String(row.name || "-")
											)}
										</td>
										<td className="px-3 py-2 text-sm">
											{editing ? (
												<div className="space-y-1">
													<input
														value={editCategoryName}
														onChange={(e) =>
															setEditCategoryName(e.target.value)
														}
														className="border border-gray-300 rounded px-2 py-1 w-full"
													/>
													<input
														value={editCategoryCode}
														onChange={(e) =>
															setEditCategoryCode(e.target.value)
														}
														className="border border-gray-300 rounded px-2 py-1 w-full font-mono"
													/>
												</div>
											) : (
												<div>
													<p>{String(row.category_name || "-")}</p>
													<p className="text-xs text-gray-500 font-mono">
														{String(row.category_code || "-")}
													</p>
												</div>
											)}
										</td>
										<td className="px-3 py-2 text-sm">
											{editing ? (
												<input
													value={editSortOrder}
													type="number"
													min={0}
													onChange={(e) => setEditSortOrder(e.target.value)}
													className="border border-gray-300 rounded px-2 py-1 w-full"
												/>
											) : (
												String(row.sort_order ?? 100)
											)}
										</td>
										<td className="px-3 py-2 text-sm font-mono">
											{editing ? (
												<input
													value={editSlug}
													onChange={(e) => setEditSlug(slugify(e.target.value))}
													className="border border-gray-300 rounded px-2 py-1 w-full"
												/>
											) : (
												String(row.slug || "-")
											)}
										</td>
										<td className="px-3 py-2 text-sm">
											{editing ? (
												<select
													value={editIcon}
													onChange={(e) => setEditIcon(e.target.value)}
													className="border border-gray-300 rounded px-2 py-1 w-full"
												>
													{ICON_OPTIONS.map((option) => (
														<option key={option} value={option}>
															{option}
														</option>
													))}
												</select>
											) : (
												String(row.icon || "-")
											)}
										</td>
										<td className="px-3 py-2 text-sm">
											<span
												className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${row.is_active === false ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-green-100 text-green-700 border-green-200"}`}
											>
												{row.is_active === false ? "Inactivo" : "Activo"}
											</span>
										</td>
										<td className="px-3 py-2 text-right">
											<div className="inline-flex gap-2">
												{editing ? (
													<>
														<button
															type="button"
															onClick={submitEdit}
															className="px-2 py-1 text-xs border border-blue-200 text-blue-700 rounded hover:bg-blue-50"
														>
															Guardar
														</button>
														<button
															type="button"
															onClick={() => {
																setEditId("");
																setEditName("");
																setEditSlug("");
																setEditIcon("package");
																setEditCategoryName("");
																setEditCategoryCode("");
																setEditSortOrder("100");
															}}
															className="px-2 py-1 text-xs border border-gray-200 text-gray-700 rounded hover:bg-gray-50"
														>
															Cancelar
														</button>
													</>
												) : (
													<button
														type="button"
														onClick={() => {
															setEditId(rowId);
															setEditName(String(row.name || ""));
															setEditSlug(String(row.slug || ""));
															setEditIcon(String(row.icon || "package"));
															setEditCategoryName(
																String(row.category_name || ""),
															);
															setEditCategoryCode(
																String(row.category_code || ""),
															);
															setEditSortOrder(String(row.sort_order ?? 100));
														}}
														className="px-2 py-1 text-xs border border-blue-200 text-blue-700 rounded hover:bg-blue-50"
													>
														Editar
													</button>
												)}
												<button
													type="button"
													onClick={() =>
														onToggle(rowId, !(row.is_active === false))
													}
													className={`px-2 py-1 text-xs rounded border ${row.is_active === false ? "border-green-200 text-green-700 hover:bg-green-50" : "border-orange-200 text-orange-700 hover:bg-orange-50"}`}
												>
													{row.is_active === false ? "Activar" : "Desactivar"}
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<div className="overflow-x-auto border border-gray-200 rounded-md">
					<table className="min-w-full">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Subcategoría
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Código
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Categoría
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Orden
								</th>
								<th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Estado
								</th>
								<th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-600 px-3 py-2">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody>
							{sortedSubcategories.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="px-3 py-6 text-sm text-center text-gray-500"
									>
										No hay subcategorías creadas.
									</td>
								</tr>
							) : (
								sortedSubcategories.map((row) => {
									const serviceType = rows.find(
										(type) => String(type.id) === String(row.service_type_id),
									);
									return (
										<tr
											key={String(row.id)}
											className="border-b border-gray-100"
										>
											<td className="px-3 py-2 text-sm text-gray-900">
												{String(row.name || "-")}
											</td>
											<td className="px-3 py-2 text-sm text-gray-700 font-mono">
												{String(row.code || "-")}
											</td>
											<td className="px-3 py-2 text-sm text-gray-700">
												{String(
													serviceType?.name || row.service_type_id || "-",
												)}
											</td>
											<td className="px-3 py-2 text-sm text-gray-700">
												{String(row.sort_order ?? 100)}
											</td>
											<td className="px-3 py-2 text-sm">
												<span
													className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${row.is_active === false ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-green-100 text-green-700 border-green-200"}`}
												>
													{row.is_active === false ? "Inactivo" : "Activo"}
												</span>
											</td>
											<td className="px-3 py-2 text-right">
												<button
													type="button"
													onClick={() =>
														onToggleSubcategory(
															String(row.id),
															!(row.is_active === false),
														)
													}
													className={`px-2 py-1 text-xs rounded border ${row.is_active === false ? "border-green-200 text-green-700 hover:bg-green-50" : "border-orange-200 text-orange-700 hover:bg-orange-50"}`}
												>
													{row.is_active === false ? "Activar" : "Desactivar"}
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
		</div>
	);

	if (embedded) return body;

	return (
		<div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-6 sm:p-8">
			<div className="w-full max-w-6xl max-h-[90vh] overflow-auto">{body}</div>
		</div>
	);
}
