"use client";
import {
	ArrowLeft,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Edit,
	Filter,
	Lock,
	Mail,
	MapPin,
	Phone,
	Plus,
	Search,
	Trash2,
	Unlock,
	Users,
	XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CNUserModal from "@/components/CNUserModal";
import { supabase } from "@/lib/supabaseClient";

interface CNUser {
	id: string;
	email: string;
	full_name: string;
	phone?: string;
	status: "active" | "inactive" | "pending";
	role?: string;
	location?: string;
	created_at: string;
	last_login?: string;
	last_session_revoked?: boolean | null;
	last_session_last_activity?: string | null;
	auth_banned_until?: string | null;
	auth_is_banned?: boolean;
}

interface CNSession {
	id: string;
	user_id: string;
	revoked: boolean;
	last_activity: string;
	issued_at?: string;
}

interface BanHoverState {
	user: CNUser;
	rect: { left: number; right: number; top: number; bottom: number };
}

type CNUserInput = {
	id?: unknown;
	email?: unknown;
	full_name?: unknown;
	phone?: unknown;
	status?: unknown;
	role?: unknown;
	location?: unknown;
	created_at?: unknown;
	last_login?: unknown;
	last_session_revoked?: unknown;
	last_session_last_activity?: unknown;
	auth_banned_until?: unknown;
	auth_is_banned?: unknown;
};

export default function CNUsersPage() {
	const [users, setUsers] = useState<CNUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [, setRealtimeConnected] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingUser, setEditingUser] = useState<CNUser | null>(null);
	const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
	const [userSessions, setUserSessions] = useState<Map<string, CNSession[]>>(
		new Map(),
	);
	const [loadingSessionsForUser, setLoadingSessionsForUser] = useState<
		string | null
	>(null);
	const [banModalUser, setBanModalUser] = useState<CNUser | null>(null);
	const [banMode, setBanMode] = useState<"duration" | "calendar">("duration");
	const [banAmount, setBanAmount] = useState<number>(24);
	const [banUnit, setBanUnit] = useState<
		"minutes" | "hours" | "days" | "weeks"
	>("hours");
	const [banUntilLocal, setBanUntilLocal] = useState<string>("");
	const [banHover, setBanHover] = useState<BanHoverState | null>(null);
	const [nowTs, setNowTs] = useState<number>(Date.now());
	const realtimeConnectedRef = useRef(false);
	const silentFetchInFlightRef = useRef(false);
	const lastSilentFetchRef = useRef(0);
	const forcedRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const router = useRouter();
	const SILENT_REFRESH_MIN_MS = 1200;
	const FALLBACK_REFRESH_MS = 20000;
	const AUTH_SYNC_REFRESH_MS = 5000;
	const EXPANDED_SESSIONS_REFRESH_MS = 4000;

	const applySessionRealtimeChange = useCallback((payload: unknown) => {
		const eventPayload = payload as {
			eventType?: string;
			new?: CNSession;
			old?: CNSession;
		};
		const eventType = String(eventPayload?.eventType || "");
		const newRow = eventPayload?.new || null;
		const oldRow = eventPayload?.old || null;
		const row = newRow || oldRow;
		if (!row) return;
		const userId = row?.user_id as string | undefined;
		if (!userId) return;

		// Update session badge/last activity immediately in users list.
		if (eventType === "INSERT" || eventType === "UPDATE") {
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId
						? {
								...u,
								last_session_revoked:
									row.revoked ?? u.last_session_revoked ?? null,
								last_session_last_activity:
									row.last_activity ?? u.last_session_last_activity ?? null,
							}
						: u,
				),
			);
		}

		// If row is expanded and sessions are loaded, keep detail table in sync too.
		setUserSessions((prev) => {
			if (!prev.has(userId)) return prev;
			const current = prev.get(userId) || [];
			const next = [...current];
			const idx = next.findIndex((s) => s.id === row.id);

			if (eventType === "DELETE") {
				if (idx >= 0) next.splice(idx, 1);
			} else if (idx >= 0) {
				next[idx] = { ...next[idx], ...row };
			} else {
				next.unshift(row as CNSession);
			}

			const map = new Map(prev);
			map.set(userId, next);
			return map;
		});
	}, []);

	useEffect(() => {
		const timer = setInterval(() => setNowTs(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!banModalUser || typeof document === "undefined") return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [banModalUser]);

	const loadUsers = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/admin/cn/users", { cache: "no-store" });
			const payload = await res.json();
			if (!res.ok) {
				console.error("Error cargando usuarios desde admin API:", payload);
				setUsers([]);
				return;
			}
			setUsers(payload.users || []);
		} catch (error) {
			console.error("❌ Error general:", error);
			setUsers([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Silent loader: updates users without toggling global loading spinner
	const loadUsersSilent = useCallback(async (force = false) => {
		const now = Date.now();
		if (silentFetchInFlightRef.current) return;
		if (!force && now - lastSilentFetchRef.current < SILENT_REFRESH_MIN_MS)
			return;

		try {
			silentFetchInFlightRef.current = true;
			lastSilentFetchRef.current = now;
			const res = await fetch("/api/admin/cn/users", { cache: "no-store" });
			const payload = await res.json().catch(() => null);
			if (!res.ok) {
				console.error("Error cargando usuarios (silent):", payload);
				return;
			}
			setUsers(payload.users || []);
		} catch (error) {
			console.error("Error general (silent):", error);
		} finally {
			silentFetchInFlightRef.current = false;
		}
	}, []);

	const handleDeleteUser = async (userId: string) => {
		if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

		try {
			const res = await fetch(
				`/api/admin/cn/users?id=${encodeURIComponent(userId)}`,
				{
					method: "DELETE",
				},
			);
			const payload = await res.json();
			if (!res.ok) {
				console.error("Error deleting user:", payload);
				alert("Error al eliminar usuario");
				return;
			}
			alert("Usuario eliminado exitosamente");
			setUsers((prev) => prev.filter((u) => u.id !== userId));
			setUserSessions((prev) => {
				const map = new Map(prev);
				map.delete(userId);
				return map;
			});
			if (expandedUserId === userId) setExpandedUserId(null);
		} catch (error) {
			console.error("❌ Error:", error);
			alert("Error al eliminar usuario");
		}
	};

	const buildBanDuration = (
		amount: number,
		unit: "minutes" | "hours" | "days" | "weeks",
	) => {
		const safeAmount = Math.max(1, Math.floor(Number(amount) || 1));
		if (unit === "minutes") return `${safeAmount}m`;
		if (unit === "hours") return `${safeAmount}h`;
		if (unit === "days") return `${safeAmount * 24}h`;
		return `${safeAmount * 24 * 7}h`;
	};

	const toLocalDateTimeInputValue = (ts: number) => {
		const d = new Date(ts);
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		const hh = String(d.getHours()).padStart(2, "0");
		const min = String(d.getMinutes()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
	};

	const buildBanDurationFromCalendar = (untilValue: string) => {
		const endTs = new Date(untilValue).getTime();
		if (Number.isNaN(endTs)) return null;
		const diffMs = endTs - Date.now();
		if (diffMs < 0) return null;
		const diffMinutes = Math.max(1, Math.ceil(diffMs / 60000));
		return `${diffMinutes}m`;
	};

	const handleToggleAuthBan = async (user: CNUser) => {
		setBanHover(null);
		const isCurrentlyBanned = isAuthBanActiveNow(user);
		if (isCurrentlyBanned) {
			const confirmUnban = window.confirm(
				"Se quitará el baneo de este usuario. ¿Deseas proceder?",
			);
			if (!confirmUnban) return;
		}
		try {
			const res = await fetch("/api/admin/cn/users", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: user.id,
					auth_is_banned: !user.auth_is_banned,
				}),
			});
			const payload = await res.json();
			if (!res.ok) {
				console.error("Error updating auth ban:", payload);
				alert("Error al cambiar bloqueo en Auth");
				return;
			}
			const updated = payload?.user;
			setUsers((prev) =>
				prev.map((u) => {
					if (u.id !== user.id) return u;
					return {
						...u,
						...(updated || {}),
					};
				}),
			);
		} catch (error) {
			console.error("❌ Error:", error);
			alert("Error al cambiar bloqueo en Auth");
		}
	};

	const handleOpenBanModal = (user: CNUser) => {
		setBanHover(null);
		setBanModalUser(user);
		setBanMode("duration");
		setBanAmount(24);
		setBanUnit("hours");
		setBanUntilLocal(
			toLocalDateTimeInputValue(Date.now() + 24 * 60 * 60 * 1000),
		);
	};

	const handleBanHoverEnter = (
		event: React.MouseEvent<HTMLButtonElement>,
		user: CNUser,
	) => {
		const rect = event.currentTarget.getBoundingClientRect();
		setBanHover({
			user,
			rect: {
				left: rect.left,
				right: rect.right,
				top: rect.top,
				bottom: rect.bottom,
			},
		});
	};

	const handleBanHoverLeave = () => {
		setBanHover(null);
	};

	const handleConfirmBan = async () => {
		if (!banModalUser) return;
		try {
			const banDuration =
				banMode === "duration"
					? buildBanDuration(banAmount, banUnit)
					: buildBanDurationFromCalendar(banUntilLocal);
			if (!banDuration) {
				alert(
					"Selecciona una fecha/hora válida de desbaneo (igual o posterior a la fecha actual).",
				);
				return;
			}
			const res = await fetch("/api/admin/cn/users", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: banModalUser.id,
					auth_is_banned: true,
					ban_duration: banDuration,
				}),
			});
			const payload = await res.json();
			if (!res.ok) {
				console.error("Error updating auth ban:", payload);
				alert("Error al cambiar bloqueo en Auth");
				return;
			}
			const updated = payload?.user;
			setUsers((prev) =>
				prev.map((u) =>
					u.id === banModalUser.id ? { ...u, ...(updated || {}) } : u,
				),
			);
			setBanModalUser(null);
		} catch (error) {
			console.error("❌ Error:", error);
			alert("Error al cambiar bloqueo en Auth");
		}
	};

	const openCreateModal = () => {
		setEditingUser(null);
		setShowCreateModal(true);
	};

	const handleRefresh = () => {
		loadUsers();
	};

	const openEditModal = (user: CNUser) => {
		setEditingUser(user);
		setShowCreateModal(true);
	};

	const loadUserSessions = useCallback(
		async (userId: string, silent = false) => {
			try {
				if (!silent) setLoadingSessionsForUser(userId);
				const res = await fetch(
					`/api/admin/cn/users/${encodeURIComponent(userId)}/sessions`,
				);
				const payload = await res.json();
				if (!res.ok) {
					console.error("Error loading sessions:", res.status, payload);
					if (!silent) {
						alert(
							`Error al cargar sesiones: ${payload?.error || `HTTP ${res.status}`}`,
						);
					}
					return;
				}
				setUserSessions((prev) => {
					const newSessions = new Map(prev);
					newSessions.set(userId, payload.sessions || []);
					return newSessions;
				});
			} catch (error) {
				console.error("Error loading sessions:", error);
				if (!silent) {
					alert(`Error al cargar sesiones: ${error}`);
				}
			} finally {
				if (!silent) setLoadingSessionsForUser(null);
			}
		},
		[],
	);

	const handleToggleExpandUser = async (userId: string) => {
		if (expandedUserId === userId) {
			setExpandedUserId(null);
		} else {
			setExpandedUserId(userId);
			// Load sessions if not already loaded
			if (!userSessions.has(userId)) {
				await loadUserSessions(userId);
			}
		}
	};

	const handleDeleteSession = async (userId: string, sessionId: string) => {
		if (!confirm("¿Eliminar esta sesión del historial?")) return;
		try {
			const res = await fetch(
				`/api/admin/cn/users/${encodeURIComponent(userId)}/sessions?sessionId=${encodeURIComponent(sessionId)}`,
				{ method: "DELETE" },
			);
			const payload = await res.json();
			if (!res.ok) {
				console.error("Error deleting session:", payload);
				alert("Error al eliminar sesión");
				return;
			}
			setUserSessions((prev) => {
				const map = new Map(prev);
				const current = map.get(userId) || [];
				map.set(
					userId,
					current.filter((s) => s.id !== sessionId),
				);
				return map;
			});
		} catch (error) {
			console.error("Error deleting session:", error);
			alert("Error al eliminar sesión");
		}
	};

	useEffect(() => {
		loadUsers();
		const scheduleForcedRefresh = () => {
			if (forcedRefreshTimerRef.current)
				clearTimeout(forcedRefreshTimerRef.current);
			forcedRefreshTimerRef.current = setTimeout(() => {
				void loadUsersSilent(true);
			}, 350);
		};

		const channel = supabase
			.channel("realtime:cn_users_and_sessions")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "cn_users" },
				() => {
					setRealtimeConnected(true);
					realtimeConnectedRef.current = true;
					scheduleForcedRefresh();
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "cn_sessions" },
				(payload) => {
					setRealtimeConnected(true);
					realtimeConnectedRef.current = true;
					applySessionRealtimeChange(payload);
				},
			)
			.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					setRealtimeConnected(true);
					realtimeConnectedRef.current = true;
				}
			});

		const intervalId = setInterval(() => {
			if (!realtimeConnectedRef.current) {
				void loadUsersSilent();
			}
		}, FALLBACK_REFRESH_MS);

		return () => {
			if (forcedRefreshTimerRef.current)
				clearTimeout(forcedRefreshTimerRef.current);
			clearInterval(intervalId);
			try {
				supabase.removeChannel(channel);
			} catch {}
		};
	}, [applySessionRealtimeChange, loadUsers, loadUsersSilent]);

	useEffect(() => {
		const intervalId = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			void loadUsersSilent(true);
		}, AUTH_SYNC_REFRESH_MS);
		return () => clearInterval(intervalId);
	}, [loadUsersSilent]);

	useEffect(() => {
		if (!expandedUserId) return;
		const intervalId = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			void loadUserSessions(expandedUserId, true);
		}, EXPANDED_SESSIONS_REFRESH_MS);
		return () => clearInterval(intervalId);
	}, [expandedUserId, loadUserSessions]);

	const formatSessionDate = (value?: string) => {
		if (!value) return "-";
		const d = new Date(new Date(value).getTime() - 3 * 60 * 60 * 1000);
		if (Number.isNaN(d.getTime())) return "-";
		const dd = String(d.getDate()).padStart(2, "0");
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const yy = String(d.getFullYear()).slice(-2);
		const hh = String(d.getHours()).padStart(2, "0");
		const min = String(d.getMinutes()).padStart(2, "0");
		return `${dd}/${mm}/${yy} ${hh}:${min}`;
	};

	const getRelativeMinutes = (value?: string) => {
		if (!value) return "-";
		// Keep relative time aligned with the same timezone adjustment used in formatSessionDate.
		const t = new Date(value).getTime() - 3 * 60 * 60 * 1000;
		if (Number.isNaN(t)) return "-";
		const diffMin = Math.max(0, Math.floor((Date.now() - t) / 60000));
		if (diffMin < 1) return "ahora";
		if (diffMin < 60) return `${diffMin} min`;
		const h = Math.floor(diffMin / 60);
		const m = diffMin % 60;
		return `${h}h ${m}m`;
	};

	// Filtrar usuarios
	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.phone?.includes(searchQuery);

		const matchesStatus =
			statusFilter === "all" || user.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	const getStatusBadge = (status: string) => {
		const styles = {
			active: "bg-emerald-100 text-emerald-800 border-emerald-200",
			inactive: "bg-red-100 text-red-800 border-red-200",
			pending: "bg-amber-100 text-amber-800 border-amber-200",
		};

		const labels = {
			active: "Activo",
			inactive: "Inactivo",
			pending: "Pendiente",
		};

		return (
			<span
				className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.inactive}`}
			>
				{labels[status as keyof typeof labels] || status}
			</span>
		);
	};

	const getStatusIcon = (status: string) => {
		if (status === "active")
			return <CheckCircle className="w-4 h-4 text-emerald-600" />;
		if (status === "pending")
			return <Calendar className="w-4 h-4 text-amber-600" />;
		return <XCircle className="w-4 h-4 text-red-600" />;
	};

	const getSessionBadge = (revoked: boolean | null | undefined) => {
		if (revoked === false) {
			return (
				<span className="px-2 py-1 text-xs font-medium rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
					Activa
				</span>
			);
		}
		if (revoked === true) {
			return (
				<span className="px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
					Cerrada
				</span>
			);
		}
		return (
			<span className="px-2 py-1 text-xs font-medium rounded-full border bg-amber-100 text-amber-800 border-amber-200">
				Desconocida
			</span>
		);
	};

	const isAuthBanActiveNow = (user: CNUser) => {
		if (!user.auth_banned_until) return false;
		const endTs = new Date(user.auth_banned_until).getTime();
		if (Number.isNaN(endTs)) return Boolean(user.auth_is_banned);
		return endTs > nowTs;
	};

	const getAuthBanTooltip = (user: CNUser) => {
		const isBannedNow = isAuthBanActiveNow(user);
		if (!isBannedNow) {
			return { title: "No baneado", detail: "" };
		}

		if (!user.auth_banned_until) {
			return { title: "Baneado", detail: "Sin fecha de término" };
		}

		const endTs = new Date(user.auth_banned_until).getTime();
		if (Number.isNaN(endTs) || endTs <= nowTs) {
			return { title: "Baneado", detail: "Finaliza pronto" };
		}

		const totalSec = Math.max(0, Math.floor((endTs - nowTs) / 1000));
		if (totalSec < 3600) {
			const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
			const ss = String(totalSec % 60).padStart(2, "0");
			return { title: "Baneado", detail: `Restante: ${mm}:${ss}` };
		}

		const days = Math.floor(totalSec / 86400);
		const hours = Math.floor((totalSec % 86400) / 3600);
		const mins = Math.floor((totalSec % 3600) / 60);
		const chunks: string[] = [];
		if (days > 0) chunks.push(`${days}d`);
		if (hours > 0) chunks.push(`${hours}h`);
		if (mins > 0) chunks.push(`${mins}m`);

		return {
			title: "Baneado",
			detail: `Restante: ${chunks.join(" ") || "menos de 1m"}`,
		};
	};

	const normalizeUserForState = (
		incoming: CNUserInput,
		base?: CNUser,
	): CNUser => {
		const incomingStatus = String(incoming.status || base?.status || "pending");
		const status: CNUser["status"] =
			incomingStatus === "active" ||
			incomingStatus === "inactive" ||
			incomingStatus === "pending"
				? incomingStatus
				: "pending";
		const createdAt = String(
			incoming.created_at || base?.created_at || new Date().toISOString(),
		);
		return {
			id: String(incoming.id || base?.id || ""),
			email: String(incoming.email || base?.email || ""),
			full_name: String(incoming.full_name || base?.full_name || ""),
			phone:
				incoming.phone !== undefined
					? String(incoming.phone)
					: (base?.phone ?? undefined),
			status,
			role:
				incoming.role !== undefined
					? String(incoming.role)
					: (base?.role ?? undefined),
			location:
				incoming.location !== undefined
					? String(incoming.location)
					: (base?.location ?? undefined),
			created_at: createdAt,
			last_login:
				incoming.last_login !== undefined
					? String(incoming.last_login)
					: (base?.last_login ?? undefined),
			last_session_revoked:
				incoming.last_session_revoked !== undefined
					? Boolean(incoming.last_session_revoked)
					: (base?.last_session_revoked ?? null),
			last_session_last_activity:
				incoming.last_session_last_activity !== undefined
					? String(incoming.last_session_last_activity)
					: (base?.last_session_last_activity ?? null),
			auth_banned_until:
				incoming.auth_banned_until !== undefined
					? String(incoming.auth_banned_until)
					: (base?.auth_banned_until ?? null),
			auth_is_banned:
				incoming.auth_is_banned !== undefined
					? Boolean(incoming.auth_is_banned)
					: (base?.auth_is_banned ?? false),
		};
	};

	return (
		<div className="min-h-screen bg-gray10 p-2 sm:p-3 lg:p-4">
			<div className="w-full max-w-none">
				{showCreateModal && (
					<CNUserModal
						user={editingUser}
						onClose={() => {
							setShowCreateModal(false);
							setEditingUser(null);
						}}
						onSaved={(savedUser, mode) => {
							if (!savedUser?.id) return;
							setUsers((prev) => {
								if (mode === "create") {
									if (prev.some((u) => u.id === savedUser.id)) return prev;
									return [normalizeUserForState(savedUser), ...prev];
								}
								return prev.map((u) =>
									u.id === savedUser.id
										? normalizeUserForState(savedUser, u)
										: u,
								);
							});
						}}
					/>
				)}
				<div className="mb-4">
					<div className="mb-4 flex items-center justify-start">
						<button
							type="button"
							onClick={() => router.push("/admin/cn")}
							className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-sm font-medium text-gray3 shadow-sm transition-colors duration-200 hover:bg-gray10 hover:text-gray1"
						>
							<ArrowLeft className="h-4 w-4" />
							Volver atrás
						</button>
					</div>

					{/* Search and Filters */}
					<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
						<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
							<div className="flex-1 w-full sm:max-w-md">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray6" />
									<input
										type="text"
										placeholder="Buscar por nombre, email o teléfono..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full rounded-md border border-gray9 bg-white py-2 pl-10 pr-4 text-sm text-gray3 shadow-sm placeholder:text-gray6 focus:border-blue6 focus:ring-2 focus:ring-blue6/10"
									/>
								</div>
							</div>

							<div className="flex gap-2 w-full sm:w-auto">
								<div className="relative flex-1 sm:flex-none">
									<Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray6" />
									<select
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value)}
										className="w-full appearance-none rounded-md border border-gray9 bg-white py-2 pl-10 pr-8 text-sm text-gray3 shadow-sm focus:border-blue6 focus:ring-2 focus:ring-blue6/10 sm:w-auto"
									>
										<option value="all">Todos los estados</option>
										<option value="active">Activos</option>
										<option value="inactive">Inactivos</option>
										<option value="pending">Pendientes</option>
									</select>
								</div>

								<button
									type="button"
									onClick={openCreateModal}
									className="flex items-center gap-2 whitespace-nowrap rounded-md bg-blue6 px-4 py-2 font-medium text-white transition-colors hover:bg-blue5"
								>
									<Plus className="w-4 h-4" />
									Nuevo Usuario
								</button>
								<button
									type="button"
									onClick={handleRefresh}
									className="flex items-center gap-2 rounded-md border border-gray9 bg-gray10 px-4 py-2 font-medium text-gray3 transition-colors hover:bg-white"
									title="Refrescar lista"
								>
									Refrescar
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Stats */}
				<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
						<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray4">Total</p>
								<p className="mt-2 text-3xl font-bold leading-none text-gray1">
									{users.length}
								</p>
							</div>
							<div className="rounded-md bg-blue15 p-3">
								<Users className="h-6 w-6 text-blue6" />
							</div>
						</div>
					</div>

					<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
						<div className="absolute inset-x-0 top-0 h-1 bg-green2" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray4">Activos</p>
								<p className="mt-2 text-3xl font-bold leading-none text-green2">
									{users.filter((u) => u.status === "active").length}
								</p>
							</div>
							<div className="rounded-md bg-green6 p-3">
								<CheckCircle className="h-6 w-6 text-green2" />
							</div>
						</div>
					</div>

					<div className="relative overflow-hidden rounded-md border border-gray9 bg-white p-4 shadow-sm">
						<div className="absolute inset-x-0 top-0 h-1 bg-gold3" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray4">Pendientes</p>
								<p className="mt-2 text-3xl font-bold leading-none text-gold2">
									{users.filter((u) => u.status === "pending").length}
								</p>
							</div>
							<div className="rounded-md bg-gold7 p-3">
								<Calendar className="h-6 w-6 text-gold2" />
							</div>
						</div>
					</div>
				</div>

				{/* Users Table */}
				<div className="overflow-hidden rounded-md border border-gray9 bg-white shadow-sm">
					<div>
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6"></div>
							</div>
						) : filteredUsers.length > 0 ? (
							<>
								<div className="md:hidden divide-y divide-gray9">
									{filteredUsers.map((user) => (
										<div key={user.id} className="p-4">
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-3 min-w-0">
													<div className="flex-shrink-0 h-10 w-10 bg-blue15 rounded-full flex items-center justify-center">
														<Users className="h-5 w-5 text-blue6" />
													</div>
													<div className="min-w-0">
														<div className="text-sm font-medium text-gray-900 truncate">
															{user.full_name || "Sin nombre"}
														</div>
														<div className="text-xs text-gray-500 flex items-center gap-1 truncate">
															<Mail className="w-3 h-3 shrink-0" />
															<span className="truncate">{user.email}</span>
														</div>
													</div>
												</div>
												<button
													type="button"
													onClick={() => handleToggleExpandUser(user.id)}
													className="p-1 hover:bg-gray-100 rounded transition-colors"
													title={
														expandedUserId === user.id
															? "Contraer sesiones"
															: "Expandir sesiones"
													}
												>
													{expandedUserId === user.id ? (
														<ChevronDown className="w-4 h-4 text-gray-600" />
													) : (
														<ChevronRight className="w-4 h-4 text-gray-600" />
													)}
												</button>
											</div>

											<div className="mt-3 grid grid-cols-2 gap-3 text-xs">
												<div>
													<div className="text-gray-500 mb-1">Contacto</div>
													<div className="text-gray-900 space-y-1">
														{user.phone && (
															<div className="flex items-center gap-1">
																<Phone className="w-3 h-3 text-gray-400" />
																{user.phone}
															</div>
														)}
														{user.location && (
															<div className="flex items-center gap-1">
																<MapPin className="w-3 h-3 text-gray-400" />
																<span className="truncate">
																	{user.location}
																</span>
															</div>
														)}
													</div>
												</div>
												<div>
													<div className="text-gray-500 mb-1">Estado</div>
													<div className="flex items-center gap-2">
														{getStatusIcon(user.status)}
														{getStatusBadge(user.status)}
													</div>
												</div>
												<div>
													<div className="text-gray-500 mb-1">Sesión</div>
													<div>
														{getSessionBadge(user.last_session_revoked)}
													</div>
												</div>
												<div>
													<div className="text-gray-500 mb-1">Rol</div>
													<div className="text-gray-900">
														{user.role || "-"}
													</div>
												</div>
												<div>
													<div className="text-gray-500 mb-1">
														Última Actividad
													</div>
													<div className="text-gray-900">
														{user.last_session_last_activity
															? (() => {
																	const d = new Date(
																		new Date(
																			user.last_session_last_activity,
																		).getTime() -
																			3 * 60 * 60 * 1000,
																	);
																	const dd = String(d.getDate()).padStart(
																		2,
																		"0",
																	);
																	const mm = String(d.getMonth() + 1).padStart(
																		2,
																		"0",
																	);
																	const yy = String(d.getFullYear()).slice(-2);
																	const hh = String(d.getHours()).padStart(
																		2,
																		"0",
																	);
																	const min = String(d.getMinutes()).padStart(
																		2,
																		"0",
																	);
																	return `${dd}/${mm}/${yy} ${hh}:${min}`;
																})()
															: "-"}
													</div>
												</div>
												<div>
													<div className="text-gray-500 mb-1">Registro</div>
													<div className="text-gray-900">
														{new Date(user.created_at).toLocaleDateString(
															"es-CL",
														)}
													</div>
												</div>
											</div>

											<div className="mt-4 flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() =>
														isAuthBanActiveNow(user)
															? handleToggleAuthBan(user)
															: handleOpenBanModal(user)
													}
													onMouseEnter={(event) =>
														handleBanHoverEnter(event, user)
													}
													onMouseLeave={handleBanHoverLeave}
													className={`p-2 rounded-md transition-colors ${
														isAuthBanActiveNow(user)
															? "text-red-600 hover:text-red-700 hover:bg-red-50"
															: "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
													}`}
													title={
														isAuthBanActiveNow(user)
															? "Quitar baneo"
															: "Banear usuario"
													}
												>
													{isAuthBanActiveNow(user) ? (
														<Unlock className="w-4 h-4" />
													) : (
														<Lock className="w-4 h-4" />
													)}
												</button>
												<button
													type="button"
													onClick={() => openEditModal(user)}
													className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
													title="Editar"
												>
													<Edit className="w-4 h-4" />
												</button>
												<button
													type="button"
													onClick={() => handleDeleteUser(user.id)}
													className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
													title="Eliminar"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>

											{expandedUserId === user.id && (
												<div className="mt-4 rounded-md border border-gray9 bg-gray10 p-3">
													<h4 className="text-sm font-semibold text-gray-900 mb-2">
														Historial de Sesiones
													</h4>
													{loadingSessionsForUser === user.id ? (
														<div className="flex items-center justify-center py-4">
															<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue6"></div>
														</div>
													) : (userSessions.get(user.id) || []).length > 0 ? (
														<div className="space-y-2">
															{(userSessions.get(user.id) || []).map(
																(session) => (
																	<div
																		key={session.id}
																		className="rounded-md border border-gray9 bg-white p-2"
																	>
																		<div className="flex items-center justify-between gap-2">
																			<div className="text-xs text-gray-600 font-mono">
																				{session.id.slice(0, 8)}
																			</div>
																			<div>
																				{session.revoked ? (
																					<span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
																						Cerrada
																					</span>
																				) : (
																					<span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
																						Activa
																					</span>
																				)}
																			</div>
																		</div>
																		<div className="mt-1 text-xs text-gray-700">
																			<div>
																				Emitida:{" "}
																				{formatSessionDate(session.issued_at)}
																			</div>
																			<div>
																				Última:{" "}
																				{formatSessionDate(
																					session.last_activity,
																				)}
																			</div>
																			<div>
																				Hace:{" "}
																				{getRelativeMinutes(
																					session.last_activity,
																				)}
																			</div>
																		</div>
																		<div className="mt-2 flex justify-end">
																			<button
																				type="button"
																				onClick={() =>
																					handleDeleteSession(
																						user.id,
																						session.id,
																					)
																				}
																				className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
																				title="Eliminar sesión"
																			>
																				<Trash2 className="w-4 h-4" />
																			</button>
																		</div>
																	</div>
																),
															)}
														</div>
													) : (
														<p className="text-sm text-gray-500">
															No hay sesiones registradas
														</p>
													)}
												</div>
											)}
										</div>
									))}
								</div>

								<div className="hidden md:block overflow-x-auto">
									<table className="w-full">
										<thead className="border-b border-gray9 bg-gray10">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Usuario
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
													Contacto
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
													Estado
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Rol
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
													Sesión
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
													Última Actividad
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
													Fecha Registro
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
													Acciones
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray9">
											{filteredUsers.map((user) => (
												<React.Fragment key={user.id}>
													<tr className="transition-colors hover:bg-gray10">
														<td className="px-3 py-4 text-center">
															<button
																type="button"
																onClick={() => handleToggleExpandUser(user.id)}
																className="p-1 hover:bg-gray-100 rounded transition-colors"
																title={
																	expandedUserId === user.id
																		? "Contraer sesiones"
																		: "Expandir sesiones"
																}
															>
																{expandedUserId === user.id ? (
																	<ChevronDown className="w-4 h-4 text-gray-600" />
																) : (
																	<ChevronRight className="w-4 h-4 text-gray-600" />
																)}
															</button>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-center">
																<div className="flex-shrink-0 h-10 w-10 bg-blue15 rounded-full flex items-center justify-center">
																	<Users className="h-5 w-5 text-blue6" />
																</div>
																<div className="ml-4">
																	<div className="text-sm font-medium text-gray-900">
																		{user.full_name || "Sin nombre"}
																	</div>
																	<div className="text-sm text-gray-500 flex items-center gap-1">
																		<Mail className="w-3 h-3" />
																		{user.email}
																	</div>
																</div>
															</div>
														</td>
														<td className="px-6 py-4 text-center">
															<div className="text-sm text-gray-900 inline-flex flex-col items-center">
																{user.phone && (
																	<div className="flex items-center justify-center gap-1">
																		<Phone className="w-3 h-3 text-gray-400" />
																		{user.phone}
																	</div>
																)}
																{user.location && (
																	<div className="flex items-center justify-center gap-1 mt-1">
																		<MapPin className="w-3 h-3 text-gray-400" />
																		<span className="text-xs text-gray-500">
																			{user.location}
																		</span>
																	</div>
																)}
															</div>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-center justify-center gap-2">
																{getStatusIcon(user.status)}
																{getStatusBadge(user.status)}
															</div>
														</td>
														<td className="px-6 py-4">
															<span className="text-sm text-gray-900">
																{user.role || "-"}
															</span>
														</td>
														<td className="px-6 py-4 text-center">
															<div className="flex justify-center">
																{getSessionBadge(user.last_session_revoked)}
															</div>
														</td>
														<td className="px-6 py-4 text-center">
															<div className="text-sm text-gray-900">
																{user.last_session_last_activity
																	? (() => {
																			const d = new Date(
																				new Date(
																					user.last_session_last_activity,
																				).getTime() -
																					3 * 60 * 60 * 1000,
																			);
																			const dd = String(d.getDate()).padStart(
																				2,
																				"0",
																			);
																			const mm = String(
																				d.getMonth() + 1,
																			).padStart(2, "0");
																			const yy = String(d.getFullYear()).slice(
																				-2,
																			);
																			const hh = String(d.getHours()).padStart(
																				2,
																				"0",
																			);
																			const min = String(
																				d.getMinutes(),
																			).padStart(2, "0");
																			return `${dd}/${mm}/${yy} ${hh}:${min}`;
																		})()
																	: "-"}
															</div>
														</td>
														<td className="px-6 py-4 text-center">
															<div className="text-sm text-gray-900">
																{new Date(user.created_at).toLocaleDateString(
																	"es-CL",
																)}
															</div>
															{user.last_login && (
																<div className="text-xs text-gray-500">
																	Último acceso:{" "}
																	{new Date(user.last_login).toLocaleDateString(
																		"es-CL",
																	)}
																</div>
															)}
														</td>
														<td className="px-6 py-4 text-right">
															<div className="flex items-center justify-end gap-2">
																<div className="relative">
																	<button
																		type="button"
																		onClick={() =>
																			isAuthBanActiveNow(user)
																				? handleToggleAuthBan(user)
																				: handleOpenBanModal(user)
																		}
																		onMouseEnter={(event) =>
																			handleBanHoverEnter(event, user)
																		}
																		onMouseLeave={handleBanHoverLeave}
																		className={`p-2 rounded-md transition-colors ${
																			isAuthBanActiveNow(user)
																				? "text-red-600 hover:text-red-700 hover:bg-red-50"
																				: "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
																		}`}
																		title={
																			isAuthBanActiveNow(user)
																				? "Quitar baneo"
																				: "Banear usuario"
																		}
																	>
																		{isAuthBanActiveNow(user) ? (
																			<Unlock className="w-4 h-4" />
																		) : (
																			<Lock className="w-4 h-4" />
																		)}
																	</button>
																</div>
																<button
																	type="button"
																	onClick={() => openEditModal(user)}
																	className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
																	title="Editar"
																>
																	<Edit className="w-4 h-4" />
																</button>
																<button
																	type="button"
																	onClick={() => handleDeleteUser(user.id)}
																	className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
																	title="Eliminar"
																>
																	<Trash2 className="w-4 h-4" />
																</button>
															</div>
														</td>
													</tr>
													{expandedUserId === user.id && (
														<tr className="border-b border-gray9 bg-gray10">
															<td colSpan={9} className="px-6 py-4">
																<div className="space-y-4">
																	<div>
																		<h4 className="text-sm font-semibold text-gray-900 mb-3">
																			Historial de Sesiones
																		</h4>
																		{loadingSessionsForUser === user.id ? (
																			<div className="flex items-center justify-center py-4">
																				<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue6"></div>
																			</div>
																		) : (userSessions.get(user.id) || [])
																				.length > 0 ? (
																			<div className="overflow-x-auto">
																				<table className="w-full text-sm">
																					<thead className="border-b border-gray9 bg-white">
																						<tr>
																							<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																								ID
																							</th>
																							<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																								Estado
																							</th>
																							<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																								Emitida
																							</th>
																							<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																								Última Actividad
																							</th>
																							<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																								Hace
																							</th>
																							<th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
																								Acciones
																							</th>
																						</tr>
																					</thead>
																					<tbody className="divide-y divide-gray9">
																						{(
																							userSessions.get(user.id) || []
																						).map((session) => (
																							<tr
																								key={session.id}
																								className="hover:bg-white"
																							>
																								<td className="px-4 py-2 text-xs text-gray-600 font-mono">
																									{session.id.slice(0, 8)}
																								</td>
																								<td className="px-4 py-2">
																									{session.revoked ? (
																										<span className="px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
																											Cerrada
																										</span>
																									) : (
																										<span className="px-2 py-1 text-xs font-medium rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
																											Activa
																										</span>
																									)}
																								</td>
																								<td className="px-4 py-2 text-gray-700">
																									{formatSessionDate(
																										session.issued_at,
																									)}
																								</td>
																								<td className="px-4 py-2 text-gray-700">
																									{formatSessionDate(
																										session.last_activity,
																									)}
																								</td>
																								<td className="px-4 py-2 text-gray-700">
																									{getRelativeMinutes(
																										session.last_activity,
																									)}
																								</td>
																								<td className="px-4 py-2 text-right">
																									<button
																										type="button"
																										onClick={() =>
																											handleDeleteSession(
																												user.id,
																												session.id,
																											)
																										}
																										className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
																										title="Eliminar sesión"
																									>
																										<Trash2 className="w-4 h-4" />
																									</button>
																								</td>
																							</tr>
																						))}
																					</tbody>
																				</table>
																			</div>
																		) : (
																			<p className="text-sm text-gray-500">
																				No hay sesiones registradas
																			</p>
																		)}
																	</div>
																</div>
															</td>
														</tr>
													)}
												</React.Fragment>
											))}
										</tbody>
									</table>
								</div>
							</>
						) : (
							<div className="text-center py-12">
								<Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-500">
									{searchQuery || statusFilter !== "all"
										? "No se encontraron usuarios con los filtros aplicados"
										: "No hay usuarios registrados"}
								</p>
								<button
									type="button"
									onClick={() => setShowCreateModal(true)}
									className="mt-4 px-4 py-2 bg-blue6 hover:bg-blue5 text-white rounded-md transition-colors"
								>
									Crear primer usuario
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Pagination Info */}
				{filteredUsers.length > 0 && (
					<div className="mt-4 text-sm text-gray-600 text-center">
						Mostrando {filteredUsers.length} de {users.length} usuarios
					</div>
				)}

				{banHover &&
					typeof document !== "undefined" &&
					createPortal(
						<div
							className="pointer-events-none fixed z-[1200] min-w-[180px] rounded-md border border-gray-200 bg-white px-3 py-2 shadow-xl text-center"
							style={{
								top: `${banHover.rect.bottom + 8}px`,
								left: `${Math.max(8, banHover.rect.right - 180)}px`,
							}}
						>
							<div
								className={`text-xs font-semibold ${isAuthBanActiveNow(banHover.user) ? "text-red-700" : "text-gray-700"}`}
							>
								{getAuthBanTooltip(banHover.user).title}
							</div>
							{getAuthBanTooltip(banHover.user).detail && (
								<div className="text-xs text-gray-600 mt-0.5">
									{getAuthBanTooltip(banHover.user).detail}
								</div>
							)}
						</div>,
						document.body,
					)}

				{banModalUser &&
					typeof document !== "undefined" &&
					createPortal(
						<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4">
							<div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden border border-red-100">
								<div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
									<h3 className="text-lg font-semibold text-red-900">
										Banear usuario
									</h3>
									<p className="text-sm text-red-700 mt-1">
										{banModalUser.full_name || banModalUser.email}
									</p>
								</div>

								<div className="px-6 py-5">
									<p className="text-xs text-gray-600 mb-2">
										Define el tiempo de restricción de acceso.
									</p>

									<div className="mt-3">
										<p className="block text-xs text-gray-600 mb-2">
											Método de baneo
										</p>
										<div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-1 bg-gray-50">
											<button
												type="button"
												onClick={() => setBanMode("duration")}
												className={`px-3 py-2 text-sm rounded-md transition-colors ${
													banMode === "duration"
														? "bg-white border border-blue13 text-blue6 shadow-sm"
														: "text-gray-700 hover:bg-white"
												}`}
											>
												Por duración
											</button>
											<button
												type="button"
												onClick={() => setBanMode("calendar")}
												className={`px-3 py-2 text-sm rounded-md transition-colors ${
													banMode === "calendar"
														? "bg-white border border-blue13 text-blue6 shadow-sm"
														: "text-gray-700 hover:bg-white"
												}`}
											>
												Por calendario
											</button>
										</div>
									</div>

									{banMode === "duration" ? (
										<div className="mt-4 grid grid-cols-2 gap-3">
											<div>
												<label
													htmlFor="ban-amount"
													className="block text-xs text-gray-600 mb-1"
												>
													Cantidad
												</label>
												<input
													id="ban-amount"
													type="number"
													min={1}
													value={banAmount}
													onChange={(e) =>
														setBanAmount(
															Math.max(1, Number(e.target.value) || 1),
														)
													}
													className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-semibold text-gray-600 text-center"
												/>
											</div>
											<div>
												<label
													htmlFor="ban-unit"
													className="block text-xs text-gray-600 mb-1"
												>
													Unidad
												</label>
												<select
													id="ban-unit"
													value={banUnit}
													onChange={(e) =>
														setBanUnit(
															e.target.value as
																| "minutes"
																| "hours"
																| "days"
																| "weeks",
														)
													}
													className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-semibold text-center text-gray-600 bg-white"
												>
													<option value="minutes">Minutos</option>
													<option value="hours">Horas</option>
													<option value="days">Días</option>
													<option value="weeks">Semanas</option>
												</select>
											</div>
										</div>
									) : (
										<div className="mt-4 grid grid-cols-2 gap-3">
											<div>
												<label
													htmlFor="ban-start-at"
													className="block text-xs text-gray-600 mb-1"
												>
													Fecha de baneo
												</label>
												<input
													id="ban-start-at"
													type="datetime-local"
													value={toLocalDateTimeInputValue(nowTs)}
													readOnly
													className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600"
												/>
											</div>
											<div>
												<label
													htmlFor="ban-until-at"
													className="block text-xs text-gray-600 mb-1"
												>
													Hasta
												</label>
												<input
													id="ban-until-at"
													type="datetime-local"
													min={toLocalDateTimeInputValue(nowTs)}
													value={banUntilLocal}
													onChange={(e) => setBanUntilLocal(e.target.value)}
													className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
												/>
											</div>
										</div>
									)}
									<div className="mt-5 pt-4 border-t border-gray-100 flex justify-end gap-2">
										<button
											type="button"
											onClick={() => setBanModalUser(null)}
											className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
										>
											Cancelar
										</button>
										<button
											type="button"
											onClick={handleConfirmBan}
											className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm transition-colors"
										>
											Confirmar baneo
										</button>
									</div>
								</div>
							</div>
						</div>,
						document.body,
					)}
			</div>
		</div>
	);
}
