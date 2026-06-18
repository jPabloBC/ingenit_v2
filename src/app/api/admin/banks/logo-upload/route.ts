import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getBankLogoKey } from "@/lib/bankLogoKey";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

function badConfig() {
	return NextResponse.json(
		{ success: false, error: "Admin storage API no configurada" },
		{ status: 500 },
	);
}

export async function POST(request: Request) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return badConfig();

	try {
		const form = await request.formData();
		const file = form.get("file");
		const bankId = String(form.get("bankId") || "");
		const bankCode = String(form.get("bankCode") || "");
		const bankName = String(form.get("bankName") || "");

		if (!(file instanceof File)) {
			return NextResponse.json(
				{ success: false, error: "Archivo requerido" },
				{ status: 400 },
			);
		}

		if (!bankCode && !bankName) {
			return NextResponse.json(
				{ success: false, error: "Código o nombre de banco requerido" },
				{ status: 400 },
			);
		}

		const key = getBankLogoKey(bankCode, bankName);
		const storagePath = `banks/${key}.png`;
		const bytes = new Uint8Array(await file.arrayBuffer());

		const { error: uploadError } = await supabaseAdmin.storage
			.from("ingenit")
			.upload(storagePath, bytes, {
				contentType: file.type || "image/png",
				upsert: true,
			});

		if (uploadError) {
			return NextResponse.json(
				{ success: false, error: uploadError.message },
				{ status: 500 },
			);
		}

		const version = Date.now();
		const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/ingenit/${storagePath}?v=${version}`;

		if (bankId || bankCode || bankName) {
			if (bankId) {
				await supabaseAdmin
					.from("rt_personal_banks")
					.update({ logo_url: publicUrl })
					.eq("id", bankId);
			}
			if (bankCode) {
				await supabaseAdmin
					.from("rt_personal_banks")
					.update({ logo_url: publicUrl })
					.eq("code", bankCode);
			}
			if (bankName) {
				await supabaseAdmin
					.from("rt_personal_banks")
					.update({ logo_url: publicUrl })
					.eq("name", bankName);
			}
		}

		return NextResponse.json({
			success: true,
			path: storagePath,
			publicUrl,
		});
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(request: Request) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return badConfig();

	try {
		const body = (await request.json().catch(() => ({}))) as {
			bankId?: string;
			bankCode?: string;
			bankName?: string;
		};
		const bankId = String(body.bankId || "");
		const bankCode = String(body.bankCode || "");
		const bankName = String(body.bankName || "");

		let bankRow: { id: string; logo_url?: string | null } | null = null;

		if (bankId) {
			const { data } = await supabaseAdmin
				.from("rt_personal_banks")
				.select("id, logo_url")
				.eq("id", bankId)
				.maybeSingle();
			if (data?.id) bankRow = data as { id: string; logo_url?: string | null };
		}

		if (!bankRow && bankCode) {
			const { data } = await supabaseAdmin
				.from("rt_personal_banks")
				.select("id, logo_url")
				.eq("code", bankCode)
				.limit(1)
				.maybeSingle();
			if (data?.id) bankRow = data as { id: string; logo_url?: string | null };
		}

		if (!bankRow && bankName) {
			const { data } = await supabaseAdmin
				.from("rt_personal_banks")
				.select("id, logo_url")
				.eq("name", bankName)
				.limit(1)
				.maybeSingle();
			if (data?.id) bankRow = data as { id: string; logo_url?: string | null };
		}

		if (!bankRow?.id) {
			return NextResponse.json(
				{ success: false, error: "Banco no encontrado" },
				{ status: 404 },
			);
		}

		const logoUrl = String(bankRow.logo_url || "");
		if (logoUrl.includes("/storage/v1/object/public/ingenit/")) {
			const marker = "/storage/v1/object/public/ingenit/";
			const idx = logoUrl.indexOf(marker);
			if (idx >= 0) {
				const rawPath = logoUrl.slice(idx + marker.length);
				const storagePath = decodeURIComponent(rawPath.split("?")[0] || "");
				if (storagePath) {
					await supabaseAdmin.storage.from("ingenit").remove([storagePath]);
				}
			}
		}

		await supabaseAdmin
			.from("rt_personal_banks")
			.update({ logo_url: null })
			.eq("id", bankRow.id);

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
