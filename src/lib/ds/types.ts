export type DSServiceType = {
	id: string;
	slug?: string;
	name?: string;
	icon?: string | null;
	category_code?: string | null;
	category_name?: string | null;
	sort_order?: number | null;
	is_active?: boolean;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};

export type DSProductSubcategory = {
	id: string;
	service_type_id: string;
	code?: string | null;
	name?: string;
	sort_order?: number | null;
	is_active?: boolean;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};

export type DSSeller = {
	seller_id: string;
	profile_id?: string | null;
	full_name: string;
	email?: string;
	is_active?: boolean;
	seller_profile?: Record<string, unknown>;
	profile?: Record<string, unknown> | null;
};

export type DSCatalogProduct = {
	id: string;
	service_type_id: string;
	subcategory_id?: string | null;
	sku: string;
	name: string;
	description?: string | null;
	unit?: string | null;
	specs?: Record<string, unknown> | null;
	assignment_mode?: "required" | "optional" | "restricted";
	min_price?: number | null;
	max_price?: number | null;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};

export type DSSellerCatalogAssignment = {
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

export type DSSellerServiceTypeSelection = {
	id?: string;
	seller_id: string;
	service_type_id: string;
	is_active?: boolean;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
};
