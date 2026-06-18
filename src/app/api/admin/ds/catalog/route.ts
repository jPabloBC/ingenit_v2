import { type NextRequest, NextResponse } from "next/server";
import {
	createCatalogProduct,
	DS_ADMIN_AVAILABLE,
	deleteCatalogProduct,
	ensureDsAdminConfigured,
	listCatalogProducts,
	setCatalogProductActive,
	updateCatalogProduct,
} from "@/lib/admin/dsRepository";

function configErrorResponse() {
	return NextResponse.json(
		{
			error: "Admin DS API not configured",
			details: { hasServiceRole: DS_ADMIN_AVAILABLE },
		},
		{ status: 500 },
	);
}

function toBoolean(value: string | null): boolean | undefined {
	if (value === null) return undefined;
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

function toStatus(error: unknown) {
	const msg = error instanceof Error ? error.message : String(error || "");
	if (msg.includes("duplicate key value") || msg.includes("unique constraint"))
		return 409;
	if (
		msg.includes("requerido") ||
		msg.includes("debe ser") ||
		msg.includes("no puede estar vacío") ||
		msg.includes("invalid input syntax")
	) {
		return 400;
	}
	return 500;
}

export async function GET(req: NextRequest) {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const page = Number(req.nextUrl.searchParams.get("page") || "1");
		const pageSize = Number(req.nextUrl.searchParams.get("pageSize") || "20");
		const search = req.nextUrl.searchParams.get("search") || undefined;
		const serviceTypeId =
			req.nextUrl.searchParams.get("service_type_id") || undefined;
		const subcategoryId =
			req.nextUrl.searchParams.get("subcategory_id") || undefined;
		const isActive = toBoolean(req.nextUrl.searchParams.get("is_active"));

		const payload = await listCatalogProducts({
			page,
			pageSize,
			search,
			serviceTypeId,
			subcategoryId,
			isActive,
		});
		return NextResponse.json(payload);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}

export async function POST(req: NextRequest) {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const body = await req.json();
		const product = await createCatalogProduct(body);
		return NextResponse.json({ product }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}

export async function PUT(req: NextRequest) {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const body = await req.json();
		const product = await updateCatalogProduct(body);
		return NextResponse.json({ product });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}

export async function PATCH(req: NextRequest) {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const body = await req.json();
		const id = String(body?.id || "").trim();
		const isActive = Boolean(body?.is_active);
		if (!id) {
			return NextResponse.json({ error: "`id` es requerido" }, { status: 400 });
		}
		const product = await setCatalogProductActive(id, isActive);
		return NextResponse.json({ product });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}

export async function DELETE(req: NextRequest) {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const id = req.nextUrl.searchParams.get("id");
		if (!id) {
			return NextResponse.json({ error: "`id` es requerido" }, { status: 400 });
		}
		const product = await deleteCatalogProduct(id);
		return NextResponse.json({ product });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}
