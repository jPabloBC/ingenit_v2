"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Message {
	id: string;
	content: string;
	sender: string;
	timestamp: string;
	read: boolean;
	from_number?: string;
	to_number?: string;
	whatsapp_number?: string; // Número de WhatsApp que envió/recibió el mensaje
	media_url?: string | null;
	storage_path?: string | null;
	media_type?: "audio" | "image" | "video" | "document" | null;
	contact_name?: string | null;
}

interface Contact {
	id: string;
	name: string;
	phone: string;
	unreadCount: number;
	whatsapp_number?: string; // Número de WhatsApp asociado al contacto
	totalMessages?: number;
	firstMessageAt?: string;
	lastMessageAt?: string;
	lastDirection?: "in" | "out";
	countryLabel?: string;
	isNewContact?: boolean;
}

interface WhatsAppNumber {
	id: string;
	number: string;
	name: string;
	isActive: boolean;
	lastUsed: string;
	phoneId?: string; // Identificador de número de teléfono
	businessAccountId?: string; // Identificador de la cuenta de WhatsApp Business
	primaryColor: string; // Color primario corporativo
	secondaryColor: string; // Color secundario corporativo
	accentColor: string; // Color de acento
	bgColor: string; // Color de fondo
	connectionStatus?: "active" | "connecting" | "disconnected";
}

interface MediaPreview {
	type: "pdf" | "image";
	src: string;
	title?: string;
	messageId?: string;
}

interface NumberThemeClasses {
	numberCardSelected: string;
	numberCardIdle: string;
	numberDot: string;
	numberTitleSelected: string;
	numberSubtitleSelected: string;
	contactRowBorder: string;
	contactRowLeftBorder: string;
	contactRowSelected: string;
	contactRowIdle: string;
	contactAvatar: string;
	contactNameSelected: string;
	menuButtonOpen: string;
	chatAreaBg: string;
	chatHeaderBg: string;
	chatHeaderBorder: string;
	chatFooterBg: string;
	chatFooterBorder: string;
	inputFocusRing: string;
	actionButton: string;
	actionButtonHover: string;
}

const AUDIO_FALLBACK_BARS = new Array(34)
	.fill(0)
	.map((_, idx) => 0.2 + (idx % 8) * 0.08);

const AudioSpectrumPreview = ({ src }: { src: string }) => {
	const [bars, setBars] = useState<number[]>(AUDIO_FALLBACK_BARS);

	useEffect(() => {
		let cancelled = false;
		let context: AudioContext | null = null;
		let closing = false;

		const safeCloseContext = async () => {
			if (!context || closing) return;
			if (context.state === "closed") return;
			closing = true;
			try {
				await context.close();
			} catch {
				// ignore close race conditions on unmount
			} finally {
				closing = false;
			}
		};

		const run = async () => {
			if (typeof window === "undefined" || !("AudioContext" in window)) return;
			try {
				context = new AudioContext();
				const res = await fetch(src, { cache: "force-cache" });
				if (!res.ok) throw new Error("audio_fetch_failed");
				const buffer = await res.arrayBuffer();
				const decoded = await context.decodeAudioData(buffer.slice(0));
				if (cancelled) return;

				const channel = decoded.getChannelData(0);
				const totalBars = 40;
				const step = Math.max(1, Math.floor(channel.length / totalBars));
				const values: number[] = [];

				for (let i = 0; i < totalBars; i++) {
					const start = i * step;
					const end = Math.min(channel.length, start + step);
					let sum = 0;
					for (let j = start; j < end; j++) {
						const s = channel[j];
						sum += s * s;
					}
					values.push(Math.sqrt(sum / Math.max(1, end - start)));
				}

				const max = Math.max(...values, 0.001);
				const normalized = values.map((v) =>
					Math.max(0.15, Math.min(1, v / max)),
				);
				setBars(normalized);
			} catch {
				if (!cancelled) setBars(AUDIO_FALLBACK_BARS);
			} finally {
				await safeCloseContext();
			}
		};

		run();
		return () => {
			cancelled = true;
			void safeCloseContext();
		};
	}, [src]);

	return (
		<div className="my-2 inline-block max-w-full rounded-xl border border-white/20 bg-white/10 p-2">
			<div className="w-[260px] sm:w-[320px] md:w-[360px] max-w-full h-12 rounded bg-black/20 px-2 py-1 flex items-end gap-[2px] overflow-hidden">
				{bars.map((value) => (
					<span
						key={`audio-bar-${Math.round(value * 10000)}`}
						className="flex-1 rounded-sm bg-white/80"
						style={{ height: `${Math.round(value * 100)}%` }}
					/>
				))}
			</div>
			<audio controls src={src} className="w-full mt-2" preload="metadata">
				<track kind="captions" srcLang="es" label="Sin subtítulos" />
				Tu navegador no soporta audio.
			</audio>
		</div>
	);
};

