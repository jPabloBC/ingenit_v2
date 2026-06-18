import { NextResponse } from "next/server";
import {
	DS_ADMIN_AVAILABLE,
	ensureDsAdminConfigured,
	listProductSubcategories,
	listSellers,
	listServiceTypes,
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

export async function GET() {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const [serviceTypes, subcategories, sellers] = await Promise.all([
			listServiceTypes(),
			listProductSubcategories(),
			listSellers(),
		]);
		return NextResponse.json({ serviceTypes, subcategories, sellers });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
