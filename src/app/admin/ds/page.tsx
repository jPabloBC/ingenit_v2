"use client";

import { Box, Layers, Plus, RefreshCw, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DSCatalogFormModal from "@/components/ds/DSCatalogFormModal";
import DSCatalogTable from "@/components/ds/DSCatalogTable";
import DSSellerAssignmentsPanel from "@/components/ds/DSSellerAssignmentsPanel";
import DSServiceTypesManager from "@/components/ds/DSServiceTypesManager";
import {
	createCatalogProduct,
	createServiceType as createServiceTypeApi,
	createSubcategory as createSubcategoryApi,
	deleteCatalogProduct as deleteCatalogProductApi,
	getCatalogProducts,
	getDsMeta,
	getSellerAssignments,
	getSellerServiceTypeSelection,
	getServiceTypes,
	getSubcategories,
	saveSellerServiceTypeSelection,
	toggleCatalogProduct,
	toggleServiceType as toggleServiceTypeApi,
	toggleSubcategory as toggleSubcategoryApi,
	updateCatalogProduct,
	updateServiceType as updateServiceTypeApi,
	upsertSellerAssignment,
} from "@/lib/ds/adminApi";
import type {
	DSCatalogProduct,
	DSProductSubcategory,
	DSSeller,
	DSSellerCatalogAssignment,
	DSServiceType,
} from "@/lib/ds/types";
import { supabase } from "@/lib/supabaseClient";

type Tab = "categories" | "products" | "assignments";
type AssignmentDraft = {
	price: string;
	stock: string;
	is_active: boolean;
	custom_name: string;
	custom_description: string;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string") return error;
	if (error && typeof error === "object") {
		const obj = error as Record<string, unknown>;
		const nestedError =
			typeof obj.error === "string"
				? obj.error
				: obj.error && typeof obj.error === "object"
					? (obj.error as Record<string, unknown>)
					: null;
		if (nestedError && typeof nestedError.message === "string")
			return nestedError.message;
		if (typeof obj.message === "string") return obj.message;
		try {
			return JSON.stringify(error);
		} catch {
			return "Error inesperado";
		}
	}
	return "Error inesperado";
}

export default function DSAdminPage() {
	const router = useRouter();

	const [tab, setTab] = useState<Tab>("categories");
	const [serviceTypes, setServiceTypes] = useState<DSServiceType[]>([]);
	const [subcategories, setSubcategories] = useState<DSProductSubcategory[]>(
		[],
	);
	const [sellers, setSellers] = useState<DSSeller[]>([]);

	const [products, setProducts] = useState<DSCatalogProduct[]>([]);
	const [catalogTotal, setCatalogTotal] = useState(0);
	const [catalogPage, setCatalogPage] = useState(1);
	const [catalogPageSize] = useState(20);
	const [catalogSearch, setCatalogSearch] = useState("");
	const [catalogFilterServiceType, setCatalogFilterServiceType] = useState("");
	const [catalogFilterSubcategory, setCatalogFilterSubcategory] = useState("");
	const [catalogFilterActive, setCatalogFilterActive] = useState<
		"all" | "true" | "false"
	>("all");
	const [catalogLoading, setCatalogLoading] = useState(true);
	const [createForSellerId, setCreateForSellerId] = useState("");
	const [createForSellerPrice, setCreateForSellerPrice] = useState("0");
	const [createForSellerStock, setCreateForSellerStock] = useState("0");

	const [assignmentRows, setAssignmentRows] = useState<
		Array<{
			product: DSCatalogProduct;
			assignment: DSSellerCatalogAssignment | null;
		}>
	>([]);
	const [assignmentTotal, setAssignmentTotal] = useState(0);
	const [assignmentPage, setAssignmentPage] = useState(1);
	const [assignmentPageSize] = useState(20);
	const [assignmentSearch, setAssignmentSearch] = useState("");
	const [assignmentFilterServiceType, setAssignmentFilterServiceType] =
		useState("");
	const [assignmentLoading, setAssignmentLoading] = useState(false);
	const [selectedSellerId, setSelectedSellerId] = useState("");
	const [selectedServiceTypeIds, setSelectedServiceTypeIds] = useState<
		string[]
	>([]);
	const [selectedServiceTypesLoading, setSelectedServiceTypesLoading] =
		useState(false);
	const [selectedServiceTypesSaving, setSelectedServiceTypesSaving] =
		useState(false);

	const [modalOpen, setModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<DSCatalogProduct | null>(
		null,
	);
	const [actionMessage, setActionMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [hasAccess, setHasAccess] = useState(false);
	const [accessLoading, setAccessLoading] = useState(true);

	useEffect(() => {
		const verifyAccess = async () => {
			try {
				const { data } = await supabase.auth.getSession();
				if (!data.session?.user?.id) {
					router.push("/admin/login");
					return;
				}

				const { data: profile, error } = await supabase
					.from("rt_profiles")
					.select("role")
					.eq("id", data.session.user.id)
					.single();

				if (
					error ||
					!profile ||
					!["admin", "dev"].includes(String(profile.role))
				) {
					router.push("/admin/dashboard");
					return;
				}

				setHasAccess(true);
			} catch {
				router.push("/admin/dashboard");
			} finally {
				setAccessLoading(false);
			}
		};

		void verifyAccess();
	}, [router]);

	const totalCatalogPages = Math.max(
		1,
		Math.ceil(catalogTotal / catalogPageSize),
	);
	const totalAssignmentPages = Math.max(
		1,
		Math.ceil(assignmentTotal / assignmentPageSize),
	);

	const selectedSeller = useMemo(
		() =>
			sellers.find((seller) => seller.seller_id === selectedSellerId) || null,
		[sellers, selectedSellerId],
	);
	const serviceTypesByCategory = useMemo(() => {
		const map = new Map<string, DSServiceType[]>();
		for (const row of serviceTypes) {
			const categoryName = String(row.category_name || "Sin grupo");
			const current = map.get(categoryName) || [];
			current.push(row);
			map.set(categoryName, current);
		}
		return Array.from(map.entries()).sort(([a], [b]) =>
			a.localeCompare(b, "es", { sensitivity: "base" }),
		);
	}, [serviceTypes]);

	const loadMeta = useCallback(async () => {
		try {
			const payload = await getDsMeta();
			setServiceTypes(payload.serviceTypes || []);
			setSubcategories(payload.subcategories || []);
			setSellers(payload.sellers || []);
			if (payload.sellers?.length) {
				setSelectedSellerId((prev) => prev || payload.sellers[0].seller_id);
			}
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
		}
	}, []);

	const reloadServiceTypes = useCallback(async () => {
		const payload = await getServiceTypes();
		setServiceTypes(payload.rows || []);
	}, []);

	const reloadSubcategories = useCallback(async () => {
		const payload = await getSubcategories();
		setSubcategories(payload.rows || []);
	}, []);

	const loadCatalog = useCallback(async () => {
		setCatalogLoading(true);
		try {
			const payload = await getCatalogProducts({
				page: catalogPage,
				pageSize: catalogPageSize,
				search: catalogSearch,
				serviceTypeId: catalogFilterServiceType || undefined,
				subcategoryId: catalogFilterSubcategory || undefined,
				isActive: catalogFilterActive,
			});
			setProducts(payload.rows || []);
			setCatalogTotal(payload.total || 0);
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
			setProducts([]);
		} finally {
			setCatalogLoading(false);
		}
	}, [
		catalogFilterActive,
		catalogFilterServiceType,
		catalogFilterSubcategory,
		catalogPage,
		catalogPageSize,
		catalogSearch,
	]);

	const loadAssignments = useCallback(async () => {
		if (!selectedSellerId) return;
		setAssignmentLoading(true);
		try {
			const payload = await getSellerAssignments({
				sellerId: selectedSellerId,
				page: assignmentPage,
				pageSize: assignmentPageSize,
				search: assignmentSearch,
				serviceTypeId: assignmentFilterServiceType || undefined,
				onlySelectedServiceTypes: true,
			});
			setAssignmentRows(payload.rows || []);
			setAssignmentTotal(payload.total || 0);
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
			setAssignmentRows([]);
		} finally {
			setAssignmentLoading(false);
		}
	}, [
		assignmentFilterServiceType,
		assignmentPage,
		assignmentPageSize,
		assignmentSearch,
		selectedSellerId,
	]);

	const loadSellerServiceTypes = useCallback(async () => {
		if (!selectedSellerId) {
			setSelectedServiceTypeIds([]);
			return;
		}
		setSelectedServiceTypesLoading(true);
		try {
			const payload = await getSellerServiceTypeSelection(selectedSellerId);
			setSelectedServiceTypeIds(payload.serviceTypeIds || []);
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
			setSelectedServiceTypeIds([]);
		} finally {
			setSelectedServiceTypesLoading(false);
		}
	}, [selectedSellerId]);

	useEffect(() => {
		if (!hasAccess) return;
		void loadMeta();
	}, [hasAccess, loadMeta]);

	useEffect(() => {
		if (!hasAccess) return;
		void loadCatalog();
	}, [hasAccess, loadCatalog]);

	useEffect(() => {
		if (!hasAccess) return;
		if (tab !== "assignments") return;
		if (!selectedSellerId) return;
		void loadAssignments();
	}, [hasAccess, loadAssignments, selectedSellerId, tab]);

	useEffect(() => {
		if (!hasAccess) return;
		if (tab !== "assignments") return;
		if (!selectedSellerId) return;
		void loadSellerServiceTypes();
	}, [hasAccess, loadSellerServiceTypes, selectedSellerId, tab]);

	const handleCreate = () => {
		setEditingProduct(null);
		setModalOpen(true);
	};

	const handleEdit = (row: DSCatalogProduct) => {
		setEditingProduct(row);
		setModalOpen(true);
	};

	const handleSubmitProduct = async (payload: Record<string, unknown>) => {
		if (editingProduct) {
			await updateCatalogProduct(payload);
			setActionMessage({
				type: "success",
				text: "Producto actualizado correctamente",
			});
		} else {
			const created = await createCatalogProduct(payload);
			if (createForSellerId) {
				const initialPrice = Number(createForSellerPrice);
				const initialStock = Number(createForSellerStock);
				if (!Number.isFinite(initialPrice) || initialPrice < 0) {
					throw new Error("Precio inicial del vendedor inválido");
				}
				if (!Number.isFinite(initialStock) || initialStock < 0) {
					throw new Error("Stock inicial del vendedor inválido");
				}
				await upsertSellerAssignment({
					seller_id: createForSellerId,
					catalog_product_id: created.product.id,
					price: initialPrice,
					stock: initialStock,
					is_active: true,
					custom_name: null,
					custom_description: null,
				});
				setActionMessage({
					type: "success",
					text: "Producto creado y asignado al vendedor correctamente",
				});
			} else {
				setActionMessage({
					type: "success",
					text: "Producto creado correctamente",
				});
			}
		}
		await loadCatalog();
	};

	const handleToggle = async (row: DSCatalogProduct) => {
		const next = !row.is_active;
		const confirmed = window.confirm(
			next
				? `¿Activar el producto "${row.name}"?`
				: `¿Desactivar el producto "${row.name}"?`,
		);
		if (!confirmed) return;
		try {
			await toggleCatalogProduct(row.id, next);
			setActionMessage({
				type: "success",
				text: next ? "Producto activado" : "Producto desactivado",
			});
			await loadCatalog();
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
		}
	};

	const handleDelete = async (row: DSCatalogProduct) => {
		const confirmed = window.confirm(
			`¿Eliminar definitivamente "${row.name}"? Esta acción no se puede deshacer.`,
		);
		if (!confirmed) return;
		try {
			await deleteCatalogProductApi(row.id);
			setActionMessage({
				type: "success",
				text: "Producto eliminado correctamente",
			});
			await loadCatalog();
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
		}
	};

	const handleSaveAssignment = async (
		sellerId: string,
		productId: string,
		draft: AssignmentDraft,
	) => {
		const price = Number(draft.price);
		const stock = Number(draft.stock);
		if (!Number.isFinite(price) || price < 0)
			throw new Error("`price` debe ser >= 0");
		if (!Number.isFinite(stock) || stock < 0)
			throw new Error("`stock` debe ser >= 0");

		await upsertSellerAssignment({
			seller_id: sellerId,
			catalog_product_id: productId,
			price,
			stock,
			is_active: Boolean(draft.is_active),
			custom_name: draft.custom_name?.trim() || null,
			custom_description: draft.custom_description?.trim() || null,
		});
		await loadAssignments();
	};

	const handleBulkPrice = async (newPrice: number) => {
		if (!selectedSellerId) throw new Error("Selecciona un vendedor");
		await Promise.all(
			assignmentRows.map((row) =>
				upsertSellerAssignment({
					seller_id: selectedSellerId,
					catalog_product_id: row.product.id,
					price: newPrice,
					stock: Number(row.assignment?.stock ?? 0),
					is_active: row.assignment?.is_active ?? true,
					custom_name: row.assignment?.custom_name ?? null,
					custom_description: row.assignment?.custom_description ?? null,
				}),
			),
		);
		await loadAssignments();
	};

	const handleSaveSellerServiceTypes = async () => {
		if (!selectedSellerId) return;
		if (
			serviceTypes.length > 1 &&
			selectedServiceTypeIds.length === serviceTypes.length
		) {
			setActionMessage({
				type: "error",
				text: "No habilites todos los grupos al vendedor. Selecciona solo los rubros que realmente opera.",
			});
			return;
		}
		setSelectedServiceTypesSaving(true);
		try {
			await saveSellerServiceTypeSelection({
				seller_id: selectedSellerId,
				service_type_ids: selectedServiceTypeIds,
			});
			setActionMessage({
				type: "success",
				text: "Rubros/tipos del vendedor actualizados",
			});
			setAssignmentPage(1);
			await loadAssignments();
		} catch (error) {
			setActionMessage({ type: "error", text: getErrorMessage(error) });
		} finally {
			setSelectedServiceTypesSaving(false);
		}
	};

	const handleToggleServiceTypeSelection = (serviceTypeId: string) => {
		setSelectedServiceTypeIds((prev) =>
			prev.includes(serviceTypeId)
				? prev.filter((id) => id !== serviceTypeId)
				: [...prev, serviceTypeId],
		);
	};

	const handleCreateServiceType = async (payload: {
		name: string;
		slug: string;
		icon: string;
		category_code: string;
		category_name: string;
		sort_order: number;
		is_active: boolean;
	}) => {
		await createServiceTypeApi(payload);
		await reloadServiceTypes();
		setActionMessage({ type: "success", text: "Tipo de servicio creado" });
	};

	const handleUpdateServiceType = async (payload: {
		id: string;
		name: string;
		slug: string;
		icon: string;
		category_code: string;
		category_name: string;
		sort_order: number;
	}) => {
		await updateServiceTypeApi(payload);
		await reloadServiceTypes();
		setActionMessage({ type: "success", text: "Tipo de servicio actualizado" });
	};

	const handleToggleServiceType = async (id: string, isActive: boolean) => {
		await toggleServiceTypeApi(id, isActive);
		await reloadServiceTypes();
		await reloadSubcategories();
		setActionMessage({
			type: "success",
			text: isActive ? "Tipo activado" : "Tipo desactivado",
		});
	};

	const handleCreateSubcategory = async (payload: {
		service_type_id: string;
		name: string;
		code: string;
		sort_order: number;
		is_active: boolean;
	}) => {
		await createSubcategoryApi(payload);
		await reloadSubcategories();
		setActionMessage({ type: "success", text: "Subgrupo creado" });
	};

	const handleToggleSubcategory = async (id: string, isActive: boolean) => {
		await toggleSubcategoryApi(id, isActive);
		await reloadSubcategories();
		setActionMessage({
			type: "success",
			text: isActive ? "Subgrupo activado" : "Subgrupo desactivado",
		});
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{accessLoading ? (
				<div className="min-h-screen flex items-center justify-center">
					<div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
				</div>
			) : null}
			{!accessLoading && hasAccess ? (
				<>
					<div className="w-full max-w-none px-6 lg:px-12 py-6 sm:py-8">
						<div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
									<Store className="w-7 h-7 text-indigo-600" />
									Catálogo DS
								</h1>
								<p className="text-sm sm:text-base text-gray-600 mt-1">
									Flujo recomendado: 1) Categorías, 2) Productos, 3) Asignación
									por vendedor
								</p>
							</div>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => router.push("/admin/dashboard")}
									className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
								>
									Volver al Dashboard
								</button>
								<button
									type="button"
									onClick={() => {
										void loadMeta();
										if (tab === "products") void loadCatalog();
										if (tab === "assignments") void loadAssignments();
									}}
									className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-sm font-medium inline-flex items-center gap-2"
								>
									<RefreshCw className="w-4 h-4" />
									Refrescar
								</button>
							</div>
						</div>

						{actionMessage ? (
							<div
								className={`mb-4 px-4 py-3 rounded-md border text-sm ${
									actionMessage.type === "success"
										? "bg-green-50 border-green-200 text-green-800"
										: "bg-red-50 border-red-200 text-red-800"
								}`}
							>
								{actionMessage.text}
							</div>
						) : null}

						<div className="mb-4 flex items-center gap-2">
							<button
								type="button"
								onClick={() => setTab("categories")}
								className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
									tab === "categories"
										? "bg-indigo-600 text-white"
										: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
								}`}
							>
								<Box className="w-4 h-4" />
								1. Categorías
							</button>
							<button
								type="button"
								onClick={() => setTab("products")}
								className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
									tab === "products"
										? "bg-indigo-600 text-white"
										: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
								}`}
							>
								<Box className="w-4 h-4" />
								2. Productos
							</button>
							<button
								type="button"
								onClick={() => setTab("assignments")}
								className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
									tab === "assignments"
										? "bg-indigo-600 text-white"
										: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
								}`}
							>
								<Layers className="w-4 h-4" />
								3. Asignación
							</button>
						</div>

						{tab === "categories" ? (
							<DSServiceTypesManager
								embedded
								open
								onClose={() => undefined}
								rows={serviceTypes}
								subcategories={subcategories}
								onCreate={handleCreateServiceType}
								onUpdate={handleUpdateServiceType}
								onToggle={handleToggleServiceType}
								onCreateSubcategory={handleCreateSubcategory}
								onToggleSubcategory={handleToggleSubcategory}
							/>
						) : tab === "products" ? (
							<>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-4">
									<div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
										<div className="md:col-span-2">
											<label
												htmlFor="create-for-seller-id"
												className="block text-xs font-medium text-gray-600 mb-1"
											>
												Crear y asignar directamente a vendedor (opcional)
											</label>
											<select
												id="create-for-seller-id"
												value={createForSellerId}
												onChange={(e) => setCreateForSellerId(e.target.value)}
												className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
											>
												<option value="">
													Solo catálogo global (sin asignar)
												</option>
												{sellers.map((seller) => (
													<option
														key={seller.seller_id}
														value={seller.seller_id}
													>
														{seller.full_name}{" "}
														{seller.email ? `(${seller.email})` : ""}
													</option>
												))}
											</select>
										</div>
										<div>
											<label
												htmlFor="create-for-seller-price"
												className="block text-xs font-medium text-gray-600 mb-1"
											>
												Precio inicial vendedor
											</label>
											<input
												id="create-for-seller-price"
												type="number"
												min="0"
												step="0.01"
												value={createForSellerPrice}
												onChange={(e) =>
													setCreateForSellerPrice(e.target.value)
												}
												disabled={!createForSellerId}
												className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
											/>
										</div>
										<div>
											<label
												htmlFor="create-for-seller-stock"
												className="block text-xs font-medium text-gray-600 mb-1"
											>
												Stock inicial vendedor
											</label>
											<input
												id="create-for-seller-stock"
												type="number"
												min="0"
												step="1"
												value={createForSellerStock}
												onChange={(e) =>
													setCreateForSellerStock(e.target.value)
												}
												disabled={!createForSellerId}
												className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
										<input
											value={catalogSearch}
											onChange={(e) => {
												setCatalogPage(1);
												setCatalogSearch(e.target.value);
											}}
											placeholder="Buscar por nombre o SKU"
											className="border border-gray-300 rounded-md px-3 py-2 text-sm lg:col-span-2"
										/>
										<select
											value={catalogFilterServiceType}
											onChange={(e) => {
												setCatalogPage(1);
												setCatalogFilterServiceType(e.target.value);
												setCatalogFilterSubcategory("");
											}}
											className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										>
											<option value="">Todos los tipos</option>
											{serviceTypes.map((type) => (
												<option key={String(type.id)} value={String(type.id)}>
													{type.category_name
														? `${String(type.category_name)} / ${String(type.name || type.id)}`
														: String(type.name || type.id)}
												</option>
											))}
										</select>
										<select
											value={catalogFilterSubcategory}
											onChange={(e) => {
												setCatalogPage(1);
												setCatalogFilterSubcategory(e.target.value);
											}}
											className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										>
											<option value="">Todos los subgrupos</option>
											{subcategories
												.filter((subcategory) =>
													catalogFilterServiceType
														? String(subcategory.service_type_id) ===
															catalogFilterServiceType
														: true,
												)
												.map((subcategory) => (
													<option
														key={String(subcategory.id)}
														value={String(subcategory.id)}
													>
														{String(
															subcategory.name ||
																subcategory.code ||
																subcategory.id,
														)}
													</option>
												))}
										</select>
										<select
											value={catalogFilterActive}
											onChange={(e) => {
												setCatalogPage(1);
												setCatalogFilterActive(
													e.target.value as "all" | "true" | "false",
												);
											}}
											className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										>
											<option value="all">Todos</option>
											<option value="true">Activos</option>
											<option value="false">Inactivos</option>
										</select>
										<button
											type="button"
											onClick={handleCreate}
											className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 inline-flex items-center justify-center gap-2"
										>
											<Plus className="w-4 h-4" />
											Crear producto
										</button>
									</div>
								</div>

								<DSCatalogTable
									rows={products}
									serviceTypes={serviceTypes}
									subcategories={subcategories}
									onEdit={handleEdit}
									onToggleActive={handleToggle}
									onDelete={handleDelete}
									isLoading={catalogLoading}
								/>

								<div className="mt-4 flex items-center justify-between text-sm">
									<p className="text-gray-600">
										Mostrando {(catalogPage - 1) * catalogPageSize + 1} -{" "}
										{Math.min(catalogPage * catalogPageSize, catalogTotal)} de{" "}
										{catalogTotal}
									</p>
									<div className="inline-flex items-center gap-2">
										<button
											type="button"
											disabled={catalogPage <= 1}
											onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
											className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50"
										>
											Anterior
										</button>
										<span className="text-gray-700">
											Página {catalogPage} / {totalCatalogPages}
										</span>
										<button
											type="button"
											disabled={catalogPage >= totalCatalogPages}
											onClick={() =>
												setCatalogPage((p) =>
													Math.min(totalCatalogPages, p + 1),
												)
											}
											className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50"
										>
											Siguiente
										</button>
									</div>
								</div>
							</>
						) : (
							<>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-4">
									<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
										<div>
											<h2 className="text-base font-semibold text-gray-900">
												Rubros y tipos habilitados por vendedor
											</h2>
											<p className="text-sm text-gray-600 mt-1">
												Selecciona qué tipos puede gestionar el vendedor. El
												listado de abajo se filtra por esta selección.
											</p>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => setSelectedServiceTypeIds([])}
												className="px-3 py-2 rounded-md bg-white text-gray-700 border border-gray-300 text-sm hover:bg-gray-50"
											>
												Limpiar
											</button>
											<button
												type="button"
												disabled={
													!selectedSellerId || selectedServiceTypesSaving
												}
												onClick={() => void handleSaveSellerServiceTypes()}
												className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
											>
												{selectedServiceTypesSaving
													? "Guardando..."
													: "Guardar selección"}
											</button>
										</div>
									</div>

									<div className="mt-4">
										<p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
											Recomendación: habilita solo los rubros/tipos que el
											vendedor realmente ofrece.
										</p>
										{!selectedSellerId ? (
											<p className="text-sm text-gray-600">
												Selecciona un vendedor para habilitar rubros/tipos.
											</p>
										) : selectedServiceTypesLoading ? (
											<p className="text-sm text-gray-600">
												Cargando tipos habilitados...
											</p>
										) : serviceTypesByCategory.length === 0 ? (
											<p className="text-sm text-gray-600">
												No hay tipos de servicio cargados.
											</p>
										) : (
											<div className="space-y-3">
												{serviceTypesByCategory.map(([categoryName, rows]) => (
													<div
														key={categoryName}
														className="border border-gray-200 rounded-lg p-3"
													>
														<p className="text-sm font-semibold text-gray-900 mb-2">
															{categoryName}
														</p>
														<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
															{rows.map((row) => {
																const id = String(row.id);
																const checked =
																	selectedServiceTypeIds.includes(id);
																return (
																	<label
																		key={id}
																		className="inline-flex items-center gap-2 text-sm text-gray-700"
																	>
																		<input
																			type="checkbox"
																			checked={checked}
																			onChange={() =>
																				handleToggleServiceTypeSelection(id)
																			}
																		/>
																		<span>
																			{String(row.name || row.slug || id)}
																		</span>
																	</label>
																);
															})}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>

								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-4">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
										<input
											value={assignmentSearch}
											onChange={(e) => {
												setAssignmentPage(1);
												setAssignmentSearch(e.target.value);
											}}
											placeholder="Buscar producto por nombre o SKU"
											className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										/>
										<select
											value={assignmentFilterServiceType}
											onChange={(e) => {
												setAssignmentPage(1);
												setAssignmentFilterServiceType(e.target.value);
											}}
											className="border border-gray-300 rounded-md px-3 py-2 text-sm"
										>
											<option value="">Todos los tipos</option>
											{serviceTypes.map((type) => (
												<option key={String(type.id)} value={String(type.id)}>
													{type.category_name
														? `${String(type.category_name)} / ${String(type.name || type.id)}`
														: String(type.name || type.id)}
												</option>
											))}
										</select>
										<div className="text-sm text-gray-600 self-center">
											{selectedSeller
												? `Vendedor: ${selectedSeller.full_name}`
												: "Selecciona vendedor"}
										</div>
									</div>
								</div>

								<DSSellerAssignmentsPanel
									sellers={sellers}
									serviceTypes={serviceTypes}
									selectedSellerId={selectedSellerId}
									onSelectSeller={(sellerId) => {
										setSelectedSellerId(sellerId);
										setAssignmentPage(1);
									}}
									rows={assignmentRows}
									isLoading={assignmentLoading}
									onSaveRow={handleSaveAssignment}
									onBulkPrice={handleBulkPrice}
								/>

								<div className="mt-4 flex items-center justify-between text-sm">
									<p className="text-gray-600">
										Mostrando {(assignmentPage - 1) * assignmentPageSize + 1} -{" "}
										{Math.min(
											assignmentPage * assignmentPageSize,
											assignmentTotal,
										)}{" "}
										de {assignmentTotal}
									</p>
									<div className="inline-flex items-center gap-2">
										<button
											type="button"
											disabled={assignmentPage <= 1}
											onClick={() =>
												setAssignmentPage((p) => Math.max(1, p - 1))
											}
											className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50"
										>
											Anterior
										</button>
										<span className="text-gray-700">
											Página {assignmentPage} / {totalAssignmentPages}
										</span>
										<button
											type="button"
											disabled={assignmentPage >= totalAssignmentPages}
											onClick={() =>
												setAssignmentPage((p) =>
													Math.min(totalAssignmentPages, p + 1),
												)
											}
											className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50"
										>
											Siguiente
										</button>
									</div>
								</div>
							</>
						)}
					</div>

					<DSCatalogFormModal
						open={modalOpen}
						mode={editingProduct ? "edit" : "create"}
						product={editingProduct}
						serviceTypes={serviceTypes}
						subcategories={subcategories}
						onClose={() => setModalOpen(false)}
						onSubmit={handleSubmitProduct}
					/>
				</>
			) : null}
		</div>
	);
}
