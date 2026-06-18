import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const DS_ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

export type DSCatalogProductRow = {
	id: string;
	service_type_id: string;
	subcategory_id: string | null;
	sku: string;
	name: string;
	description: string | null;
	unit: string | null;
	specs: Record<string, unknown> | null;
	assignment_mode: "required" | "optional" | "restricted" | null;
	min_price: number | null;
	max_price: number | null;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};

export type DSSellerAssignmentRow = {
	id?: string;
	seller_id: string;
	catalog_product_id: string;
	price: number;
	stock: number;
	is_active: boolean;
	custom_name?: string | null;
	custom_description?: string | null;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};

function adminClient() {
	return createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
		auth: { persistSession: false },
	});
}

function normalizeSpecs(value: unknown): Record<string, unknown> | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "string") {
		const parsed = JSON.parse(value);
		if (
			parsed === null ||
			typeof parsed !== "object" ||
			Array.isArray(parsed)
		) {
			throw new Error("`specs` debe ser un objeto JSON");
		}
		return parsed as Record<string, unknown>;
	}
	if (typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error("`specs` debe ser un objeto JSON");
}

function toNumber(value: unknown, fieldName: string): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n))
		throw new Error(`\`${fieldName}\` debe ser numérico`);
	return n;
}

function toNullableNumber(value: unknown, fieldName: string): number | null {
	if (value === null || value === undefined || value === "") return null;
	return toNumber(value, fieldName);
}

function normalizeAssignmentMode(
	value: unknown,
): "required" | "optional" | "restricted" {
	const mode = String(value || "optional")
		.trim()
		.toLowerCase();
	if (mode === "required" || mode === "optional" || mode === "restricted")
		return mode;
	throw new Error(
		"`assignment_mode` inválido. Usa: required | optional | restricted",
	);
}

function readObjectString(
	value: Record<string, unknown> | null | undefined,
	key: string,
): string {
	if (!value) return "";
	const raw = value[key];
	return typeof raw === "string" ? raw : "";
}

function slugify(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

function normalizeCategoryCode(value: unknown): string {
	const raw = String(value || "")
		.trim()
		.toLowerCase();
	if (!raw) return "";
	return raw
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 40);
}

export function ensureDsAdminConfigured() {
	if (!DS_ADMIN_AVAILABLE) throw new Error("Admin DS API no configurada");
}

export async function listCatalogProducts(params: {
	page: number;
	pageSize: number;
	search?: string;
	serviceTypeId?: string;
	subcategoryId?: string;
	isActive?: boolean;
}) {
	const client = adminClient();
	const page = Math.max(1, params.page || 1);
	const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	let query = client
		.from("ds_catalog_products")
		.select("*", { count: "exact" });

	if (params.serviceTypeId)
		query = query.eq("service_type_id", params.serviceTypeId);
	if (params.subcategoryId)
		query = query.eq("subcategory_id", params.subcategoryId);
	if (typeof params.isActive === "boolean")
		query = query.eq("is_active", params.isActive);
	if (params.search) {
		const q = params.search.replace(/[%]/g, "").trim();
		if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
	}

	let result = await query
		.order("created_at", { ascending: false })
		.range(from, to);
	if (result.error) {
		result = await query
			.order("updated_at", { ascending: false })
			.range(from, to);
	}
	if (result.error) throw result.error;

	return {
		rows: (result.data || []) as DSCatalogProductRow[],
		total: result.count || 0,
		page,
		pageSize,
	};
}