export default function AdminChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [showContacts, setShowContacts] = useState(true);
	const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
	const [selectedWhatsappNumber, setSelectedWhatsappNumber] =
		useState<WhatsAppNumber | null>(null);
	const [showWhatsappSelector, setShowWhatsappSelector] = useState(false);
	const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
	const [openContactMenu, setOpenContactMenu] = useState<string | null>(null);
	const [newMessageIndicator, setNewMessageIndicator] = useState(false);
	const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const selectedContactRef = useRef<Contact | null>(null);
	const selectedWhatsappNumberRef = useRef<WhatsAppNumber | null>(null);
	const realtimeRefreshTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>(
		{},
	);

	const getContactInitial = (name?: string | null) => {
		const value = String(name || "").trim();
		if (!value) return null;
		const first = value.charAt(0).toUpperCase();
		return /[A-ZÁÉÍÓÚÑÜ]/i.test(first) ? first : null;
	};

	const inferCountryLabel = (phone: string) => {
		const normalized = String(phone || "");
		if (normalized.startsWith("+56")) return "Chile (+56)";
		if (normalized.startsWith("+54")) return "Argentina (+54)";
		if (normalized.startsWith("+51")) return "Perú (+51)";
		if (normalized.startsWith("+57")) return "Colombia (+57)";
		if (normalized.startsWith("+52")) return "México (+52)";
		if (normalized.startsWith("+55")) return "Brasil (+55)";
		return "Internacional";
	};

	const formatMessageTimestamp = (iso?: string) => {
		if (!iso) return "";
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return "";

		const now = new Date();
		const dayMs = 24 * 60 * 60 * 1000;
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).getTime();
		const msgDayStart = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
		).getTime();
		const dayDiff = Math.floor((todayStart - msgDayStart) / dayMs);

		const hhmm = date.toLocaleTimeString("es-CL", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		if (dayDiff <= 0) return hhmm;
		if (dayDiff === 1) return `Ayer ${hhmm}`;
		if (dayDiff === 2) return `Anteayer ${hhmm}`;
		if (dayDiff < 7) {
			const weekday = date.toLocaleDateString("es-CL", { weekday: "long" });
			const normalizedWeekday =
				weekday.charAt(0).toUpperCase() + weekday.slice(1);
			return `${normalizedWeekday} ${hhmm}`;
		}

		const dateLabel = date.toLocaleDateString("es-CL", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
		return `${dateLabel} ${hhmm}`;
	};

	// Función para hacer scroll automático al final de los mensajes
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			// small feedback could be added
		} catch (e) {
			console.error("Copy failed", e);
		}
	};

	const inferExtensionFromUrl = (url?: string | null) => {
		if (!url) return "";
		try {
			const parsed = new URL(url);
			const pathname = parsed.pathname.toLowerCase();
			const byPath = pathname.match(
				/\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|ogg|mp3|wav|m4a|mp4|mov|avi|webm|mkv)$/i,
			);
			if (byPath?.[1]) return byPath[1].toLowerCase();
		} catch {}
		return "";
	};

	const buildDownloadFilename = (message: Message) => {
		const extFromUrl = inferExtensionFromUrl(message.media_url);
		const defaultExtByType: Record<string, string> = {
			image: "jpg",
			audio: "ogg",
			video: "mp4",
			document: "pdf",
		};
		const mediaTypeKey = String(message.media_type || "").toLowerCase();
		const ext = extFromUrl || defaultExtByType[mediaTypeKey] || "bin";
		const base = mediaTypeKey || "archivo";
		const shortId = String(message.id || "msg").slice(0, 8);
		return `${base}-${shortId}.${ext}`;
	};

	const extractStoragePathFromPublicUrl = (url?: string | null) => {
		if (!url) return null;
		try {
			const parsed = new URL(url);
			const marker = "/storage/v1/object/public/ingenit/";
			const idx = parsed.pathname.indexOf(marker);
			if (idx === -1) return null;
			const encodedPath = parsed.pathname.slice(idx + marker.length);
			return decodeURIComponent(encodedPath);
		} catch {
			return null;
		}
	};

	const getMessageStoragePath = (message: {
		storage_path?: string | null;
		media_url?: string | null;
	}) => {
		if (message.storage_path) return message.storage_path;
		return extractStoragePathFromPublicUrl(message.media_url);
	};

	const removeStorageFiles = async (paths: string[]) => {
		const uniquePaths = Array.from(
			new Set(
				paths.filter((p) => typeof p === "string" && p.trim().length > 0),
			),
		);
		if (uniquePaths.length === 0) {
			return { removed: 0, error: null as unknown };
		}
		try {
			const response = await fetch("/api/admin/chat/storage", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ paths: uniquePaths }),
			});
			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				return {
					removed: 0,
					error:
						(payload as { error?: string }).error ||
						`storage delete failed (${response.status})`,
				};
			}
			const payload = (await response.json().catch(() => ({}))) as {
				removed?: number;
			};
			return {
				removed: Number(payload.removed || uniquePaths.length),
				error: null as unknown,
			};
		} catch (error) {
			return { removed: 0, error };
		}
	};

	const getMediaPreviewType = (message: Message): "pdf" | "image" | null => {
		if (!message.media_url) return null;
		const ext = inferExtensionFromUrl(message.media_url);
		if (
			message.media_type === "image" ||
			(!message.media_type &&
				["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
		) {
			return "image";
		}
		const isPdf =
			message.media_type === "document" &&
			(ext === "pdf" || /\\.pdf(\\b|\\s|$)/i.test(message.content || ""));
		if (isPdf || ext === "pdf") {
			return "pdf";
		}
		return null;
	};

	const getPreviewItemsForChat = () => {
		const items: Array<{
			messageId: string;
			type: "pdf" | "image";
			src: string;
			title: string;
			filename: string;
		}> = [];
		for (const msg of messages) {
			if (!msg.media_url) continue;
			const type = getMediaPreviewType(msg);
			if (!type) continue;
			const parsedUrl = (() => {
				try {
					return new URL(msg.media_url || "");
				} catch {
					return null;
				}
			})();
			const shouldProxy =
				parsedUrl &&
				(parsedUrl.hostname === "lookaside.fbsbx.com" ||
					parsedUrl.hostname === "graph.facebook.com");
			const src = shouldProxy
				? `/api/media-proxy?u=${encodeURIComponent(msg.media_url)}`
				: msg.media_url;

			items.push({
				messageId: msg.id,
				type,
				src,
				title: msg.content || (type === "pdf" ? "Documento PDF" : "Imagen"),
				filename: buildDownloadFilename(msg),
			});
		}
		return items;
	};

	const downloadFile = (url: string, filename?: string) => {
		try {
			// Use proxied url if needed
			const parsedUrl = (() => {
				try {
					return new URL(url);
				} catch {
					return null;
				}
			})();
			const shouldProxy =
				parsedUrl &&
				(parsedUrl.hostname === "lookaside.fbsbx.com" ||
					parsedUrl.hostname === "graph.facebook.com");
			const downloadUrl = shouldProxy
				? `/api/media-proxy?u=${encodeURIComponent(url)}`
				: url;
			const a = document.createElement("a");
			a.href = downloadUrl;
			if (filename) a.download = filename;
			a.target = "_blank";
			document.body.appendChild(a);
			a.click();
			a.remove();
		} catch (e) {
			console.error("Download failed", e);
			window.open(url, "_blank");
		}
	};

	// Componente interno para mostrar imagen con fallback si falla la carga
	const ImageWithFallback = ({ src, alt }: { src: string; alt?: string }) => {
		const [error, setError] = useState(false);
		if (!src || error) {
			return <span style={{ color: "#888" }}>Imagen no disponible</span>;
		}
		return (
			// crossOrigin in case storage requires it
			<Image
				src={src}
				alt={alt || "Imagen"}
				width={1200}
				height={1200}
				unoptimized
				className="max-w-full max-h-[40vh] my-2 rounded object-contain"
				style={{ display: "block" }}
				crossOrigin="anonymous"
				onError={() => setError(true)}
			/>
		);
	};

	const getNumberThemeClasses = (
		whatsappNumber: WhatsAppNumber | null,
	): NumberThemeClasses => {
		const key = whatsappNumber?.primaryColor || "blue8";
		if (key === "grayStrong") {
			return {
				numberCardSelected: "border-gray2 bg-gray3",
				numberCardIdle: "border-gray7 bg-white",
				numberDot: "bg-white",
				numberTitleSelected: "text-white",
				numberSubtitleSelected: "text-white/85",
				contactRowBorder: "border-b-gray8",
				contactRowLeftBorder: "border-l-gray3",
				contactRowSelected: "bg-gray9 ring-1 ring-inset ring-gray6",
				contactRowIdle: "bg-gray10/60",
				contactAvatar: "bg-gray3",
				contactNameSelected: "text-gray2",
				menuButtonOpen: "bg-gray8",
				chatAreaBg: "bg-gray3",
				chatHeaderBg: "bg-gray3",
				chatHeaderBorder: "border-gray7",
				chatFooterBg: "bg-gray3",
				chatFooterBorder: "border-gray7",
				inputFocusRing: "focus:ring-gray5",
				actionButton: "bg-gray3",
				actionButtonHover: "hover:bg-gray2",
			};
		}
		if (key === "greenStrong") {
			return {
				numberCardSelected: "border-green1 bg-green2",
				numberCardIdle: "border-green4 bg-white",
				numberDot: "bg-white",
				numberTitleSelected: "text-white",
				numberSubtitleSelected: "text-white/85",
				contactRowBorder: "border-b-green5",
				contactRowLeftBorder: "border-l-green2",
				contactRowSelected: "bg-green6 ring-1 ring-inset ring-green4",
				contactRowIdle: "bg-green6/40",
				contactAvatar: "bg-green2",
				contactNameSelected: "text-green2",
				menuButtonOpen: "bg-green6",
				chatAreaBg: "bg-green1",
				chatHeaderBg: "bg-green3",
				chatHeaderBorder: "border-green4",
				chatFooterBg: "bg-green3",
				chatFooterBorder: "border-green4",
				inputFocusRing: "focus:ring-green2",
				actionButton: "bg-green2",
				actionButtonHover: "hover:bg-green1",
			};
		}
		return {
			numberCardSelected: "border-blue9 bg-blue7",
			numberCardIdle: "border-blue-300 bg-white",
			numberDot: "bg-white",
			numberTitleSelected: "text-white",
			numberSubtitleSelected: "text-white/85",
			contactRowBorder: "border-b-blue-200",
			contactRowLeftBorder: "border-l-blue-700",
			contactRowSelected: "bg-blue-50 ring-1 ring-inset ring-blue-300",
			contactRowIdle: "bg-blue-50/40",
			contactAvatar: "bg-blue-700",
			contactNameSelected: "text-blue-900",
			menuButtonOpen: "bg-blue-100",
			chatAreaBg: "bg-blue7",
			chatHeaderBg: "bg-blue-800",
			chatHeaderBorder: "border-blue-300",
			chatFooterBg: "bg-blue-800",
			chatFooterBorder: "border-blue-300",
			inputFocusRing: "focus:ring-blue-600",
			actionButton: "bg-blue-700",
			actionButtonHover: "hover:bg-blue-600",
		};
	};

	/* biome-ignore lint/correctness/useExhaustiveDependencies: initial load must run once to avoid render loops */
	useEffect(() => {
		void loadWhatsappNumbers();
		// En móvil, mostrar contactos por defecto
		if (window.innerWidth < 768) {
			setShowContacts(true);
		}
	}, []);

	useEffect(() => {
		selectedContactRef.current = selectedContact;
	}, [selectedContact]);

	useEffect(() => {
		selectedWhatsappNumberRef.current = selectedWhatsappNumber;
	}, [selectedWhatsappNumber]);

	useEffect(() => {
		if (!mediaPreview) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMediaPreview(null);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [mediaPreview]);

	// Actualizar contadores automáticamente como fallback
	/* biome-ignore lint/correctness/useExhaustiveDependencies: interval depends on current fallback polling strategy */
	useEffect(() => {
		if (whatsappNumbers.length > 0) {
			const interval = setInterval(() => {
				if (document.visibilityState !== "visible") return;
				void loadUnreadCounts();
			}, 8000);

			return () => clearInterval(interval);
		}
	}, [whatsappNumbers]);

	// Cerrar menús cuando se hace clic fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			if (!target.closest(".menu-dropdown")) {
				setOpenMessageMenu(null);
				setOpenContactMenu(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Recargar contactos cuando cambie el número de WhatsApp seleccionado
	/* biome-ignore lint/correctness/useExhaustiveDependencies: reload on selected number changes only */
	useEffect(() => {
		if (selectedWhatsappNumber) {
			void loadContacts();
			// Limpiar contacto seleccionado cuando cambie el número
			setSelectedContact(null);
			setMessages([]);
			return;
		}
		setContacts([]);
		setSelectedContact(null);
		setMessages([]);
	}, [selectedWhatsappNumber]);

	async function loadWhatsappNumbers() {
		try {
			// TODO: En el futuro, cargar desde la base de datos
			// const { data, error } = await supabase
			//     .from("whatsapp_numbers")
			//     .select("*")
			//     .eq("isActive", true)
			//     .order("lastUsed", { ascending: false });

			// Números reales de WhatsApp Business con colores corporativos
			// AMBOS NÚMEROS ESTÁN CONFIGURADOS EN WHATSAPP BUSINESS API
			const numbers: WhatsAppNumber[] = [
				{
					id: "1",
					number: "+56975385487",
					name: "WhatsApp Business",
					isActive: true, // CONFIGURADO EN WHATSAPP BUSINESS API
					connectionStatus: "active",
					lastUsed: new Date().toISOString(),
					phoneId: "720256401177655", // PHONE ID ÚNICO DEL NÚMERO PRINCIPAL
					businessAccountId: "512985415236720",
					primaryColor: "blue8", // Azul principal
					secondaryColor: "blue6", // Azul secundario
					accentColor: "blue10", // Azul de acento
					bgColor: "blue15", // Fondo azul claro
				},
				{
					id: "2",
					number: "+56990206618",
					name: "WhatsApp Business",
					isActive: true, // CONFIGURADO EN WHATSAPP BUSINESS API
					connectionStatus: "active",
					lastUsed: new Date().toISOString(),
					phoneId: "731956903332850", // PHONE ID ÚNICO DEL NÚMERO SECUNDARIO
					businessAccountId: "512985415236720",
					primaryColor: "grayStrong",
					secondaryColor: "grayStrong",
					accentColor: "grayStrong",
					bgColor: "grayStrong",
				},
				{
					id: "3",
					number: "+56937570007",
					name: "WhatsApp Business",
					isActive: true,
					connectionStatus: "active",
					lastUsed: new Date().toISOString(),
					phoneId: "560424903813462",
					businessAccountId: "512985415236720",
					primaryColor: "greenStrong",
					secondaryColor: "greenStrong",
					accentColor: "greenStrong",
					bgColor: "greenStrong",
				},
			];

			setWhatsappNumbers(numbers);
			setSelectedWhatsappNumber(null);
			// Cargar contadores después de establecer los números
			setTimeout(() => {
				loadUnreadCounts();
			}, 100);
		} catch (error) {
			console.error("Error cargando números de WhatsApp:", error);
		}
	}

	// Suscripción en tiempo real para mensajes
	/* biome-ignore lint/correctness/useExhaustiveDependencies: realtime handler intentionally reads refs to avoid channel recreation thrash */
	useEffect(() => {
		// Configurando suscripción en tiempo real

		const handleRealtimeChange = (payload: unknown) => {
			type RealtimeRow = {
				whatsapp_number?: string;
				from_number?: string;
				to_number?: string;
			};
			type RealtimePayload = {
				eventType?: string;
				new?: RealtimeRow;
				old?: RealtimeRow;
			};
			const realtimePayload = payload as RealtimePayload | null;
			const eventType = realtimePayload?.eventType;

			const selectedNumber = selectedWhatsappNumberRef.current;
			const activeContactPhone = selectedContactRef.current?.phone;
			const changedRow = realtimePayload?.new ?? realtimePayload?.old;
			if (!changedRow) return;

			const changedWhatsappNumber = changedRow.whatsapp_number ?? null;
			if (
				selectedNumber &&
				changedWhatsappNumber &&
				changedWhatsappNumber !== selectedNumber.number
			) {
				return;
			}
			const affectsActiveConversation =
				!!activeContactPhone &&
				(changedRow.from_number === activeContactPhone ||
					changedRow.to_number === activeContactPhone);

			// Solo mostrar indicador visual para mensajes nuevos
			if (eventType === "INSERT") {
				setNewMessageIndicator(true);
				setTimeout(() => {
					setNewMessageIndicator(false);
				}, 3000);
			}

			// Evitar refresh agresivo en UPDATE (ej: read=true), que genera parpadeo.
			// Los entrantes relevantes llegan por INSERT.
			if (eventType === "UPDATE") {
				return;
			}

			// Agrupar cambios para evitar "parpadeos" por múltiples eventos seguidos
			if (realtimeRefreshTimeoutRef.current) {
				clearTimeout(realtimeRefreshTimeoutRef.current);
			}
			realtimeRefreshTimeoutRef.current = setTimeout(() => {
				void loadUnreadCounts();
				void loadContacts({ preserveSelection: true });
				if (affectsActiveConversation && activeContactPhone) {
					void loadMessages(activeContactPhone, { skipScroll: true });
				}
			}, 450);
		};

		const channel = supabase
			.channel("messages-realtime")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "rt_messages",
				},
				handleRealtimeChange,
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "rt_messages",
				},
				handleRealtimeChange,
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "rt_messages",
				},
				handleRealtimeChange,
			)
			.subscribe((_status) => {
				// Estado de suscripción
			});

		return () => {
			// Desconectando suscripción en tiempo real
			if (realtimeRefreshTimeoutRef.current) {
				clearTimeout(realtimeRefreshTimeoutRef.current);
			}
			supabase.removeChannel(channel);
		};
	}, []);

	// Cerrar dropdown cuando se hace clic fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showWhatsappSelector) {
				const target = event.target as Element;
				if (!target.closest(".whatsapp-selector")) {
					setShowWhatsappSelector(false);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showWhatsappSelector]);

	// Función para cargar contadores de mensajes no leídos por número de WhatsApp
	async function loadUnreadCounts() {
		try {
			const counts: { [key: string]: number } = {};
			for (const number of whatsappNumbers) {
				const { data } = await supabase
					.from("rt_messages")
					.select("id")
					.eq("whatsapp_number", number.number)
					.eq("sender", "client")
					.eq("read", false);
				counts[number.number] = data?.length || 0;
			}
			setUnreadCounts((prev) => {
				const prevKeys = Object.keys(prev);
				const nextKeys = Object.keys(counts);
				if (
					prevKeys.length === nextKeys.length &&
					nextKeys.every((key) => prev[key] === counts[key])
				) {
					return prev;
				}
				return counts;
			});
		} catch (_error) {
			// Opcional: puedes dejar un solo log de error general si lo deseas
		}
	}

	async function loadContacts(options?: { preserveSelection?: boolean }) {
		try {
			// Solo cargar contactos si hay un número de WhatsApp seleccionado
			const currentWhatsappNumber =
				selectedWhatsappNumberRef.current || selectedWhatsappNumber;
			if (!currentWhatsappNumber) return;

			// Cargando contactos para WhatsApp

			const { data, error } = await supabase
				.from("rt_messages") // Vista en public
				.select("*")
				.eq("whatsapp_number", currentWhatsappNumber.number)
				.order("timestamp", { ascending: false });

			if (error) {
				console.error(
					"Supabase error:",
					error,
					error?.message,
					error?.code,
					error?.details,
				);
				throw error;
			}

			if (!data) {
				// Supabase returned no data
				return;
			}

			const contactMap = new Map<string, Contact>();

			data.forEach((msg) => {
				// Determinar el número del contacto (el que no es el WhatsApp Business)
				// Si from_number es el WhatsApp Business, entonces to_number es el contacto
				// Si to_number es el WhatsApp Business, entonces from_number es el contacto
				const isFromWhatsApp = msg.from_number === currentWhatsappNumber.number;
				const contactPhone = isFromWhatsApp ? msg.to_number : msg.from_number;

				// Mensaje: from_number → to_number, Contacto: contactPhone

				if (!contactMap.has(contactPhone)) {
					contactMap.set(contactPhone, {
						id: contactPhone,
						name:
							typeof msg.contact_name === "string" && msg.contact_name.trim()
								? msg.contact_name.trim()
								: contactPhone,
						phone: contactPhone,
						unreadCount: 0,
						whatsapp_number: currentWhatsappNumber.number,
						totalMessages: 0,
						firstMessageAt: msg.timestamp,
						lastMessageAt: msg.timestamp,
						lastDirection: msg.sender === "client" ? "in" : "out",
						countryLabel: inferCountryLabel(contactPhone),
						isNewContact: false,
					});
				}

				const contact = contactMap.get(contactPhone);
				if (!contact) return;
				if (
					(contact.name === contact.phone || !contact.name) &&
					typeof msg.contact_name === "string" &&
					msg.contact_name.trim()
				) {
					contact.name = msg.contact_name.trim();
				}
				contact.totalMessages = (contact.totalMessages || 0) + 1;
				if (
					!contact.firstMessageAt ||
					new Date(msg.timestamp) < new Date(contact.firstMessageAt)
				) {
					contact.firstMessageAt = msg.timestamp;
				}
				if (
					!contact.lastMessageAt ||
					new Date(msg.timestamp) > new Date(contact.lastMessageAt)
				) {
					contact.lastMessageAt = msg.timestamp;
					contact.lastDirection = msg.sender === "client" ? "in" : "out";
				}
				if (msg.sender === "client" && !msg.read) {
					contact.unreadCount++;
				}
			});

			for (const contact of contactMap.values()) {
				const firstAt = contact.firstMessageAt
					? new Date(contact.firstMessageAt).getTime()
					: 0;
				const ageHours = firstAt
					? (Date.now() - firstAt) / (1000 * 60 * 60)
					: 9999;
				const isRecent = (contact.totalMessages || 0) <= 3 || ageHours <= 24;
				contact.isNewContact = isRecent && (contact.unreadCount || 0) > 0;
			}

			const nextContacts = Array.from(contactMap.values());
			setContacts((prev) => {
				if (prev.length !== nextContacts.length) return nextContacts;
				for (let i = 0; i < prev.length; i++) {
					const a = prev[i];
					const b = nextContacts[i];
					if (
						a.id !== b.id ||
						a.name !== b.name ||
						a.phone !== b.phone ||
						a.unreadCount !== b.unreadCount ||
						a.lastMessageAt !== b.lastMessageAt ||
						a.totalMessages !== b.totalMessages
					) {
						return nextContacts;
					}
				}
				return prev;
			});

			if (options?.preserveSelection) {
				const activePhone = selectedContactRef.current?.phone;
				if (activePhone) {
					const refreshed = nextContacts.find((c) => c.phone === activePhone);
					if (refreshed) {
						setSelectedContact((prev) =>
							prev?.phone === refreshed.phone ? refreshed : prev,
						);
					}
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error(
					"Error cargando contactos:",
					error,
					error.message,
					error.stack,
				);
			} else {
				console.error("Error cargando contactos:", error);
			}
		}
	}

	async function loadMessages(
		phone: string,
		options?: { skipScroll?: boolean },
	) {
		try {
			const currentWhatsappNumber =
				selectedWhatsappNumberRef.current || selectedWhatsappNumber;
			if (!currentWhatsappNumber) return;

			// Cargando mensajes para contacto

			// Cargar mensajes que involucren tanto al contacto como al número de WhatsApp seleccionado
			const { data, error } = await supabase
				.from("rt_messages")
				.select("*")
				.eq("whatsapp_number", currentWhatsappNumber.number)
				.or(`from_number.eq.${phone},to_number.eq.${phone}`)
				.order("timestamp", { ascending: true });

			if (error) throw error;
			const mappedMessages: Message[] = data.map((msg) => ({
				id: msg.id,
				content: msg.content,
				sender: msg.sender,
				timestamp: msg.timestamp,
				read: msg.read,
				from_number: msg.from_number,
				to_number: msg.to_number,
				whatsapp_number: msg.whatsapp_number,
				media_url: msg.media_url || null,
				storage_path: msg.storage_path || null,
				media_type: msg.media_type || null,
				contact_name: msg.contact_name || null,
			}));
			setMessages((prev) => {
				if (prev.length !== mappedMessages.length) return mappedMessages;
				for (let i = 0; i < prev.length; i++) {
					const a = prev[i];
					const b = mappedMessages[i];
					if (
						a.id !== b.id ||
						a.read !== b.read ||
						a.content !== b.content ||
						a.timestamp !== b.timestamp ||
						a.media_url !== b.media_url
					) {
						return mappedMessages;
					}
				}
				return prev;
			});

			// Hacer scroll al final después de cargar mensajes
			if (!options?.skipScroll) {
				setTimeout(() => {
					scrollToBottom();
				}, 100);
			}

			// Marcar como leídos loen el chat lass mensajes entrantes no leídos del cliente al renderizar
			const unreadIds = data
				.filter(
					(msg) =>
						msg.sender === "client" &&
						!msg.read &&
						(msg.from_number === phone || msg.to_number === phone) &&
						msg.whatsapp_number === currentWhatsappNumber.number,
				)
				.map((msg) => msg.id);

			if (unreadIds.length > 0) {
				const _updateRes = await supabase
					.from("rt_messages")
					.update({ read: true })
					.in("id", unreadIds)
					.select();
				// Actualizar contadores y ocultar indicador
				setNewMessageIndicator(false);
				// Optimistically update contacts UI: set unreadCount to 0 for this contact
				setContacts((prev) =>
					prev.map((c) => (c.phone === phone ? { ...c, unreadCount: 0 } : c)),
				);
				// Reload counts and contacts to ensure consistency with DB
				await loadUnreadCounts();
				// Reload contacts to refresh unread counts per contact
				await loadContacts({ preserveSelection: true });
			}
		} catch (error) {
			console.error("Error cargando mensajes:", error);
		}
	}

	const handleContactSelect = (contact: Contact) => {
		setSelectedContact(contact);
		setContacts((prev) =>
			prev.map((row) =>
				row.id === contact.id ? { ...row, isNewContact: false } : row,
			),
		);
		loadMessages(contact.phone);
		// En móvil, ocultar la lista de contactos después de seleccionar uno
		if (window.innerWidth < 768) {
			setShowContacts(false);
		}
	};

	// Funciones para manejar menús desplegables
	const handleShowMessageId = (messageId: string) => {
		alert(`ID del mensaje: ${messageId}`);
		setOpenMessageMenu(null);
	};

	const handleDeleteMessage = async (messageId: string) => {
		if (
			confirm(
				"⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n¿Estás seguro de que quieres eliminar este mensaje?\n\nEsta acción no se puede deshacer.",
			)
		) {
			try {
				const { data: targetMessage } = await supabase
					.from("rt_messages")
					.select("id, media_url, storage_path")
					.eq("id", messageId)
					.maybeSingle();
				const targetPath = getMessageStoragePath({
					storage_path:
						(targetMessage as { storage_path?: string | null } | null)
							?.storage_path || null,
					media_url:
						(targetMessage as { media_url?: string | null } | null)
							?.media_url || null,
				});

				const { error } = await supabase
					.from("rt_messages")
					.delete()
					.eq("id", messageId);

				if (error) throw error;
				if (targetPath) {
					const removeRes = await removeStorageFiles([targetPath]);
					if (removeRes.error) {
						console.error(
							"⚠️ Error eliminando archivo de storage:",
							removeRes.error,
						);
					}
				}

				// Recargar mensajes
				if (selectedContact) {
					loadMessages(selectedContact.phone);
				}
				console.log("✅ Mensaje eliminado exitosamente");
			} catch (error) {
				console.error("❌ Error eliminando mensaje:", error);
				alert("Error al eliminar el mensaje");
			}
		}
		setOpenMessageMenu(null);
	};

	const handleDeleteContact = async (contactPhone: string) => {
		if (
			confirm(
				"⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n¿Estás seguro de que quieres eliminar TODOS los mensajes de este contacto?\n\nEsta acción no se puede deshacer.",
			)
		) {
			try {
				if (!selectedWhatsappNumber?.number) {
					alert("Selecciona un número de WhatsApp antes de eliminar.");
					return;
				}

				const { data: contactMessages, error: selectError } = await supabase
					.from("rt_messages")
					.select("id, media_url, storage_path")
					.eq("whatsapp_number", selectedWhatsappNumber.number)
					.or(`from_number.eq.${contactPhone},to_number.eq.${contactPhone}`);
				if (selectError) throw selectError;

				const idsToDelete = (contactMessages || []).map((m) => m.id);
				const storagePaths = (contactMessages || [])
					.map((m) =>
						getMessageStoragePath({
							storage_path:
								(m as { storage_path?: string | null }).storage_path || null,
							media_url: (m as { media_url?: string | null }).media_url || null,
						}),
					)
					.filter((p): p is string => !!p);

				if (idsToDelete.length > 0) {
					const { error: deleteError } = await supabase
						.from("rt_messages")
						.delete()
						.in("id", idsToDelete);
					if (deleteError) throw deleteError;
				}

				if (storagePaths.length > 0) {
					const removeRes = await removeStorageFiles(storagePaths);
					if (removeRes.error) {
						console.error(
							"⚠️ Error eliminando archivos de storage:",
							removeRes.error,
						);
					}
				}

				// Recargar contactos
				loadContacts({ preserveSelection: true });

				// Si el contacto eliminado es el seleccionado, limpiar la selección
				if (selectedContact && selectedContact.phone === contactPhone) {
					setSelectedContact(null);
					setMessages([]);
				}

				console.log("✅ Contacto eliminado exitosamente");
			} catch (error) {
				console.error("❌ Error eliminando contacto:", error);
				alert("Error al eliminar el contacto");
			}
		}
		setOpenContactMenu(null);
	};

	const sendMessage = async () => {
		if (!input.trim() || !selectedContact || !selectedWhatsappNumber || sending)
			return;

		// Verificar que el número de WhatsApp esté disponible
		if (!selectedWhatsappNumber.isActive || !selectedWhatsappNumber.phoneId) {
			alert(
				`❌ El número ${selectedWhatsappNumber.number} no está disponible.`,
			);
			return;
		}

		setSending(true);
		const text = input.trim();

		console.log("🚀 Enviando mensaje:", {
			from: selectedWhatsappNumber.number,
			to: selectedContact.phone,
			text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
			phoneId: selectedWhatsappNumber.phoneId,
			businessAccountId: selectedWhatsappNumber.businessAccountId,
			note: "✅ Enviando con el phoneId configurado para el número seleccionado",
		});

		try {
			// Primero guardar en la base de datos
			const { error: dbError } = await supabase.from("rt_messages").insert({
				content: text,
				sender: "admin",
				from_number: selectedWhatsappNumber.number,
				to_number: selectedContact.phone,
				type: "text",
				direction: "out",
				timestamp: new Date().toISOString(),
				read: true,
				whatsapp_number: selectedWhatsappNumber.number,
			});

			if (dbError) {
				console.error("❌ Error guardando en BD:", dbError);
				throw dbError;
			}

			console.log("✅ Mensaje guardado en BD");

			// Luego enviar por WhatsApp
			const response = await fetch("/api/send-text", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					to: selectedContact.phone,
					text,
					from: selectedWhatsappNumber.number,
					phoneId: selectedWhatsappNumber.phoneId,
					businessAccountId: selectedWhatsappNumber.businessAccountId,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				console.error("❌ Error enviando mensaje:", result);
				throw new Error(result.error || "Error del sistema");
			}

			console.log("✅ Mensaje enviado exitosamente:", result);
			setInput("");
			loadMessages(selectedContact.phone);

			// Hacer scroll al final después de enviar mensaje
			setTimeout(() => {
				scrollToBottom();
			}, 200);
		} catch (error) {
			console.error("❌ Error completo enviando mensaje:", error);
			// Aquí podrías mostrar una notificación al usuario
			alert(
				`Error: ${error instanceof Error ? error.message : "Error del sistema"}`,
			);
		} finally {
			setSending(false);
		}
	};

	// Upload a file to Supabase and send it via WhatsApp
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleFilePick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (
			!files ||
			files.length === 0 ||
			!selectedContact ||
			!selectedWhatsappNumber
		)
			return;

		// Prevent sending while uploading
		setSending(true);

		try {
			for (const file of Array.from(files)) {
				const contactPhone = selectedContact.phone;
				const inferredType = file.type.startsWith("image/")
					? "image"
					: file.type.startsWith("audio/")
						? "audio"
						: file.type.startsWith("video/")
							? "video"
							: "document";

				// Generate a filename with timestamp
				const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
				const ext =
					(file.name.split(".").pop() || "").toLowerCase() ||
					file.type.split("/")[1] ||
					"bin";
				const folder = inferredType === "document" ? "file" : inferredType;
				const storagePath = `whatsapp-media/${contactPhone}/${folder}/${id}.${ext}`;

				// Upload to Supabase public bucket 'ingenit'
				const { error: uploadError } = await supabase.storage
					.from("ingenit")
					.upload(storagePath, file, {
						cacheControl: "3600",
						upsert: true,
						contentType: file.type || undefined,
					});
				if (uploadError) {
					console.error("Upload error for file", file.name, uploadError);
					alert(`Error subiendo ${file.name}`);
					continue; // proceed with next file
				}

				const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ingenit/${encodeURIComponent(storagePath)}`;

				// Insert outbound message optimistically
				const { error: dbError } = await supabase.from("rt_messages").insert({
					content: `[${inferredType.toUpperCase()}] ${file.name}`,
					sender: "admin",
					from_number: selectedWhatsappNumber.number,
					to_number: selectedContact.phone,
					type: inferredType,
					direction: "out",
					timestamp: new Date().toISOString(),
					read: true,
					media_url: publicUrl,
					media_type: inferredType,
					storage_path: storagePath,
					whatsapp_number: selectedWhatsappNumber.number,
				});

				if (dbError) {
					console.error(
						"Error inserting outbound media message in DB:",
						dbError,
					);
				} else {
					// Refresh messages so UI shows the sent media
					loadMessages(selectedContact.phone);
				}

				// Call server to actually send the media via WhatsApp
				const res = await fetch("/api/send-media", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						to: selectedContact.phone,
						media_url: publicUrl,
						media_type: inferredType,
						filename: file.name,
						phoneId: selectedWhatsappNumber.phoneId,
						businessAccountId: selectedWhatsappNumber.businessAccountId,
						caption: "", // optional
					}),
				});

				const result = await res.json().catch(() => ({}));
				if (!res.ok) {
					console.error("Error sending media via API:", result);
					// Continue with next file but notify
					alert(`Error enviando ${file.name}`);
				} else {
					console.log("Media send initiated for", file.name, result);
				}
			}
		} catch (error) {
			console.error("Error uploading/sending files:", error);
			alert("No se pudo subir o enviar algunos archivos");
		} finally {
			// clear input value so same files can be selected again if needed
			if (fileInputRef.current) fileInputRef.current.value = "";
			setSending(false);
		}
	};

	const selectedNumberTheme = getNumberThemeClasses(selectedWhatsappNumber);

	return (
		<div className="h-screen bg-gray-100 flex">
			{/* Sidebar de contactos - Estilo WhatsApp */}
			<div
				className={`${showContacts ? "flex" : "hidden"} md:flex w-full md:w-64 bg-white border-r flex-col absolute md:relative z-10 h-full`}
			>
				{/* Header del sidebar */}
				<div className="bg-gray-50 p-2 border-b">
					<div className="flex items-center justify-between mb-1">
						<div className="flex items-center space-x-2">
							<h1 className="text-3xl font-nornal text-gray9 ml-4">Chats</h1>
							{newMessageIndicator && (
								<div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
									<span>Nuevo</span>
								</div>
							)}
						</div>
						{/* Botón para cerrar en móvil */}
						<button
							type="button"
							onClick={() => setShowContacts(false)}
							className="md:hidden p-2 rounded-lg hover:bg-gray-200"
						>
							<svg
								aria-hidden="true"
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Selector de número de WhatsApp */}
					{/* Selector de números de WhatsApp - Siempre visible */}
					<div className="mb-1">
						{/* Lista vertical de números */}
						<div className="space-y-2">
							{whatsappNumbers.map((number) => {
								const numberTheme = getNumberThemeClasses(number);
								const isSelected = selectedWhatsappNumber?.id === number.id;

								return (
									<button
										type="button"
										key={number.id}
										onClick={() => {
											setSelectedWhatsappNumber(number);
											setShowWhatsappSelector(false);
										}}
										className={`relative w-full flex items-center p-3 rounded-lg border-2 transition-all ${
											isSelected
												? `${numberTheme.numberCardSelected} shadow-md`
												: `${numberTheme.numberCardIdle} hover:shadow-sm`
										}`}
										aria-pressed={isSelected}
									>
										<div
											className={`w-4 h-4 rounded-full mr-3 flex-shrink-0 ${numberTheme.numberDot} ${
												isSelected ? "ring-4 ring-white/60" : ""
											}`}
										></div>
										<div className="text-left flex-1">
											<div className="flex items-center justify-between gap-2">
												<div
													className={`text-sm font-medium ${isSelected ? numberTheme.numberTitleSelected : "text-gray1"}`}
												>
													{number.name}
												</div>
												{unreadCounts[number.number] > 0 && (
													<div className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 inline-flex items-center justify-center font-medium flex-shrink-0">
														{unreadCounts[number.number] > 99
															? "99+"
															: unreadCounts[number.number]}
													</div>
												)}
											</div>
											<div
												className={`text-xs ${isSelected ? numberTheme.numberSubtitleSelected : "text-gray5"}`}
											>
												{number.number}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Lista de contactos */}
				<div className="flex-1 overflow-y-auto">
					{contacts.map((contact) =>
						(() => {
							const contactInitial = getContactInitial(contact.name);
							return (
								<div
									key={contact.id}
									className={`p-4 border-b transition-colors ${selectedNumberTheme.contactRowBorder} ${
										selectedContact?.id === contact.id
											? selectedNumberTheme.contactRowSelected
											: selectedNumberTheme.contactRowIdle
									} ${selectedContact?.id === contact.id ? `border-l-4 ${selectedNumberTheme.contactRowLeftBorder}` : "border-l-0"}`}
								>
									<div className="flex items-center justify-between">
										<button
											type="button"
											className="flex items-center flex-1 cursor-pointer text-left"
											onClick={() => handleContactSelect(contact)}
										>
											<div
												className={`w-12 h-12 rounded-full inline-flex items-center justify-center text-white mr-3 ${selectedNumberTheme.contactAvatar}`}
											>
												{contactInitial ? (
													<span className="inline-flex items-center justify-center w-full h-full text-2xl font-normal leading-none translate-x-[1px] -translate-y-[1px]">
														{contactInitial}
													</span>
												) : (
													<svg
														aria-hidden="true"
														className="w-6 h-6"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<title>icon</title>
														<path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12zm0 2c-4.418 0-8 2.91-8 6.5 0 .828.672 1.5 1.5 1.5h13c.828 0 1.5-.672 1.5-1.5 0-3.59-3.582-6.5-8-6.5z" />
													</svg>
												)}
											</div>
											<div className="flex-1">
												<div className="flex items-center justify-between gap-2">
													<div
														className={`font-medium ${selectedContact?.id === contact.id ? selectedNumberTheme.contactNameSelected : "text-gray1"}`}
													>
														{contact.name}
													</div>
													{contact.unreadCount > 0 && (
														<span className="inline-flex items-center justify-center text-white text-[10px] font-semibold rounded-full bg-red-500 w-5 h-5 flex-shrink-0">
															{contact.unreadCount > 99
																? "99+"
																: contact.unreadCount}
														</span>
													)}
												</div>
												<div className="text-sm text-gray-500">
													{contact.phone}
												</div>
											</div>
										</button>

										{/* Menú desplegable para contactos */}
										<div className="relative menu-dropdown">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setOpenContactMenu(
														openContactMenu === contact.id ? null : contact.id,
													);
												}}
												className={`p-2 rounded-lg transition-colors ${openContactMenu === contact.id ? selectedNumberTheme.menuButtonOpen : "hover:bg-gray8/50"}`}
											>
												<svg
													aria-hidden="true"
													className="w-4 h-4 text-gray-500"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<title>icon</title>
													<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
												</svg>
											</button>

											{openContactMenu === contact.id && (
												<div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
													<button
														type="button"
														onClick={() => handleDeleteContact(contact.phone)}
														className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
													>
														<svg
															aria-hidden="true"
															className="w-4 h-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<title>icon</title>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
														Eliminar mensajes
													</button>
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})(),
					)}
				</div>
			</div>

			{/* Área de chat - Estilo WhatsApp */}
			<div className="flex-1 flex flex-col bg-gray-100">
				{selectedContact ? (
					<>
						{/* Header del chat */}
						<div
							className={`py-3 px-1 border-b flex items-center ${selectedNumberTheme.chatHeaderBg} ${selectedNumberTheme.chatHeaderBorder}`}
						>
							{/* Botón para volver a contactos en móvil */}
							<button
								type="button"
								onClick={() => setShowContacts(true)}
								className="md:hidden mr-1 p-2 rounded-lg hover:bg-white/15 text-white flex items-center gap-2"
							>
								<svg
									aria-hidden="true"
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>
							<div
								className={`w-10 h-10 rounded-full inline-flex items-center justify-center text-white mr-3 ${selectedNumberTheme.contactAvatar}`}
							>
								{getContactInitial(selectedContact.name) ? (
									<span className="inline-flex items-center justify-center w-full h-full text-xl font-normal leading-none translate-x-[1px] -translate-y-[1px]">
										{getContactInitial(selectedContact.name)}
									</span>
								) : (
									<svg
										aria-hidden="true"
										className="w-5 h-5"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>icon</title>
										<path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12zm0 2c-4.418 0-8 2.91-8 6.5 0 .828.672 1.5 1.5 1.5h13c.828 0 1.5-.672 1.5-1.5 0-3.59-3.582-6.5-8-6.5z" />
									</svg>
								)}
							</div>
							<div className="flex-1">
								<div className="font-semibold text-white">
									{selectedContact.name}{" "}
									<span className="text-white/75 font-normal text-xs">
										({selectedContact.phone})
									</span>
								</div>
							</div>
						</div>

						{/* Área de mensajes */}
						<div
							className={`flex-1 overflow-y-auto p-4 ${selectedNumberTheme.chatAreaBg}`}
						>
							<div className="space-y-3">
								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex w-full ${message.sender === "admin" ? "justify-end" : "justify-start"}`}
									>
										<div className="relative group max-w-[70%]">
											<div
												className={`inline-block w-fit max-w-full px-3 py-2 rounded-2xl shadow-sm ${
													message.sender === "admin"
														? "text-white bg-green2 rounded-br-sm border border-green1/60"
														: "text-white bg-white/20 rounded-bl-sm border border-white/35"
												}`}
											>
												{/* Mostrar media si hay media_url, aunque media_type esté vacío */}
												{(() => {
													if (message.media_url) {
														const url = message.media_url;
														const ext =
															url.split(".").pop()?.toLowerCase() || "";
														const parsedUrl = (() => {
															try {
																return new URL(url);
															} catch {
																return null;
															}
														})();
														const shouldProxy =
															parsedUrl &&
															(parsedUrl.hostname === "lookaside.fbsbx.com" ||
																parsedUrl.hostname === "graph.facebook.com");
														const proxied = shouldProxy
															? `/api/media-proxy?u=${encodeURIComponent(url)}`
															: url;

														// Mostrar reproductor de audio si es audio
														if (
															message.media_type === "audio" ||
															["ogg", "mp3", "wav", "m4a"].includes(ext)
														) {
															return <AudioSpectrumPreview src={proxied} />;
														}

														// Documentos
														if (
															message.media_type === "document" ||
															(!message.media_type &&
																[
																	"pdf",
																	"doc",
																	"docx",
																	"xls",
																	"xlsx",
																	"ppt",
																	"pptx",
																].includes(ext))
														) {
															const isPdf =
																ext === "pdf" ||
																/\\.pdf(\\b|\\s|$)/i.test(
																	message.content || "",
																);
															if (isPdf) {
																return (
																	<button
																		type="button"
																		onClick={() =>
																			setMediaPreview({
																				type: "pdf",
																				src: proxied,
																				title:
																					message.content || "Documento PDF",
																				messageId: message.id,
																			})
																		}
																		onKeyDown={(event) => {
																			if (
																				event.key === "Enter" ||
																				event.key === " "
																			) {
																				event.preventDefault();
																				setMediaPreview({
																					type: "pdf",
																					src: proxied,
																					title:
																						message.content || "Documento PDF",
																					messageId: message.id,
																				});
																			}
																		}}
																		className="my-2 inline-block max-w-full overflow-hidden rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
																	>
																		<div className="pointer-events-none bg-white">
																			<iframe
																				src={`${proxied}#toolbar=0&navpanes=0&scrollbar=0`}
																				className="block w-[260px] sm:w-[320px] md:w-[360px] max-w-full h-[220px]"
																				title="Mini vista previa PDF"
																			/>
																		</div>
																	</button>
																);
															}

															return (
																<div className="my-2">
																	<div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
																		<a
																			href={proxied}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="underline"
																		>
																			Abrir documento
																		</a>
																		<button
																			type="button"
																			onClick={() => downloadFile(proxied)}
																			className="underline"
																		>
																			Descargar documento
																		</button>
																	</div>
																</div>
															);
														}

														// Imágenes
														if (
															message.media_type === "image" ||
															(!message.media_type &&
																[
																	"jpg",
																	"jpeg",
																	"png",
																	"gif",
																	"webp",
																	"bmp",
																	"svg",
																].includes(ext))
														) {
															return (
																<button
																	type="button"
																	onClick={() =>
																		setMediaPreview({
																			type: "image",
																			src: proxied,
																			title: message.content || "Imagen",
																			messageId: message.id,
																		})
																	}
																	className="my-2 block cursor-zoom-in"
																>
																	<ImageWithFallback
																		src={proxied}
																		alt="Imagen"
																	/>
																</button>
															);
														}

														// Videos
														if (
															message.media_type === "video" ||
															(!message.media_type &&
																["mp4", "mov", "avi", "webm", "mkv"].includes(
																	ext,
																))
														) {
															return (
																<div>
																	<video
																		controls
																		src={proxied}
																		className="max-w-full max-h-[40vh] my-2 rounded object-contain block"
																	>
																		<track
																			kind="captions"
																			srcLang="es"
																			label="Sin subtítulos"
																		/>
																		Tu navegador no soporta video.
																	</video>
																</div>
															);
														}
													}
													// Si no hay media_url y el content indica un media, mostrar mensaje claro
													if (
														!message.media_url &&
														["audio", "image", "video", "document"].includes(
															message.media_type || "",
														)
													) {
														return (
															<span style={{ color: "#888" }}>
																Archivo no disponible
															</span>
														);
													}
													// Solo mostrar [AUDIO] si no hay media_url y no se detectó tipo
													if (
														message.content === "[AUDIO]" &&
														!message.media_url
													) {
														return (
															<span style={{ color: "#888" }}>[AUDIO]</span>
														);
													}
													return (
														<p className="text-[15px] leading-5 whitespace-pre-line break-words">
															{message.content}
														</p>
													);
												})()}
												<div className="mt-1 flex justify-end">
													<span
														className="text-[11px] leading-none whitespace-nowrap"
														style={{
															color:
																message.sender === "admin"
																	? "#a7d5c8"
																	: "#8696a0",
														}}
													>
														{formatMessageTimestamp(message.timestamp)}
													</span>
												</div>
											</div>

											{/* Menú desplegable para mensajes */}
											<div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity menu-dropdown">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setOpenMessageMenu(
															openMessageMenu === message.id
																? null
																: message.id,
														);
													}}
													className="p-1 rounded-lg hover:bg-black hover:bg-opacity-20 transition-colors"
												>
													<svg
														aria-hidden="true"
														className="w-3 h-3 text-gray-500"
														fill="currentColor"
														viewBox="0 0 24 24"
													>
														<title>icon</title>
														<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
													</svg>
												</button>

												{openMessageMenu === message.id && (
													<div
														className={`absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 ${
															message.sender === "admin" ? "right-0" : "left-0"
														}`}
													>
														{/* Mostrar ID */}
														<button
															type="button"
															onClick={() => handleShowMessageId(message.id)}
															className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
														>
															<svg
																aria-hidden="true"
																className="w-4 h-4"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<title>icon</title>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
																/>
															</svg>
															Mostrar ID
														</button>

														{/* Copiar si es texto */}
														{(!message.media_url ||
															message.media_type === null) && (
															<button
																type="button"
																onClick={() => {
																	copyToClipboard(message.content);
																	setOpenMessageMenu(null);
																}}
																className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
															>
																<svg
																	aria-hidden="true"
																	className="w-4 h-4"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<title>icon</title>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M8 16h8M8 12h8M8 8h8"
																	/>
																</svg>
																Copiar
															</button>
														)}

														{/* Descargar si es archivo/media */}
														{message.media_url && (
															<button
																type="button"
																onClick={() => {
																	downloadFile(
																		message.media_url || "",
																		buildDownloadFilename(message),
																	);
																	setOpenMessageMenu(null);
																}}
																className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
															>
																<svg
																	aria-hidden="true"
																	className="w-4 h-4 text-gray-700"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<title>icon</title>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3"
																	/>
																</svg>
																Descargar
															</button>
														)}

														<button
															type="button"
															onClick={() => handleDeleteMessage(message.id)}
															className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<svg
																aria-hidden="true"
																className="w-4 h-4"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<title>icon</title>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
																/>
															</svg>
															Eliminar mensaje
														</button>
													</div>
												)}
											</div>
										</div>
									</div>
								))}
								{/* Referencia para scroll automático */}
								<div ref={messagesEndRef} />
							</div>
						</div>

						{/* Input del mensaje */}
						<div
							className={`p-4 border-t ${selectedNumberTheme.chatFooterBg} ${selectedNumberTheme.chatFooterBorder}`}
						>
							<div className="flex items-center gap-2">
								<input
									type="file"
									ref={fileInputRef}
									onChange={handleFileChange}
									className="hidden"
									multiple
									accept="*/*"
								/>
								<button
									type="button"
									onClick={handleFilePick}
									title="Adjuntar archivos"
									className="p-2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center"
								>
									{/* Plus icon (bigger/thicker) */}
									<svg
										aria-hidden="true"
										className="w-8 h-8 text-white/80"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
									>
										<title>icon</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
											d="M12 5v14M5 12h14"
										/>
									</svg>
								</button>

								<textarea
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && e.metaKey) {
											e.preventDefault();
											sendMessage();
										}
									}}
									rows={1}
									placeholder="Escribe un mensaje..."
									className={`flex-1 border border-white/40 bg-white/95 text-gray-900 placeholder:text-gray-500 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 ${selectedNumberTheme.inputFocusRing}`}
								/>
								<button
									type="button"
									onClick={sendMessage}
									disabled={sending}
									className={`text-white p-2 rounded-full disabled:opacity-50 flex items-center justify-center transition-colors ${selectedNumberTheme.actionButton} ${selectedNumberTheme.actionButtonHover}`}
								>
									{/* Filled paper-plane pointing right (solid) */}
									<svg
										aria-hidden="true"
										className="w-5 h-5 text-white"
										viewBox="0 0 24 24"
										fill="currentColor"
										xmlns="http://www.w3.org/2000/svg"
									>
										<title>icon</title>
										<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 6z" />
									</svg>
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center text-gray-500">
							<div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									aria-hidden="true"
									className="w-8 h-8 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
							</div>
							<p className="text-lg font-medium">Selecciona un chat</p>
							<p className="text-sm">
								Elige un contacto para comenzar a chatear
							</p>
							{/* Botón para mostrar contactos en móvil cuando no hay chat seleccionado */}
							<button
								type="button"
								onClick={() => setShowContacts(true)}
								className={`md:hidden mt-4 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors ${selectedNumberTheme.actionButton} ${selectedNumberTheme.actionButtonHover}`}
							>
								<svg
									aria-hidden="true"
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
								Ver contactos
							</button>
						</div>
					</div>
				)}
			</div>

			{mediaPreview
				? (() => {
						const previewItems = getPreviewItemsForChat();
						const currentIndex = previewItems.findIndex((item) =>
							item.messageId && mediaPreview.messageId
								? item.messageId === mediaPreview.messageId
								: item.src === mediaPreview.src,
						);
						const safeIndex = currentIndex >= 0 ? currentIndex : 0;
						const currentItem = previewItems[safeIndex] || {
							messageId: mediaPreview.messageId || "",
							type: mediaPreview.type,
							src: mediaPreview.src,
							title:
								mediaPreview.title ||
								(mediaPreview.type === "pdf" ? "Documento PDF" : "Imagen"),
							filename:
								mediaPreview.type === "pdf" ? "documento.pdf" : "imagen.jpg",
						};
						const hasMultiple = previewItems.length > 1;
						const goToPreview = (nextIndex: number) => {
							if (!hasMultiple) return;
							if (nextIndex < 0 || nextIndex >= previewItems.length) return;
							const nextItem = previewItems[nextIndex];
							if (!nextItem) return;
							setMediaPreview({
								type: nextItem.type,
								src: nextItem.src,
								title: nextItem.title,
								messageId: nextItem.messageId,
							});
						};
						const isFirst = safeIndex <= 0;
						const isLast = safeIndex >= previewItems.length - 1;

						return (
							/* biome-ignore lint/a11y/noStaticElementInteractions: overlay uses outside-click close behavior */
							<div
								className="fixed inset-0 z-[100] bg-[#020617]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
								onMouseDown={(event) => {
									if (event.target === event.currentTarget) {
										setMediaPreview(null);
									}
								}}
							>
								<div className="relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-[#0f172a] border border-white/15 rounded-xl overflow-hidden shadow-2xl">
									<div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111827]">
										<div className="flex-1" />
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() =>
													downloadFile(currentItem.src, currentItem.filename)
												}
												className="p-1.5 rounded-md hover:bg-white/10"
												aria-label="Descargar archivo"
												title="Descargar"
											>
												<svg
													aria-hidden="true"
													className="w-5 h-5 text-white"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<title>icon</title>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3"
													/>
												</svg>
											</button>
											<button
												type="button"
												onClick={() => setMediaPreview(null)}
												className="p-1.5 rounded-md hover:bg-white/10"
												aria-label="Cerrar vista previa"
												title="Cerrar"
											>
												<svg
													aria-hidden="true"
													className="w-5 h-5 text-white"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<title>icon</title>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>
									<div className="h-[calc(92vh-56px)] bg-black">
										{hasMultiple && (
											<>
												<button
													type="button"
													onClick={() => goToPreview(safeIndex - 1)}
													disabled={isFirst}
													className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border border-white/20 ${
														isFirst
															? "bg-black/20 text-white/30 cursor-not-allowed"
															: "bg-black/50 hover:bg-black/70 text-white"
													}`}
													aria-label="Archivo anterior"
													title="Anterior"
												>
													<svg
														aria-hidden="true"
														className="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<title>icon</title>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M15 19l-7-7 7-7"
														/>
													</svg>
												</button>
												<button
													type="button"
													onClick={() => goToPreview(safeIndex + 1)}
													disabled={isLast}
													className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border border-white/20 ${
														isLast
															? "bg-black/20 text-white/30 cursor-not-allowed"
															: "bg-black/50 hover:bg-black/70 text-white"
													}`}
													aria-label="Siguiente archivo"
													title="Siguiente"
												>
													<svg
														aria-hidden="true"
														className="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<title>icon</title>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M9 5l7 7-7 7"
														/>
													</svg>
												</button>
											</>
										)}
										{currentItem.type === "pdf" ? (
											<iframe
												src={`${currentItem.src}#toolbar=1&navpanes=0&scrollbar=1`}
												className="w-full h-full"
												title="Vista previa PDF"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center p-3 bg-black">
												<Image
													src={currentItem.src}
													alt={currentItem.title || "Imagen"}
													width={1600}
													height={1200}
													unoptimized
													className="max-w-full max-h-full object-contain"
												/>
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})()
				: null}
		</div>
	);
}
