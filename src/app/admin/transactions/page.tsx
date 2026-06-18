/* biome-ignore-all lint/a11y/useButtonType: legacy modal actions in this screen require a dedicated accessibility refactor */
/* biome-ignore-all lint/a11y/useKeyWithClickEvents: legacy modal overlays handled with pointer interactions */
/* biome-ignore-all lint/a11y/noStaticElementInteractions: legacy modal overlays handled with pointer interactions */
/* biome-ignore-all lint/a11y/noLabelWithoutControl: visual section labels are intentionally not bound to a single control */
/* biome-ignore-all lint/a11y/noSvgWithoutTitle: decorative SVG icons in this screen are non-semantic */
/* biome-ignore-all lint/suspicious/noExplicitAny: legacy admin module pending progressive typing */
/* biome-ignore-all lint/performance/noImgElement: bank logo rendering uses dynamic sources not yet migrated to next/image */
"use client";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import BankSelector from "@/components/BankSelector";
import { useSidebar } from "@/contexts/SidebarContext";
import { getAccountTypeLabel } from "@/lib/accountTypeLabels";
import { BANK_CATALOG } from "@/lib/bankCatalog";
import { getBankLogoKey } from "@/lib/bankLogoKey";
import { supabase } from "@/lib/supabaseClient";

// Format a stored DB date/timestamp using UTC components to avoid local TZ shifts
function formatStoredDateUTC(dateStr: any) {
	if (!dateStr) return null;
	try {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return String(dateStr);
		const yyyy = d.getUTCFullYear();
		const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
		const dd = String(d.getUTCDate()).padStart(2, "0");
		return `${dd}-${mm}-${yyyy}`;
	} catch (_e) {
		return String(dateStr);
	}
}

function toNumberSafe(value: unknown): number {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	const raw = String(value ?? "").trim();
	if (!raw) return 0;
	const cleaned = raw.replace(/[^\d,.-]/g, "");
	if (!cleaned) return 0;

	const commaCount = (cleaned.match(/,/g) || []).length;
	const dotCount = (cleaned.match(/\./g) || []).length;

	let normalized = cleaned;

	if (commaCount > 0 && dotCount > 0) {
		// Usa el último separador como decimal y elimina el resto.
		const lastComma = cleaned.lastIndexOf(",");
		const lastDot = cleaned.lastIndexOf(".");
		const decimalSep = lastComma > lastDot ? "," : ".";
		if (decimalSep === ",") {
			normalized = cleaned.replace(/\./g, "").replace(",", ".");
		} else {
			normalized = cleaned.replace(/,/g, "");
		}
	} else if (commaCount > 0) {
		// Si termina con 3 dígitos, interpretamos coma como miles.
		if (/,\d{3}$/.test(cleaned)) {
			normalized = cleaned.replace(/,/g, "");
		} else {
			normalized = cleaned.replace(",", ".");
		}
	} else if (dotCount > 0) {
		// Si termina con 3 dígitos, interpretamos punto como miles.
		if (/\.\d{3}$/.test(cleaned)) {
			normalized = cleaned.replace(/\./g, "");
		}
	}

	const num = Number(normalized);
	return Number.isFinite(num) ? num : 0;
}

function isUuid(value: unknown): value is string {
	if (typeof value !== "string") return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value.trim(),
	);
}

function isCreditAccountType(type: unknown, name?: unknown): boolean {
	const typeText = `${String(type || "")} ${String(name || "")}`.toLowerCase();
	return (
		/(?:credit|line|línea|linea|tarjeta)/i.test(typeText) &&
		!/(?:checking|savings|corriente|vista|ahorro|rut)/i.test(typeText)
	);
}

// Custom input for react-datepicker to enforce readOnly behavior (no typing)
const DatePickerInput = React.forwardRef<HTMLInputElement, any>(
	({ value, onClick, className, placeholder }, ref) => {
		return (
			<input
				ref={ref}
				className={className}
				onClick={onClick}
				value={value}
				placeholder={placeholder}
				readOnly
			/>
		);
	},
);