export async function createCatalogProduct(raw: Record<string, unknown>) {
	const client = adminClient();

	const generateNumericSku = (length: number) => {
		let sku = "";
		for (let i = 0; i < length; i += 1) {
			sku += Math.floor(Math.random() * 10).toString();
		}
		return sku;
	};

	const buildUniqueSku = async () => {
		for (let i = 0; i < 12; i += 1) {
			const candidate = generateNumericSku(10);
			const { data, error } = await client
				.from("ds_catalog_products")
				.select("id")
				.eq("sku", candidate)
				.limit(1);
			if (error) throw error;
			if (!data || data.length === 0) return candidate;
		}
		throw new Error("No fue posible generar un SKU único automáticamente");
	};

	const payload = {
		service_type_id: String(raw.service_type_id || "").trim(),
		subcategory_id: raw.subcategory_id
			? String(raw.subcategory_id || "").trim()
			: null,
		sku: await buildUniqueSku(),
		name: String(raw.name || "").trim(),
		description: raw.description ? String(raw.description) : null,
		unit: raw.unit ? String(raw.unit).trim() : null,
		specs: normalizeSpecs(raw.specs),
		assignment_mode: normalizeAssignmentMode(raw.assignment_mode),
		min_price: toNullableNumber(raw.min_price, "min_price"),
		max_price: toNullableNumber(raw.max_price, "max_price"),
		is_active: raw.is_active === undefined ? true : Boolean(raw.is_active),
	};

	if (!payload.service_type_id)
		throw new Error("`service_type_id` es requerido");
	if (payload.subcategory_id) {
		const { data: subcategory, error: subcategoryError } = await client
			.from("ds_product_subcategories")
			.select("id,service_type_id,is_active")
			.eq("id", payload.subcategory_id)
			.single();
		if (subcategoryError) throw subcategoryError;
		const serviceTypeId = String(
			(subcategory as Record<string, unknown>)?.service_type_id || "",
		);
		if (serviceTypeId !== payload.service_type_id) {
			throw new Error(
				"La subcategoría no pertenece al tipo de servicio seleccionado",
			);
		}
	}
	if (!payload.name) throw new Error("`name` es requerido");
	if (payload.min_price !== null && payload.min_price < 0)
		throw new Error("`min_price` debe ser >= 0");
	if (payload.max_price !== null && payload.max_price < 0)
		throw new Error("`max_price` debe ser >= 0");
	if (
		payload.min_price !== null &&
		payload.max_price !== null &&
		payload.max_price < payload.min_price
	) {
		throw new Error("`max_price` debe ser mayor o igual a `min_price`");
	}
	const { data, error } = await client
		.from("ds_catalog_products")
		.insert(payload)
		.select("*")
		.single();
	if (error) throw error;
	return data as DSCatalogProductRow;
}

