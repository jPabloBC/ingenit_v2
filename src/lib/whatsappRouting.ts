const DEFAULT_INGENIT_NUMBERS = [
	"+56975385487",
	"+56990206618",
	"+56937570007",
];
const DEFAULT_MT_NUMBERS: string[] = [];

function normalizeWhatsappNumber(value?: string | null): string {
	if (!value) return "";
	const digits = value.replace(/\D/g, "");
	return digits ? `+${digits}` : "";
}

function parseConfiguredNumbers(
	envValue: string | undefined,
	fallback: string[],
): string[] {
	if (!envValue?.trim()) return fallback;

	const parsed = envValue
		.split(",")
		.map((number) => normalizeWhatsappNumber(number))
		.filter(Boolean);

	// Merge env config with safe defaults to avoid production breakage
	// when an outdated env omits one of the required numbers.
	return Array.from(new Set([...fallback, ...parsed]));
}

export function getWhatsappRoutingConfig() {
	return {
		ingenitNumbers: parseConfiguredNumbers(
			process.env.INGENIT_WHATSAPP_NUMBERS,
			DEFAULT_INGENIT_NUMBERS,
		),
		mtNumbers: parseConfiguredNumbers(
			process.env.MT_WHATSAPP_NUMBERS,
			DEFAULT_MT_NUMBERS,
		),
	};
}

export function isConfiguredWhatsappNumber(
	number: string | undefined | null,
	configuredNumbers: string[],
) {
	const normalized = normalizeWhatsappNumber(number);
	return normalized ? configuredNumbers.includes(normalized) : false;
}

export function normalizeWhatsappNumberForComparison(
	number: string | undefined | null,
) {
	return normalizeWhatsappNumber(number);
}
