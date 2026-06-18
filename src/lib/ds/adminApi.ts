import type {
	DSCatalogProduct,
	DSProductSubcategory,
	DSSeller,
	DSSellerCatalogAssignment,
	DSServiceType,
} from "@/lib/ds/types";

async function parseJson<T>(res: Response): Promise<T> {
	const payload: unknown = await res.json().catch(() => ({}));
	if (!res.ok) {
		const errorMessage =
			typeof payload === "object" &&
			payload !== null &&
			"error" in payload &&
			typeof (payload as { error?: unknown }).error === "string"
				? (payload as { error: string }).error
				: `HTTP ${res.status}`;
		throw new Error(errorMessage);
	}
	return payload as T;
}

export async function getDsMeta() {
	const res = await fetch("/api/admin/ds/meta", { cache: "no-store" });
	return parseJson<{
		serviceTypes: DSServiceType[];
		subcategories: DSProductSubcategory[];
		sellers: DSSeller[];
	}>(res);
}

export async function getServiceTypes() {
	const res = await fetch("/api/admin/ds/service-types", { cache: "no-store" });
	return parseJson<{ rows: DSServiceType[] }>(res);
}

export async function createServiceType(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/service-types", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ row: DSServiceType }>(res);
}

export async function updateServiceType(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/service-types", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ row: DSServiceType }>(res);
}

export async function toggleServiceType(id: string, isActive: boolean) {
	const res = await fetch("/api/admin/ds/service-types", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, is_active: isActive }),
	});
	return parseJson<{ row: DSServiceType }>(res);
}

export async function getCatalogProducts(params: {
	page: number;
	pageSize: number;
	search?: string;
	serviceTypeId?: string;
	subcategoryId?: string;
	isActive?: string;
}) {
	const query = new URLSearchParams();
	query.set("page", String(params.page));
	query.set("pageSize", String(params.pageSize));
	if (params.search) query.set("search", params.search);
	if (params.serviceTypeId) query.set("service_type_id", params.serviceTypeId);
	if (params.subcategoryId) query.set("subcategory_id", params.subcategoryId);
	if (params.isActive && params.isActive !== "all")
		query.set("is_active", params.isActive);

	const res = await fetch(`/api/admin/ds/catalog?${query.toString()}`, {
		cache: "no-store",
	});
	return parseJson<{
		rows: DSCatalogProduct[];
		total: number;
		page: number;
		pageSize: number;
	}>(res);
}

export async function createCatalogProduct(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/catalog", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ product: DSCatalogProduct }>(res);
}

export async function updateCatalogProduct(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/catalog", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ product: DSCatalogProduct }>(res);
}

export async function toggleCatalogProduct(id: string, isActive: boolean) {
	const res = await fetch("/api/admin/ds/catalog", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, is_active: isActive }),
	});
	return parseJson<{ product: DSCatalogProduct }>(res);
}

export async function deleteCatalogProduct(id: string) {
	const res = await fetch(
		`/api/admin/ds/catalog?id=${encodeURIComponent(id)}`,
		{
			method: "DELETE",
		},
	);
	return parseJson<{ product: DSCatalogProduct }>(res);
}

export async function getSellerAssignments(params: {
	sellerId: string;
	page: number;
	pageSize: number;
	search?: string;
	serviceTypeId?: string;
	onlySelectedServiceTypes?: boolean;
}) {
	const query = new URLSearchParams();
	query.set("seller_id", params.sellerId);
	query.set("page", String(params.page));
	query.set("pageSize", String(params.pageSize));
	query.set("only_active_catalog", "true");
	query.set(
		"only_selected_service_types",
		params.onlySelectedServiceTypes === false ? "false" : "true",
	);
	if (params.search) query.set("search", params.search);
	if (params.serviceTypeId) query.set("service_type_id", params.serviceTypeId);
	const res = await fetch(`/api/admin/ds/assignments?${query.toString()}`, {
		cache: "no-store",
	});
	return parseJson<{
		rows: Array<{
			product: DSCatalogProduct;
			assignment: DSSellerCatalogAssignment | null;
		}>;
		total: number;
		page: number;
		pageSize: number;
	}>(res);
}

export async function upsertSellerAssignment(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/assignments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ assignment: DSSellerCatalogAssignment }>(res);
}

export async function getSellerServiceTypeSelection(sellerId: string) {
	const query = new URLSearchParams();
	query.set("seller_id", sellerId);
	const res = await fetch(`/api/admin/ds/seller-services?${query.toString()}`, {
		cache: "no-store",
	});
	return parseJson<{ serviceTypeIds: string[] }>(res);
}

export async function saveSellerServiceTypeSelection(payload: {
	seller_id: string;
	service_type_ids: string[];
}) {
	const res = await fetch("/api/admin/ds/seller-services", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ rows: Array<Record<string, unknown>> }>(res);
}

export async function getSubcategories(params?: {
	serviceTypeId?: string;
	onlyActive?: boolean;
}) {
	const query = new URLSearchParams();
	if (params?.serviceTypeId) query.set("service_type_id", params.serviceTypeId);
	if (params?.onlyActive !== undefined)
		query.set("only_active", String(params.onlyActive));
	const suffix = query.toString() ? `?${query.toString()}` : "";
	const res = await fetch(`/api/admin/ds/subcategories${suffix}`, {
		cache: "no-store",
	});
	return parseJson<{ rows: DSProductSubcategory[] }>(res);
}

export async function createSubcategory(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/subcategories", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ row: DSProductSubcategory }>(res);
}

export async function updateSubcategory(payload: Record<string, unknown>) {
	const res = await fetch("/api/admin/ds/subcategories", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseJson<{ row: DSProductSubcategory }>(res);
}

export async function toggleSubcategory(id: string, isActive: boolean) {
	const res = await fetch("/api/admin/ds/subcategories", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, is_active: isActive }),
	});
	return parseJson<{ row: DSProductSubcategory }>(res);
}