export async function updateCatalogProduct(raw: Record<string, unknown>) {
	const id = String(raw.id || "").trim();
	if (!id) throw new Error("`id` es requerido");
	const client = adminClient();

	const updates: Record<string, unknown> = {};
	if (raw.service_type_id !== undefined)
		updates.service_type_id = String(raw.service_type_id || "").trim();
	if (raw.subcategory_id !== undefined) {
		updates.subcategory_id = raw.subcategory_id
			? String(raw.subcategory_id || "").trim()
			: null;
	}
	if (raw.name !== undefined) updates.name = String(raw.name || "").trim();
	if (raw.description !== undefined)
		updates.description = raw.description ? String(raw.description) : null;
	if (raw.unit !== undefined)
		updates.unit = raw.unit ? String(raw.unit).trim() : null;
	if (raw.specs !== undefined) updates.specs = normalizeSpecs(raw.specs);
	if (raw.assignment_mode !== undefined)
		updates.assignment_mode = normalizeAssignmentMode(raw.assignment_mode);
	if (raw.min_price !== undefined)
		updates.min_price = toNullableNumber(raw.min_price, "min_price");
	if (raw.max_price !== undefined)
		updates.max_price = toNullableNumber(raw.max_price, "max_price");
	if (raw.is_active !== undefined) updates.is_active = Boolean(raw.is_active);
	updates.updated_at = new Date().toISOString();

	if (updates.name !== undefined && !String(updates.name))
		throw new Error("`name` no puede estar vacío");
	if (updates.subcategory_id !== undefined && updates.subcategory_id) {
		const serviceTypeFromUpdate =
			updates.service_type_id !== undefined
				? String(updates.service_type_id || "")
				: null;
		let effectiveServiceTypeId = serviceTypeFromUpdate;
		if (!effectiveServiceTypeId) {
			const { data: currentServiceTypeRow, error: currentServiceTypeError } =
				await client
					.from("ds_catalog_products")
					.select("service_type_id")
					.eq("id", id)
					.single();
			if (currentServiceTypeError) throw currentServiceTypeError;
			effectiveServiceTypeId = String(
				(currentServiceTypeRow as Record<string, unknown>)?.service_type_id ||
					"",
			);
		}
		const { data: subcategory, error: subcategoryError } = await client
			.from("ds_product_subcategories")
			.select("id,service_type_id,is_active")
			.eq("id", updates.subcategory_id as string)
			.single();
		if (subcategoryError) throw subcategoryError;
		const subServiceTypeId = String(
			(subcategory as Record<string, unknown>)?.service_type_id || "",
		);
		if (subServiceTypeId !== effectiveServiceTypeId) {
			throw new Error(
				"La subcategoría no pertenece al tipo de servicio seleccionado",
			);
		}
	}
	if (
		updates.min_price !== undefined &&
		updates.min_price !== null &&
		Number(updates.min_price) < 0
	) {
		throw new Error("`min_price` debe ser >= 0");
	}
	if (
		updates.max_price !== undefined &&
		updates.max_price !== null &&
		Number(updates.max_price) < 0
	) {
		throw new Error("`max_price` debe ser >= 0");
	}
	let currentMin: number | null = null;
	let currentMax: number | null = null;
	if (updates.min_price !== undefined || updates.max_price !== undefined) {
		const { data: currentRow, error: currentError } = await client
			.from("ds_catalog_products")
			.select("min_price,max_price")
			.eq("id", id)
			.single();
		if (currentError) throw currentError;
		currentMin = toNullableNumber(
			(currentRow as Record<string, unknown>)?.min_price,
			"min_price",
		);
		currentMax = toNullableNumber(
			(currentRow as Record<string, unknown>)?.max_price,
			"max_price",
		);
	}
	const nextMin =
		updates.min_price !== undefined
			? (updates.min_price as number | null)
			: currentMin;
	const nextMax =
		updates.max_price !== undefined
			? (updates.max_price as number | null)
			: currentMax;
	if (nextMin !== null && nextMax !== null && nextMax < nextMin) {
		throw new Error("`max_price` debe ser mayor o igual a `min_price`");
	}
	const { data, error } = await client
		.from("ds_catalog_products")
		.update(updates)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data as DSCatalogProductRow;
}

