import { type NextRequest, NextResponse } from "next/server";
import {
	DS_ADMIN_AVAILABLE,
	ensureDsAdminConfigured,
	listSellerSelectedServiceTypeIds,
	replaceSellerServiceTypes,
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

function toStatus(error: unknown) {
	const msg = error instanceof Error ? error.message : String(error || "");
	if (msg.includes("requerido") || msg.includes("invalid input syntax"))
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
		const serviceTypeIds = await listSellerSelectedServiceTypeIds(sellerId);
		return NextResponse.json({ serviceTypeIds });
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
		const sellerId = String(body?.seller_id || "").trim();
		const serviceTypeIdsRaw = Array.isArray(body?.service_type_ids)
			? body.service_type_ids
			: [];
		if (!sellerId) {
			return NextResponse.json(
				{ error: "`seller_id` es requerido" },
				{ status: 400 },
			);
		}
		const serviceTypeIds = serviceTypeIdsRaw
			.map((id: unknown) => String(id || ""))
			.filter(Boolean);
		const rows = await replaceSellerServiceTypes(sellerId, serviceTypeIds);
		return NextResponse.json({ rows });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}
