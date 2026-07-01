"use client";

import {
	Bot,
	Box,
	ChevronRight,
	ClipboardList,
	FileText,
	Image as ImageIcon,
	LayoutDashboard,
	LibraryBig,
	LogOut,
	Menu,
	MessageCircle,
	PanelLeftClose,
	Printer,
	Settings,
	TrendingUp,
	UsersRound,
	Wallet,
	Workflow,
	X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const iconClassName = "w-5 h-5 flex-shrink-0";
const navLabelClassName =
	"min-w-0 flex-1 text-left text-[15px] leading-tight whitespace-normal break-words";

// Helper: Map screen_id to route and icon
const SCREEN_CONFIG: Record<
	string,
	{ route: string; label: string; icon: React.ReactNode }
> = {
	transactions: {
		route: "/admin/transactions",
		label: "Finanzas Personales",
		icon: <Wallet className={iconClassName} />,
	},
	print: {
		route: "/admin/print",
		label: "Impresión",
		icon: <Printer className={iconClassName} />,
	},
	print_image: {
		route: "/admin/print/image",
		label: "Imágenes",
		icon: <ImageIcon className={iconClassName} />,
	},
	dashboard: {
		route: "/admin/dashboard",
		label: "Dashboard",
		icon: <LayoutDashboard className={iconClassName} />,
	},
	chat: {
		route: "/admin/chat",
		label: "Chat",
		icon: <MessageCircle className={iconClassName} />,
	},
	"chatbot-conversations": {
		route: "/admin/chatbot-conversations",
		label: "Chatbot",
		icon: <Bot className={iconClassName} />,
	},
	quotes: {
		route: "/admin/quotes",
		label: "Cotizaciones",
		icon: <FileText className={iconClassName} />,
	},
	"pricing-library": {
		route: "/admin/pricing-library",
		label: "Biblioteca de Precios",
		icon: <LibraryBig className={iconClassName} />,
	},
	"market-prices": {
		route: "/admin/market-prices",
		label: "Precios de Mercado",
		icon: <TrendingUp className={iconClassName} />,
	},
	"process-tracking": {
		route: "/admin/process-tracking",
		label: "Seguimiento de Procesos",
		icon: <ClipboardList className={iconClassName} />,
	},
	"whatsapp-flows": {
		route: "/admin/whatsapp-flows",
		label: "Flujos de WhatsApp",
		icon: <Workflow className={iconClassName} />,
	},
	"automation-leads": {
		route: "/admin/automation-leads",
		label: "Leads de Automatización",
		icon: <UsersRound className={iconClassName} />,
	},
	ds: {
		route: "/admin/ds",
		label: "Catálogo DS",
		icon: <Box className={iconClassName} />,
	},
	settings: {
		route: "/admin/settings",
		label: "Configuración",
		icon: <Settings className={iconClassName} />,
	},
};

// Preferred global ordering for sidebar items. Items not listed will appear afterwards alphabetically.
const PREFERRED_ORDER = [
	"dashboard",
	"chat",
	"chatbot-conversations",
	"quotes",
	"pricing-library",
	"market-prices",
	"process-tracking",
	"whatsapp-flows",
	"automation-leads",
	"ds",
	// Finanzas Personales e Impresión deben ir abajo, antes de Configuración
	"transactions",
	"print",
	"print_image",
	"settings",
];

export default function SidebarAdmin() {
	const router = useRouter();
	const pathname = usePathname();

	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [allowedScreens, setAllowedScreens] = useState<
		{ screen_id: string; label: string }[]
	>([]); // [{screen_id, label}]
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({}); // Para manejar el colapso de sub screens
	const { isCollapsed, toggleCollapse } = useSidebar();

	useEffect(() => {
		const checkAuthAndFetchScreens = async () => {
			try {
				if (
					pathname === "/admin/login" ||
					pathname === "/admin/reset-password"
				) {
					return;
				}

				if (isSupabaseConfigured()) {
					const {
						data: { session },
					} = await supabase.auth.getSession();
					if (session) {
						// Obtener el role y allowed_screens del usuario
						const { data: profile, error: errorProfile } = await supabase
							.from("rt_profiles")
							.select("role, allowed_screens")
							.eq("id", session.user.id)
							.single();
						if (errorProfile) {
							alert(
								"Supabase error: " +
									(errorProfile.message || JSON.stringify(errorProfile)),
							);
							console.error("Supabase error:", errorProfile);
							return;
						}
						if (profile?.role === "dev") {
							// Acceso total: incluir solo pantallas principales (no sub-screens con '_')
							// Apply preferred ordering so key screens appear before settings
							const allScreens = Object.keys(SCREEN_CONFIG).filter(
								(id) => !id.includes("_"),
							);
							allScreens.sort((a, b) => {
								const ia = PREFERRED_ORDER.indexOf(a);
								const ib = PREFERRED_ORDER.indexOf(b);
								if (ia === -1 && ib === -1) return a.localeCompare(b);
								if (ia === -1) return 1;
								if (ib === -1) return -1;
								return ia - ib;
							});
							setAllowedScreens(
								allScreens.map((screen_id) => ({
									screen_id,
									label: SCREEN_CONFIG[screen_id].label,
								})),
							);
							return;
						}
						// Si no es dev, usar allowed_screens de rt_profiles
						console.log("Perfil completo:", profile);
						const allowedScreenIds = profile?.allowed_screens || [];
						console.log("allowed_screens del perfil:", allowedScreenIds);

						// Buscar las screen_ids en rt_screens para obtener los nombres
						const { data: screenData, error: screenError } = await supabase
							.from("rt_screens")
							.select("id, screen_id")
							.in("id", allowedScreenIds);

						if (screenError) {
							console.error("Error obteniendo screens:", screenError);
						}

						console.log("Screens obtenidas de rt_screens:", screenData);

						// Mapear a las screens permitidas
						const allowed = (screenData || [])
							.map((s) => ({
								screen_id: s.screen_id,
								label: SCREEN_CONFIG[s.screen_id]?.label || s.screen_id,
							}))
							// Asegurar que la screen exista en SCREEN_CONFIG y no sea una sub-screen independiente
							.filter(
								(s) => SCREEN_CONFIG[s.screen_id] && !s.screen_id.includes("_"),
							);
						// Apply global preferred ordering
						allowed.sort((a, b) => {
							const ia = PREFERRED_ORDER.indexOf(a.screen_id);
							const ib = PREFERRED_ORDER.indexOf(b.screen_id);
							if (ia === -1 && ib === -1) return a.label.localeCompare(b.label);
							if (ia === -1) return 1;
							if (ib === -1) return -1;
							return ia - ib;
						});
						console.log("Screens permitidas (allowedScreens):", allowed);
						setAllowedScreens(allowed);
					} else {
						router.push("/admin/login");
					}
				} else {
					// Fallback a localStorage (no permissions)
					const adminToken = localStorage.getItem("adminToken");
					const adminUser = localStorage.getItem("adminUser");
					if (adminToken && adminUser) {
						try {
							const userData = JSON.parse(adminUser);
							if (userData.email && userData.role) {
								// Apply same preferred ordering for fallback
								const allScreens = Object.keys(SCREEN_CONFIG).filter(
									(id) => !id.includes("_"),
								);
								allScreens.sort((a, b) => {
									const ia = PREFERRED_ORDER.indexOf(a);
									const ib = PREFERRED_ORDER.indexOf(b);
									if (ia === -1 && ib === -1) return a.localeCompare(b);
									if (ia === -1) return 1;
									if (ib === -1) return -1;
									return ia - ib;
								});
								setAllowedScreens(
									allScreens.map((screen_id) => ({
										screen_id,
										label: SCREEN_CONFIG[screen_id].label,
									})),
								);
							} else {
								router.push("/admin/login");
							}
						} catch {
							router.push("/admin/login");
						}
					} else {
						router.push("/admin/login");
					}
				}
			} catch (error) {
				const errorMsg = getErrorMessage(error);
				alert(`Error verificando autenticación o permisos: ${errorMsg}`);
				console.error("Error verificando autenticación o permisos:", error);
				router.push("/admin/login");
			} finally {
			}
		};
		checkAuthAndFetchScreens();
	}, [router, pathname]);

	const handleLogout = async () => {
		try {
			if (isSupabaseConfigured()) {
				await supabase.auth.signOut();
			} else {
				localStorage.removeItem("adminToken");
				localStorage.removeItem("adminUser");
			}

			router.push("/admin/login");
		} catch (error) {
			console.error("Error al cerrar sesión:", error);
			// Fallback: limpiar localStorage y redirigir
			localStorage.removeItem("adminToken");
			localStorage.removeItem("adminUser");
			router.push("/admin/login");
		}
	};

	// Sólo ocultar el sidebar en las pantallas de login o reset-password.
	// Mostrar el sidebar durante la carga o mientras verificamos autenticación
	// para que sea persistente al recargar o cambiar de pantalla.
	if (pathname === "/admin/login" || pathname === "/admin/reset-password") {
		return null;
	}

	return (
		<>
			{/* Botón hamburguesa para pantallas pequeñas */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-4 right-4 z-[50] bg-blue2 text-white p-3 rounded-full shadow-lg hover:bg-blue6 transition-all duration-200 lg:hidden"
			>
				<Menu className="w-6 h-6" />
			</button>

			{/* Overlay para cerrar sidebar en mobile */}
			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
					onClick={() => setIsOpen(false)}
					aria-label="Cerrar menú lateral"
				/>
			)}

			{/* Sidebar fijo en pantallas grandes */}
			<aside
				className={`fixed top-0 left-0 h-full bg-white text-gray-900 z-50 shadow-xl transition-all duration-300 ease-in-out ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				} lg:translate-x-0 lg:shadow-none ${isCollapsed ? "w-16" : "w-72"}`}
			>
				<div className="flex flex-col h-full p-4 space-y-4 bg-gradient-to-b from-blue1 via-blue5 to-blue2">
					{/* Header */}
					<div className="flex items-center justify-end lg:hidden">
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="lg:hidden text-gray-500 hover:text-gray-700"
						>
							<X className="w-6 h-6" />
						</button>
					</div>

					{/* Navigation */}
					<style jsx>{`
                        .scrollbar-hide::-webkit-scrollbar {
                            display: none;
                        }
                        .scrollbar-hide {
                            -ms-overflow-style: none; /* IE and Edge */
                            scrollbar-width: none; /* Firefox */
                        }
                    `}</style>
					<nav className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
						{/* Render allowed screens normalmente */}
						{allowedScreens.map((screen) => {
							const config = SCREEN_CONFIG[screen.screen_id];
							if (!config) return null;
							// Buscar sub screens dinámicamente
							const subScreenEntries = Object.entries(SCREEN_CONFIG).filter(
								([key]) => key.startsWith(`${screen.screen_id}_`),
							);
							const hasSubScreens = subScreenEntries.length > 0;
							const isOpen = openGroups[screen.screen_id] || false;
							return (
								<div key={screen.screen_id}>
									<button
										type="button"
										onClick={() => {
											if (hasSubScreens) {
												setOpenGroups((prev) => ({
													...prev,
													[screen.screen_id]: !isOpen,
												}));
											} else {
												router.push(config.route);
												setIsOpen(false);
											}
										}}
										className={`w-full flex items-start gap-3 px-3 py-2.5 text-gray8 hover:text-blue5 hover:bg-gray6 rounded transition-all duration-200 font-medium ${
											isCollapsed ? "justify-center" : ""
										}`}
										title={config.label}
									>
										{config.icon}
										{!isCollapsed && (
											<span className={navLabelClassName}>{config.label}</span>
										)}
										{hasSubScreens && !isCollapsed && (
											<ChevronRight
												className={`w-4 h-4 ml-auto mt-0.5 flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
											/>
										)}
									</button>
									{hasSubScreens && isOpen && (
										<div className="ml-6 border-l border-gray-200 pl-2 mt-1 space-y-1">
											{subScreenEntries.map(([key, value]) => (
												<button
													key={key}
													type="button"
													onClick={() => {
														router.push(value.route);
														setIsOpen(false);
													}}
													className={`w-full flex items-start gap-3 px-3 py-2.5 text-gray8 hover:text-blue5 hover:bg-gray6 rounded transition-all duration-200 font-medium ${
														isCollapsed ? "justify-center" : ""
													}`}
													title={value.label}
												>
													{value.icon}
													{!isCollapsed && (
														<span className={navLabelClassName}>
															{value.label}
														</span>
													)}
												</button>
											))}
										</div>
									)}
								</div>
							);
						})}
						{/* Asegurar que el enlace a Finanzas Personales siempre esté visible */}
						{!allowedScreens.some((s) => s.screen_id === "transactions") && (
							<button
								type="button"
								onClick={() => {
									router.push(SCREEN_CONFIG.transactions.route);
									setIsOpen(false);
								}}
								className={`w-full flex items-start gap-3 px-3 py-2.5 text-gray8 hover:text-blue5 hover:bg-gray6 rounded transition-all duration-200 font-medium ${
									isCollapsed ? "justify-center" : ""
								}`}
								title={SCREEN_CONFIG.transactions.label}
							>
								{SCREEN_CONFIG.transactions.icon}
								{!isCollapsed && (
									<span className={navLabelClassName}>
										{SCREEN_CONFIG.transactions.label}
									</span>
								)}
							</button>
						)}
					</nav>

					{/* Controles inferiores */}
					<div className="border-t border-blue4 pt-4 space-y-3">
						<button
							type="button"
							onClick={toggleCollapse}
							className={`hidden lg:flex w-fit items-center justify-center px-3 py-2 text-gray8 hover:text-white hover:bg-blue4 rounded transition-all duration-200 ${
								isCollapsed ? "mx-auto" : "ml-auto"
							}`}
							aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
							title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
						>
							<PanelLeftClose className={iconClassName} />
						</button>

						<button
							type="button"
							onClick={handleLogout}
							className={`w-full flex items-center gap-3 px-3 py-2 text-gold5 hover:text-white hover:bg-blue4 rounded transition-all duration-200 font-medium ${
								isCollapsed ? "justify-center" : ""
							}`}
							title="Cerrar sesión"
						>
							<LogOut className={iconClassName} />
							{!isCollapsed && <span>Cerrar sesión</span>}
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}