export async function setCatalogProductActive(id: string, isActive: boolean) {
	const client = adminClient();
	const { data, error } = await client
		.from("ds_catalog_products")
		.update({
			is_active: isActive,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data as DSCatalogProductRow;
}

export async function deleteCatalogProduct(id: string) {
	const client = adminClient();
	const { data, error } = await client
		.from("ds_catalog_products")
		.delete()
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data as DSCatalogProductRow;
}

export async function listServiceTypes() {
	const client = adminClient();
	let result = await client
		.from("ds_service_types")
		.select("*")
		.order("sort_order", { ascending: true, nullsFirst: false })
		.order("category_name", { ascending: true, nullsFirst: false })
		.order("name", { ascending: true });
	if (result.error) {
		result = await client.from("ds_service_types").select("*");
	}
	if (result.error) throw result.error;
	return result.data || [];
}

export async function listProductSubcategories(params?: {
	serviceTypeId?: string;
	onlyActive?: boolean;
}) {
	const client = adminClient();
	let query = client
		.from("ds_product_subcategories")
		.select("*")
		.order("sort_order", { ascending: true, nullsFirst: false })
		.order("name", { ascending: true });
	if (params?.serviceTypeId)
		query = query.eq("service_type_id", params.serviceTypeId);
	if (params?.onlyActive) query = query.eq("is_active", true);
	const { data, error } = await query;
	if (error) {
		const msg = String(error.message || "");
		if (msg.includes("does not exist") || msg.includes("schema cache"))
			return [];
		throw error;
	}
	return data || [];
}

export async function createProductSubcategory(raw: Record<string, unknown>) {
	const service_type_id = String(raw.service_type_id || "").trim();
	const name = String(raw.name || "").trim();
	const code = slugify(String(raw.code || name || "")).replace(/-/g, "_");
	const sort_order =
		raw.sort_order === undefined ||
		raw.sort_order === null ||
		raw.sort_order === ""
			? 100
			: Math.max(0, Math.floor(toNumber(raw.sort_order, "sort_order")));
	const is_active = raw.is_active === undefined ? true : Boolean(raw.is_active);

	if (!service_type_id) throw new Error("`service_type_id` es requerido");
	if (!name) throw new Error("`name` es requerido");
	if (!code) throw new Error("`code` es requerido");

	const client = adminClient();
	const { data, error } = await client
		.from("ds_product_subcategories")
		.insert({ service_type_id, name, code, sort_order, is_active })
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function updateProductSubcategory(raw: Record<string, unknown>) {
	const id = String(raw.id || "").trim();
	if (!id) throw new Error("`id` es requerido");
	const updates: Record<string, unknown> = {};
	if (raw.service_type_id !== undefined)
		updates.service_type_id = String(raw.service_type_id || "").trim();
	if (raw.name !== undefined) updates.name = String(raw.name || "").trim();
	if (raw.code !== undefined)
		updates.code = slugify(String(raw.code || "")).replace(/-/g, "_");
	if (raw.sort_order !== undefined) {
		updates.sort_order =
			raw.sort_order === null || raw.sort_order === ""
				? null
				: Math.max(0, Math.floor(toNumber(raw.sort_order, "sort_order")));
	}
	if (raw.is_active !== undefined) updates.is_active = Boolean(raw.is_active);
	updates.updated_at = new Date().toISOString();
	if (updates.name !== undefined && !String(updates.name))
		throw new Error("`name` no puede estar vacío");
	if (updates.code !== undefined && !String(updates.code))
		throw new Error("`code` no puede estar vacío");
	if (
		updates.service_type_id !== undefined &&
		!String(updates.service_type_id)
	) {
		throw new Error("`service_type_id` no puede estar vacío");
	}

	const client = adminClient();
	const { data, error } = await client
		.from("ds_product_subcategories")
		.update(updates)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function setProductSubcategoryActive(
	id: string,
	isActive: boolean,
) {
	const client = adminClient();
	const { data, error } = await client
		.from("ds_product_subcategories")
		.update({ is_active: isActive, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function createServiceType(raw: Record<string, unknown>) {
	const name = String(raw.name || "").trim();
	const slug = slugify(String(raw.slug || name || ""));
	const icon = raw.icon ? String(raw.icon).trim() : null;
	const category_code = normalizeCategoryCode(raw.category_code);
	const category_name = raw.category_name
		? String(raw.category_name).trim()
		: null;
	const sort_order =
		raw.sort_order === undefined ||
		raw.sort_order === null ||
		raw.sort_order === ""
			? 100
			: Math.max(0, Math.floor(toNumber(raw.sort_order, "sort_order")));
	const is_active = raw.is_active === undefined ? true : Boolean(raw.is_active);
	if (!name) throw new Error("`name` es requerido");
	if (!slug) throw new Error("`slug` es requerido");
	if (!category_code) throw new Error("`category_code` es requerido");
	if (!category_name) throw new Error("`category_name` es requerido");

	const client = adminClient();
	const { data, error } = await client
		.from("ds_service_types")
		.insert({
			name,
			slug,
			icon,
			category_code,
			category_name,
			sort_order,
			is_active,
		})
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function updateServiceType(raw: Record<string, unknown>) {
	const id = String(raw.id || "").trim();
	if (!id) throw new Error("`id` es requerido");

	const updates: Record<string, unknown> = {};
	if (raw.name !== undefined) updates.name = String(raw.name || "").trim();
	if (raw.slug !== undefined) updates.slug = slugify(String(raw.slug || ""));
	if (raw.icon !== undefined)
		updates.icon = raw.icon ? String(raw.icon).trim() : null;
	if (raw.category_code !== undefined)
		updates.category_code = normalizeCategoryCode(raw.category_code);
	if (raw.category_name !== undefined)
		updates.category_name = raw.category_name
			? String(raw.category_name).trim()
			: null;
	if (raw.sort_order !== undefined) {
		updates.sort_order =
			raw.sort_order === null || raw.sort_order === ""
				? null
				: Math.max(0, Math.floor(toNumber(raw.sort_order, "sort_order")));
	}
	if (raw.is_active !== undefined) updates.is_active = Boolean(raw.is_active);
	updates.updated_at = new Date().toISOString();

	if (updates.name !== undefined && !String(updates.name))
		throw new Error("`name` no puede estar vacío");
	if (updates.slug !== undefined && !String(updates.slug))
		throw new Error("`slug` no puede estar vacío");
	if (updates.category_code !== undefined && !String(updates.category_code)) {
		throw new Error("`category_code` no puede estar vacío");
	}
	if (updates.category_name !== undefined && !String(updates.category_name)) {
		throw new Error("`category_name` no puede estar vacío");
	}

	const client = adminClient();
	const { data, error } = await client
		.from("ds_service_types")
		.update(updates)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function setServiceTypeActive(id: string, isActive: boolean) {
	const client = adminClient();
	const { data, error } = await client
		.from("ds_service_types")
		.update({
			is_active: isActive,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function listSellers() {
	const client = adminClient();
	const sellersResult = await client
		.from("ds_seller_profiles")
		.select("*")
		.limit(2000);
	if (sellersResult.error) throw sellersResult.error;

	const profilesResult = await client
		.from("ds_profiles")
		.select("*")
		.limit(5000);
	if (profilesResult.error) throw profilesResult.error;

	const profilesById = new Map<string, Record<string, unknown>>();
	for (const profile of profilesResult.data || []) {
		const p = profile as Record<string, unknown>;
		const id = String(p.id || "");
		if (id) profilesById.set(id, profile as Record<string, unknown>);
	}

	const sellerRows = (sellersResult.data || []).map((seller) => {
		const s = seller as Record<string, unknown>;
		const profileId = String(
			s.profile_id || s.user_id || s.seller_id || s.id || "",
		);
		const profile = profilesById.get(profileId);
		return {
			seller_id: String(s.id || profileId),
			profile_id: profileId || null,
			full_name:
				readObjectString(profile, "full_name") ||
				readObjectString(profile, "name") ||
				String(s.name || "Sin nombre"),
			email: readObjectString(profile, "email") || String(s.email || ""),
			is_active: s.is_active === undefined ? true : Boolean(s.is_active),
			seller_profile: s,
			profile: profile || null,
		};
	});

	sellerRows.sort((a, b) =>
		a.full_name.localeCompare(b.full_name, "es", { sensitivity: "base" }),
	);
	return sellerRows;
}

export async function listSellerAssignments(params: {
	sellerId: string;
	search?: string;
	serviceTypeId?: string;
	onlyActiveCatalog?: boolean;
	onlySelectedServiceTypes?: boolean;
	page: number;
	pageSize: number;
}) {
	const client = adminClient();
	const selectedTypeIds = await listSellerSelectedServiceTypeIds(
		params.sellerId,
	);

	if (
		params.onlySelectedServiceTypes !== false &&
		!params.serviceTypeId &&
		selectedTypeIds.length === 0
	) {
		return {
			rows: [],
			total: 0,
			page: Math.max(1, params.page || 1),
			pageSize: Math.min(100, Math.max(1, params.pageSize || 20)),
		};
	}

	const effectiveServiceTypeId =
		params.serviceTypeId ||
		(params.onlySelectedServiceTypes !== false && selectedTypeIds.length === 1
			? selectedTypeIds[0]
			: undefined);

	const catalog = await listCatalogProducts({
		page: params.page,
		pageSize: params.pageSize,
		search: params.search,
		serviceTypeId: effectiveServiceTypeId,
		isActive: params.onlyActiveCatalog ? true : undefined,
	});

	const filteredCatalogRows =
		params.onlySelectedServiceTypes !== false && !params.serviceTypeId
			? catalog.rows.filter((row) =>
					selectedTypeIds.includes(String(row.service_type_id)),
				)
			: catalog.rows;

	const productIds = filteredCatalogRows.map((row) => row.id);
	let assignments: DSSellerAssignmentRow[] = [];

	if (productIds.length > 0) {
		const { data, error } = await client
			.from("ds_seller_catalog_products")
			.select("*")
			.eq("seller_id", params.sellerId)
			.in("catalog_product_id", productIds);
		if (error) throw error;
		assignments = (data || []) as DSSellerAssignmentRow[];
	}

	const byProduct = new Map(assignments.map((a) => [a.catalog_product_id, a]));

	const rows = filteredCatalogRows.map((product) => {
		const assignment = byProduct.get(product.id);
		return {
			product,
			assignment: assignment || null,
		};
	});

	return {
		rows,
		total: catalog.total,
		page: catalog.page,
		pageSize: catalog.pageSize,
	};
}

export async function upsertSellerAssignment(raw: Record<string, unknown>) {
	const sellerId = String(raw.seller_id || "").trim();
	const catalogProductId = String(raw.catalog_product_id || "").trim();
	if (!sellerId) throw new Error("`seller_id` es requerido");
	if (!catalogProductId) throw new Error("`catalog_product_id` es requerido");

	const price = toNumber(raw.price ?? 0, "price");
	const stock = toNumber(raw.stock ?? 0, "stock");
	if (price < 0) throw new Error("`price` debe ser >= 0");
	if (stock < 0) throw new Error("`stock` debe ser >= 0");

	const client = adminClient();
	const { data: productData, error: productError } = await client
		.from("ds_catalog_products")
		.select("id,name,min_price,max_price,assignment_mode")
		.eq("id", catalogProductId)
		.single();
	if (productError) throw productError;
	const product = (productData || {}) as Record<string, unknown>;
	const minPrice = toNullableNumber(product.min_price, "min_price");
	const maxPrice = toNullableNumber(product.max_price, "max_price");
	const assignmentMode = normalizeAssignmentMode(
		product.assignment_mode || "optional",
	);
	if (minPrice !== null && price < minPrice) {
		throw new Error(`El precio no puede ser menor al mínimo (${minPrice})`);
	}
	if (maxPrice !== null && price > maxPrice) {
		throw new Error(`El precio no puede ser mayor al máximo (${maxPrice})`);
	}

	const payload = {
		seller_id: sellerId,
		catalog_product_id: catalogProductId,
		price,
		stock,
		is_active:
			assignmentMode === "required"
				? true
				: raw.is_active === undefined
					? true
					: Boolean(raw.is_active),
		custom_name: raw.custom_name ? String(raw.custom_name) : null,
		custom_description: raw.custom_description
			? String(raw.custom_description)
			: null,
		updated_at: new Date().toISOString(),
	};

	const { data, error } = await client
		.from("ds_seller_catalog_products")
		.upsert(payload, { onConflict: "seller_id,catalog_product_id" })
		.select("*")
		.single();

	if (error) throw error;
	return data as DSSellerAssignmentRow;
}

export async function listSellerSelectedServiceTypeIds(sellerId: string) {
	const client = adminClient();
	const { data, error } = await client
		.from("ds_seller_service_types")
		.select("service_type_id,is_active")
		.eq("seller_id", sellerId)
		.eq("is_active", true);
	if (error) {
		const msg = String(error.message || "");
		if (msg.includes("does not exist") || msg.includes("schema cache"))
			return [];
		throw error;
	}
	return (data || [])
		.map((row) =>
			String((row as Record<string, unknown>).service_type_id || ""),
		)
		.filter(Boolean);
}

export async function replaceSellerServiceTypes(
	sellerId: string,
	serviceTypeIds: string[],
) {
	const client = adminClient();
	const sanitized = Array.from(
		new Set(
			serviceTypeIds.map((id) => String(id || "").trim()).filter(Boolean),
		),
	);

	const { error: deleteError } = await client
		.from("ds_seller_service_types")
		.delete()
		.eq("seller_id", sellerId);
	if (deleteError) throw deleteError;

	if (sanitized.length === 0) return [];

	const rows = sanitized.map((serviceTypeId) => ({
		seller_id: sellerId,
		service_type_id: serviceTypeId,
		is_active: true,
		updated_at: new Date().toISOString(),
	}));

	const { data, error } = await client
		.from("ds_seller_service_types")
		.insert(rows)
		.select("*");
	if (error) throw error;
	return data || [];
}
