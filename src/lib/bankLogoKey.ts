export function getBankLogoKey(
	bankCode?: string | null,
	bankName?: string | null,
) {
	const raw = String(bankCode || bankName || "")
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

	return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "bank";
}
