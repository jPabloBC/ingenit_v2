import { type NextRequest, NextResponse } from "next/server";
import {
	createServiceType,
	DS_ADMIN_AVAILABLE,
	ensureDsAdminConfigured,
	listServiceTypes,
	setServiceTypeActive,
	updateServiceType,
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
	if (msg.includes("duplicate key value") || msg.includes("unique constraint"))
		return 409;
	if (
		msg.includes("requerido") ||
		msg.includes("no puede estar vacío") ||
		msg.includes("invalid input syntax")
	)
		return 400;
	return 500;
}

export async function GET() {
	if (!DS_ADMIN_AVAILABLE) return configErrorResponse();
	try {
		ensureDsAdminConfigured();
		const rows = await listServiceTypes();
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
		const row = await createServiceType(body);
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
		const row = await updateServiceType(body);
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
		if (!id)
			return NextResponse.json({ error: "`id` es requerido" }, { status: 400 });
		const row = await setServiceTypeActive(id, isActive);
		return NextResponse.json({ row });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: toStatus(error) },
		);
	}
}
