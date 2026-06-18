import { type NextRequest, NextResponse } from "next/server";
import {
	DS_ADMIN_AVAILABLE,
	ensureDsAdminConfigured,
	listSellerAssignments,
	upsertSellerAssignment,
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
		msg.includes("invalid input syntax")
	)
		return 400;
	return 500;
}

export async function GET(req: NextRequest) {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const sellerId = req.nextUrl.searchParams.get("seller_id");
		if (!sellerId) {
			return NextResponse.json(
				{ error: "`seller_id` es requerido" },
				{ status: 400 },
			);
		}

		const page = Number(req.nextUrl.searchParams.get("page") || "1");
		const pageSize = Number(req.nextUrl.searchParams.get("pageSize") || "20");
		const search = req.nextUrl.searchParams.get("search") || undefined;
		const serviceTypeId =
			req.nextUrl.searchParams.get("service_type_id") || undefined;
		const onlyActiveCatalog = toBoolean(
			req.nextUrl.searchParams.get("only_active_catalog"),
		);
		const onlySelectedServiceTypes = toBoolean(
			req.nextUrl.searchParams.get("only_selected_service_types"),
		);

		const payload = await listSellerAssignments({
			sellerId,
			page,
			pageSize,
			search,
			serviceTypeId,
			onlyActiveCatalog: onlyActiveCatalog !== false,
			onlySelectedServiceTypes: onlySelectedServiceTypes !== false,
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
		const assignment = await upsertSellerAssignment(body);
		return NextResponse.json({ assignment }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}
