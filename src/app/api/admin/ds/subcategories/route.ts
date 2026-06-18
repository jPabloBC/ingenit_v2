import { type NextRequest, NextResponse } from "next/server";
import {
	createProductSubcategory,
	DS_ADMIN_AVAILABLE,
	ensureDsAdminConfigured,
	listProductSubcategories,
	setProductSubcategoryActive,
	updateProductSubcategory,
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
		const serviceTypeId =
			req.nextUrl.searchParams.get("service_type_id") || undefined;
		const onlyActive = toBoolean(req.nextUrl.searchParams.get("only_active"));
		const rows = await listProductSubcategories({
			serviceTypeId,
			onlyActive: onlyActive === true,
		});
		return NextResponse.json({ rows });
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
		const row = await createProductSubcategory(body);
		return NextResponse.json({ row }, { status: 201 });
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
		const row = await updateProductSubcategory(body);
		return NextResponse.json({ row });
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
		const row = await setProductSubcategoryActive(id, isActive);
		return NextResponse.json({ row });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}