export default function Page() {
	const { isCollapsed } = useSidebar();
	const [accounts, setAccounts] = useState<any[]>([]);
	const [loadingAccounts, setLoadingAccounts] = useState(false);
	const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);
	const [selectedBank, setSelectedBank] = useState<any | null>(null);
	const [selectedType, setSelectedType] = useState<string | null>(null);
	const [initialAmount, setInitialAmount] = useState<string>("");
	const [creditLimit, setCreditLimit] = useState<string>("");
	const [editingInitial, setEditingInitial] = useState(false);
	const [editingCredit, setEditingCredit] = useState(false);
	const [editingInitialDisplay, setEditingInitialDisplay] =
		useState<string>("");
	const [editingCreditDisplay, setEditingCreditDisplay] = useState<string>("");
	const [uploadingBankLogo, setUploadingBankLogo] = useState(false);
	const [bankLogoFeedback, setBankLogoFeedback] = useState<string | null>(null);
	const [bankLogoRefreshKey, setBankLogoRefreshKey] = useState<number>(0);
	const [bankLogoPreviewUrl, setBankLogoPreviewUrl] = useState<string | null>(
		null,
	);
	const [bankLogoPreviewName, setBankLogoPreviewName] = useState<string | null>(
		null,
	);
	const [bankLogoDragOver, setBankLogoDragOver] = useState(false);
	const initialInputRef = useRef<HTMLInputElement | null>(null);
	const creditInputRef = useRef<HTMLInputElement | null>(null);
	const bankLogoInputRef = useRef<HTMLInputElement | null>(null);
	const creatingAccountRef = useRef(false);

	function formatLiveDisplay(raw: string, isUsd = false) {
		if (!raw || raw === "-") return raw;
		const sign = raw.startsWith("-") ? "-" : "";
		let body = sign ? raw.slice(1) : raw;
		const hasTrailingDecimalSep = isUsd && /[.,]$/.test(body);

		// Reemplazar punto por coma para USD (visualización con coma)
		if (isUsd) {
			body = body.replace(".", ",");
		}

		// Separar parte entera y decimal
		let integerPart = body;
		let decimalPart = "";
		const separatorIdx = body.indexOf(",");
		if (separatorIdx >= 0) {
			integerPart = body.slice(0, separatorIdx);
			decimalPart = body.slice(separatorIdx + 1);
		}

		// Limpiar parte entera (solo números)
		integerPart = integerPart.replace(/[^0-9]/g, "") || "0";

		// Agrupar miles con punto
		const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

		if (isUsd) {
			if (hasTrailingDecimalSep) return `${sign}${grouped},`;
			if (decimalPart) return `${sign}${grouped},${decimalPart}`;
			return `${sign}${grouped}`;
		}
		return `${sign}${grouped}`;
	}
	const [modalOpen, setModalOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [txModalOpen, setTxModalOpen] = useState(false);
	const [txActionChoiceOpen, setTxActionChoiceOpen] = useState(false);
	const [txIsTransfer, setTxIsTransfer] = useState(false);
	const [txTransferOpen, setTxTransferOpen] = useState(false);
	const [txPayOpen, setTxPayOpen] = useState(false);
	const [_txTransferShowNav, setTxTransferShowNav] = useState(false);
	const [_txPayShowNav, setTxPayShowNav] = useState(false);

	// DEBUG: log when the choice modal state changes
	useEffect(() => {
		console.log("[UI] txActionChoiceOpen ->", txActionChoiceOpen);
	}, [txActionChoiceOpen]);

	// transaction form state
	// Tooltip portal state for balance hover
	const [balanceTooltip, setBalanceTooltip] = useState<null | {
		x: number;
		y: number;
		text: string;
		colorClass: string;
	}>(null);
	const balanceTooltipTimeout = useRef<number | null>(null);

	function showBalanceTooltip(
		x: number,
		y: number,
		text: string,
		colorClass: string,
		duration = 2000,
	) {
		if (typeof window === "undefined") return;
		if (balanceTooltipTimeout.current) {
			window.clearTimeout(balanceTooltipTimeout.current);
			balanceTooltipTimeout.current = null;
		}
		setBalanceTooltip({ x, y: y + 14, text: `Saldo: ${text}`, colorClass });
		balanceTooltipTimeout.current = window.setTimeout(() => {
			setBalanceTooltip(null);
			balanceTooltipTimeout.current = null;
		}, duration) as unknown as number;
	}

	function hideBalanceTooltip() {
		if (typeof window === "undefined") return;
		if (balanceTooltipTimeout.current) {
			window.clearTimeout(balanceTooltipTimeout.current);
			balanceTooltipTimeout.current = null;
		}
		setBalanceTooltip(null);
	}

	function BalanceTooltipPortal({
		state,
	}: {
		state: null | { x: number; y: number; text: string; colorClass: string };
	}) {
		if (!state || typeof document === "undefined") return null;
		const style: React.CSSProperties = {
			position: "absolute",
			left: `${Math.round(state.x)}px`,
			top: `${Math.round(state.y)}px`,
			transform: "translate(-50%, -100%)",
			pointerEvents: "none",
			zIndex: 99999,
		};
		return createPortal(
			<div
				style={style}
				className={`bg-transparent text-base px-4 py-1 whitespace-nowrap font-normal ${state.colorClass}`}
			>
				{state.text}
			</div>,
			document.body,
		);
	}
	const [txAccountId, setTxAccountId] = useState<string | null>(null);
	const [txSelectedBank, setTxSelectedBank] = useState<string | null>(null);
	// Transferencia: origen/destino
	const [txTransferStep, setTxTransferStep] = useState<"origen" | "destino">(
		"origen",
	);
	const [txTransferOriginBank, setTxTransferOriginBank] = useState<
		string | null
	>(null);
	const [txTransferOriginAccount, setTxTransferOriginAccount] = useState<
		string | null
	>(null);
	const [txTransferDestBank, setTxTransferDestBank] = useState<string | null>(
		null,
	);
	const [txTransferDestAccount, setTxTransferDestAccount] = useState<
		string | null
	>(null);
	// Pagar: origen/destino (separate from transfer)
	const [txPayOriginBank, setTxPayOriginBank] = useState<string | null>(null);
	const [txPayOriginAccount, setTxPayOriginAccount] = useState<string | null>(
		null,
	);
	const [txPayDestBank, setTxPayDestBank] = useState<string | null>(null);
	const [txPayDestAccount, setTxPayDestAccount] = useState<string | null>(null);
	const [txPayAllowOther, setTxPayAllowOther] = useState<boolean>(false);
	// pay inner step: 'origen' -> 'destino' so we show fewer elements at once
	const [_txPayStep, setTxPayStep] = useState<"origen" | "destino">("origen");
	const [txAmount, setTxAmount] = useState<string>("");
	const [txEditingAmount, setTxEditingAmount] = useState(false);
	const [txAmountDisplay, setTxAmountDisplay] = useState<string>("");
	const txAmountRef = useRef<HTMLInputElement | null>(null);
	const [txCreditLimit, setTxCreditLimit] = useState<string>("");
	const [txEditingCreditLimit, setTxEditingCreditLimit] = useState(false);
	const [txCreditLimitDisplay, setTxCreditLimitDisplay] = useState<string>("");
	const [txUpdatingCreditLimit, setTxUpdatingCreditLimit] = useState(false);
	// initialize txDate as local date YYYY-MM-DD (avoid UTC shift)
	const localIsoDate = () => {
		const d = new Date();
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}`;
	};
	const [txDate, setTxDate] = useState<string>(localIsoDate());

	// helper: reset all transaction form fields to initial state
	const resetTxForm = () => {
		setTxSelectedBank(null);
		setTxAccountId(null);
		setTxAmount("");
		setTxEditingAmount(false);
		setTxAmountDisplay("");
		setTxDate(localIsoDate());
		setTxTipo(null);
		setTxMetodo(null);
		setTxCategoria(null);
		setTxDescripcion("");
		setActiveSection(1);
		setTxTransferStep("origen");
		setTxTransferOriginBank(null);
		setTxTransferOriginAccount(null);
		setTxTransferDestBank(null);
		setTxTransferDestAccount(null);
		// reset pay fields
		setTxPayOriginBank(null);
		setTxPayOriginAccount(null);
		setTxPayDestBank(null);
		setTxPayDestAccount(null);
		setTxPayAllowOther(false);
		setTxPayStep("origen");
		if (txAmountRef.current) {
			txAmountRef.current.value = "";
		}
	};

	// close modal and reset form
	const closeTxModal = () => {
		resetTxForm();
		setTxModalOpen(false);
	};

	// close transfer modal and reset transfer fields
	const closeTxTransferModal = () => {
		resetTxForm();
		setTxTransferOpen(false);
		setTxTransferShowNav(false);
		setTxIsTransfer(false);
		setActiveSection(1);
	};
	// Tipo and Metodo should start with no default selection so auto-advance waits for user action
	const [txTipo, setTxTipo] = useState<string | null>(null);
	const [txMetodo, setTxMetodo] = useState<string | null>(null);
	const [txCategoria, setTxCategoria] = useState<string | null>(null);
	const [txDescripcion, setTxDescripcion] = useState<string>("");

	// active modal section: 1 = banco/cuentas, 2 = fecha/monto/tipo/metodo, 3 = categoria/descripcion/actions
	const [activeSection, setActiveSection] = useState<number>(1);
	// ref to track the last seen combination of section-2 fields so we only auto-advance
	const section2SignatureRef = useRef<string>("");

	// predefined options for method and category
	const METODO_OPTIONS = [
		"efectivo",
		"transferencia",
		"pago automático",
		"pago electrónico",
		"tarjeta",
		"otro",
	];
	const CATEGORIA_OPTIONS = [
		{ key: "alimentacion", label: "Alimentación" },
		{ key: "transporte", label: "Transporte" },
		{ key: "vivienda", label: "Vivienda" },
		{ key: "salud", label: "Salud" },
		{ key: "educacion", label: "Educación" },
		{ key: "servicios", label: "Servicios (luz, agua, gas)" },
		{ key: "entretenimiento", label: "Entretenimiento" },
		{ key: "sueldos", label: "Sueldos y salarios" },
		{ key: "compras", label: "Compras y suministros" },
		// { key: 'ventas', label: 'Ventas' },
		{ key: "ingresos", label: "Otros ingresos" },
		{ key: "combustible", label: "Combustible" },
		// 'otro' should be last
		{ key: "otro", label: "Otro egresos" },
	];
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	// Tabs: show accounts or historial
	const [activeTab, setActiveTab] = useState<"cuentas" | "historial">(
		"cuentas",
	);
	const [transactions, setTransactions] = useState<any[]>([]);
	const [loadingTransactions, setLoadingTransactions] = useState(false);

	// Fetch only accounts
	const fetchAccounts = async () => {
		const isFirstLoad = !hasLoadedAccounts;
		if (isFirstLoad) setLoadingAccounts(true);
		const { data: accountsData, error: accountsError } = await supabase
			.from("rt_personal_accounts")
			.select();
		let sourceAccounts = accountsData || [];
		let sourceBanks: Array<{
			id: string;
			name: string | null;
			code: string | null;
			logo_url?: string | null;
		}> = [];

		if (accountsError || sourceAccounts.length === 0) {
			try {
				const fallback = await fetch(
					"/api/admin/transactions/data?mode=accounts",
				);
				const payload = (await fallback.json().catch(() => ({}))) as {
					accounts?: any[];
					error?: string;
				};
				if (!fallback.ok) {
					if (accountsError) {
						setError(payload.error || accountsError.message);
						setAccounts([]);
						setHasLoadedAccounts(true);
						setLoadingAccounts(false);
						return;
					}
				} else if ((payload.accounts || []).length > 0) {
					sourceAccounts = payload.accounts || [];
				}
			} catch (fallbackErr: any) {
				if (accountsError) {
					setError(
						fallbackErr?.message ||
							accountsError.message ||
							"Error cargando cuentas",
					);
					setAccounts([]);
					setHasLoadedAccounts(true);
					setLoadingAccounts(false);
					return;
				}
			}
		}

		try {
			const { data: banksData, error: banksError } = await supabase
				.from("rt_personal_banks")
				.select("id, name, code, logo_url");
			if (!banksError && banksData) {
				sourceBanks = banksData as Array<{
					id: string;
					name: string | null;
					code: string | null;
					logo_url?: string | null;
				}>;
			}
		} catch {}

		if (sourceBanks.length === 0) {
			try {
				const fallback = await fetch("/api/admin/transactions/data?mode=banks");
				const payload = (await fallback.json().catch(() => ({}))) as {
					banks?: Array<{
						id: string;
						name: string | null;
						code: string | null;
						logo_url?: string | null;
					}>;
				};
				if (fallback.ok) {
					sourceBanks = payload.banks || [];
				}
			} catch {}
		}

		const bankById = new Map(sourceBanks.map((b) => [String(b.id), b]));
		const bankByCode = new Map(
			sourceBanks
				.filter((b) => b.code)
				.map((b) => [String(b.code).toUpperCase(), b]),
		);
		const bankByName = new Map(
			sourceBanks
				.filter((b) => b.name)
				.map((b) => [String(b.name).trim().toLowerCase(), b]),
		);
		// Attach bank name
		const accountsWithBank = sourceAccounts.map((acc) => {
			const accBankId = acc?.bank_id ? String(acc.bank_id) : "";
			const accBankCode = acc?.bank_code
				? String(acc.bank_code).toUpperCase()
				: "";
			const accBankName = acc?.name
				? String(acc.name).trim().toLowerCase()
				: "";
			const bankRef =
				(accBankId ? bankById.get(accBankId) : undefined) ||
				(accBankCode ? bankByCode.get(accBankCode) : undefined) ||
				(accBankName ? bankByName.get(accBankName) : undefined);

			let bankName = "Otro";
			if (acc.bank_id || acc.bank_code) {
				const found = BANK_CATALOG.find(
					(b) => b.code === acc.bank_id || b.code === acc.bank_code,
				);
				bankName = bankRef?.name || (found ? found.name : acc.name || "Otro");
			} else if (acc.name) {
				bankName = acc.name;
			}

			// Removed duplicated inline modal JSX that accidentally lived inside fetchAccounts map.
			// The txActionChoice modal is rendered at top-level further down near other modals.
			return {
				...acc,
				bank_name: bankName,
				bank_logo_url: bankRef?.logo_url || null,
			};
		});
		const _totalsLeftClass = isCollapsed
			? "lg:left-16"
			: "lg:left-64 sm:sticky";
		const map = new Map<string, any>();
		for (const a of accountsWithBank) {
			if (a?.id) map.set(String(a.id), a);
		}
		let finalAccounts = Array.from(map.values());

		// fetch transactions to compute 'used' amounts per account
		const ids = finalAccounts.map((a) => a.id).filter(Boolean);
		if (ids.length > 0) {
			const { data: txs, error: txsError } = await supabase
				.from("rt_personal_transactions")
				.select("account_id, amount");
			let txRows = txs || [];
			if (txsError) {
				try {
					const fallback = await fetch(
						"/api/admin/transactions/data?mode=transactions",
					);
					const payload = (await fallback.json().catch(() => ({}))) as {
						transactions?: any[];
					};
					if (fallback.ok) {
						txRows = (payload.transactions || []).map((t) => ({
							account_id: t.account_id,
							amount: t.amount,
						}));
					}
				} catch {}
			}
			// group sums
			const usedMap = new Map<string, number>();
			for (const t of txRows || []) {
				const accId = String(t.account_id);
				const amt = toNumberSafe(t.amount);
				usedMap.set(accId, (usedMap.get(accId) || 0) + amt);
			}
			finalAccounts = finalAccounts.map((a) => {
				const accId = String(a.id);
				const usedFromTx = usedMap.get(accId) || 0;
				const balance = toNumberSafe(a.balance); // available
				const creditLimit =
					a.credit_limit != null ? toNumberSafe(a.credit_limit) : balance;
				const usedDerived = creditLimit - balance;
				const used =
					usedFromTx !== 0 ? usedFromTx : creditLimit ? usedDerived : 0;
				return { ...a, used, credit_limit: creditLimit, balance };
			});
		}

		setAccounts(finalAccounts);
		setError(null);
		setHasLoadedAccounts(true);
		setLoadingAccounts(false);
	};

	const uploadBankLogo = async (
		file: File,
		bankMeta: {
			id?: string | null;
			code?: string | null;
			name?: string | null;
		},
	): Promise<string | null> => {
		const bankId = bankMeta.id ? String(bankMeta.id) : "";
		const bankCode = bankMeta.code ? String(bankMeta.code) : "";
		const bankName = bankMeta.name ? String(bankMeta.name) : "";

		if (!bankId && !bankCode && !bankName) {
			setBankLogoFeedback(
				"No se pudo identificar el banco para actualizar logo.",
			);
			return null;
		}

		setUploadingBankLogo(true);
		setBankLogoFeedback(null);
		try {
			const form = new FormData();
			form.append("file", file);
			form.append("bankId", bankId);
			form.append("bankCode", bankCode);
			form.append("bankName", bankName);

			const res = await fetch("/api/admin/banks/logo-upload", {
				method: "POST",
				body: form,
			});
			const payload = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
				publicUrl?: string;
			};

			if (!res.ok || !payload.success) {
				setBankLogoFeedback(payload.error || "No se pudo subir el logo.");
				return null;
			}

			setBankLogoFeedback("Logo actualizado correctamente.");
			setBankLogoRefreshKey(Date.now());
			await fetchAccounts();
			return payload.publicUrl || null;
		} catch (error: unknown) {
			setBankLogoFeedback(
				error instanceof Error ? error.message : "Error subiendo logo.",
			);
			return null;
		} finally {
			setUploadingBankLogo(false);
		}
	};

	const handleBankLogoUpload = async (file: File) => {
		if (!selectedBank) {
			setBankLogoFeedback("Selecciona primero un banco.");
			return;
		}
		const localPreview = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
			reader.readAsDataURL(file);
		}).catch(() => "");
		if (localPreview) setBankLogoPreviewUrl(localPreview);
		setBankLogoPreviewName(file.name);

		const uploadedUrl = await uploadBankLogo(file, {
			id: selectedBank.id,
			code: selectedBank.code,
			name: selectedBank.name,
		});
		if (uploadedUrl) setBankLogoPreviewUrl(uploadedUrl);
	};

	const handleBankLogoDelete = async (bankMeta: {
		id?: string | null;
		code?: string | null;
		name?: string | null;
	}) => {
		setUploadingBankLogo(true);
		setBankLogoFeedback(null);
		try {
			const res = await fetch("/api/admin/banks/logo-upload", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					bankId: bankMeta.id || "",
					bankCode: bankMeta.code || "",
					bankName: bankMeta.name || "",
				}),
			});
			const payload = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};
			if (!res.ok || !payload.success) {
				setBankLogoFeedback(payload.error || "No se pudo eliminar el logo.");
				return;
			}
			setBankLogoFeedback("Logo eliminado correctamente.");
			setBankLogoRefreshKey(Date.now());
			setBankLogoPreviewUrl(null);
			setBankLogoPreviewName(null);
			await fetchAccounts();
		} catch (error: unknown) {
			setBankLogoFeedback(
				error instanceof Error ? error.message : "Error eliminando logo.",
			);
		} finally {
			setUploadingBankLogo(false);
		}
	};

	useEffect(() => {
		const initialUrl = selectedBank?.logo_url
			? String(selectedBank.logo_url)
			: null;
		setBankLogoPreviewUrl(initialUrl);
		setBankLogoPreviewName(null);
	}, [selectedBank]);

	// Fetch transactions for Historial tab (GET /api/transactions)
	const fetchTransactions = useCallback(async () => {
		setLoadingTransactions(true);
		const headers: any = { "Content-Type": "application/json" };
		try {
			const sess = await supabase.auth.getSession();
			const token = (sess as any)?.data?.session?.access_token;
			if (token) headers.Authorization = `Bearer ${token}`;
		} catch (_e) {}
		try {
			const res = await fetch("/api/transactions", { headers });
			const data = await res.json().catch(() => null);
			if (res.ok && data?.success) {
				const apiTransactions = data.transactions || [];
				if (apiTransactions.length > 0) {
					setTransactions(apiTransactions);
					setError(null);
					return;
				}
			}

			// Fallback para entorno admin cuando /api/transactions no tiene sesión bearer válida.
			const { data: directData, error: directError } = await supabase
				.from("rt_personal_transactions")
				.select("*")
				.order("date", { ascending: false });

			if (directError) {
				setError(
					(data as { error?: string } | null)?.error ||
						directError.message ||
						"Error al cargar historial",
				);
				setTransactions([]);
				return;
			}

			setTransactions(directData || []);
			setError(null);
		} catch (e: any) {
			// Fallback final al query directo
			const { data: directData, error: directError } = await supabase
				.from("rt_personal_transactions")
				.select("*")
				.order("date", { ascending: false });
			if (directError) {
				try {
					const fallback = await fetch(
						"/api/admin/transactions/data?mode=transactions",
					);
					const payload = (await fallback.json().catch(() => ({}))) as {
						transactions?: any[];
						error?: string;
					};
					if (!fallback.ok) {
						setError(
							payload.error ||
								e?.message ||
								directError.message ||
								"Error al cargar historial",
						);
						setTransactions([]);
					} else {
						setTransactions(payload.transactions || []);
						setError(null);
					}
				} catch (fallbackErr: any) {
					setError(
						fallbackErr?.message ||
							e?.message ||
							directError.message ||
							String(e),
					);
					setTransactions([]);
				}
			} else {
				setTransactions(directData || []);
				setError(null);
			}
		} finally {
			setLoadingTransactions(false);
		}
	}, []);

	// Real-time subscription: when Historial tab is active, subscribe to changes
	useEffect(() => {
		if (activeTab !== "historial") return;

		// Ensure initial load
		fetchTransactions();

		const channel = supabase
			.channel("rt_personal_transactions_updates")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "rt_personal_transactions" },
				(_payload: any) => {
					// On any change, refresh the transactions list to keep it in sync
					fetchTransactions();
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [activeTab, fetchTransactions]);

	// submit transaction to API and refresh accounts
	const handleSubmitTransaction = async () => {
		setError(null);
		setLoading(true);
		try {
			if (!txAccountId || !txAmount) {
				setError("Selecciona cuenta y monto.");
				setLoading(false);
				return;
			}
			// Build payload with explicit fields to ensure bank_id, currency and balance snapshots are stored
			const selectedAccount = (accounts || []).find(
				(a) => String(a.id) === String(txAccountId),
			);
			const numericAmount =
				Number(String(txAmount || "").replace(/[^0-9.-]/g, "")) || 0;
			let effectiveType = txTipo || null;
			let effectiveAmount = numericAmount;
			let effectiveMetodo = txMetodo || null;
			let effectiveDescription = txDescripcion || null;
			const payload: any = {
				date: txDate,
				// send both english/spanish names - server accepts either
				type: effectiveType,
				tipo: effectiveType,
				metodo: effectiveMetodo,
				categoria: txCategoria || null,
				amount: effectiveAmount,
				monto: effectiveAmount,
				description: effectiveDescription,
				descripcion: effectiveDescription,
				account_id: txAccountId,
				accountId: txAccountId,
				bank_id: selectedAccount?.bank_id ?? selectedAccount?.bank_code ?? null,
				bankId: selectedAccount?.bank_id ?? selectedAccount?.bank_code ?? null,
				// ensure we always send a currency: prefer account.currency, else derive from account type (USD vs CLP), fallback to 'CLP'
				currency:
					selectedAccount?.currency ??
					(selectedAccount?.type && /_?usd$/i.test(String(selectedAccount.type))
						? "USD"
						: "CLP"),
			};

			// If we have a selected account, capture balance_before/after on the client as a fallback
			if (selectedAccount) {
				const currentBal = Number(selectedAccount.balance ?? 0) || 0;
				const requestedType = String(txTipo || "").toLowerCase();
				if (requestedType === "ajuste") {
					const targetBalance = numericAmount;
					const delta = targetBalance - currentBal;
					if (delta === 0) {
						setError("El saldo ingresado ya coincide con el saldo actual.");
						setLoading(false);
						return;
					}
					effectiveType = delta < 0 ? "egreso" : "ingreso";
					effectiveAmount = Math.abs(delta);
					effectiveMetodo = "ajuste";
					effectiveDescription =
						txDescripcion?.trim() ||
						`Ajuste de saldo a ${formatBalanceDisplayByType(selectedAccount.type, targetBalance)}`;
					payload.type = effectiveType;
					payload.tipo = effectiveType;
					payload.amount = effectiveAmount;
					payload.monto = effectiveAmount;
					payload.metodo = effectiveMetodo;
					payload.description = effectiveDescription;
					payload.descripcion = effectiveDescription;
					payload.balance_before = currentBal;
					payload.balance_after = targetBalance;
				} else {
					const t = String(effectiveType || "").toLowerCase();
					const delta =
						t === "egreso"
							? -Math.abs(effectiveAmount)
							: Math.abs(effectiveAmount);
					payload.balance_before = currentBal;
					payload.balance_after = currentBal + delta;
				}
			}
			// Include user's supabase access token in Authorization header so server can
			// authenticate the request (route.ts expects a Bearer token).
			const headers: any = { "Content-Type": "application/json" };
			try {
				const sess = await supabase.auth.getSession();
				const token = (sess as any)?.data?.session?.access_token;
				if (token) headers.Authorization = `Bearer ${token}`;
			} catch (_e) {
				// ignore session errors and continue without auth header
			}
			const res = await fetch("/api/transactions", {
				method: "POST",
				headers: headers,
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!data || !data.success) {
				setError(data?.error || "Error al guardar movimiento");
				setLoading(false);
				return;
			}
			setSuccess("Movimiento registrado.");
			// reset form and close modal
			closeTxModal();
			// refresh accounts to reflect used amounts
			await fetchAccounts();
		} catch (e: any) {
			setError(e?.message || String(e));
		} finally {
			setLoading(false);
		}
	};

	// submit a transfer: create an egreso on origin and ingreso on destination
	const handleSubmitTransfer = async () => {
		setError(null);
		setLoading(true);
		try {
			if (!txTransferOriginAccount || !txTransferDestAccount || !txAmount) {
				setError("Selecciona origen, destino y monto.");
				setLoading(false);
				return;
			}
			const originAcc = (accounts || []).find(
				(a) => String(a.id) === String(txTransferOriginAccount),
			);
			const destAcc = (accounts || []).find(
				(a) => String(a.id) === String(txTransferDestAccount),
			);
			if (!originAcc || !destAcc) {
				setError("No se encontraron las cuentas seleccionadas.");
				setLoading(false);
				return;
			}
			const numericAmount =
				Number(String(txAmount || "").replace(/[^0-9.-]/g, "")) || 0;
			if (numericAmount <= 0) {
				setError("El monto debe ser mayor a 0.");
				setLoading(false);
				return;
			}
			// build payloads for origin (egreso) and dest (ingreso)
			const buildPayload = (acc: any, tipo: string, desc: string) => {
				const currentBal = Number(acc.balance ?? 0) || 0;
				const delta =
					tipo === "egreso"
						? -Math.abs(numericAmount)
						: Math.abs(numericAmount);
				return {
					date: txDate,
					tipo: tipo,
					metodo: txMetodo || null,
					amount: numericAmount,
					monto: numericAmount,
					description: desc,
					descripcion: desc,
					account_id: acc.id,
					accountId: acc.id,
					bank_id: acc.bank_id ?? acc.bank_code ?? null,
					bankId: acc.bank_id ?? acc.bank_code ?? null,
					currency:
						acc.currency ??
						(acc.type && /_?usd$/i.test(String(acc.type)) ? "USD" : "CLP"),
					balance_before: currentBal,
					balance_after: currentBal + delta,
				};
			};
			const originDesc =
				txDescripcion ||
				`Transferencia a ${destAcc.bank_name} ${getAccountTypeLabel(destAcc.type, destAcc.bank_name)}`;
			const destDesc =
				txDescripcion ||
				`Transferencia desde ${originAcc.bank_name} ${getAccountTypeLabel(originAcc.type, originAcc.bank_name)}`;
			const payloadOrigin = buildPayload(originAcc, "egreso", originDesc);
			const payloadDest = buildPayload(destAcc, "ingreso", destDesc);
			const headers: any = { "Content-Type": "application/json" };
			try {
				const sess = await supabase.auth.getSession();
				const token = (sess as any)?.data?.session?.access_token;
				if (token) headers.Authorization = `Bearer ${token}`;
			} catch (_e) {}
			// post origin
			let res = await fetch("/api/transactions", {
				method: "POST",
				headers,
				body: JSON.stringify(payloadOrigin),
			});
			let data = await res.json();
			if (!data || !data.success) {
				setError(data?.error || "Error al registrar transferencia (origen)");
				setLoading(false);
				return;
			}
			// post destination
			res = await fetch("/api/transactions", {
				method: "POST",
				headers,
				body: JSON.stringify(payloadDest),
			});
			data = await res.json();
			if (!data || !data.success) {
				setError(data?.error || "Error al registrar transferencia (destino)");
				setLoading(false);
				return;
			}
			setSuccess("Transferencia registrada.");
			closeTxModal();
			await fetchAccounts();
		} catch (e: any) {
			setError(e?.message || String(e));
		} finally {
			setLoading(false);
		}
	};

	// submit a pay action: create an egreso on origin and ingreso on destination (same pattern as transfer)
	const handleSubmitPay = async () => {
		setError(null);
		setLoading(true);
		try {
			if (!txPayOriginAccount || !txPayDestAccount || !txAmount) {
				setError("Selecciona origen, destino y monto.");
				setLoading(false);
				return;
			}
			const originAcc = (accounts || []).find(
				(a) => String(a.id) === String(txPayOriginAccount),
			);
			const destAcc = (accounts || []).find(
				(a) => String(a.id) === String(txPayDestAccount),
			);
			if (!originAcc || !destAcc) {
				setError("No se encontraron las cuentas seleccionadas.");
				setLoading(false);
				return;
			}
			const numericAmount =
				Number(String(txAmount || "").replace(/[^0-9.-]/g, "")) || 0;
			if (numericAmount <= 0) {
				setError("El monto debe ser mayor a 0.");
				setLoading(false);
				return;
			}
			const buildPayload = (acc: any, tipo: string, desc: string) => {
				const currentBal = Number(acc.balance ?? 0) || 0;
				const delta =
					tipo === "egreso"
						? -Math.abs(numericAmount)
						: Math.abs(numericAmount);
				return {
					date: txDate,
					tipo: tipo,
					metodo: txMetodo || null,
					amount: numericAmount,
					monto: numericAmount,
					description: desc,
					descripcion: desc,
					account_id: acc.id,
					accountId: acc.id,
					bank_id: acc.bank_id ?? acc.bank_code ?? null,
					bankId: acc.bank_id ?? acc.bank_code ?? null,
					currency:
						acc.currency ??
						(acc.type && /_?usd$/i.test(String(acc.type)) ? "USD" : "CLP"),
					balance_before: currentBal,
					balance_after: currentBal + delta,
				};
			};
			const originDesc =
				txDescripcion ||
				`Pago a ${destAcc.bank_name} ${getAccountTypeLabel(destAcc.type, destAcc.bank_name)}`;
			const destDesc =
				txDescripcion ||
				`Pago desde ${originAcc.bank_name} ${getAccountTypeLabel(originAcc.type, originAcc.bank_name)}`;
			const payloadOrigin = buildPayload(originAcc, "egreso", originDesc);
			const payloadDest = buildPayload(destAcc, "ingreso", destDesc);
			const headers: any = { "Content-Type": "application/json" };
			try {
				const sess = await supabase.auth.getSession();
				const token = (sess as any)?.data?.session?.access_token;
				if (token) headers.Authorization = `Bearer ${token}`;
			} catch (_e) {}
			// post origin (egreso)
			let res = await fetch("/api/transactions", {
				method: "POST",
				headers,
				body: JSON.stringify(payloadOrigin),
			});
			let data = await res.json();
			if (!data || !data.success) {
				setError(data?.error || "Error al registrar pago (origen)");
				setLoading(false);
				return;
			}
			// post destination (ingreso)
			res = await fetch("/api/transactions", {
				method: "POST",
				headers,
				body: JSON.stringify(payloadDest),
			});
			data = await res.json();
			if (!data || !data.success) {
				setError(data?.error || "Error al registrar pago (destino)");
				setLoading(false);
				return;
			}
			setSuccess("Pago registrado.");
			// close pay modal and refresh
			resetTxForm();
			setTxPayOpen(false);
			setTxPayShowNav(false);
			await fetchAccounts();
		} catch (e: any) {
			setError(e?.message || String(e));
		} finally {
			setLoading(false);
		}
	};

	// Auto-advance: when bank and account selected -> section 2
	useEffect(() => {
		if (txSelectedBank && txAccountId) {
			setActiveSection(2);
		}
	}, [txSelectedBank, txAccountId]);

	// Auto-advance for transfer flow: when both origin and dest selected -> section 2
	useEffect(() => {
		if (txIsTransfer && txTransferOriginAccount && txTransferDestAccount) {
			setActiveSection(2);
		}
	}, [txIsTransfer, txTransferOriginAccount, txTransferDestAccount]);

	// Auto-advance: when in section 2 and required fields are filled -> section 3
	// Only advance when the combination of section-2 fields has changed since
	// the last check. This prevents immediately re-advancing when the user
	// clicks "Volver" to go back to section 2.
	useEffect(() => {
		if (activeSection === 2) {
			const amountOk = !!txAmount && txAmount !== "-";
			const fieldsOk = !!txDate && amountOk && !!txTipo && !!txMetodo;
			const signature = `${txDate || ""}|${txAmount || ""}|${txTipo || ""}|${txMetodo || ""}`;
			const prev = section2SignatureRef.current;
			if (fieldsOk && signature !== prev) {
				section2SignatureRef.current = signature;
				setActiveSection(3);
			} else {
				// keep the ref up to date so future changes are detected
				section2SignatureRef.current = signature;
			}
		}
	}, [activeSection, txDate, txAmount, txTipo, txMetodo]);

	// Ensure nav arrows show when a modal is open and the user is past section 1
	useEffect(() => {
		if (txTransferOpen && activeSection > 1) {
			setTxTransferShowNav(true);
		}
	}, [txTransferOpen, activeSection]);

	useEffect(() => {
		if (txPayOpen && activeSection > 1) {
			setTxPayShowNav(true);
		}
	}, [txPayOpen, activeSection]);

	const txSelectedAccountIsUsd = useMemo(() => {
		if (!txAccountId) return false;
		const acc = (accounts || []).find(
			(a) => String(a.id) === String(txAccountId),
		);
		if (!acc) return false;
		const currency = String(acc.currency || "").toUpperCase();
		if (currency === "USD") return true;
		return /_?usd$/i.test(String(acc.type || ""));
	}, [txAccountId, accounts]);

	const selectedTxAccount = useMemo(() => {
		if (!txAccountId) return null;
		return (
			(accounts || []).find((a) => String(a.id) === String(txAccountId)) || null
		);
	}, [txAccountId, accounts]);

	const txSelectedAccountIsCredit = useMemo(() => {
		if (!selectedTxAccount) return false;
		return isCreditAccountType(selectedTxAccount.type, selectedTxAccount.name);
	}, [selectedTxAccount]);

	useEffect(() => {
		if (!selectedTxAccount || !txSelectedAccountIsCredit) {
			setTxCreditLimit("");
			setTxCreditLimitDisplay("");
			setTxEditingCreditLimit(false);
			return;
		}
		const rawLimit =
			selectedTxAccount.credit_limit ?? selectedTxAccount.balance ?? 0;
		const numericLimit = Math.max(0, Number(rawLimit) || 0);
		const normalized = txSelectedAccountIsUsd
			? numericLimit.toFixed(2)
			: String(Math.trunc(numericLimit));
		setTxCreditLimit(normalized);
		setTxCreditLimitDisplay("");
		setTxEditingCreditLimit(false);
	}, [selectedTxAccount, txSelectedAccountIsCredit, txSelectedAccountIsUsd]);

	// When a product (dest account) is selected during Pay flow and we're on section 2,
	// advance to the Fecha/Monto section. Using an effect ensures the navigation happens
	// after React commits the new txPayDestAccount state (avoids needing two clicks).
	useEffect(() => {
		if (txPayOpen && activeSection === 2 && txPayDestAccount) {
			setActiveSection(3);
		}
	}, [txPayDestAccount, txPayOpen, activeSection]);

	const handleTxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let raw = e.target.value || "";
		if (txSelectedAccountIsUsd) {
			// USD: mantener '.' como miles y usar ',' como decimal.
			// 1) quitar caracteres no válidos, 2) quitar puntos (miles),
			// 3) conservar una sola coma decimal y hasta 2 decimales.
			raw = raw.replace(/[^0-9,.-]/g, "");
			raw = raw.replace(/\./g, "");
			raw = raw.replace(/-/g, "");
			const parts = raw.split(",");
			const integerPart = (parts[0] || "").replace(/\D/g, "");
			const decimalPart = (parts.slice(1).join("") || "")
				.replace(/\D/g, "")
				.slice(0, 2);
			const hasCommaIntent = parts.length > 1;
			const limited = hasCommaIntent
				? `${integerPart},${decimalPart}`
				: integerPart;
			// Normalizar valor interno (coma -> punto)
			const normalized = normalizeAmountInput(limited, true);
			setTxAmount(normalized);
			const display = hasCommaIntent
				? `${formatLiveDisplay(integerPart || "0", true)},${decimalPart}`
				: formatLiveDisplay(normalized, true) || "";
			setTxAmountDisplay(display);
		} else {
			// CLP: solo enteros
			const cleaned = raw.replace(/[^0-9-]/g, "");
			const normalized = normalizeAmountInput(cleaned, false);
			setTxAmount(normalized);
			const display = formatLiveDisplay(normalized, false) || "";
			setTxAmountDisplay(display);
		}
	};

	const handleTxAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// En USD, '.' no debe convertirse en decimal.
		if (txSelectedAccountIsUsd) {
			if (e.key === ".") {
				e.preventDefault();
				return;
			}
		}
	};

	const handleTxAmountPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const paste = (e.clipboardData.getData("text") || "").trim();
		if (!paste) return;
		if (txSelectedAccountIsUsd) {
			// Normalize pasted value: remove dots used as thousands, accept comma as decimal
			let cleaned = paste.replace(/\./g, "");
			// Replace any commas with a single comma (keep first occurrence)
			cleaned = cleaned.replace(/[^0-9,]/g, "");
			const parts = cleaned.split(",");
			if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
			if (parts[1]) parts[1] = parts[1].slice(0, 2);
			const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
			const normalized = normalizeAmountInput(limited, true);
			setTxAmount(normalized);
			setTxAmountDisplay(formatLiveDisplay(normalized, true) || "");
		} else {
			// CLP: keep digits only
			const cleaned = paste.replace(/[^0-9-]/g, "");
			const normalized = normalizeAmountInput(cleaned, false);
			setTxAmount(normalized);
			setTxAmountDisplay(formatLiveDisplay(normalized, false) || "");
		}
	};

	const handleTxAmountFocus = () => {
		setTxEditingAmount(true);
		setTxAmountDisplay(
			formatLiveDisplay(txAmount, txSelectedAccountIsUsd) || "",
		);
	};

	const handleTxAmountBlur = () => {
		setTxEditingAmount(false);
		setTxAmountDisplay("");
	};

	const handleTxCreditLimitChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		let raw = e.target.value || "";
		if (txSelectedAccountIsUsd) {
			raw = raw.replace(/[^0-9,.-]/g, "");
			raw = raw.replace(/\./g, "");
			raw = raw.replace(/-/g, "");
			const parts = raw.split(",");
			const integerPart = (parts[0] || "").replace(/\D/g, "");
			const decimalPart = (parts.slice(1).join("") || "")
				.replace(/\D/g, "")
				.slice(0, 2);
			const hasCommaIntent = parts.length > 1;
			const limited = hasCommaIntent
				? `${integerPart},${decimalPart}`
				: integerPart;
			const normalized = normalizePositiveInput(limited, true);
			setTxCreditLimit(normalized);
			const display = hasCommaIntent
				? `${formatLiveDisplay(integerPart || "0", true)},${decimalPart}`
				: formatLiveDisplay(normalized, true) || "";
			setTxCreditLimitDisplay(display);
			return;
		}
		const cleaned = raw.replace(/[^0-9]/g, "");
		const normalized = normalizePositiveInput(cleaned, false);
		setTxCreditLimit(normalized);
		setTxCreditLimitDisplay(formatLiveDisplay(normalized, false) || "");
	};

	const handleTxCreditLimitFocus = () => {
		setTxEditingCreditLimit(true);
		setTxCreditLimitDisplay(
			formatLiveDisplay(txCreditLimit, txSelectedAccountIsUsd) || "",
		);
	};

	const handleTxCreditLimitBlur = () => {
		setTxEditingCreditLimit(false);
		setTxCreditLimitDisplay("");
	};

	const handleSaveCreditLimit = async () => {
		if (!selectedTxAccount || !txSelectedAccountIsCredit) return;
		const accountId = String(selectedTxAccount.id || "");
		if (!accountId || !isUuid(accountId)) {
			setError("Cuenta inválida para actualizar cupo.");
			return;
		}

		let parsed = Number(txCreditLimit || 0);
		if (!Number.isFinite(parsed) || parsed < 0) {
			setError("El cupo debe ser un número válido mayor o igual a 0.");
			return;
		}

		parsed = txSelectedAccountIsUsd
			? Number(parsed.toFixed(2))
			: Math.trunc(parsed);

		setError(null);
		setSuccess(null);
		setTxUpdatingCreditLimit(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch("/api/admin/transactions/update-credit-limit", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(session?.access_token
						? { Authorization: `Bearer ${session.access_token}` }
						: {}),
				},
				body: JSON.stringify({ accountId, creditLimit: parsed }),
			});
			const payload = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
				account?: { id?: string; credit_limit?: number | null };
			};
			if (!res.ok || !payload.success) {
				throw new Error(payload.error || "No se pudo actualizar el cupo.");
			}

			const nextLimit =
				payload.account?.credit_limit !== undefined &&
				payload.account?.credit_limit !== null
					? Number(payload.account.credit_limit)
					: parsed;
			setAccounts((prev) =>
				prev.map((acc) =>
					String(acc.id) === accountId
						? { ...acc, credit_limit: nextLimit }
						: acc,
				),
			);
			setSuccess("Cupo actualizado.");
			await fetchAccounts();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "No se pudo actualizar el cupo.",
			);
		} finally {
			setTxUpdatingCreditLimit(false);
		}
	};

	// Helpers for formatting
	function normalizeAmountInput(raw: string, isUsd = false) {
		// Only treat as negative when the user explicitly types a leading '-'
		const hasMinus = String(raw || "")
			.trim()
			.startsWith("-");

		if (!isUsd) {
			// CLP: solo números, sin decimales
			let cleaned = raw.replace(/[^0-9-]/g, "");
			cleaned = cleaned.replace(/-/g, "");
			return hasMinus ? `-${cleaned}` : cleaned;
		}

		// USD: permitir números y una coma como separador decimal
		let cleaned = raw.replace(/[^0-9,-]/g, "");
		cleaned = cleaned.replace(/-/g, "");

		// Manejar la coma como separador decimal
		const parts = cleaned.split(",");
		if (parts.length > 2) {
			// Solo permitir una coma
			cleaned = `${parts[0]},${parts[1]}`;
		}

		// Convertir coma a punto para el valor interno
		const normalized = cleaned.replace(",", ".");

		return hasMinus ? `-${normalized}` : normalized;
	}

	function formatAmountDisplay(val: string, isUsd = false) {
		if (!val) return "";
		if (val === "-") return isUsd ? "- US$ " : "- $ ";
		const num = Number(val);
		if (Number.isNaN(num)) return val;
		if (isUsd) {
			const formatted = Math.abs(num).toLocaleString("es-CL", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			});
			return num < 0 ? `- US$ ${formatted}` : `US$ ${formatted}`;
		}
		const formatted = Math.abs(num).toLocaleString("es-CL");
		return num < 0 ? `- $ ${formatted}.-` : `$ ${formatted}.-`;
	}

	function formatBalanceDisplayNum(num: number) {
		const formatted = Math.abs(num).toLocaleString("es-CL");
		return num < 0 ? `- $ ${formatted}.-` : `$ ${formatted}.-`;
	}

	function formatBalanceDisplayByType(type: string | undefined, num: number) {
		const isUsd = !!type && /_?usd$/i.test(String(type));
		if (isUsd) {
			const formatted = Math.abs(num).toLocaleString("es-CL", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			});
			return num < 0 ? `- US$ ${formatted}` : `US$ ${formatted}`;
		}
		const formatted = Math.abs(num).toLocaleString("es-CL");
		return num < 0 ? `- $ ${formatted}.-` : `$ ${formatted}.-`;
	}

	function normalizePositiveInput(raw: string, isUsd = false) {
		let cleaned = raw.replace(/[^0-9.,]/g, "");
		// For CLP, strip grouping separators
		if (!isUsd) {
			cleaned = cleaned.replace(/[.,]/g, "");
		}
		// strip extra separators, prefer first
		const firstDot = cleaned.indexOf(".");
		const firstComma = cleaned.indexOf(",");
		let separatorIndex = -1;
		if (firstDot >= 0 && (firstComma === -1 || firstDot < firstComma))
			separatorIndex = firstDot;
		else if (firstComma >= 0) separatorIndex = firstComma;
		if (separatorIndex >= 0 && isUsd) {
			const integer = cleaned.slice(0, separatorIndex).replace(/[^0-9]/g, "");
			const decimal = cleaned.slice(separatorIndex + 1).replace(/[^0-9]/g, "");
			// If decimal part looks like a thousands group (3 digits) treat as grouping
			if (decimal.length === 3) {
				return (integer + decimal).replace(/[^0-9]/g, "");
			}
			return decimal ? `${integer}.${decimal}` : integer;
		}
		return cleaned.replace(/[^0-9]/g, "");
	}

	// Handlers to show grouped display while keeping a normalized value and preserving caret
	const handleInitialInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let raw = e.target.value;
		// Para USD, permitir coma explícitamente
		if (isUsdSelected) {
			// Permitir solo números, coma y guión (para negativos)
			raw = raw.replace(/[^0-9,-]/g, "");
			// Solo una coma
			const parts = raw.split(",");
			if (parts.length > 2) raw = `${parts[0]},${parts.slice(1).join("")}`;
			// Limitar decimales a 2
			if (parts[1]) raw = `${parts[0]},${parts[1].slice(0, 2)}`;
		}
		const sel = e.target.selectionStart ?? raw.length;
		const digitsBefore = (raw.slice(0, sel).match(/\d/g) || []).length;
		const normalized = normalizeAmountInput(raw, isUsdSelected);
		setInitialAmount(normalized);
		const newDisplay = formatLiveDisplay(normalized, isUsdSelected) || "";
		setEditingInitialDisplay(newDisplay);
		// restore caret position based on digit count
		setTimeout(() => {
			const input = initialInputRef.current;
			if (!input) return;
			let seen = 0;
			let pos = newDisplay.length;
			for (let i = 0; i < newDisplay.length; i++) {
				if (/\d/.test(newDisplay[i])) seen++;
				if (seen >= digitsBefore) {
					pos = i + 1;
					break;
				}
			}
			input.setSelectionRange(pos, pos);
		}, 0);
	};

	const handleTxBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
		// onBeforeInput gives us the raw character the user is trying to insert
		try {
			const inputEvent = e.nativeEvent as InputEvent | any;
			const data = inputEvent.data;
			if (!txSelectedAccountIsUsd) return;
			if (!data) return;
			const input = txAmountRef.current;
			if (!input) return;
			// En USD, ignorar '.' (el separador decimal válido es ',').
			if (data === ".") {
				e.preventDefault();
				return;
			}
			// If user types a comma but there's already one, prevent
			if (data === ",") {
				const cur = input.value || "";
				if (cur.includes(",")) {
					e.preventDefault();
					return;
				}
				// allow comma
			}
		} catch (_err) {
			// ignore
		}
	};

	const handleInitialFocus = () => {
		setEditingInitial(true);
		setEditingInitialDisplay(
			formatLiveDisplay(initialAmount, isUsdSelected) || "",
		);
	};

	const handleInitialBlur = () => {
		setEditingInitial(false);
		setEditingInitialDisplay("");
	};

	const handleInitialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Block dot key and convert to comma for USD
		if (isUsdSelected) {
			if (e.key === ".") {
				e.preventDefault();
				const input = initialInputRef.current;
				if (!input) return;
				const start = input.selectionStart ?? 0;
				const end = input.selectionEnd ?? 0;
				const cur = input.value || "";
				const next = `${cur.slice(0, start)},${cur.slice(end)}`;
				let cleaned = next.replace(/[^0-9,-]/g, "");
				const parts = cleaned.split(",");
				if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
				if (parts[1]) parts[1] = parts[1].slice(0, 2);
				const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
				const normalized = normalizeAmountInput(limited, true);
				setInitialAmount(normalized);
				setEditingInitialDisplay(
					formatLiveDisplay(normalized, true) || limited,
				);
				setTimeout(() => {
					try {
						input.setSelectionRange(start + 1, start + 1);
					} catch (_err) {}
				}, 0);
				return;
			}
		}
	};

	const handleInitialPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const paste = (e.clipboardData.getData("text") || "").trim();
		if (!paste) return;
		if (isUsdSelected) {
			// Normalize pasted value: remove dots used as thousands, accept comma as decimal
			let cleaned = paste.replace(/\./g, "");
			cleaned = cleaned.replace(/[^0-9,-]/g, "");
			const parts = cleaned.split(",");
			if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
			if (parts[1]) parts[1] = parts[1].slice(0, 2);
			const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
			const normalized = normalizeAmountInput(limited, true);
			setInitialAmount(normalized);
			setEditingInitialDisplay(formatLiveDisplay(normalized, true) || "");
		} else {
			// CLP: keep digits only
			const cleaned = paste.replace(/[^0-9-]/g, "");
			const normalized = normalizeAmountInput(cleaned, false);
			setInitialAmount(normalized);
			setEditingInitialDisplay(formatLiveDisplay(normalized, false) || "");
		}
	};

	const handleInitialBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
		try {
			const inputEvent = e.nativeEvent as InputEvent | any;
			const data = inputEvent.data;
			if (!isUsdSelected) return;
			if (!data) return;
			const input = initialInputRef.current;
			if (!input) return;
			// If user types a dot, convert to comma
			if (data === ".") {
				e.preventDefault();
				const start = input.selectionStart ?? 0;
				const end = input.selectionEnd ?? 0;
				const cur = input.value || "";
				const next = `${cur.slice(0, start)},${cur.slice(end)}`;
				let cleaned = next.replace(/[^0-9,-]/g, "");
				const parts = cleaned.split(",");
				if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
				if (parts[1]) parts[1] = parts[1].slice(0, 2);
				const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
				const normalized = normalizeAmountInput(limited, true);
				setInitialAmount(normalized);
				setEditingInitialDisplay(
					formatLiveDisplay(normalized, true) || limited,
				);
				setTimeout(() => {
					try {
						input.setSelectionRange(start + 1, start + 1);
					} catch (_err) {}
				}, 0);
				return;
			}
			// If user types a comma but there's already one, prevent
			if (data === ",") {
				const cur = input.value || "";
				if (cur.includes(",")) {
					e.preventDefault();
					return;
				}
				// allow comma
			}
		} catch (_err) {
			// ignore
		}
	};

	const handleCreditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let raw = e.target.value;
		// Para USD, permitir coma explícitamente
		if (isUsdSelected) {
			// Permitir solo números y coma
			raw = raw.replace(/[^0-9,]/g, "");
			// Solo una coma
			const parts = raw.split(",");
			if (parts.length > 2) raw = `${parts[0]},${parts.slice(1).join("")}`;
			// Limitar decimales a 2
			if (parts[1]) raw = `${parts[0]},${parts[1].slice(0, 2)}`;
		}
		const sel = e.target.selectionStart ?? raw.length;
		const digitsBefore = (raw.slice(0, sel).match(/\d/g) || []).length;
		const normalized = normalizePositiveInput(raw, isUsdSelected);
		setCreditLimit(normalized);
		const newDisplay = formatLiveDisplay(normalized, isUsdSelected) || "";
		setEditingCreditDisplay(newDisplay);
		setTimeout(() => {
			const input = creditInputRef.current;
			if (!input) return;
			let seen = 0;
			let pos = newDisplay.length;
			for (let i = 0; i < newDisplay.length; i++) {
				if (/\d/.test(newDisplay[i])) seen++;
				if (seen >= digitsBefore) {
					pos = i + 1;
					break;
				}
			}
			input.setSelectionRange(pos, pos);
		}, 0);
	};

	const handleCreditFocus = () => {
		setEditingCredit(true);
		setEditingCreditDisplay(
			formatLiveDisplay(creditLimit, isUsdSelected) || "",
		);
	};

	const handleCreditBlur = () => {
		setEditingCredit(false);
		setEditingCreditDisplay("");
	};

	const handleCreditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Block dot key and convert to comma for USD
		if (isUsdSelected) {
			if (e.key === ".") {
				e.preventDefault();
				const input = creditInputRef.current;
				if (!input) return;
				const start = input.selectionStart ?? 0;
				const end = input.selectionEnd ?? 0;
				const cur = input.value || "";
				const next = `${cur.slice(0, start)},${cur.slice(end)}`;
				let cleaned = next.replace(/[^0-9,]/g, "");
				const parts = cleaned.split(",");
				if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
				if (parts[1]) parts[1] = parts[1].slice(0, 2);
				const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
				const normalized = normalizePositiveInput(limited, true);
				setCreditLimit(normalized);
				setEditingCreditDisplay(formatLiveDisplay(normalized, true) || limited);
				setTimeout(() => {
					try {
						input.setSelectionRange(start + 1, start + 1);
					} catch (_err) {}
				}, 0);
				return;
			}
		}
	};

	const handleCreditPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const paste = (e.clipboardData.getData("text") || "").trim();
		if (!paste) return;
		if (isUsdSelected) {
			// Normalize pasted value: remove dots used as thousands, accept comma as decimal
			let cleaned = paste.replace(/\./g, "");
			cleaned = cleaned.replace(/[^0-9,]/g, "");
			const parts = cleaned.split(",");
			if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
			if (parts[1]) parts[1] = parts[1].slice(0, 2);
			const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
			const normalized = normalizePositiveInput(limited, true);
			setCreditLimit(normalized);
			setEditingCreditDisplay(formatLiveDisplay(normalized, true) || "");
		} else {
			// CLP: keep digits only
			const cleaned = paste.replace(/[^0-9]/g, "");
			const normalized = normalizePositiveInput(cleaned, false);
			setCreditLimit(normalized);
			setEditingCreditDisplay(formatLiveDisplay(normalized, false) || "");
		}
	};

	const handleCreditBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
		try {
			const inputEvent = e.nativeEvent as InputEvent | any;
			const data = inputEvent.data;
			if (!isUsdSelected) return;
			if (!data) return;
			const input = creditInputRef.current;
			if (!input) return;
			// If user types a dot, convert to comma
			if (data === ".") {
				e.preventDefault();
				const start = input.selectionStart ?? 0;
				const end = input.selectionEnd ?? 0;
				const cur = input.value || "";
				const next = `${cur.slice(0, start)},${cur.slice(end)}`;
				let cleaned = next.replace(/[^0-9,]/g, "");
				const parts = cleaned.split(",");
				if (parts.length > 2) cleaned = `${parts[0]},${parts[1]}`;
				if (parts[1]) parts[1] = parts[1].slice(0, 2);
				const limited = parts[1] ? `${parts[0]},${parts[1]}` : parts[0];
				const normalized = normalizePositiveInput(limited, true);
				setCreditLimit(normalized);
				setEditingCreditDisplay(formatLiveDisplay(normalized, true) || limited);
				setTimeout(() => {
					try {
						input.setSelectionRange(start + 1, start + 1);
					} catch (_err) {}
				}, 0);
				return;
			}
			// If user types a comma but there's already one, prevent
			if (data === ",") {
				const cur = input.value || "";
				if (cur.includes(",")) {
					e.preventDefault();
					return;
				}
				// allow comma
			}
		} catch (_err) {
			// ignore
		}
	};

	/* biome-ignore lint/correctness/useExhaustiveDependencies: fetchAccounts is a local callback; this effect is intended to run on mount */
	useEffect(() => {
		fetchAccounts();
	}, []);

	/* biome-ignore lint/correctness/useExhaustiveDependencies: fetchAccounts is a local callback; this effect is intended to run only when success changes */
	useEffect(() => {
		if (success) fetchAccounts();
	}, [success]);

	// Real-time updates: subscribe to changes in rt_personal_accounts
	useEffect(() => {
		const channel = supabase
			.channel("public:rt_personal_accounts")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "rt_personal_accounts" },
				(payload) => {
					const newRow = payload.new;
					if (!newRow) return;
					let bankName = "Otro";
					if (newRow.bank_id || newRow.bank_code) {
						const found = BANK_CATALOG.find(
							(b) => b.code === newRow.bank_id || b.code === newRow.bank_code,
						);
						bankName = found ? found.name : newRow.name || "Otro";
					} else if (newRow.name) {
						bankName = newRow.name;
					}
					setAccounts((prev) => {
						// if already present, replace; otherwise append
						const exists = prev.findIndex(
							(a) => String(a.id) === String(newRow.id),
						);
						if (exists >= 0) {
							const copy = prev.slice();
							copy[exists] = { ...newRow, bank_name: bankName };
							return copy;
						}
						return [...prev, { ...newRow, bank_name: bankName }];
					});
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "rt_personal_accounts" },
				(payload) => {
					const newRow = payload.new;
					if (!newRow) return;
					let bankName = "Otro";
					if (newRow.bank_id || newRow.bank_code) {
						const found = BANK_CATALOG.find(
							(b) => b.code === newRow.bank_id || b.code === newRow.bank_code,
						);
						bankName = found ? found.name : newRow.name || "Otro";
					} else if (newRow.name) {
						bankName = newRow.name;
					}
					setAccounts((prev) => {
						const idx = prev.findIndex(
							(a) => String(a.id) === String(newRow.id),
						);
						if (idx >= 0) {
							const copy = prev.slice();
							copy[idx] = { ...newRow, bank_name: bankName };
							return copy;
						}
						// if not found, append
						return [...prev, { ...newRow, bank_name: bankName }];
					});
				},
			)
			.on(
				"postgres_changes",
				{ event: "DELETE", schema: "public", table: "rt_personal_accounts" },
				(payload) => {
					const oldRow = payload.old;
					if (!oldRow) return;
					setAccounts((prev) => prev.filter((a) => a.id !== oldRow.id));
				},
			)
			.subscribe();

		return () => {
			try {
				supabase.removeChannel(channel);
			} catch (_e) {
				// fallback: try unsubscribe if removeChannel not available
				if ((channel as any)?.unsubscribe) (channel as any).unsubscribe();
			}
		};
	}, []);

	const availableTypes = useMemo(() => {
		if (!selectedBank) return [] as string[];
		const code = selectedBank.code;
		let entry = code ? BANK_CATALOG.find((b) => b.code === code) : undefined;
		if (!entry && selectedBank.name) {
			const name = String(selectedBank.name).trim().toLowerCase();
			entry = BANK_CATALOG.find((b) => b.name.trim().toLowerCase() === name);
		}
		return entry?.types ?? [];
	}, [selectedBank]);

	useEffect(() => {
		if (availableTypes.length > 0) {
			setSelectedType(availableTypes[0]);
		} else {
			setSelectedType(null);
		}
	}, [availableTypes]);

	const isUsdSelected = !!selectedType && /_?usd$/i.test(String(selectedType));
	const needsCreditLimit =
		!!selectedType && /credit/i.test(String(selectedType));

	// matching left padding for page content so body aligns with the header/aside
	const contentLeftClass = isCollapsed ? "lg:pl-2" : "lg:pl-2";

	const handleCreateAccount = async () => {
		if (creatingAccountRef.current || loading) return;
		creatingAccountRef.current = true;
		setLoading(true);
		setError(null);
		setSuccess(null);
		const needsCreditLimit =
			!!selectedType && /credit/i.test(String(selectedType));
		const isUsd = !!selectedType && /_?usd$/i.test(String(selectedType));
		try {
			if (
				!selectedBank ||
				!selectedType ||
				!initialAmount ||
				initialAmount === "-" ||
				(needsCreditLimit && (!creditLimit || creditLimit === ""))
			) {
				setError("Completa todos los campos.");
				setLoading(false);
				creatingAccountRef.current = false;
				return;
			}
			const duplicateCount = (accounts || []).filter((acc) => {
				const sameBank =
					(acc.bank_id && selectedBank.id && acc.bank_id === selectedBank.id) ||
					(acc.bank_code &&
						selectedBank.code &&
						acc.bank_code === selectedBank.code) ||
					(acc.bank_name &&
						selectedBank.name &&
						acc.bank_name === selectedBank.name);
				return sameBank && acc.type === selectedType;
			}).length;

			const baseLabel =
				getAccountTypeLabel(selectedType, selectedBank.code) ||
				String(selectedType);
			const _insertName = selectedBank.name;
			if (duplicateCount > 0) {
				const proposed = `${baseLabel} ${duplicateCount + 1}`;
				const ok =
					typeof window !== "undefined"
						? window.confirm(
								`Ya existe una cuenta de este tipo para ${selectedBank.name}.\nCrear como '${proposed}'?`,
							)
						: true;
				if (!ok) {
					setLoading(false);
					creatingAccountRef.current = false;
					return;
				}
			}

			let resolvedBankId: string | null = isUuid(selectedBank?.id)
				? selectedBank.id
				: null;
			const selectedBankCode = selectedBank?.code
				? String(selectedBank.code)
				: null;
			const selectedBankName = selectedBank?.name
				? String(selectedBank.name)
				: null;

			if (!resolvedBankId) {
				let existingBank: { id: string; name?: string | null } | null = null;

				if (selectedBankCode) {
					const { data } = await supabase
						.from("rt_personal_banks")
						.select("id, name")
						.eq("code", selectedBankCode)
						.limit(1)
						.maybeSingle();
					if (data?.id)
						existingBank = data as { id: string; name?: string | null };
				}

				if (!existingBank && selectedBankName) {
					const { data } = await supabase
						.from("rt_personal_banks")
						.select("id, name")
						.eq("name", selectedBankName)
						.limit(1)
						.maybeSingle();
					if (data?.id)
						existingBank = data as { id: string; name?: string | null };
				}

				if (existingBank?.id) {
					resolvedBankId = existingBank.id;
				} else {
					const {
						data: { session },
					} = await supabase.auth.getSession();
					const createBankRes = await fetch(
						"/api/admin/transactions/create-bank",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...(session?.access_token
									? { Authorization: `Bearer ${session.access_token}` }
									: {}),
							},
							body: JSON.stringify({
								name: selectedBankName || selectedBankCode || "Banco",
								code: selectedBankCode || undefined,
							}),
						},
					);
					const createBankPayload = (await createBankRes
						.json()
						.catch(() => ({}))) as {
						success?: boolean;
						error?: string;
						bank?: { id?: string; name?: string | null };
					};

					const createdBank = createBankPayload.bank;
					if (
						!createBankRes.ok ||
						!createBankPayload.success ||
						!createdBank?.id
					) {
						throw new Error(
							createBankPayload.error ||
								"No se pudo crear el banco seleccionado.",
						);
					}

					resolvedBankId = createdBank.id;
					setSelectedBank((prev: any) =>
						prev
							? {
									...prev,
									id: createdBank.id,
									name: createdBank.name ?? prev.name,
								}
							: prev,
					);
				}
			}

			const insertPayload: any = {
				bank_id: resolvedBankId,
				type: selectedType,
				name: selectedBankName || selectedBankCode || "Banco",
			};
			if (needsCreditLimit) {
				// initialAmount represents the available balance for credit accounts
				insertPayload.balance = isUsd
					? parseFloat(initialAmount)
					: Number(initialAmount);
				// credit_limit comes from the separate credit input
				insertPayload.credit_limit = isUsd
					? parseFloat(creditLimit)
					: Number(creditLimit);
			} else {
				insertPayload.balance = isUsd
					? parseFloat(initialAmount)
					: Number(initialAmount);
				insertPayload.credit_limit = null;
			}

			const {
				data: { session },
			} = await supabase.auth.getSession();
			const createAccountRes = await fetch(
				"/api/admin/transactions/create-account",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(session?.access_token
							? { Authorization: `Bearer ${session.access_token}` }
							: {}),
					},
					body: JSON.stringify(insertPayload),
				},
			);
			const createAccountPayload = (await createAccountRes
				.json()
				.catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};
			if (!createAccountRes.ok || !createAccountPayload.success) {
				throw new Error(
					createAccountPayload.error || "No se pudo crear la cuenta.",
				);
			}

			setSuccess("Cuenta creada exitosamente.");
			setModalOpen(false);
			setSelectedBank(null);
			setSelectedType(null);
			setInitialAmount("");
			setCreditLimit("");
		} catch (err: any) {
			setError(err.message || "Error al crear la cuenta.");
		} finally {
			setLoading(false);
			creatingAccountRef.current = false;
		}
	};

	const handleDeleteAccount = async (account: any) => {
		const accountLabel = getAccountTypeLabel(
			String(account?.type || ""),
			String(account?.bank_name || ""),
		);
		const ok =
			typeof window !== "undefined"
				? window.confirm(`Eliminar cuenta "${accountLabel}"?`)
				: true;
		if (!ok) return;

		setError(null);
		setSuccess(null);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch("/api/admin/transactions/delete-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(session?.access_token
						? { Authorization: `Bearer ${session.access_token}` }
						: {}),
				},
				body: JSON.stringify({ accountId: account?.id }),
			});
			const payload = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};
			if (!res.ok || !payload.success) {
				throw new Error(payload.error || "No se pudo eliminar la cuenta.");
			}
			setSuccess("Cuenta eliminada.");
			setAccounts((prev) =>
				prev.filter((a) => String(a.id) !== String(account.id)),
			);
			await fetchAccounts();
		} catch (err: any) {
			setError(err?.message || "No se pudo eliminar la cuenta.");
		}
	};

	const handleDeleteBank = async (
		bankId?: string | null,
		bankName?: string,
	) => {
		if (!bankId) {
			setError("No se pudo identificar el banco.");
			return;
		}
		const ok =
			typeof window !== "undefined"
				? window.confirm(
						`Eliminar banco "${bankName || "Banco"}"? Esta acción requiere que no tenga cuentas asociadas.`,
					)
				: true;
		if (!ok) return;

		setError(null);
		setSuccess(null);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch("/api/admin/transactions/delete-bank", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(session?.access_token
						? { Authorization: `Bearer ${session.access_token}` }
						: {}),
				},
				body: JSON.stringify({ bankId }),
			});
			const payload = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};
			if (!res.ok || !payload.success) {
				throw new Error(payload.error || "No se pudo eliminar el banco.");
			}
			setSuccess("Banco eliminado.");
			await fetchAccounts();
		} catch (err: any) {
			setError(err?.message || "No se pudo eliminar el banco.");
		}
	};

	const openAccountMovementModal = (account: any) => {
		setTxSelectedBank(String(account?.bank_name || ""));
		setTxAccountId(String(account?.id || ""));
		setTxTipo(null);
		setTxMetodo(null);
		setTxCategoria(null);
		setTxDescripcion("");
		const isUsd =
			String(account?.currency || "").toUpperCase() === "USD" ||
			/_?usd$/i.test(String(account?.type || ""));
		const currentBalance = Number(account?.balance ?? 0) || 0;
		const normalizedAmount = isUsd
			? currentBalance.toFixed(2)
			: String(Math.trunc(currentBalance));
		setTxAmount(normalizedAmount);
		setTxAmountDisplay("");
		setTxDate(localIsoDate());
		setActiveSection(2);
		setTxModalOpen(true);
	};

	// Totals and debt ratios memoized
	const totals = useMemo(() => {
		const res = {
			balanceCLP: 0,
			creditLimitCLP: 0,
			creditBalancesCLP: 0, // suma de saldos disponibles en cuentas de crédito (cupo disponible por cuenta)
			creditUsedCLP: 0, // cupo usado total = creditLimitCLP - creditBalancesCLP
			checkingBalancesCLP: 0, // suma de saldos para Cuenta corriente / Vista / Ahorro (CLP)
			balanceUSD: 0,
			creditLimitUSD: 0,
			creditBalancesUSD: 0,
			creditUsedUSD: 0,
			checkingBalancesUSD: 0, // suma de saldos para Cuenta corriente / Vista / Ahorro (USD)
			debtRatioCLP: null as number | null,
			debtRatioUSD: null as number | null,
		};
		for (const a of accounts || []) {
			const typeText =
				`${String(a?.type || "")} ${String(a?.name || "")}`.toLowerCase();
			const currencyText = String(a?.currency || "").toUpperCase();
			const isUsd =
				currencyText === "USD" ||
				/(?:_usd|\busd\b|dolar|dólar|us\$|\$us)/i.test(typeText);
			const bal = toNumberSafe(a?.balance); // available balance for credit accounts (cupo disponible)
			const cupo = a?.credit_limit != null ? toNumberSafe(a.credit_limit) : bal;
			// credit types: tarjetas de crédito y líneas de crédito
			const isCreditType =
				/(?:credit|line|línea|linea|tarjeta)/i.test(typeText) &&
				!/(?:checking|savings|corriente|vista|ahorro|rut)/i.test(typeText);
			// primary deposit types: Cuenta corriente, Vista (incluye RUT), Ahorro
			const isPrimaryDeposit =
				/(?:checking|vista|savings|corriente|ahorro|rut)/i.test(typeText);
			if (isUsd) {
				// Sum USD balances only for credit types (TC/LC)
				if (isCreditType) {
					res.balanceUSD += bal;
					res.creditLimitUSD += cupo;
					res.creditBalancesUSD += bal;
				}
				// Sum USD balances for primary deposit types
				if (isPrimaryDeposit) {
					res.checkingBalancesUSD += bal;
				}
			} else {
				// Sum CLP balances only for credit types (TC/LC)
				if (isCreditType) {
					res.balanceCLP += bal;
					res.creditLimitCLP += cupo;
					res.creditBalancesCLP += bal;
				}
				// Sum CLP balances for primary deposit types
				if (isPrimaryDeposit) {
					res.checkingBalancesCLP += bal;
				}
			}
		}
		// Cupo usado = creditLimit - suma(cupo disponible)
		res.creditUsedCLP = res.creditLimitCLP - res.creditBalancesCLP;
		res.creditUsedUSD = res.creditLimitUSD - res.creditBalancesUSD;
		if (res.creditLimitCLP > 0)
			res.debtRatioCLP = (res.creditUsedCLP / res.creditLimitCLP) * 100;
		if (res.creditLimitUSD > 0)
			res.debtRatioUSD = (res.creditUsedUSD / res.creditLimitUSD) * 100;
		return res;
	}, [accounts]);

	// Agrupar cuentas por banco y calcular máximo de columnas (para layout tipo Excel)
	const bankGroups = useMemo(() => {
		return Object.entries(
			(accounts || []).reduce((acc: Record<string, any[]>, account: any) => {
				if (!acc[account.bank_name]) acc[account.bank_name] = [];
				acc[account.bank_name].push(account);
				return acc;
			}, {}),
		).sort((a, b) =>
			String(a[0] || "").localeCompare(String(b[0] || ""), "es", {
				sensitivity: "base",
				numeric: true,
			}),
		);
	}, [accounts]);

	const maxAccounts = useMemo(
		() => bankGroups.reduce((m, [, g]) => Math.max(m, (g as any[]).length), 0),
		[bankGroups],
	);

	return (
		<div
			className={`min-h-screen bg-gray-50 p-2 md:p-46 pb-24 ${contentLeftClass}`}
		>
			{/* Consolidated totals (balances, cupos, debt ratio) */}
			<div className="sticky top-0 z-40 bg-white border-b shadow-sm py-4 sm:py-8">
				<div className="w-full max-w-screen-xl mx-auto px-2 sm:px-6">
					<h1 className="text-2xl md:text-3xl ml-4 text-gray-300 font-medium mb-1">
						Balance General
					</h1>
					{/* Mobile: swipeable full-width cards (no visible scrollbar) */}
					<style>{`.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
					<div
						className="sm:hidden hide-scrollbar overflow-x-auto snap-x snap-mandatory flex flex-row flex-nowrap gap-4 px-4 pb-2 ml-3"
						style={{ WebkitOverflowScrolling: "touch" }}
					>
						<div className="snap-start w-[calc(100vw-2rem)] flex-shrink-0 bg-white rounded-xl shadow-lg p-5 border-2 border-gray-100 mx-auto">
							<div className="grid grid-cols-2 gap-2">
								<div className="text-left flex flex-col justify-between">
									<div>
										<div className="text-base text-gray-500 mb-1">
											Saldo total (CLP)
										</div>
										<div className="text-xl font-extrabold text-green-700">
											{formatBalanceDisplayNum(totals.balanceCLP)}
										</div>
									</div>

									<div className="mt-4">
										<div className="text-base text-gray-500">Cupo total</div>
										<div className="text-xl font-bold text-gray-800">
											{formatBalanceDisplayNum(totals.creditLimitCLP)}
										</div>
									</div>
									<div className="mt-4">
										<div className="text-base text-gray-500">
											Relación de deuda
										</div>
									</div>
								</div>
								<div className="text-right flex flex-col justify-between">
									<div>
										<div className="text-base text-gray-500 mb-1">
											Suma de cupos
										</div>
										<div className="text-xl font-bold text-gray-800">
											{formatBalanceDisplayNum(totals.creditLimitCLP)}
										</div>
									</div>
									<div className="mt-4">
										<div className="text-base text-gray-500">
											Cupo usado (CLP)
										</div>
										<div className="text-xl font-bold text-red-600">
											{formatBalanceDisplayNum(totals.creditUsedCLP)}
										</div>
									</div>
									<div className="mt-4">
										<div
											className={`text-xl font-bold ${totals.debtRatioCLP != null && totals.debtRatioCLP > 80 ? "text-red-600" : totals.debtRatioCLP != null && totals.debtRatioCLP > 50 ? "text-yellow-600" : "text-green-600"}`}
										>
											{totals.debtRatioCLP == null
												? "N/A"
												: `${totals.debtRatioCLP.toFixed(1)} %`}
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="snap-start w-[calc(100vw-2rem)] flex-shrink-0 bg-white rounded-xl shadow-lg p-5 border-2 border-gray-100">
							<div className="grid grid-cols-2 gap-2">
								<div className="text-left flex flex-col justify-between">
									<div>
										<div className="text-base text-gray-500 mb-1">
											Saldo total (USD)
										</div>
										<div className="text-xl font-extrabold text-green-700">{`US$ ${Math.abs(totals.balanceUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
									</div>
									<div className="mt-4">
										<div className="text-base text-gray-500">
											Cupo total (USD)
										</div>
										<div className="text-xl font-bold text-gray-800">
											{totals.creditLimitUSD === 0
												? "US$ 0.00"
												: `US$ ${Math.abs(totals.creditLimitUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
										</div>
									</div>
									<div className="mt-4">
										<div className="text-base text-gray-500">
											Relación de deuda
										</div>
									</div>
								</div>
								<div className="text-right flex flex-col justify-between">
									<div>
										<div className="text-base text-gray-500 mb-1">
											Suma de cupos
										</div>
										<div className="text-xl font-bold text-gray-800">
											{totals.creditLimitUSD === 0
												? "US$ 0.00"
												: `US$ ${Math.abs(totals.creditLimitUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
										</div>
									</div>
									<div className="mt-4">
										<div className="text-base text-gray-500">
											Cupo usado (USD)
										</div>
										<div
											className={`text-xl font-bold ${totals.creditUsedUSD === 0 ? "text-green-700" : "text-red-600"}`}
										>
											{totals.creditUsedUSD === 0
												? "US$ 0.00"
												: `US$ ${Math.abs(totals.creditUsedUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
										</div>
									</div>
									<div className="mt-4">
										<div
											className={`text-xl font-bold ${totals.debtRatioUSD != null && totals.debtRatioUSD > 80 ? "text-red-600" : totals.debtRatioUSD != null && totals.debtRatioUSD > 50 ? "text-yellow-600" : "text-green-600"}`}
										>
											{totals.debtRatioUSD == null
												? "N/A"
												: `${totals.debtRatioUSD.toFixed(1)} %`}
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="snap-start w-[calc(100vw-2rem)] flex-shrink-0 bg-white rounded-xl shadow-lg p-5 border-2 border-gray-100">
							<div className="grid grid-cols-2 gap-2">
								<div className="text-left">
									<div className="text-base text-gray-500 mb-1">
										Saldos (CLP)
									</div>
									<div className="text-xl font-bold text-gray-800">
										{formatBalanceDisplayNum(totals.checkingBalancesCLP)}
									</div>
								</div>
								<div className="text-right">
									<div className="text-base text-gray-500 mb-1">
										Saldos (USD)
									</div>
									<div className="text-xl font-bold text-gray-800">
										{totals.checkingBalancesUSD === 0
											? "US$ 0.00"
											: `US$ ${Math.abs(totals.checkingBalancesUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Desktop/tablet totals grid */}
					<div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						<div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-100">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-sm text-gray-500">
										Saldos totales (CLP)
									</div>
									<div className="text-lg md:text-xl font-extrabold text-green-700 mt-1">
										{formatBalanceDisplayNum(totals.balanceCLP)}
									</div>
									<div className="mt-3">
										<div className="text-sm text-gray-600">Cupo total</div>
										<div className="font-semibold text-gray-800">
											{formatBalanceDisplayNum(totals.creditLimitCLP)}
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="text-sm text-gray-500">Suma de cupos</div>
									<div className="text-lg md:text-xl font-semibold text-gray-800 mt-1">
										{formatBalanceDisplayNum(totals.creditLimitCLP)}
									</div>
									{/* Moved: Cupo usado shown below Suma de cupos */}
									<div className="mt-2 text-sm text-gray-600">
										Cupo usado (CLP)
									</div>
									<div
										className={`font-semibold ${totals.creditUsedCLP > 0 ? "text-red-600" : "text-green-600"}`}
									>
										{formatBalanceDisplayNum(totals.creditUsedCLP)}
									</div>
								</div>
							</div>
							<div className="mt-3 flex items-center justify-between">
								<div className="text-sm text-gray-600">Relación de deuda</div>
								<div
									className={`font-semibold ${totals.debtRatioCLP != null && totals.debtRatioCLP > 80 ? "text-red-600" : totals.debtRatioCLP != null && totals.debtRatioCLP > 50 ? "text-yellow-600" : "text-green-600"}`}
								>
									{totals.debtRatioCLP == null
										? "N/A"
										: `${totals.debtRatioCLP.toFixed(1)} %`}
								</div>
							</div>
						</div>

						{/* USD card */}
						<div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-100">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-sm text-gray-500">
										Saldos totales (USD)
									</div>
									<div className="text-lg md:text-xl font-extrabold text-green-700 mt-1">{`US$ ${Math.abs(totals.balanceUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
									<div className="mt-3">
										<div className="text-sm text-gray-600">
											Cupo total (USD)
										</div>
										<div className="font-semibold text-gray-800">
											{totals.creditLimitUSD === 0
												? "US$ 0.00"
												: `US$ ${Math.abs(totals.creditLimitUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="text-sm text-gray-500">
										Suma de cupos (USD)
									</div>
									<div className="text-xl font-semibold text-gray-800 mt-1">
										{totals.creditLimitUSD === 0
											? "US$ 0.00"
											: `US$ ${Math.abs(totals.creditLimitUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
									</div>
									{/* Moved: Cupo usado shown below Suma de cupos */}
									<div className="mt-2 text-sm text-gray-600">
										Cupo usado (USD)
									</div>
									<div
										className={`font-semibold ${totals.creditUsedUSD > 0 ? "text-red-600" : "text-green-600"}`}
									>
										{totals.creditUsedUSD === 0
											? "US$ 0.00"
											: `US$ ${Math.abs(totals.creditUsedUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
									</div>
								</div>
							</div>
							<div className="mt-3 flex items-center justify-between">
								<div className="text-sm text-gray-600">Relación de deuda</div>
								<div
									className={`font-semibold ${totals.debtRatioUSD != null && totals.debtRatioUSD > 80 ? "text-red-600" : totals.debtRatioUSD != null && totals.debtRatioUSD > 50 ? "text-yellow-600" : "text-green-600"}`}
								>
									{totals.debtRatioUSD == null
										? "N/A"
										: `${totals.debtRatioUSD.toFixed(1)} %`}
								</div>
							</div>
						</div>

						{/* Checking / Vista / Ahorro card */}
						<div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-100">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-sm text-gray-500">Saldos (CLP)</div>
									<div className="text-lg md:text-xl font-extrabold text-gray-800 mt-1">
										{formatBalanceDisplayNum(totals.checkingBalancesCLP)}
									</div>
								</div>
								<div className="text-right">
									<div className="text-sm text-gray-500">Saldos (USD)</div>
									<div className="text-xl font-semibold text-gray-800 mt-1">
										{totals.checkingBalancesUSD === 0
											? "US$ 0.00"
											: `US$ ${Math.abs(totals.checkingBalancesUSD).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Floating create button (top-right) opens a modal with actions */}
			<div className="fixed sm:top-6 sm:right-6 bottom-6 right-6 z-50">
				<button
					className="w-12 h-12 rounded-full bg-blue6 text-white shadow-lg flex items-center justify-center pb-0.5 text-4xl hover:scale-105 transition-transform"
					onClick={() => setMenuOpen(true)}
					aria-label="Abrir acciones"
				>
					+
				</button>
			</div>

			{menuOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
					onClick={() => setMenuOpen(false)}
				>
					<div
						className="bg-white rounded-lg shadow-lg p-4 w-[95%] max-w-sm relative"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							className="absolute -top-12 right-1 w-10 h-10 flex items-center justify-center rounded-full hover:bg-transparent/30 text-gray-500 border border-gray-300/50 hover:text-white text-3xl focus:outline-none"
							onClick={() => setMenuOpen(false)}
							aria-label="Cerrar acciones"
						>
							&times;
						</button>
						<h3 className="text-2xl text-gray-200 font-normal mb-4 text-center">
							Acciones
						</h3>
						<div className="flex flex-col gap-4 p-2">
							<button
								className="w-full text-left px-4 py-3 bg-gray-50 rounded hover:bg-blue6 hover:text-white text-center border-2 border-gray-100"
								onClick={() => {
									// Close menu, then open the account creation modal
									setMenuOpen(false);
									setTimeout(() => setModalOpen(true), 100);
								}}
							>
								Crear cuenta
							</button>
							<button
								className="w-full text-left px-4 py-3 bg-gray-50 rounded hover:bg-blue6 hover:text-white text-center border-2 border-gray-100"
								onClick={() => {
									// Close menu, then open the transaction modal
									setMenuOpen(false);
									setTimeout(() => setTxModalOpen(true), 100);
								}}
							>
								Registrar movimiento
							</button>
							<button
								className="w-full text-left px-4 py-3 bg-gray-50 rounded hover:bg-blue6 hover:text-white text-center border-2 border-gray-100"
								onClick={() => {
									// Close menu and open the Transferir/Pagar chooser
									console.log("[UI] Transferir/Pagar button clicked");
									setMenuOpen(false);
									console.log("[UI] scheduling txActionChoiceOpen=true");
									setTimeout(() => {
										console.log("[UI] opening txActionChoiceOpen now");
										setTxActionChoiceOpen(true);
									}, 80);
								}}
							>
								Transferir / Pagar
							</button>
						</div>
					</div>
				</div>
			)}

			{success && <div className="mt-4 text-green-600">{success}</div>}
			{error && <div className="mt-4 text-red-600">{error}</div>}

			{modalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-40 z-50 overflow-y-auto p-3 sm:p-0 flex items-start sm:items-center justify-center">
					<div className="bg-white rounded-lg shadow-lg p-4 w-[95%] max-w-sm relative my-4 max-h-[92vh] overflow-y-auto">
						<button
							className="absolute -top-12 right-1 w-10 h-10 flex items-center justify-center rounded-full hover:bg-transparent/30 text-gray-500 border border-gray-300/50 hover:text-white text-3xl focus:outline-none"
							onClick={() => setModalOpen(false)}
							disabled={loading}
							aria-label="Cerrar modal"
						>
							&times;
						</button>
						<h2 className="text-2xl font-normal text-gray-200 mb-4 text-center">
							Crear cuenta bancaria
						</h2>
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Banco
							</label>
							<div className="relative">
								<BankSelector
									value={selectedBank?.code ?? ""}
									onChange={(b) => setSelectedBank(b)}
									placeholder="Selecciona un banco"
									display={"name"}
									className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-800 appearance-none shadow-sm hover:border-blue-400"
								/>
								<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
									<svg
										width="20"
										height="20"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</span>
							</div>
							<div className="mt-2">
								<label className="block text-xs text-gray-500 mb-1">
									Logo del banco (opcional)
								</label>
								<input
									ref={bankLogoInputRef}
									type="file"
									accept="image/png,image/jpeg,image/webp,image/svg+xml"
									className="hidden"
									disabled={!selectedBank || uploadingBankLogo}
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (!file) return;
										void handleBankLogoUpload(file);
										e.currentTarget.value = "";
									}}
								/>
								<div
									className={`mt-1 border-2 border-dashed rounded-lg p-3 transition-colors ${
										bankLogoDragOver
											? "border-blue-500 bg-blue-50"
											: "border-gray-300 bg-gray-50"
									} ${!selectedBank ? "opacity-60" : ""}`}
									onDragOver={(e) => {
										e.preventDefault();
										if (!selectedBank || uploadingBankLogo) return;
										setBankLogoDragOver(true);
									}}
									onDragLeave={() => setBankLogoDragOver(false)}
									onDrop={(e) => {
										e.preventDefault();
										setBankLogoDragOver(false);
										if (!selectedBank || uploadingBankLogo) return;
										const file = e.dataTransfer.files?.[0];
										if (!file) return;
										void handleBankLogoUpload(file);
									}}
								>
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
											{bankLogoPreviewUrl ? (
												<img
													src={bankLogoPreviewUrl}
													alt="Preview logo banco"
													className="w-full h-full object-contain"
												/>
											) : (
												<svg
													width="22"
													height="22"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="1.8"
													className="text-gray-400"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M3 10l9-5 9 5"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M4 10h16v9H4z"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M9 19v-4h6v4"
													/>
												</svg>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-xs font-medium text-gray-700 truncate">
												{bankLogoPreviewName ||
													(selectedBank
														? "Arrastra y suelta el logo aquí"
														: "Selecciona un banco primero")}
											</p>
											<p className="text-[11px] text-gray-500">
												PNG, JPG, WEBP o SVG
											</p>
										</div>
										<button
											type="button"
											className="px-2.5 py-1.5 text-xs rounded-md bg-blue-600 text-white disabled:opacity-50"
											disabled={!selectedBank || uploadingBankLogo}
											onClick={() => bankLogoInputRef.current?.click()}
										>
											{uploadingBankLogo ? "Subiendo..." : "Seleccionar"}
										</button>
									</div>
								</div>
								{bankLogoFeedback && (
									<p className="mt-1 text-xs text-gray-500">
										{bankLogoFeedback}
									</p>
								)}
							</div>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Tipo de cuenta
							</label>
							<div className="relative">
								<select
									className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-800 appearance-none shadow-sm hover:border-blue-400"
									value={selectedType ?? ""}
									onChange={(e) => setSelectedType(e.target.value || null)}
									disabled={availableTypes.length === 0}
								>
									<option value="" disabled>
										Selecciona un tipo
									</option>
									{(() => {
										const seen = new Set<string>();
										const opts: { key: string; label: string }[] = [];
										for (const t of availableTypes) {
											const label = getAccountTypeLabel(t, selectedBank?.code);
											if (seen.has(label)) continue;
											seen.add(label);
											opts.push({ key: t, label });
										}
										return opts.map((o) => (
											<option key={o.key} value={o.key}>
												{o.label}
											</option>
										));
									})()}
								</select>
								<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
									<svg
										width="20"
										height="20"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</span>
							</div>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700">
								Monto inicial
							</label>
							<div className="mt-1">
								<input
									type="text"
									className="w-full border rounded px-3 py-2 text-2xl text-center"
									inputMode={isUsdSelected ? "decimal" : "numeric"}
									pattern={
										isUsdSelected ? "^-?[0-9]+([.,][0-9]{0,2})?$" : "^-?[0-9]*$"
									}
									placeholder={isUsdSelected ? "US$ 0.00" : "$ 0.-"}
									ref={initialInputRef}
									value={
										editingInitial
											? editingInitialDisplay
											: formatAmountDisplay(initialAmount, isUsdSelected)
									}
									onFocus={handleInitialFocus}
									onBlur={handleInitialBlur}
									onChange={handleInitialInputChange}
									onKeyDown={handleInitialKeyDown}
									onPaste={handleInitialPaste}
									onBeforeInput={handleInitialBeforeInput}
									disabled={loading}
								/>
							</div>
						</div>
						{needsCreditLimit && (
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700">
									Cupo (lí­mite)
								</label>
								<div className="mt-1">
									<input
										type="text"
										className="w-full border rounded px-3 py-2 text-2xl text-center"
										inputMode={isUsdSelected ? "decimal" : "numeric"}
										pattern={
											isUsdSelected ? "^[0-9]+([.,][0-9]{0,2})?$" : "^[0-9]*$"
										}
										placeholder={isUsdSelected ? "US$ 0.00" : "$ 0.-"}
										ref={creditInputRef}
										value={
											editingCredit
												? editingCreditDisplay
												: formatAmountDisplay(creditLimit, isUsdSelected)
										}
										onFocus={handleCreditFocus}
										onBlur={handleCreditBlur}
										onChange={handleCreditInputChange}
										onKeyDown={handleCreditKeyDown}
										onPaste={handleCreditPaste}
										onBeforeInput={handleCreditBeforeInput}
										disabled={loading}
									/>
								</div>
							</div>
						)}

						{/* Transaction modal is rendered at top-level so it can open independently */}
						{/* credit limit is provided via 'Monto inicial' for credit account types */}
						<button
							className="w-full py-2 bg-blue6 text-white rounded shadow disabled:opacity-50"
							onClick={handleCreateAccount}
							disabled={loading}
						>
							{loading ? "Guardando..." : "Guardar cuenta"}
						</button>
						{error && <div className="mt-2 text-red-600">{error}</div>}
					</div>
				</div>
			)}

			{/* Tabs Navigation: rely on spacer above for vertical offset so layout is consistent */}
			<div className="px-4">
				<div className="flex gap-4 mb-6 border-b border-gray-200">
					<button
						onClick={() => setActiveTab("cuentas")}
						className={`px-6 py-3 text-base font-medium transition-colors ${
							activeTab === "cuentas"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-500 hover:text-gray-700"
						}`}
						>
							Cuentas
						</button>
					<button
						onClick={() => {
							setActiveTab("historial");
							if (transactions.length === 0) fetchTransactions();
						}}
						className={`px-6 py-3 text-base font-medium transition-colors ${
							activeTab === "historial"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						Historial
					</button>
				</div>

				{/* Cuentas Tab Content */}
				{activeTab === "cuentas" && (
					<>
						{!hasLoadedAccounts && loadingAccounts ? (
							<div>Cargando cuentas...</div>
						) : (
							<div className="w-full flex flex-col gap-4">
								{bankGroups.map(([bankName, group]) => {
									const accountsGroup = group as any[];
									const sorted = accountsGroup
										.slice()
										.sort((a: any, b: any) => {
											const labelA =
												getAccountTypeLabel(a.type, bankName) ||
												String(a.name || "");
											const labelB =
												getAccountTypeLabel(b.type, bankName) ||
												String(b.name || "");
											return String(labelA).localeCompare(
												String(labelB),
												"es",
												{ sensitivity: "base", numeric: true },
											);
										});
									const bankCode =
										accountsGroup[0]?.bank_id ||
										accountsGroup[0]?.bank_code ||
										BANK_CATALOG.find((b) => b.name === bankName)?.code;
									const groupLogoUrl =
										accountsGroup.find((a) => a.bank_logo_url)?.bank_logo_url ||
										null;
									const logoSrc = groupLogoUrl ? String(groupLogoUrl) : null;
									const logoSrcWithRefresh = logoSrc
										? `${logoSrc}${logoSrc.includes("?") ? "&" : "?"}_r=${bankLogoRefreshKey}`
										: null;
									const primaryBankRow = accountsGroup[0] || null;
									const bankMeta = {
										id: primaryBankRow?.bank_id
											? String(primaryBankRow.bank_id)
											: null,
										code: bankCode ? String(bankCode) : null,
										name: bankName ? String(bankName) : null,
									};
									const bankKey = getBankLogoKey(
										bankMeta.code || undefined,
										bankMeta.name || undefined,
									);
									const desktopLogoInputId = `bank-logo-upload-${bankKey}-desktop`;
									const mobileLogoInputId = `bank-logo-upload-${bankKey}-mobile`;

									return (
										<div
											key={bankName}
											className="group relative w-full bg-white rounded-2xl shadow-xl border border-gray-100 px-2 sm:px-4 py-2 sm:py-2"
										>
											{bankMeta.id && (
												<button
													type="button"
													className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
													title="Eliminar banco"
													onClick={() =>
														void handleDeleteBank(
															bankMeta.id,
															bankMeta.name || bankName,
														)
													}
												>
													<svg
														width="14"
														height="14"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M3 6h18"
														/>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M8 6V4h8v2M6 6l1 14h10l1-14"
														/>
													</svg>
												</button>
											)}
											{/* Desktop / large screens: Excel-like single-row with logo + account columns */}
											<div className="hidden md:block">
												<div
													style={{
														display: "grid",
														gridTemplateColumns: `84px repeat(${maxAccounts}, minmax(96px, 1fr))`,
														gap: "0.5rem",
														alignItems: "flex-start",
													}}
												>
													<div className="group relative flex items-center justify-center w-20 h-10">
														<input
															id={desktopLogoInputId}
															type="file"
															accept="image/png,image/jpeg,image/webp,image/svg+xml"
															className="hidden"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (!file) return;
																void uploadBankLogo(file, bankMeta);
																e.currentTarget.value = "";
															}}
														/>
														<label
															htmlFor={desktopLogoInputId}
															className="relative w-full h-full cursor-pointer"
															title="Editar logo del banco"
														>
															{logoSrcWithRefresh ? (
																<>
																	<img
																		src={logoSrcWithRefresh}
																		alt={bankName}
																		className="w-full h-full object-contain object-center"
																		onError={(e) => {
																			const img =
																				e.currentTarget as HTMLImageElement;
																			img.style.display = "none";
																			const fallback =
																				img.nextElementSibling as HTMLElement | null;
																			if (fallback)
																				fallback.style.display = "flex";
																		}}
																	/>
																	<span className="hidden absolute inset-0 items-center justify-center text-gray-500">
																		<svg
																			width="22"
																			height="22"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			strokeWidth="1.8"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M3 10l9-5 9 5"
																			/>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M4 10h16v9H4z"
																			/>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M9 19v-4h6v4"
																			/>
																		</svg>
																	</span>
																</>
															) : (
																<span className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
																	<svg
																		width="22"
																		height="22"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="1.8"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M3 10l9-5 9 5"
																		/>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M4 10h16v9H4z"
																		/>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M9 19v-4h6v4"
																		/>
																	</svg>
																	<span className="mt-1 text-[10px] text-gray-500 leading-none max-w-[72px] truncate text-center">
																		{bankName}
																	</span>
																</span>
															)}
															<span className="pointer-events-none absolute inset-0 hidden group-hover:flex items-center justify-center rounded-md bg-black/35 transition-colors">
																<svg
																	width="16"
																	height="16"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																	className="text-white"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M12 20h9"
																	/>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
																	/>
																</svg>
															</span>
														</label>
														{logoSrcWithRefresh && (
															<button
																type="button"
																className="hidden group-hover:flex absolute -top-2 -right-2 h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow"
																title="Eliminar logo"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	void handleBankLogoDelete(bankMeta);
																}}
															>
																<svg
																	width="12"
																	height="12"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M3 6h18"
																	/>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M8 6V4h8v2M6 6l1 14h10l1-14"
																	/>
																</svg>
															</button>
														)}
													</div>
													{Array.from({ length: maxAccounts }).map((_, idx) => {
														const acc = sorted[idx];
														if (!acc)
															return (
																<div
																	/* biome-ignore lint/suspicious/noArrayIndexKey: placeholder slots are positional and not data-backed */
																	key={`empty-${bankName}-${idx}`}
																	className="min-w-0 w-full px-1 sm:px-2 opacity-0 md:pl-2 md:border-l md:border-gray-200"
																/>
															);
														const sameTypeAccounts = sorted.filter(
															(item: any) =>
																String(item?.type || "") ===
																	String(acc?.type || "") &&
																String(item?.currency || "") ===
																	String(acc?.currency || ""),
														);
														const sameTypeIndex =
															sameTypeAccounts.findIndex(
																(item: any) =>
																	String(item?.id) === String(acc?.id),
															) + 1;
														const accountLabel = getAccountTypeLabel(
															acc.type,
															bankName,
														);
														const accountLabelWithIndex =
															sameTypeAccounts.length > 1
																? `${accountLabel} #${sameTypeIndex}`
																: accountLabel;
														return (
															<div
																key={acc.id}
																className="group/account min-w-0 w-full flex flex-col items-center px-1 sm:px-2 overflow-hidden md:pl-2 md:border-l md:border-gray-200 cursor-pointer hover:bg-blue-50/30 rounded"
																onClick={() => openAccountMovementModal(acc)}
															>
																<div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs md:text-sm font-medium text-gray-600 mb-0 sm:mb-1 truncate whitespace-nowrap w-full text-center">
																	<span className="truncate">
																		{accountLabelWithIndex}
																	</span>
																	<button
																		type="button"
																		className="h-5 w-5 rounded-full text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 opacity-0 group-hover/account:opacity-100 transition-opacity"
																		title="Eliminar cuenta"
																		onClick={(e) => {
																			e.stopPropagation();
																			void handleDeleteAccount(acc);
																		}}
																	>
																		<svg
																			width="12"
																			height="12"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			strokeWidth="2"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M3 6h18"
																			/>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M8 6V4h8v2M6 6l1 14h10l1-14"
																			/>
																		</svg>
																	</button>
																</div>
																{/(?:credit|line)/i.test(String(acc.type)) &&
																!/(checking|savings)/i.test(
																	String(acc.type),
																) ? (
																	<div className="flex flex-col items-center">
																		{/* Primary value should always show account balance */}
																		<span className="text-[12px] sm:text-sm md:text-base font-bold text-green-700 truncate whitespace-nowrap">
																			{formatBalanceDisplayByType(
																				acc.type,
																				Number(acc.balance || 0),
																			)}
																		</span>
																		<span className="text-[11px] text-gray-500 mt-0.5 truncate">
																			Cupo:{" "}
																			{formatBalanceDisplayByType(
																				acc.type,
																				Number(acc.credit_limit || 0),
																			)}
																		</span>
																		{(() => {
																			const creditLimit = Number(
																				acc.credit_limit || 0,
																			);
																			const balance = Number(acc.balance || 0);
																			const used = creditLimit - balance;
																			return (
																				<span className="text-[11px] text-orange-600 mt-0.5 truncate">
																					Usado:{" "}
																					{formatBalanceDisplayByType(
																						acc.type,
																						used,
																					)}
																				</span>
																			);
																		})()}
																	</div>
																) : (
																	<span className="text-[12px] sm:text-sm md:text-base font-bold text-green-700 truncate whitespace-nowrap">
																		{formatBalanceDisplayByType(
																			acc.type,
																			Number(acc.balance || 0),
																		)}
																	</span>
																)}
															</div>
														);
													})}
												</div>
											</div>

											{/* Mobile / small screens: stacked card with logo above and accounts in 2-col grid */}
											<div className="block md:hidden">
												<div className="flex flex-col sm:flex-row items-center">
													<div className="group relative w-28 h-8 sm:w-28 sm:h-16 flex items-center justify-center overflow-hidden mb-2 sm:mb-0 sm:mr-4 mt-1">
														<input
															id={mobileLogoInputId}
															type="file"
															accept="image/png,image/jpeg,image/webp,image/svg+xml"
															className="hidden"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (!file) return;
																void uploadBankLogo(file, bankMeta);
																e.currentTarget.value = "";
															}}
														/>
														<label
															htmlFor={mobileLogoInputId}
															className="relative w-full h-full cursor-pointer"
															title="Editar logo del banco"
														>
															{logoSrcWithRefresh ? (
																<>
																	<img
																		src={logoSrcWithRefresh}
																		alt={bankName}
																		className="w-full h-full object-contain object-center"
																		onError={(e) => {
																			const img =
																				e.currentTarget as HTMLImageElement;
																			img.style.display = "none";
																			const fallback =
																				img.nextElementSibling as HTMLElement | null;
																			if (fallback)
																				fallback.style.display = "flex";
																		}}
																	/>
																	<span className="hidden absolute inset-0 items-center justify-center text-gray-500">
																		<svg
																			width="22"
																			height="22"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			strokeWidth="1.8"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M3 10l9-5 9 5"
																			/>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M4 10h16v9H4z"
																			/>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				d="M9 19v-4h6v4"
																			/>
																		</svg>
																	</span>
																</>
															) : (
																<span className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
																	<svg
																		width="22"
																		height="22"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="1.8"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M3 10l9-5 9 5"
																		/>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M4 10h16v9H4z"
																		/>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M9 19v-4h6v4"
																		/>
																	</svg>
																	<span className="mt-1 text-[10px] text-gray-500 leading-none max-w-[88px] truncate text-center">
																		{bankName}
																	</span>
																</span>
															)}
															<span className="pointer-events-none absolute inset-0 hidden group-hover:flex items-center justify-center rounded-md bg-black/35 transition-colors">
																<svg
																	width="16"
																	height="16"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																	className="text-white"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M12 20h9"
																	/>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
																	/>
																</svg>
															</span>
														</label>
														{logoSrcWithRefresh && (
															<button
																type="button"
																className="hidden group-hover:flex absolute -top-2 -right-2 h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow"
																title="Eliminar logo"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	void handleBankLogoDelete(bankMeta);
																}}
															>
																<svg
																	width="12"
																	height="12"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M3 6h18"
																	/>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M8 6V4h8v2M6 6l1 14h10l1-14"
																	/>
																</svg>
															</button>
														)}
													</div>
													<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row gap-2 sm:gap-4 w-full">
														{sorted.map((acc: any, idx: number) => {
															const sameTypeAccounts = sorted.filter(
																(item: any) =>
																	String(item?.type || "") ===
																		String(acc?.type || "") &&
																	String(item?.currency || "") ===
																		String(acc?.currency || ""),
															);
															const sameTypeIndex =
																sameTypeAccounts.findIndex(
																	(item: any) =>
																		String(item?.id) === String(acc?.id),
																) + 1;
															const accountLabel = getAccountTypeLabel(
																acc.type,
																bankName,
															);
															const accountLabelWithIndex =
																sameTypeAccounts.length > 1
																	? `${accountLabel} #${sameTypeIndex}`
																	: accountLabel;
															return (
																<div
																	key={acc.id}
																	className={`group/account min-w-0 w-full flex flex-col items-center px-1 sm:px-2 overflow-hidden ${idx % 2 === 1 ? "pl-2 border-l border-gray-200" : ""} md:pl-2 md:border-l md:border-gray-200 cursor-pointer hover:bg-blue-50/30 rounded`}
																	onClick={() => openAccountMovementModal(acc)}
																>
																	<div className="flex items-center justify-center gap-1 text-sm sm:text-xs md:text-sm font-medium text-gray-600 mb-0 sm:mb-1 truncate whitespace-nowrap w-full text-center">
																		<span className="truncate">
																			{accountLabelWithIndex}
																		</span>
																		<button
																			type="button"
																			className="h-5 w-5 rounded-full text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 opacity-0 group-hover/account:opacity-100 transition-opacity"
																			title="Eliminar cuenta"
																			onClick={(e) => {
																				e.stopPropagation();
																				void handleDeleteAccount(acc);
																			}}
																		>
																			<svg
																				width="12"
																				height="12"
																				viewBox="0 0 24 24"
																				fill="none"
																				stroke="currentColor"
																				strokeWidth="2"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					d="M3 6h18"
																				/>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					d="M8 6V4h8v2M6 6l1 14h10l1-14"
																				/>
																			</svg>
																		</button>
																	</div>
																	{/(?:credit|line)/i.test(String(acc.type)) &&
																	!/(checking|savings)/i.test(
																		String(acc.type),
																	) ? (
																		<div className="flex flex-col items-center">
																			<span className="text-base sm:text-sm md:text-base font-bold text-green-700 truncate whitespace-nowrap">
																				{formatBalanceDisplayByType(
																					acc.type,
																					Number(acc.balance || 0),
																				)}
																			</span>
																			<span className="text-[11px] text-gray-500 mt-0.5 truncate">
																				Cupo:{" "}
																				{formatBalanceDisplayByType(
																					acc.type,
																					Number(acc.credit_limit || 0),
																				)}
																			</span>
																			{(() => {
																				const creditLimit = Number(
																					acc.credit_limit || 0,
																				);
																				const balance = Number(
																					acc.balance || 0,
																				);
																				const used = creditLimit - balance;
																				return (
																					<span className="text-[11px] text-orange-600 mt-0.5 truncate">
																						Usado:{" "}
																						{formatBalanceDisplayByType(
																							acc.type,
																							used,
																						)}
																					</span>
																				);
																			})()}
																		</div>
																	) : (
																		<span className="text-base sm:text-sm md:text-base font-bold text-green-700 truncate whitespace-nowrap">
																			{formatBalanceDisplayByType(
																				acc.type,
																				Number(acc.balance || 0),
																			)}
																		</span>
																	)}
																</div>
															);
														})}
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</>
				)}

				{/* Historial Tab Content */}
				{activeTab === "historial" && (
					<>
						{loadingTransactions ? (
							<div className="text-center py-8">Cargando historial...</div>
						) : transactions.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								No hay transacciones registradas
							</div>
						) : (
							<div className="bg-white rounded-xl shadow-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Fecha
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Banco
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Cuenta
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Tipo
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Método
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Categoría
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Descripción
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Monto
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Moneda
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Balance antes
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Balance después
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{transactions.map((tx: any) => {
												// Robust lookups with fallbacks for multilingual field names
												const account = accounts.find(
													(a) =>
														String(a.id) ===
														String(tx.account_id || tx.accountId),
												);
												const txDate =
													tx.date ||
													tx.created_at ||
													tx.inserted_at ||
													tx.createdAt ||
													null;
												const method = tx.method ?? tx.metodo ?? "N/A";
												const category = tx.category ?? tx.categoria ?? "N/A";
												const description =
													tx.description ?? tx.descripcion ?? tx.note ?? "-";
												const amount = Number(tx.amount ?? tx.monto ?? 0) || 0;
												const isNegative = amount < 0;
												const currency =
													tx.currency ?? tx.moneda ?? account?.currency ?? "";
												const balanceBefore =
													tx.balance_before ??
													tx.balanceBefore ??
													tx.balance_before_snapshot ??
													null;
												const balanceAfter =
													tx.balance_after ??
													tx.balanceAfter ??
													tx.balance_after_snapshot ??
													null;

												return (
													<tr
														key={
															tx.id ??
															`${tx.account_id}-${tx.date}-${Math.random()}`
														}
														className="hover:bg-gray-50"
													>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{txDate ? formatStoredDateUTC(txDate) : "N/A"}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{account?.bank_name ||
																tx.bank_name ||
																tx.bank_id ||
																"N/A"}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{account
																? getAccountTypeLabel(
																		account.type,
																		account.bank_name,
																	)
																: (tx.account_name ??
																	tx.account_label ??
																	"N/A")}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm">
															<span
																className={`px-2 py-1 text-xs rounded-full ${
																	isNegative
																		? "bg-red-100 text-red-800"
																		: "bg-green-100 text-green-800"
																}`}
															>
																{String(
																	tx.type ?? tx.tipo ?? "",
																).toLowerCase() === "egreso" || isNegative
																	? "Egreso"
																	: "Ingreso"}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{method}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
															{category}
														</td>
														<td className="px-6 py-4 text-sm text-gray-500">
															{description}
														</td>
														<td
															className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
																isNegative ? "text-red-600" : "text-green-600"
															}`}
														>
															{formatBalanceDisplayByType(
																account?.type ?? tx.type ?? currency,
																amount,
															)}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
															{currency || "—"}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
															{balanceBefore != null
																? formatBalanceDisplayByType(
																		account?.type ?? tx.type ?? currency,
																		Number(balanceBefore),
																	)
																: "—"}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
															{balanceAfter != null
																? formatBalanceDisplayByType(
																		account?.type ?? tx.type ?? currency,
																		Number(balanceAfter),
																	)
																: "—"}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Transaction modal (top-level) */}
			{txActionChoiceOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-40 z-50 overflow-y-auto p-3 sm:p-0 flex items-start sm:items-center justify-center"
					onClick={() => setTxActionChoiceOpen(false)}
				>
					<div
						className="bg-white rounded-lg shadow-lg p-4 w-[95%] max-w-sm relative my-4 max-h-[92vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							className="absolute -top-12 right-1 w-10 h-10 flex items-center justify-center rounded-full hover:bg-transparent/30 text-gray-500 border border-gray-300/50 hover:text-white text-3xl focus:outline-none"
							onClick={() => setTxActionChoiceOpen(false)}
							aria-label="Cerrar chooser"
						>
							&times;
						</button>
						<h2 className="text-2xl font-normal mb-6 text-center text-gray-200">
							Transferir o Pagar
						</h2>
						<div className="flex flex-col gap-4">
							<button
								className="w-full px-4 py-3 bg-gray-50 rounded shadow-sm hover:shadow-md text-left border border-gray-100 text-center"
								onClick={() => {
									setTxActionChoiceOpen(false);
									setTxIsTransfer(true);
									setTxTransferOpen(true);
									setTxTransferShowNav(true);
									setActiveSection(1);
								}}
							>
								Transferir entre cuentas
							</button>
							<button
								className="w-full px-4 py-3 bg-gray-50 rounded shadow-sm hover:shadow-md text-left border border-gray-100 text-center"
								onClick={() => {
									setTxActionChoiceOpen(false);
									setTxIsTransfer(false);
									setTxMetodo("tarjeta");
									setTxPayOpen(true);
									setTxPayShowNav(true);
									setActiveSection(1);
								}}
							>
								Pagar (Tarjeta de crédito / Línea)
							</button>
						</div>
					</div>
				</div>
			)}

			{txTransferOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-40 z-50 overflow-y-auto p-3 sm:p-0 flex items-start sm:items-center justify-center"
					onClick={() => {
						closeTxTransferModal();
					}}
				>
					<div
						className="bg-white rounded-lg shadow-lg p-4 w-[95%] max-w-sm relative my-4 max-h-[92vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							className="absolute -top-12 right-1 w-10 h-10 flex items-center justify-center rounded-full hover:bg-transparent/30 text-gray-500 border border-gray-300/50 hover:text-white text-3xl focus:outline-none"
							onClick={() => {
								closeTxTransferModal();
							}}
							aria-label="Cerrar modal transferencia"
						>
							&times;
						</button>
						{/* Forward arrow: advance section when allowed (no bg) */}
						{txTransferOpen &&
							activeSection < 3 &&
							(() => {
								const canAdvance =
									activeSection === 1
										? !!txSelectedBank && !!txAccountId
										: !!txDate && !!txAmount && txAmount !== "-";
								return (
									<button
										className={`absolute top-3 right-3 text-gray-200 text-sm w-10 h-10 flex items-center justify-center rounded-full bg-transparent ${!canAdvance ? "opacity-50 pointer-events-none" : "hover:text-gray-400 hover:scale-105 transition-transform"} z-40`}
										onClick={() => {
											if (canAdvance)
												setActiveSection((s) => Math.min(3, s + 1));
										}}
										disabled={!canAdvance}
										aria-label="Adelante"
										title={
											canAdvance
												? "Siguiente"
												: "Completa fecha y monto para continuar"
										}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth={2}
											className="w-5 h-5"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</button>
								);
							})()}
						{txTransferOpen && (
							<button
								className="absolute top-3 left-3 text-gray-700 text-sm w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 hover:scale-105 transition-transform z-50"
								onClick={() => {
									if (activeSection === 1 && txTransferStep === "origen") {
										setTxPayOpen(false);
										setTxTransferOpen(false);
										setTxActionChoiceOpen(true);
										setActiveSection(1);
									} else if (
										activeSection === 1 &&
										txTransferStep === "destino"
									) {
										setTxTransferStep("origen");
										setTxTransferDestBank(null);
										setTxTransferDestAccount(null);
									} else {
										setActiveSection((s) => Math.max(1, s - 1));
									}
								}}
								aria-label="Volver"
								title="Volver"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									className="w-5 h-5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>
						)}
						<h2 className="text-2xl font-normal mb-6 text-center text-gray-200">
							Transferencia
						</h2>
						{(() => {
							const origin = (accounts || []).find(
								(a) => String(a.id) === String(txTransferOriginAccount),
							);
							const dest = (accounts || []).find(
								(a) => String(a.id) === String(txTransferDestAccount),
							);
							const _originLabel = origin
								? `${origin.bank_name}, ${getAccountTypeLabel(origin.type, origin.bank_name)}`
								: "";
							const _destLabel = dest
								? `${dest.bank_name}, ${getAccountTypeLabel(dest.type, dest.bank_name)}`
								: "";
							if (activeSection === 2 && txIsTransfer && origin && dest) {
								const rawOrigin = getAccountTypeLabel(
									origin.type,
									origin.bank_name,
								);
								const rawDest = getAccountTypeLabel(dest.type, dest.bank_name);
								const baseOrigin = String(rawOrigin)
									.replace(/\(?USD\)?/i, "")
									.replace(/\s+\(?\)?$/, "")
									.trim();
								const baseDest = String(rawDest)
									.replace(/\(?USD\)?/i, "")
									.replace(/\s+\(?\)?$/, "")
									.trim();
								const isUsdOrigin =
									/_usd$/i.test(String(origin.type)) ||
									!!(
										origin.currency &&
										String(origin.currency).toUpperCase() === "USD"
									) ||
									/\busd\b/i.test(String(origin.type)) ||
									/\busd\b|us\$|\$us/i.test(String(origin.name)) ||
									/\busd\b|us\$|\$us/i.test(String(rawOrigin));
								const isUsdDest =
									/_usd$/i.test(String(dest.type)) ||
									!!(
										dest.currency &&
										String(dest.currency).toUpperCase() === "USD"
									) ||
									/\busd\b/i.test(String(dest.type)) ||
									/\busd\b|us\$|\$us/i.test(String(dest.name)) ||
									/\busd\b|us\$|\$us/i.test(String(rawDest));
								const _originCompact = `${origin.bank_name} · ${baseOrigin}`;
								const _destCompact = `${dest.bank_name} · ${baseDest}`;
								return (
									<div className="mb-4">
										<div className="flex items-center justify-center gap-4 mb-3 px-2 w-full">
											<div className="min-w-0 max-w-[40%]">
												<div className="truncate text-sm font-normal text-center">
													{origin.bank_name}
												</div>
												<div className="truncate text-xs text-gray-600 text-center">
													{baseOrigin}
													{isUsdOrigin ? " • US$" : ""}
												</div>
											</div>
											<div className="flex items-center justify-center px-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													className="w-8 h-8 text-gray-400 stroke-current"
												>
													<path
														strokeWidth={2}
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M5 12h14M13 5l7 7-7 7"
													/>
												</svg>
											</div>
											<div className="min-w-0 max-w-[40%] text-right">
												<div className="truncate text-sm font-normal text-center">
													{dest.bank_name}
												</div>
												<div className="truncate text-xs text-gray-600 text-center">
													{baseDest}
													{isUsdDest ? " • US$" : ""}
												</div>
											</div>
										</div>
										<div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
											<div>
												<label className="block text-sm text-gray-700 text-center bg-gray-200 p-1 rounded">
													Fecha
												</label>
												<DatePicker
													selected={
														txDate ? new Date(`${txDate}T00:00:00`) : null
													}
													onChange={(d: Date | null) =>
														setTxDate(d ? d.toISOString().slice(0, 10) : txDate)
													}
													locale={es}
													dateFormat="dd/MM/yyyy"
													wrapperClassName="w-full"
													className="block w-full mt-2 border-2 border-gray-300 rounded px-3 py-3 text-lg text-center"
													placeholderText="dd/mm/yyyy"
													customInput={<DatePickerInput />}
												/>
											</div>
											<div>
												<label className="block text-sm text-gray-700 text-center bg-gray-200 p-1 rounded">
													Monto
												</label>
												<input
													ref={txAmountRef}
													type="text"
													inputMode="text"
													className="w-full mt-2 border-2 border-gray-300 rounded px-3 py-2.5 text-2xl font-normal text-center"
													placeholder={
														txSelectedAccountIsUsd ? "US$ 0,00" : "$ 0.-"
													}
													value={
														txEditingAmount
															? txAmountDisplay
															: formatAmountDisplay(
																	txAmount,
																	txSelectedAccountIsUsd,
																)
													}
													onChange={(e) => {
														let val = e.target.value;
														if (txSelectedAccountIsUsd) {
															// Permitir coma y punto como separador decimal
															val = val.replace(/[^0-9.,]/g, "");
															// Convertir punto a coma para visualización
															val = val.replace(".", ",");
															// Solo una coma
															const parts = val.split(",");
															if (parts.length > 2)
																val = `${parts[0]},${parts[1]}`;
															// Limitar decimales a 2
															if (parts[1])
																val = `${parts[0]},${parts[1].slice(0, 2)}`;
														} else {
															// Solo permitir números (sin coma ni decimales)
															val = val.replace(/[^0-9]/g, "");
														}
														handleTxAmountChange({
															...e,
															target: {
																...e.target,
																value: val,
															},
														});
													}}
													onFocus={handleTxAmountFocus}
													onBlur={handleTxAmountBlur}
													onKeyDown={handleTxAmountKeyDown}
													onPaste={handleTxAmountPaste}
													onBeforeInput={handleTxBeforeInput}
													onInput={(e) => handleTxAmountChange(e as any)}
												/>
											</div>
										</div>
									</div>
								);
							}
							return null;
						})()}
						{/* Selección de origen/destino */}
						{activeSection === 1 && txTransferStep === "origen" && (
							<div>
								<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
									Banco de origen
								</label>
								<div className="mt-2 grid grid-cols-2 gap-2">
									{Array.from(
										new Set(
											(accounts || [])
												.filter((a) => {
													const base = String(a.type || "")
														.toLowerCase()
														.replace(/_usd$/i, "");
													return ["checking", "vista", "savings"].includes(
														base,
													);
												})
												.map((a) => a.bank_name),
										),
									).map((bn) => (
										<button
											key={bn}
											onClick={() => {
												setTxTransferOriginBank(bn);
												setTxTransferOriginAccount(null);
											}}
											className={`w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txTransferOriginBank === bn ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
										>
											{bn}
										</button>
									))}
								</div>
								{txTransferOriginBank &&
									(() => {
										const cuentasValidas = (accounts || []).filter((a) => {
											const base = String(a.type || "")
												.toLowerCase()
												.replace(/_usd$/i, "");
											return (
												a.bank_name === txTransferOriginBank &&
												["checking", "vista", "savings"].includes(base)
											);
										});
										// sort so that accounts without USD/ordinal watermark come first
										cuentasValidas.sort((A, B) => {
											const rawA = getAccountTypeLabel(A.type, A.bank_name);
											const rawB = getAccountTypeLabel(B.type, B.bank_name);
											const baseA = String(rawA)
												.replace(/\(?USD\)?/i, "")
												.replace(/\s+\(?\)?$/, "")
												.trim();
											const baseB = String(rawB)
												.replace(/\(?USD\)?/i, "")
												.replace(/\s+\(?\)?$/, "")
												.trim();
											// if different base labels, keep existing order by label
											if (baseA !== baseB)
												return String(baseA).localeCompare(
													String(baseB),
													"es",
													{ sensitivity: "base", numeric: true },
												);
											const isUsdA =
												/_usd$/i.test(String(A.type)) ||
												!!(
													A.currency &&
													String(A.currency).toUpperCase() === "USD"
												) ||
												/\busd\b/i.test(String(A.type)) ||
												/\busd\b|us\$|\$us/i.test(String(A.name)) ||
												/\busd\b|us\$|\$us/i.test(String(rawA));
											const isUsdB =
												/_usd$/i.test(String(B.type)) ||
												!!(
													B.currency &&
													String(B.currency).toUpperCase() === "USD"
												) ||
												/\busd\b/i.test(String(B.type)) ||
												/\busd\b|us\$|\$us/i.test(String(B.name)) ||
												/\busd\b|us\$|\$us/i.test(String(rawB));
											// compute siblings and ordinals
											const siblings = cuentasValidas
												.filter(
													(s) =>
														String(getAccountTypeLabel(s.type, s.bank_name))
															.replace(/\(?USD\)?/i, "")
															.replace(/\s+\(?\)?$/, "")
															.trim() === baseA,
												)
												.sort((x, y) =>
													String(x.id).localeCompare(String(y.id)),
												);
											const ordA =
												siblings.findIndex(
													(s) => String(s.id) === String(A.id),
												) + 1;
											const ordB =
												siblings.findIndex(
													(s) => String(s.id) === String(B.id),
												) + 1;
											const watermarkedA = isUsdA || ordA > 1;
											const watermarkedB = isUsdB || ordB > 1;
											// prefer non-watermarked first
											if (watermarkedA !== watermarkedB)
												return (watermarkedA ? 1 : 0) - (watermarkedB ? 1 : 0);
											// then by ordinal among siblings
											return ordA - ordB;
										});
										if (cuentasValidas.length === 0) {
											return (
												<div className="text-center text-gray-500 mt-4">
													Este banco no tiene cuentas Corriente, Ahorro, RUT o
													Vista.
												</div>
											);
										}
										return (
											<div className="mb-3 mt-4">
												<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
													Cuenta de origen
												</label>
												<div className="mt-2 grid grid-cols-2 gap-2">
													{cuentasValidas.map((a) => {
														const rawLabel = getAccountTypeLabel(
															a.type,
															a.bank_name,
														);
														const isUsdType = /_usd$/i.test(String(a.type));
														const currencyIsUsd = !!(
															a.currency &&
															String(a.currency).toUpperCase() === "USD"
														);
														const typeHasUsd = /\busd\b/i.test(String(a.type));
														const nameHasUsd = /\busd\b|us\$|\$us/i.test(
															String(a.name),
														);
														const labelHasUsd = /\busd\b|us\$|\$us/i.test(
															String(getAccountTypeLabel(a.type, a.bank_name)),
														);
														const isUsdAccount =
															isUsdType ||
															currencyIsUsd ||
															typeHasUsd ||
															nameHasUsd ||
															labelHasUsd;
														// normalize label: remove any existing USD markers like '(USD)'
														const baseLabel = String(rawLabel)
															.replace(/\(?USD\)?/i, "")
															.replace(/\s+\(?\)?$/, "")
															.trim();
														// compute ordinal among same baseLabel for this bank (to show 2,3... as background for duplicates)
														const sameLabelSiblings = cuentasValidas
															.filter(
																(s) =>
																	String(
																		getAccountTypeLabel(s.type, s.bank_name),
																	)
																		.replace(/\(?USD\)?/i, "")
																		.replace(/\s+\(?\)?$/, "")
																		.trim() === baseLabel,
															)
															.sort((x, y) =>
																String(x.id).localeCompare(String(y.id)),
															);
														const ordinal =
															sameLabelSiblings.findIndex(
																(s) => String(s.id) === String(a.id),
															) + 1;
														return (
															<button
																key={a.id}
																onClick={() => {
																	setTxTransferOriginAccount(a.id);
																	setTxTransferStep("destino");
																}}
																onMouseEnter={(e) => {
																	const rect = (
																		e.currentTarget as HTMLElement
																	).getBoundingClientRect();
																	const x =
																		rect.left + rect.width / 2 + window.scrollX;
																	const y = rect.top + window.scrollY; // slightly higher (portal adds global offset)
																	const text =
																		typeof a.balance === "number"
																			? formatBalanceDisplayNum(a.balance)
																			: a.balance;
																	const colorClass =
																		typeof a.balance === "number" &&
																		a.balance < 0
																			? "text-red-600"
																			: "text-blue6";
																	showBalanceTooltip(x, y, text, colorClass);
																}}
																onMouseLeave={() => hideBalanceTooltip()}
																onFocus={(e) => {
																	const rect = (
																		e.currentTarget as HTMLElement
																	).getBoundingClientRect();
																	const x =
																		rect.left + rect.width / 2 + window.scrollX;
																	const y = rect.top + window.scrollY;
																	const text =
																		typeof a.balance === "number"
																			? formatBalanceDisplayNum(a.balance)
																			: a.balance;
																	const colorClass =
																		typeof a.balance === "number" &&
																		a.balance < 0
																			? "text-red-600"
																			: "text-blue6";
																	showBalanceTooltip(x, y, text, colorClass);
																}}
																onBlur={() => hideBalanceTooltip()}
																className={`relative w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txTransferOriginAccount === a.id ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
															>
																<span className="relative z-10 inline-block align-middle">
																	{isUsdAccount ? baseLabel : rawLabel}
																</span>
																{/* Background watermark on the right: USD or ordinal for duplicates */}
																{isUsdAccount && (
																	<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-5xl font-normal text-white opacity-100 z-0 pointer-events-none">
																		USD
																	</span>
																)}
																{!isUsdAccount && ordinal > 1 && (
																	<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-5xl font-normal text-white opacity-100 z-0 pointer-events-none">
																		{ordinal}
																	</span>
																)}
															</button>
														);
													})}
												</div>
											</div>
										);
									})()}
							</div>
						)}
						{activeSection === 1 && txTransferStep === "destino" && (
							<div>
								<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
									Banco de destino
								</label>
								<div className="mt-2 grid grid-cols-2 gap-2">
									{Array.from(
										new Set(
											(accounts || [])
												.filter((a) => {
													const base = String(a.type || "")
														.toLowerCase()
														.replace(/_usd$/i, "");
													return (
														["checking", "vista", "savings"].includes(base) &&
														a.id !== txTransferOriginAccount
													);
												})
												.map((a) => a.bank_name),
										),
									)
										.filter(
											(bn) =>
												bn !==
												accounts.find((a) => a.id === txTransferOriginAccount)
													?.bank_name,
										)
										.map((bn) => (
											<button
												key={bn}
												onClick={() => {
													setTxTransferDestBank(bn);
													setTxTransferDestAccount(null);
												}}
												className={`w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txTransferDestBank === bn ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											>
												{bn}
											</button>
										))}
								</div>
								{txTransferDestBank &&
									(() => {
										const cuentasValidasDest = (accounts || []).filter((a) => {
											const base = String(a.type || "")
												.toLowerCase()
												.replace(/_usd$/i, "");
											return (
												a.bank_name === txTransferDestBank &&
												["checking", "vista", "savings"].includes(base) &&
												a.id !== txTransferOriginAccount
											);
										});
										// sort so that accounts without USD/ordinal watermark come first
										const makeMeta = (acc: any) => {
											const rawLabel = getAccountTypeLabel(
												acc.type,
												acc.bank_name,
											);
											const isUsdType = /_usd$/i.test(String(acc.type));
											const currencyIsUsd = !!(
												acc.currency &&
												String(acc.currency).toUpperCase() === "USD"
											);
											const typeHasUsd = /\busd\b/i.test(String(acc.type));
											const nameHasUsd = /\busd\b|us\$|\$us/i.test(
												String(acc.name),
											);
											const labelHasUsd = /\busd\b|us\$|\$us/i.test(
												String(getAccountTypeLabel(acc.type, acc.bank_name)),
											);
											const isUsdAccount =
												isUsdType ||
												currencyIsUsd ||
												typeHasUsd ||
												nameHasUsd ||
												labelHasUsd;
											const baseLabel = String(rawLabel)
												.replace(/\(?USD\)?/i, "")
												.replace(/\s+\(?\)?$/, "")
												.trim();
											const siblings = cuentasValidasDest.filter(
												(s) =>
													String(getAccountTypeLabel(s.type, s.bank_name))
														.replace(/\(?USD\)?/i, "")
														.replace(/\s+\(?\)?$/, "")
														.trim() === baseLabel,
											);
											const ordinal =
												siblings.findIndex(
													(s) => String(s.id) === String(acc.id),
												) + 1;
											const watermarked = isUsdAccount || ordinal > 1;
											return { isUsdAccount, ordinal, watermarked };
										};
										cuentasValidasDest.sort((A, B) => {
											const aMeta = makeMeta(A);
											const bMeta = makeMeta(B);
											const aKey = aMeta.watermarked ? 1 : 0;
											const bKey = bMeta.watermarked ? 1 : 0;
											if (aKey !== bKey) return aKey - bKey;
											return (aMeta.ordinal || 0) - (bMeta.ordinal || 0);
										});
										if (cuentasValidasDest.length === 0) {
											return (
												<div className="text-center text-gray-500 mt-4">
													Este banco no tiene cuentas Corriente, Ahorro, RUT o
													Vista.
												</div>
											);
										}
										return (
											<div className="mb-3 mt-4">
												<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
													Cuenta de destino
												</label>
												<div className="mt-2 grid grid-cols-2 gap-2">
													{cuentasValidasDest.map((a) => {
														const rawLabel = getAccountTypeLabel(
															a.type,
															a.bank_name,
														);
														const isUsdType = /_usd$/i.test(String(a.type));
														const currencyIsUsd = !!(
															a.currency &&
															String(a.currency).toUpperCase() === "USD"
														);
														const typeHasUsd = /\busd\b/i.test(String(a.type));
														const nameHasUsd = /\busd\b|us\$|\$us/i.test(
															String(a.name),
														);
														const labelHasUsd = /\busd\b|us\$|\$us/i.test(
															String(getAccountTypeLabel(a.type, a.bank_name)),
														);
														const isUsdAccount =
															isUsdType ||
															currencyIsUsd ||
															typeHasUsd ||
															nameHasUsd ||
															labelHasUsd;
														const baseLabel = String(rawLabel)
															.replace(/\(?USD\)?/i, "")
															.replace(/\s+\(?\)?$/, "")
															.trim();
														const sameLabelSiblings = cuentasValidasDest
															.filter(
																(s) =>
																	String(
																		getAccountTypeLabel(s.type, s.bank_name),
																	)
																		.replace(/\(?USD\)?/i, "")
																		.replace(/\s+\(?\)?$/, "")
																		.trim() === baseLabel,
															)
															.sort((x, y) =>
																String(x.id).localeCompare(String(y.id)),
															);
														const ordinal =
															sameLabelSiblings.findIndex(
																(s) => String(s.id) === String(a.id),
															) + 1;
														return (
															<button
																key={a.id}
																onClick={() => {
																	setTxTransferDestAccount(a.id);
																	setTxAccountId(a.id);
																	setTxSelectedBank(txTransferDestBank);
																	setActiveSection(2);
																}}
																onMouseEnter={(e) => {
																	const rect = (
																		e.currentTarget as HTMLElement
																	).getBoundingClientRect();
																	const x =
																		rect.left + rect.width / 2 + window.scrollX;
																	const y = rect.top + window.scrollY;
																	const text =
																		typeof a.balance === "number"
																			? formatBalanceDisplayNum(a.balance)
																			: a.balance;
																	const colorClass =
																		typeof a.balance === "number" &&
																		a.balance < 0
																			? "text-red-600"
																			: "text-blue6";
																	showBalanceTooltip(x, y, text, colorClass);
																}}
																onMouseLeave={() => hideBalanceTooltip()}
																onFocus={(e) => {
																	const rect = (
																		e.currentTarget as HTMLElement
																	).getBoundingClientRect();
																	const x =
																		rect.left + rect.width / 2 + window.scrollX;
																	const y = rect.top + window.scrollY;
																	const text =
																		typeof a.balance === "number"
																			? formatBalanceDisplayNum(a.balance)
																			: a.balance;
																	const colorClass =
																		typeof a.balance === "number" &&
																		a.balance < 0
																			? "text-red-600"
																			: "text-blue6";
																	showBalanceTooltip(x, y, text, colorClass);
																}}
																onBlur={() => hideBalanceTooltip()}
																className={`relative w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txTransferDestAccount === a.id ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
															>
																<span className="relative z-10 inline-block align-middle">
																	{isUsdAccount ? baseLabel : rawLabel}
																</span>
																{isUsdAccount && (
																	<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-5xl font-normal text-white opacity-100 z-0 pointer-events-none">
																		USD
																	</span>
																)}
																{!isUsdAccount && ordinal > 1 && (
																	<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-5xl font-normal text-white opacity-100 z-0 pointer-events-none">
																		{ordinal}
																	</span>
																)}
															</button>
														);
													})}
												</div>
											</div>
										);
									})()}
							</div>
						)}
						{activeSection === 1 &&
							txTransferStep === "origen" &&
							!txTransferOriginBank &&
							!txTransferOriginAccount && (
								<div className="text-center text-gray-200 mt-6">
									Selecciona banco y cuenta de origen
								</div>
							)}
						{activeSection === 1 &&
							txTransferStep === "destino" &&
							!txTransferDestBank &&
							!txTransferDestAccount && (
								<div className="text-center text-gray-200 mt-6">
									Selecciona banco y cuenta de destino
								</div>
							)}

						{/* Sticky actions for transfer: always visible at bottom of modal when in section 2 */}
						{txIsTransfer &&
							txTransferOriginAccount &&
							txTransferDestAccount &&
							activeSection === 2 && (
								<div className="sticky bottom-0 left-0 right-0 bg-white py-3 mt-3 border-t flex justify-center gap-2 z-50">
									<button
										className={`w-40 px-3 py-2 rounded text-center transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200`}
										onClick={() => closeTxTransferModal()}
										disabled={loading}
									>
										Cancelar
									</button>
									<button
										className={`w-40 px-3 py-2 rounded text-center transition-colors bg-blue6 text-white hover:bg-blue4`}
										onClick={handleSubmitTransfer}
										disabled={loading}
									>
										Transferir
									</button>
								</div>
							)}
					</div>
				</div>
			)}

			{txPayOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-40 z-50 overflow-y-auto p-3 sm:p-0 flex items-start sm:items-center justify-center"
					onClick={() => {
						setTxPayOpen(false);
						setTxPayShowNav(false);
						setTxPayStep("origen");
						setActiveSection(1);
					}}
				>
					<div
						className="bg-white rounded-lg shadow-lg p-4 w-[95%] max-w-sm relative"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							className="absolute -top-12 right-1 w-10 h-10 flex items-center justify-center rounded-full hover:bg-transparent/30 text-gray-500 border border-gray-300/50 hover:text-white text-3xl focus:outline-none"
							onClick={() => {
								setTxPayOpen(false);
								setTxPayShowNav(false);
								setTxPayStep("origen");
								setActiveSection(1);
							}}
							aria-label="Cerrar modal pagar"
						>
							&times;
						</button>
						{/* Forward arrow: advance section when allowed (no bg) */}
						{txPayOpen &&
							activeSection < 4 &&
							(() => {
								let canAdvance = false;
								const onClick = () => {
									if (activeSection === 1) {
										setActiveSection(2);
										return;
									}
									if (activeSection === 2) {
										setActiveSection(3);
										return;
									}
									// activeSection === 3 -> product selected
									setActiveSection((s) => Math.min(4, s + 1));
								};

								if (activeSection === 1) {
									canAdvance = !!txPayOriginBank && !!txPayOriginAccount;
								} else if (activeSection === 2) {
									canAdvance = !!txPayDestBank;
								} else if (activeSection === 3) {
									canAdvance = !!txPayDestAccount;
								} else {
									canAdvance = !!txDate && !!txAmount && txAmount !== "-";
								}

								const titleMsg =
									activeSection === 1
										? "Selecciona banco y cuenta origen"
										: activeSection === 2
											? "Selecciona banco destino"
											: activeSection === 3
												? "Selecciona producto a pagar"
												: "Siguiente";

								return (
									<button
										className={`absolute top-3 right-3 text-gray-200 text-sm w-10 h-10 flex items-center justify-center rounded-full bg-transparent ${!canAdvance ? "opacity-50 pointer-events-none" : "hover:text-gray-400 hover:scale-105 transition-transform"} z-40`}
										onClick={() => {
											if (canAdvance) onClick();
										}}
										disabled={!canAdvance}
										aria-label="Adelante"
										title={canAdvance ? "Siguiente" : titleMsg}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth={2}
											className="w-5 h-5"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</button>
								);
							})()}
						{txPayOpen && (
							<button
								className="absolute top-3 left-3 text-gray-700 text-sm w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 hover:scale-105 transition-transform z-50"
								onClick={() => {
									if (activeSection === 1) {
										// close and return to chooser
										setTxPayOpen(false);
										setTxTransferOpen(false);
										setTxActionChoiceOpen(true);
										setActiveSection(1);
									} else {
										setActiveSection((s) => Math.max(1, s - 1));
									}
								}}
								aria-label="Volver"
								title="Volver"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									className="w-5 h-5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>
						)}
						<h2 className="text-2xl font-normal mb-6 text-center text-gray-200">
							Pagar
						</h2>
						{/* Pay flow: select origin (bank + account) then destination (card/line) — default destination limited to origin bank, 'Otro' enables other banks */}
						{activeSection === 1 && (
							<div>
								<div className="mb-3">
									<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
										Banco origen
									</label>
									<div className="mt-2 grid grid-cols-2 gap-2">
										{(() => {
											// banks that have payer account types: Corriente, Vista/RUT, Ahorro
											const payerBanks = Array.from(
												new Set(
													(accounts || [])
														.filter((a) => {
															const label = String(
																getAccountTypeLabel(a.type, a.bank_name),
															)
																.replace(/\(?USD\)?/i, "")
																.toLowerCase();
															return /(corriente|vista|rut|ahorro)/i.test(
																label,
															);
														})
														.map((a) => a.bank_name),
												),
											);
											return payerBanks.map((bn) => (
												<button
													key={bn}
													onClick={() => {
														setTxPayOriginBank(bn);
														setTxPayOriginAccount(null);
													}}
													className={`w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txPayOriginBank === bn ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
												>
													{bn}
												</button>
											));
										})()}
									</div>
								</div>
								{txPayOriginBank && (
									<div className="mb-3">
										<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
											Cuenta origen
										</label>
										<div className="mt-2 grid grid-cols-2 gap-2">
											{(() => {
												const txBankAccounts = (accounts || []).filter(
													(a) => a.bank_name === txPayOriginBank,
												);
												// keep payer-type accounts only
												const filtered = txBankAccounts.filter((a) => {
													const label = String(
														getAccountTypeLabel(a.type, a.bank_name),
													)
														.replace(/\(?USD\)?/i, "")
														.toLowerCase();
													return /(corriente|vista|rut|ahorro)/i.test(label);
												});
												// Lógica para watermark diferenciador (USD o número)
												return filtered.map((a) => {
													const rawLabel = getAccountTypeLabel(
														a.type,
														a.bank_name,
													);
													const isUsdType = /_usd$/i.test(String(a.type));
													const currencyIsUsd = !!(
														a.currency &&
														String(a.currency).toUpperCase() === "USD"
													);
													const typeHasUsd = /\busd\b/i.test(String(a.type));
													const nameHasUsd = /\busd\b|us\$|\$us/i.test(
														String(a.name),
													);
													const labelHasUsd = /\busd\b|us\$|\$us/i.test(
														String(rawLabel),
													);
													const isUsdAccount =
														isUsdType ||
														currencyIsUsd ||
														typeHasUsd ||
														nameHasUsd ||
														labelHasUsd;
													// Normalizar label: quitar USD
													const baseLabel = String(rawLabel)
														.replace(/\(?USD\)?/i, "")
														.replace(/\s+\(?\)?$/, "")
														.trim();
													// Buscar duplicados para mostrar número
													const sameLabelSiblings = filtered
														.filter(
															(s) =>
																String(getAccountTypeLabel(s.type, s.bank_name))
																	.replace(/\(?USD\)?/i, "")
																	.replace(/\s+\(?\)?$/, "")
																	.trim() === baseLabel,
														)
														.sort((x, y) =>
															String(x.id).localeCompare(String(y.id)),
														);
													const ordinal =
														sameLabelSiblings.findIndex(
															(s) => String(s.id) === String(a.id),
														) + 1;
													return (
														<button
															key={a.id}
															onClick={() => {
																setTxPayOriginAccount(a.id);
																setActiveSection(2);
															}}
															onMouseEnter={(e) => {
																const rect = (
																	e.currentTarget as HTMLElement
																).getBoundingClientRect();
																const x =
																	rect.left + rect.width / 2 + window.scrollX;
																const y = rect.top + window.scrollY;
																const text =
																	typeof a.balance === "number"
																		? formatBalanceDisplayNum(a.balance)
																		: a.balance;
																const colorClass =
																	typeof a.balance === "number" && a.balance < 0
																		? "text-red-600"
																		: "text-blue6";
																showBalanceTooltip(x, y, text, colorClass);
															}}
															onMouseLeave={() => hideBalanceTooltip()}
															onFocus={(e) => {
																const rect = (
																	e.currentTarget as HTMLElement
																).getBoundingClientRect();
																const x =
																	rect.left + rect.width / 2 + window.scrollX;
																const y = rect.top + window.scrollY;
																const text =
																	typeof a.balance === "number"
																		? formatBalanceDisplayNum(a.balance)
																		: a.balance;
																const colorClass =
																	typeof a.balance === "number" && a.balance < 0
																		? "text-red-600"
																		: "text-blue6";
																showBalanceTooltip(x, y, text, colorClass);
															}}
															onBlur={() => hideBalanceTooltip()}
															className={`relative w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txPayOriginAccount === a.id ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
														>
															<span className="relative z-10 inline-block align-middle">
																{isUsdAccount ? baseLabel : rawLabel}
															</span>
															{/* Watermark: USD o número, más visible y centrado */}
															{isUsdAccount && (
																<span
																	className="absolute inset-0 flex items-center justify-end text-5xl font-normal text-white opacity-60 z-0 pointer-events-none select-none"
																	style={{ letterSpacing: 2 }}
																>
																	USD
																</span>
															)}
															{!isUsdAccount && ordinal > 1 && (
																<span
																	className="absolute inset-0 flex items-center justify-end text-5xl font-normal text-white opacity-60 z-0 pointer-events-none select-none"
																	style={{ letterSpacing: 2 }}
																>
																	{ordinal}
																</span>
															)}
														</button>
													);
												});
											})()}
										</div>
									</div>
								)}
								{/* Destino moved to section 2 */}
							</div>
						)}
						{/* Section 2: Producto a pagar (for Pay flow) */}
						{/* Section 2: Destino (Tarjeta / Línea) */}
						{txPayOpen && activeSection === 2 && (
							<div className="bg-gray-50 text-gray-800 rounded">
								<div className="mb-2">
									<label className="block text-sm text-white text-center bg-gray-400 p-1 rounded">
										Destino (Tarjeta / Línea)
									</label>
									<div className="mt-2 flex items-center justify-center">
										<label className="inline-flex items-center space-x-3 cursor-pointer">
											<input
												type="checkbox"
												role="switch"
												aria-checked={txPayAllowOther}
												checked={txPayAllowOther}
												onChange={() => setTxPayAllowOther((v) => !v)}
												className="sr-only"
											/>
											<span
												className={`w-10 h-6 flex items-center bg-gray-200 rounded-full p-1 transition-colors ${txPayAllowOther ? "bg-blue6" : "bg-gray-200"}`}
											>
												<span
													className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${txPayAllowOther ? "translate-x-4" : ""}`}
												></span>
											</span>
											<span className="text-sm text-gray-700">
												{txPayAllowOther
													? "Pagar al mismo banco"
													: "Pagar a otro banco"}
											</span>
										</label>
									</div>
								</div>
								{(() => {
									const isCard = (acc: any) => {
										const raw = String(
											getAccountTypeLabel(acc.type, acc.bank_name),
										)
											.replace(/\(?USD\)?/i, "")
											.toLowerCase();
										return /(tarjeta|\btc\b|\blc\b|línea|linea|cr[eé]dito|pago)/i.test(
											raw,
										);
									};
									let destBanks: string[] = [];
									if (txPayAllowOther) {
										destBanks = Array.from(
											new Set(
												(accounts || []).filter(isCard).map((a) => a.bank_name),
											),
										);
									} else {
										destBanks = txPayOriginBank ? [txPayOriginBank] : [];
									}
									return (
										<div className="mt-2 grid grid-cols-2 gap-2">
											{destBanks.map((db) => (
												<button
													key={db}
													onClick={() => {
														setTxPayDestBank(db);
														setTxPayDestAccount(
															null,
														); /* do not advance; show products below */
													}}
													className={`w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txPayDestBank === db ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
												>
													{db}
												</button>
											))}
										</div>
									);
								})()}
								{/* Products for selected dest bank (merged in same section) */}
								{txPayDestBank && (
									<div className="mt-4">
										<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
											Producto a pagar
										</label>
										<div className="grid grid-cols-2 gap-2">
											{(() => {
												const isCardLocal = (acc: any) => {
													const raw = String(
														getAccountTypeLabel(acc.type, acc.bank_name),
													)
														.replace(/\(?USD\)?/i, "")
														.toLowerCase();
													return /(tarjeta|\btc\b|\blc\b|línea|linea|cr[eé]dito|pago)/i.test(
														raw,
													);
												};
												const list = (accounts || []).filter(
													(a) =>
														a.bank_name === txPayDestBank && isCardLocal(a),
												);
												if (list.length === 0)
													return (
														<div className="text-center text-gray-500">
															No se encontraron productos para este banco.
														</div>
													);
												return list.map((a) => (
													<button
														key={a.id}
														onClick={() => {
															setTxPayDestAccount(a.id);
															// keep origin as active (amount uses origin currency)
															setTxSelectedBank(txPayOriginBank);
															setTxAccountId(txPayOriginAccount);
															// advance will happen in effect after state commit to avoid needing a second click
														}}
														onMouseEnter={(e) => {
															const rect = (
																e.currentTarget as HTMLElement
															).getBoundingClientRect();
															const x =
																rect.left + rect.width / 2 + window.scrollX;
															const y = rect.top + window.scrollY;
															const text =
																typeof a.balance === "number"
																	? formatBalanceDisplayNum(a.balance)
																	: a.balance;
															const colorClass =
																typeof a.balance === "number" && a.balance < 0
																	? "text-red-600"
																	: "text-blue6";
															showBalanceTooltip(x, y, text, colorClass);
														}}
														onMouseLeave={() => hideBalanceTooltip()}
														onFocus={(e) => {
															const rect = (
																e.currentTarget as HTMLElement
															).getBoundingClientRect();
															const x =
																rect.left + rect.width / 2 + window.scrollX;
															const y = rect.top + window.scrollY;
															const text =
																typeof a.balance === "number"
																	? formatBalanceDisplayNum(a.balance)
																	: a.balance;
															const colorClass =
																typeof a.balance === "number" && a.balance < 0
																	? "text-red-600"
																	: "text-blue6";
															showBalanceTooltip(x, y, text, colorClass);
														}}
														onBlur={() => hideBalanceTooltip()}
														className={`w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txPayDestAccount === a.id ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
													>
														{getAccountTypeLabel(a.type, a.bank_name)}
													</button>
												));
											})()}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Section 3: Fecha / Monto (reuse shared fields when pay origin was assigned above) */}
						{activeSection === 3 && (
							<div className="bg-gray-50 text-gray-800 rounded">
								{/* If this is the Pay flow, show origin -> dest summary */}
								{txPayOpen &&
									(() => {
										const origin = (accounts || []).find(
											(a) => String(a.id) === String(txPayOriginAccount),
										);
										const dest = (accounts || []).find(
											(a) => String(a.id) === String(txPayDestAccount),
										);
										return (
											<div className="mb-3 text-center">
												{origin && dest ? (
													<div className="inline-block w-full px-4 py-2 bg-gray-50 rounded text-gray-800 font-medium">
														<div className="flex items-center justify-center gap-4">
															<div className="text-left">
																<div className="text-base font-medium">
																	{origin.bank_name}
																</div>
																<div className="text-sm text-gray-600">
																	{getAccountTypeLabel(
																		origin.type,
																		origin.bank_name,
																	)}
																</div>
															</div>
															<div className="text-gray-400">→</div>
															<div className="text-right">
																<div className="text-base font-medium">
																	{dest.bank_name}
																</div>
																<div className="text-sm text-gray-600">
																	{getAccountTypeLabel(
																		dest.type,
																		dest.bank_name,
																	)}
																</div>
															</div>
														</div>
													</div>
												) : (
													<div className="inline-block px-3 py-2 bg-yellow-50 rounded text-yellow-800 font-medium">
														Selecciona cuenta de origen y destino
													</div>
												)}
											</div>
										);
									})()}
								<div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
									<div>
										<label className="block text-sm text-gray-700 text-center bg-gray-400 p-1 rounded">
											Fecha
										</label>
										<DatePicker
											selected={txDate ? new Date(`${txDate}T00:00:00`) : null}
											onChange={(d: Date | null) =>
												setTxDate(d ? d.toISOString().slice(0, 10) : txDate)
											}
											locale={es}
											dateFormat="dd/MM/yyyy"
											wrapperClassName="w-full"
											className="block w-full mt-2 border-2 border-gray-300 rounded px-3 py-3 text-lg text-center"
											placeholderText="dd/mm/yyyy"
											customInput={<DatePickerInput />}
										/>
									</div>
									<div>
										<label className="block text-sm text-gray-700 text-center bg-gray-400 p-1 rounded">
											{txTipo === "ajuste" ? "Nuevo saldo" : "Monto"}
										</label>
										<input
											ref={txAmountRef}
											type="text"
											className="w-full mt-2 border-2 border-gray-300 rounded px-3 py-2.5 text-2xl font-normal text-center"
											inputMode="text"
											placeholder={
												txTipo === "ajuste"
													? txSelectedAccountIsUsd
														? "US$ saldo objetivo"
														: "$ saldo objetivo"
													: txSelectedAccountIsUsd
														? "US$ 0,00"
														: "$ 0.-"
											}
											value={
												txEditingAmount
													? txAmountDisplay
													: formatAmountDisplay(
															txAmount,
															txSelectedAccountIsUsd,
														)
											}
											onChange={handleTxAmountChange}
											onFocus={handleTxAmountFocus}
											onBlur={handleTxAmountBlur}
											onKeyDown={handleTxAmountKeyDown}
											onPaste={handleTxAmountPaste}
											onBeforeInput={handleTxBeforeInput}
											onInput={(e) => handleTxAmountChange(e as any)}
										/>
									</div>
								</div>
								<div className="flex justify-center gap-2 mt-3">
									<button
										className={`w-40 px-3 py-2 rounded truncate text-center transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200`}
										onClick={() => {
											resetTxForm();
											setTxPayOpen(false);
											setTxPayShowNav(false);
											setTxPayStep("origen");
										}}
										disabled={loading}
									>
										Cancelar
									</button>
									<button
										className={`w-40 px-3 py-2 rounded truncate text-center transition-colors bg-blue6 text-white hover:bg-blue4`}
										onClick={() => {
											// submit pay as origin egreso + destination ingreso
											handleSubmitPay();
										}}
										disabled={loading}
									>
										Pagar
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{txModalOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
					onClick={() => closeTxModal()}
				>
					<div
						className="bg-white rounded-lg shadow-lg p-4 w-[96%] max-w-2xl relative my-4 max-h-[92vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							className="absolute -top-12 right-1 w-10 h-10 flex items-center justify-center rounded-full hover:bg-transparent/30 text-gray-500 border border-gray-300/50 hover:text-white text-3xl focus:outline-none"
							onClick={() => closeTxModal()}
							disabled={loading}
							aria-label="Cerrar modal movimiento"
						>
							&times;
						</button>

						{/* Forward arrow: advance section when allowed (no bg) */}
						{activeSection < 3 &&
							(() => {
								const canAdvance =
									activeSection === 1
										? !!txSelectedBank && !!txAccountId
										: !!txDate && !!txAmount && txAmount !== "-";
								return (
									<button
										className={`absolute top-3 right-3 text-gray-200 text-sm w-10 h-10 flex items-center justify-center rounded-full bg-transparent ${!canAdvance ? "opacity-50 pointer-events-none" : "hover:text-gray-400 hover:scale-105 transition-transform"} z-40`}
										onClick={() => {
											if (canAdvance)
												setActiveSection((s) => Math.min(3, s + 1));
										}}
										disabled={!canAdvance}
										aria-label="Adelante"
										title={
											canAdvance
												? "Siguiente"
												: "Completa fecha y monto para continuar"
										}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth={2}
											className="w-5 h-5"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</button>
								);
							})()}
						{activeSection > 1 && (
							<button
								className="absolute top-3 left-3 text-gray-700 text-sm w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 hover:scale-105 transition-transform z-50"
								onClick={() => setActiveSection((s) => Math.max(1, s - 1))}
								aria-label="Volver"
								title="Volver"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									className="w-5 h-5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>
						)}
						<h2 className="text-2xl font-normal mb-6 text-center text-gray-200">
							Registrar movimiento
						</h2>
						{selectedTxAccount && (
							<div className="mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-12 h-12 rounded-md bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
											{selectedTxAccount.bank_logo_url ? (
												<img
													src={String(selectedTxAccount.bank_logo_url)}
													alt={String(selectedTxAccount.bank_name || "Banco")}
													className="w-full h-full object-contain"
												/>
											) : (
												<svg
													width="20"
													height="20"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="1.8"
													className="text-gray-500"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M3 10l9-5 9 5"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M4 10h16v9H4z"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M9 19v-4h6v4"
													/>
												</svg>
											)}
										</div>
										<div className="min-w-0">
											<div className="text-sm font-semibold text-gray-800 truncate">
												{String(selectedTxAccount.bank_name || "Banco")}
											</div>
											<div className="text-xs text-gray-600 truncate">
												{getAccountTypeLabel(
													selectedTxAccount.type,
													selectedTxAccount.bank_name,
												)}
											</div>
										</div>
									</div>
									<div className="text-right shrink-0 min-w-[170px]">
										<div className="text-[11px] uppercase tracking-wide text-gray-500">
											Saldo actual
										</div>
										<div className="text-2xl font-semibold text-blue6 leading-tight">
											{formatBalanceDisplayByType(
												selectedTxAccount.type,
												Number(selectedTxAccount.balance || 0),
											)}
										</div>
										{txSelectedAccountIsCredit && (
											<div className="mt-2">
												<div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 text-left">
													Cupo asignado
												</div>
												<div className="flex items-center gap-2">
													<input
														type="text"
														className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right"
														inputMode="text"
														value={
															txEditingCreditLimit
																? txCreditLimitDisplay
																: formatAmountDisplay(
																		txCreditLimit,
																		txSelectedAccountIsUsd,
																	)
														}
														onChange={handleTxCreditLimitChange}
														onFocus={handleTxCreditLimitFocus}
														onBlur={handleTxCreditLimitBlur}
														disabled={txUpdatingCreditLimit}
													/>
													<button
														type="button"
														className="px-2.5 py-1.5 rounded bg-blue6 text-white text-xs hover:bg-blue4 disabled:opacity-60"
														onClick={() => void handleSaveCreditLimit()}
														disabled={txUpdatingCreditLimit}
													>
														{txUpdatingCreditLimit ? "..." : "Guardar"}
													</button>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{/* Section 1: Banco & Cuenta */}
						{activeSection === 1 && (
							<div>
								<div className="mb-3">
									<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
										Banco
									</label>
									<div className="mt-2 grid grid-cols-2 gap-2">
										{Array.from(
											new Set((accounts || []).map((a) => a.bank_name)),
										).map((bn) => (
											<button
												key={bn}
												onClick={() => {
													setTxSelectedBank(bn);
													setTxAccountId(null);
												}}
												className={`w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors ${txSelectedBank === bn ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											>
												{bn}
											</button>
										))}
									</div>
								</div>

								{txSelectedBank && (
									<div className="mb-3">
										<label className="block text-sm text-white text-center bg-gray-400 p-1 mb-3 rounded">
											Cuenta
										</label>
										<div className="mt-2 grid grid-cols-2 gap-2">
											{(() => {
												const txBankAccounts = (accounts || []).filter(
													(a) => a.bank_name === txSelectedBank,
												);
												// Agrupar por baseLabel y moneda
												const getBaseLabel = (acc: any) =>
													String(getAccountTypeLabel(acc.type, acc.bank_name))
														.replace(/\(?USD\)?/i, "")
														.replace(/\s+\(?\)?$/, "")
														.trim();
												const getCurrency = (acc: any) =>
													acc.currency
														? String(acc.currency).toUpperCase()
														: /_usd$/i.test(String(acc.type)) ||
																/\busd\b/i.test(String(acc.type)) ||
																/\busd\b|us\$|\$us/i.test(String(acc.name)) ||
																/\busd\b|us\$|\$us/i.test(
																	String(
																		getAccountTypeLabel(
																			acc.type,
																			acc.bank_name,
																		),
																	),
																)
															? "USD"
															: "";
												// Agrupar por baseLabel+currency
												const groups: Record<string, any[]> = {};
												txBankAccounts.forEach((acc) => {
													const base = getBaseLabel(acc);
													const curr = getCurrency(acc);
													const key = `${base}|${curr}`;
													if (!groups[key]) groups[key] = [];
													groups[key].push(acc);
												});
												// Ordenar por baseLabel, currency, id
												const sortedAccounts = Object.values(groups)
													.flat()
													.sort((a, b) => {
														const baseA = getBaseLabel(a),
															baseB = getBaseLabel(b);
														if (baseA !== baseB)
															return baseA.localeCompare(baseB);
														const currA = getCurrency(a),
															currB = getCurrency(b);
														if (currA !== currB)
															return currA.localeCompare(currB);
														return String(a.id).localeCompare(String(b.id));
													});
												return sortedAccounts.map((a) => {
													const baseLabel = getBaseLabel(a);
													const currency = getCurrency(a);
													const groupKey = `${baseLabel}|${currency}`;
													const siblings = groups[groupKey];
													let watermark = "";
													const idx = siblings.findIndex(
														(s) => String(s.id) === String(a.id),
													);
													if (currency && siblings.length > 1 && idx > 0) {
														// Ej: USD 2, USD 3 (pero no USD 1)
														watermark = `${currency} ${idx + 1}`;
													} else if (currency && siblings.length === 1) {
														// Solo USD
														watermark = currency;
													} else if (siblings.length > 1 && idx > 0) {
														// Solo número, pero no para la primera
														watermark = String(idx + 1);
													}
													const labelWithIndex =
														siblings.length > 1
															? `${baseLabel} #${idx + 1}`
															: baseLabel;
													return (
														<button
															key={a.id}
															onClick={() => {
																setTxAccountId(a.id);
																const isUsd =
																	String(a.currency || "").toUpperCase() ===
																		"USD" ||
																	/_?usd$/i.test(String(a.type || ""));
																const currentBalance =
																	Number(a.balance ?? 0) || 0;
																const normalizedAmount = isUsd
																	? currentBalance.toFixed(2)
																	: String(Math.trunc(currentBalance));
																setTxAmount(normalizedAmount);
																setTxAmountDisplay("");
															}}
															onMouseEnter={(e) => {
																const rect = (
																	e.currentTarget as HTMLElement
																).getBoundingClientRect();
																const x =
																	rect.left + rect.width / 2 + window.scrollX;
																const y = rect.top + window.scrollY;
																const text =
																	typeof a.balance === "number"
																		? formatBalanceDisplayNum(a.balance)
																		: a.balance;
																const colorClass =
																	typeof a.balance === "number" && a.balance < 0
																		? "text-red-600"
																		: "text-blue6";
																showBalanceTooltip(x, y, text, colorClass);
															}}
															onMouseLeave={() => hideBalanceTooltip()}
															onFocus={(e) => {
																const rect = (
																	e.currentTarget as HTMLElement
																).getBoundingClientRect();
																const x =
																	rect.left + rect.width / 2 + window.scrollX;
																const y = rect.top + window.scrollY;
																const text =
																	typeof a.balance === "number"
																		? formatBalanceDisplayNum(a.balance)
																		: a.balance;
																const colorClass =
																	typeof a.balance === "number" && a.balance < 0
																		? "text-red-600"
																		: "text-blue6";
																showBalanceTooltip(x, y, text, colorClass);
															}}
															onBlur={() => hideBalanceTooltip()}
															className={`relative w-full p-4 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors group ${txAccountId === a.id ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
															type="button"
														>
															{/* Watermark como fondo */}
															{watermark && (
																<span
																	className="absolute inset-0 flex items-center justify-end pr-3 pointer-events-none select-none text-white text-5xl font-normal opacity-60 z-0"
																	style={{ letterSpacing: 0.5 }}
																	aria-hidden="true"
																>
																	{watermark}
																</span>
															)}
															{/* Texto principal por encima */}
															<span className="relative z-10 inline-block align-middle">
																{labelWithIndex}
															</span>
															{/* Tooltip de saldo al hacer hover sobre el botón completo */}
															{/* tooltip now rendered in portal on hover */}
														</button>
													);
												});
											})()}
											{/* Balance tooltip portal rendered globally below */}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Section 2: Fecha / Monto / Tipo / Método */}
						{activeSection === 2 && (
							<div className="bg-gray-50 text-gray-800 rounded">
								{/* If this is a transfer flow and both origin/dest are selected, show a summary line */}
								{txIsTransfer &&
									(() => {
										const origin = (accounts || []).find(
											(a) => String(a.id) === String(txTransferOriginAccount),
										);
										const dest = (accounts || []).find(
											(a) => String(a.id) === String(txTransferDestAccount),
										);
										const _originLabel = origin
											? `${origin.bank_name}, ${getAccountTypeLabel(origin.type, origin.bank_name)}`
											: "";
										const _destLabel = dest
											? `${dest.bank_name}, ${getAccountTypeLabel(dest.type, dest.bank_name)}`
											: "";
										return (
											<div className="mb-3 text-center">
												{origin && dest ? (
													<div className="inline-block px-4 py-2 bg-gray-50 rounded text-gray-800 font-medium">
														<div className="flex items-center justify-center gap-4">
															<div className="text-left">
																<div className="text-base font-medium">
																	{origin.bank_name}
																</div>
																<div className="text-sm text-gray-600">
																	{getAccountTypeLabel(
																		origin.type,
																		origin.bank_name,
																	)}
																</div>
															</div>
															<div className="text-gray-400">→</div>
															<div className="text-right">
																<div className="text-base font-medium">
																	{dest.bank_name}
																</div>
																<div className="text-sm text-gray-600">
																	{getAccountTypeLabel(
																		dest.type,
																		dest.bank_name,
																	)}
																</div>
															</div>
														</div>
													</div>
												) : (
													<div className="inline-block px-3 py-2 bg-yellow-50 rounded text-yellow-800 font-medium">
														Selecciona cuenta de origen y destino
													</div>
												)}
											</div>
										);
									})()}

								<div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
									<div>
										<label className="block text-sm text-gray-700 text-center bg-gray-400 p-1 rounded">
											Fecha
										</label>
										<DatePicker
											selected={txDate ? new Date(`${txDate}T00:00:00`) : null}
											onChange={(d: Date | null) =>
												setTxDate(d ? d.toISOString().slice(0, 10) : txDate)
											}
											locale={es}
											dateFormat="dd/MM/yyyy"
											wrapperClassName="w-full"
											className="block w-full mt-2 border-2 border-gray-300 rounded px-3 py-3 text-lg text-center"
											placeholderText="dd/mm/yyyy"
											customInput={<DatePickerInput />}
										/>
									</div>
									<div>
										<label className="block text-sm text-gray-700 text-center bg-gray-400 p-1 rounded">
											Monto
										</label>
										<input
											ref={txAmountRef}
											type="text"
											className="w-full mt-2 border-2 border-gray-300 rounded px-3 py-2.5 text-2xl font-normal text-center"
											inputMode="text"
											placeholder={
												txSelectedAccountIsUsd ? "US$ 0,00" : "$ 0.-"
											}
											value={
												txEditingAmount
													? txAmountDisplay
													: formatAmountDisplay(
															txAmount,
															txSelectedAccountIsUsd,
														)
											}
											onChange={handleTxAmountChange}
											onFocus={handleTxAmountFocus}
											onBlur={handleTxAmountBlur}
											onKeyDown={handleTxAmountKeyDown}
											onPaste={handleTxAmountPaste}
											onBeforeInput={handleTxBeforeInput}
											onInput={(e) => handleTxAmountChange(e as any)}
										/>
									</div>
								</div>
								<div className="mb-3">
									<label className="block text-sm text-gray-700 text-center bg-gray-400 p-1 rounded">
										Tipo
									</label>
									<div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
										<button
											className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${txTipo === "egreso" ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											onClick={() => setTxTipo("egreso")}
										>
											Egreso
										</button>
										<button
											className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${txTipo === "ingreso" ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											onClick={() => setTxTipo("ingreso")}
										>
											Ingreso
										</button>
										<button
											className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${txTipo === "ajuste" ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											onClick={() => {
												setTxTipo("ajuste");
												setTxMetodo("ajuste");
											}}
										>
											Ajustar saldo
										</button>
									</div>
								</div>
								<div className="mb-3">
									<label className="block text-sm text-white text-center bg-gray-400 p-1 rounded">
										Método
									</label>
									<div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 justify-center">
										{METODO_OPTIONS.map((m) => (
											<button
												key={m}
												onClick={() => setTxMetodo(m)}
												className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${txMetodo === m ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											>
												{m.charAt(0).toUpperCase() + m.slice(1)}
											</button>
										))}
									</div>
								</div>
								{/* Transfer actions: Cancel and Transferir (only for transfers with origin+dest) */}
								{txIsTransfer &&
									txTransferOriginAccount &&
									txTransferDestAccount && (
										<div className="flex justify-center gap-2 mt-3">
											<button
												className={`w-40 px-3 py-2 rounded truncate text-center transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200`}
												onClick={() => closeTxTransferModal()}
												disabled={loading}
											>
												Cancelar
											</button>
											<button
												className={`w-40 px-3 py-2 rounded truncate text-center transition-colors bg-blue6 text-white hover:bg-blue4`}
												onClick={handleSubmitTransfer}
												disabled={loading}
											>
												Transferir
											</button>
										</div>
									)}
							</div>
						)}

						{/* Section 3: Categoría / Descripción / Acciones */}
						{activeSection === 3 && (
							<div>
								<div className="mb-3">
									<label className="block text-sm text-white text-center bg-gray-400 p-1 rounded">
										Categoría
									</label>
									<div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 justify-center">
										{CATEGORIA_OPTIONS.map((c) => (
											<button
												key={c.key}
												onClick={() => setTxCategoria(c.key)}
												className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${txCategoria === c.key ? "bg-blue6 text-white hover:bg-blue4" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
											>
												{c.label}
											</button>
										))}
									</div>
								</div>
								<div className="mb-3">
									<label className="block text-sm text-white text-center bg-gray-400 p-1 rounded">
										Descripción
									</label>
									<textarea
										className="w-full mt-1 border rounded px-3 py-2"
										value={txDescripcion}
										onChange={(e) => setTxDescripcion(e.target.value)}
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<button
										className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 bg-gray-100 text-gray-700 hover:bg-gray-200`}
										onClick={() => closeTxModal()}
										disabled={loading}
									>
										Cancelar
									</button>
									<button
										className={`w-full px-3 py-2 rounded truncate text-center overflow-hidden whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 bg-blue6 text-white hover:bg-blue4`}
										onClick={handleSubmitTransaction}
										disabled={loading}
									>
										Guardar
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
			<BalanceTooltipPortal state={balanceTooltip} />
		</div>
	);
}
