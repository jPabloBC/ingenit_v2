"use client";

import { useEffect, useMemo, useState } from "react";
import type {
	DSCatalogProduct,
	DSProductSubcategory,
	DSServiceType,
} from "@/lib/ds/types";

type Props = {
	open: boolean;
	mode: "create" | "edit";
	product: DSCatalogProduct | null;
	serviceTypes: DSServiceType[];
	subcategories: DSProductSubcategory[];
	onClose: () => void;
	onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

const STANDARD_UNITS = [
	"un",
	"kg",
	"g",
	"l",
	"ml",
	"m",
	"cm",
	"m2",
	"m3",
	"docena",
	"botella",
	"garrafa",
	"cilindro",
	"caja",
	"paquete",
	"bolsa",
];

export default function DSCatalogFormModal({
	open,
	mode,
	product,
	serviceTypes,
	subcategories,
	onClose,
	onSubmit,
}: Props) {
	const [form, setForm] = useState({
		service_type_id: "",
		subcategory_id: "",
		name: "",
		description: "",
		unit: "",
		assignment_mode: "optional" as "required" | "optional" | "restricted",
		min_price: "",
		max_price: "",
		specsMode: "guided" as "guided" | "json",
		specsText: "{}",
		is_active: true,
	});
	const [guidedSpecs, setGuidedSpecs] = useState({
		brand: "",
		origin: "",
		presentation: "",
		size: "",
		color: "",
		material: "",
		notes: "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSaving, setIsSaving] = useState(false);
	const [generalError, setGeneralError] = useState("");

	useEffect(() => {
		if (!open) return;
		if (mode === "edit" && product) {
			setForm({
				service_type_id: String(product.service_type_id || ""),
				subcategory_id: String(product.subcategory_id || ""),
				name: String(product.name || ""),
				description: String(product.description || ""),
				unit: String(product.unit || ""),
				assignment_mode: String(product.assignment_mode || "optional") as
					| "required"
					| "optional"
					| "restricted",
				min_price:
					product.min_price === null || product.min_price === undefined
						? ""
						: String(product.min_price),
				max_price:
					product.max_price === null || product.max_price === undefined
						? ""
						: String(product.max_price),
				specsMode: "guided",
				specsText: JSON.stringify(product.specs || {}, null, 2),
				is_active: Boolean(product.is_active),
			});
			const specs = (product.specs || {}) as Record<string, unknown>;
			setGuidedSpecs({
				brand: typeof specs.brand === "string" ? specs.brand : "",
				origin: typeof specs.origin === "string" ? specs.origin : "",
				presentation:
					typeof specs.presentation === "string" ? specs.presentation : "",
				size: typeof specs.size === "string" ? specs.size : "",
				color: typeof specs.color === "string" ? specs.color : "",
				material: typeof specs.material === "string" ? specs.material : "",
				notes: typeof specs.notes === "string" ? specs.notes : "",
			});
		} else {
			setForm({
				service_type_id: "",
				subcategory_id: "",
				name: "",
				description: "",
				unit: "",
				assignment_mode: "optional",
				min_price: "",
				max_price: "",
				specsMode: "guided",
				specsText: "{}",
				is_active: true,
			});
			setGuidedSpecs({
				brand: "",
				origin: "",
				presentation: "",
				size: "",
				color: "",
				material: "",
				notes: "",
			});
		}
		setErrors({});
		setGeneralError("");
	}, [open, mode, product]);

	const parsedSpecs = useMemo(() => {
		try {
			const parsed = JSON.parse(form.specsText || "{}");
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				return { valid: false, value: null, error: "Debe ser un objeto JSON" };
			}
			return {
				valid: true,
				value: parsed as Record<string, unknown>,
				error: "",
			};
		} catch (error) {
			return {
				valid: false,
				value: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}, [form.specsText]);

	const unitOptions = useMemo(() => {
		const set = new Set(STANDARD_UNITS);
		const current = form.unit.trim().toLowerCase();
		if (current && !set.has(current)) {
			return [current, ...STANDARD_UNITS];
		}
		return STANDARD_UNITS;
	}, [form.unit]);

	const builtGuidedSpecs = useMemo(() => {
		const payload: Record<string, string> = {};
		Object.entries(guidedSpecs).forEach(([key, value]) => {
			const trimmed = value.trim();
			if (trimmed) payload[key] = trimmed;
		});
		return payload;
	}, [guidedSpecs]);

	const filteredSubcategories = useMemo(() => {
		const currentSubcategoryId = String(form.subcategory_id || "");
		return subcategories.filter((row) => {
			const byServiceType =
				String(row.service_type_id || "") ===
				String(form.service_type_id || "");
			if (!byServiceType) return false;
			if (
				row.is_active === false &&
				String(row.id || "") !== currentSubcategoryId
			)
				return false;
			return true;
		});
	}, [form.service_type_id, form.subcategory_id, subcategories]);

	if (!open) return null;

	const validate = () => {
		const nextErrors: Record<string, string> = {};
		if (!form.service_type_id.trim()) nextErrors.service_type_id = "Requerido";
		if (!form.name.trim()) nextErrors.name = "Requerido";
		const minPrice =
			form.min_price.trim() === "" ? null : Number(form.min_price);
		const maxPrice =
			form.max_price.trim() === "" ? null : Number(form.max_price);
		if (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0))
			nextErrors.min_price = "Debe ser >= 0";
		if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))
			nextErrors.max_price = "Debe ser >= 0";
		if (minPrice !== null && maxPrice !== null && maxPrice < minPrice) {
			nextErrors.max_price = "Debe ser mayor o igual al mínimo";
		}
		if (form.specsMode === "json" && !parsedSpecs.valid) {
			nextErrors.specs = parsedSpecs.error || "JSON inválido";
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!validate()) return;

		setIsSaving(true);
		setGeneralError("");
		try {
			const payload: Record<string, unknown> = {
				service_type_id: form.service_type_id.trim(),
				subcategory_id: form.subcategory_id.trim() || null,
				name: form.name.trim(),
				description: form.description.trim() || null,
				unit: form.unit.trim() || null,
				assignment_mode: form.assignment_mode,
				min_price: form.min_price.trim() === "" ? null : Number(form.min_price),
				max_price: form.max_price.trim() === "" ? null : Number(form.max_price),
				specs:
					form.specsMode === "json"
						? parsedSpecs.value || {}
						: builtGuidedSpecs,
				is_active: form.is_active,
			};
			if (mode === "edit" && product?.id) payload.id = product.id;
			await onSubmit(payload);
			onClose();
		} catch (error) {
			setGeneralError(error instanceof Error ? error.message : String(error));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
			<div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-gray-200">
				<div className="mx-6 mt-6 px-6 py-5 border border-gray-100 rounded-xl flex items-center justify-between">
					<h2 className="text-xl font-semibold text-gray-900">
						{mode === "create"
							? "Crear producto catálogo DS"
							: "Editar producto catálogo DS"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-sm text-gray-500 hover:text-gray-700"
					>
						Cerrar
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="ds-service-type"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Tipo de servicio
							</label>
							<select
								id="ds-service-type"
								value={form.service_type_id}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										service_type_id: e.target.value,
										subcategory_id: "",
									}))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
							>
								<option value="">Seleccionar</option>
								{serviceTypes.map((type) => (
									<option key={String(type.id)} value={String(type.id)}>
										{type.category_name
											? `${String(type.category_name)} / ${String(type.name || type.id)}`
											: String(type.name || type.id)}
									</option>
								))}
							</select>
							{errors.service_type_id ? (
								<p className="text-xs text-red-600 mt-1">
									{errors.service_type_id}
								</p>
							) : null}
						</div>
						<div>
							<label
								htmlFor="ds-subcategory"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Subgrupo (opcional)
							</label>
							<select
								id="ds-subcategory"
								value={form.subcategory_id}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										subcategory_id: e.target.value,
									}))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
								disabled={!form.service_type_id}
							>
								<option value="">Sin subgrupo</option>
								{filteredSubcategories.map((subcategory) => (
									<option
										key={String(subcategory.id)}
										value={String(subcategory.id)}
									>
										{String(
											subcategory.name || subcategory.code || subcategory.id,
										)}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="ds-product-name"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Nombre
							</label>
							<input
								id="ds-product-name"
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
								placeholder="Nombre del producto"
							/>
							{errors.name ? (
								<p className="text-xs text-red-600 mt-1">{errors.name}</p>
							) : null}
						</div>
						<div>
							<label
								htmlFor="ds-product-unit"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Unidad
							</label>
							<select
								id="ds-product-unit"
								value={form.unit}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										unit: e.target.value.toLowerCase(),
									}))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
							>
								<option value="">Seleccionar unidad</option>
								{unitOptions.map((unit) => (
									<option key={unit} value={unit}>
										{unit}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label
								htmlFor="ds-assignment-mode"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Modo de asignación
							</label>
							<select
								id="ds-assignment-mode"
								value={form.assignment_mode}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										assignment_mode: e.target.value as
											| "required"
											| "optional"
											| "restricted",
									}))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
							>
								<option value="optional">Opcional (vendedor decide)</option>
								<option value="required">Obligatorio (siempre activo)</option>
								<option value="restricted">Restringido (control admin)</option>
							</select>
						</div>
						<div>
							<label
								htmlFor="ds-min-price"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Precio mínimo
							</label>
							<input
								id="ds-min-price"
								type="number"
								min="0"
								step="0.01"
								value={form.min_price}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, min_price: e.target.value }))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
								placeholder="Sin mínimo"
							/>
							{errors.min_price ? (
								<p className="text-xs text-red-600 mt-1">{errors.min_price}</p>
							) : null}
						</div>
						<div>
							<label
								htmlFor="ds-max-price"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Precio máximo
							</label>
							<input
								id="ds-max-price"
								type="number"
								min="0"
								step="0.01"
								value={form.max_price}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, max_price: e.target.value }))
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
								placeholder="Sin máximo"
							/>
							{errors.max_price ? (
								<p className="text-xs text-red-600 mt-1">{errors.max_price}</p>
							) : null}
						</div>
					</div>

					<div>
						<label
							htmlFor="ds-description"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Descripción
						</label>
						<textarea
							id="ds-description"
							value={form.description}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, description: e.target.value }))
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[80px]"
							placeholder="Descripción breve"
						/>
					</div>

					<div>
						<p className="block text-sm font-medium text-gray-700 mb-2">
							Specs
						</p>
						<div className="inline-flex rounded-md border border-gray-300 mb-3 overflow-hidden">
							<button
								type="button"
								onClick={() =>
									setForm((prev) => ({ ...prev, specsMode: "guided" }))
								}
								className={`px-3 py-1.5 text-sm ${form.specsMode === "guided" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
							>
								Asistido
							</button>
							<button
								type="button"
								onClick={() =>
									setForm((prev) => ({ ...prev, specsMode: "json" }))
								}
								className={`px-3 py-1.5 text-sm border-l border-gray-300 ${form.specsMode === "json" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
							>
								JSON avanzado
							</button>
						</div>

						{form.specsMode === "guided" ? (
							<div className="space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<input
										value={guidedSpecs.brand}
										onChange={(e) =>
											setGuidedSpecs((prev) => ({
												...prev,
												brand: e.target.value,
											}))
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
										placeholder="Marca"
									/>
									<input
										value={guidedSpecs.origin}
										onChange={(e) =>
											setGuidedSpecs((prev) => ({
												...prev,
												origin: e.target.value,
											}))
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
										placeholder="Origen / País"
									/>
									<input
										value={guidedSpecs.presentation}
										onChange={(e) =>
											setGuidedSpecs((prev) => ({
												...prev,
												presentation: e.target.value,
											}))
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
										placeholder="Presentación"
									/>
									<input
										value={guidedSpecs.size}
										onChange={(e) =>
											setGuidedSpecs((prev) => ({
												...prev,
												size: e.target.value,
											}))
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
										placeholder="Tamaño / Medida"
									/>
									<input
										value={guidedSpecs.color}
										onChange={(e) =>
											setGuidedSpecs((prev) => ({
												...prev,
												color: e.target.value,
											}))
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
										placeholder="Color"
									/>
									<input
										value={guidedSpecs.material}
										onChange={(e) =>
											setGuidedSpecs((prev) => ({
												...prev,
												material: e.target.value,
											}))
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
										placeholder="Material"
									/>
								</div>
								<textarea
									value={guidedSpecs.notes}
									onChange={(e) =>
										setGuidedSpecs((prev) => ({
											...prev,
											notes: e.target.value,
										}))
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[70px] text-sm"
									placeholder="Notas adicionales"
								/>
								<div>
									<p className="text-xs text-gray-600 mb-1">
										Vista previa JSON:
									</p>
									<pre className="bg-gray-50 border border-gray-200 rounded-md p-2 text-xs overflow-auto">
										{JSON.stringify(builtGuidedSpecs, null, 2)}
									</pre>
								</div>
							</div>
						) : (
							<>
								<textarea
									value={form.specsText}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, specsText: e.target.value }))
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[140px] font-mono text-sm"
									spellCheck={false}
								/>
								{!parsedSpecs.valid ? (
									<p className="text-xs text-red-600 mt-1">
										JSON inválido: {parsedSpecs.error}
									</p>
								) : (
									<p className="text-xs text-green-700 mt-1">JSON válido</p>
								)}
							</>
						)}
					</div>

					<div className="flex items-center gap-2">
						<input
							id="ds-product-active"
							type="checkbox"
							checked={form.is_active}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, is_active: e.target.checked }))
							}
						/>
						<label
							htmlFor="ds-product-active"
							className="text-sm text-gray-700"
						>
							Producto activo
						</label>
					</div>

					{generalError ? (
						<p className="text-sm text-red-700">{generalError}</p>
					) : null}

					<div className="flex items-center justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						>
							{isSaving
								? "Guardando..."
								: mode === "create"
									? "Crear"
									: "Guardar cambios"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
