"use client";

import { useRouter, usePathname } from "next/navigation";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import React from 'react';
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useSidebar } from "@/contexts/SidebarContext";

// Helper: Map screen_id to route and icon
const SCREEN_CONFIG: Record<string, { route: string; label: string; icon: React.ReactNode }> = {
            print: {
                route: "/admin/print",
                label: "Impresión",
                icon: (
                    <Printer className="w-5 h-5 flex-shrink-0" />
                )
            },
        print_image: {
            route: "/admin/print/image",
            label: "Imágenes",
            icon: (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            )
        },
    dashboard: {
        route: "/admin/dashboard",
        label: "Dashboard",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        )
    },
    chat: {
        route: "/admin/chat",
        label: "Chat",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        )
    },
    "chatbot-conversations": {
        route: "/admin/chatbot-conversations",
        label: "Chatbot",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        )
    },
    quotes: {
        route: "/admin/quotes",
        label: "Cotizaciones",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )
    },
    "pricing-library": {
        route: "/admin/pricing-library",
        label: "Biblioteca de Precios",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
        )
    },
    "market-prices": {
        route: "/admin/market-prices",
        label: "Precios de Mercado",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        )
    },
    "process-tracking": {
        route: "/admin/process-tracking",
        label: "Seguimiento de Procesos",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )
    },
    "whatsapp-flows": {
        route: "/admin/whatsapp-flows",
        label: "Flujos de WhatsApp",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        )
    },
    "automation-leads": {
        route: "/admin/automation-leads",
        label: "Leads de Automatización",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        )
    },
    settings: {
        route: "/admin/settings",
        label: "Configuración",
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    },
};

export default function SidebarAdmin() {
    const router = useRouter();
    const pathname = usePathname();

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [allowedScreens, setAllowedScreens] = useState<{ screen_id: string; label: string }[]>([]); // [{screen_id, label}]
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({}); // Para manejar el colapso de sub screens
    const [userRole, setUserRole] = useState<string | null>(null);
    const { isCollapsed, toggleCollapse } = useSidebar();

    useEffect(() => {
        const checkAuthAndFetchScreens = async () => {
            try {
                if (pathname === "/admin/login" || pathname === "/admin/reset-password") {
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                if (isSupabaseConfigured()) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        // Obtener el role y allowed_screens del usuario
                        const { data: profile, error: errorProfile } = await supabase
                            .from('rt_profiles')
                            .select('role, allowed_screens')
                            .eq('id', session.user.id)
                            .single();
                        if (errorProfile) {
                            alert('Supabase error: ' + (errorProfile.message || JSON.stringify(errorProfile)));
                            console.error('Supabase error:', errorProfile);
                            setIsLoading(false);
                            return;
                        }
                        setUserRole(profile?.role || null);
                        if (profile?.role === 'dev') {
                            // Acceso total: incluir solo pantallas principales (no sub-screens con '_')
                            setAllowedScreens(Object.keys(SCREEN_CONFIG)
                                .filter(id => !id.includes('_'))
                                .map(screen_id => ({
                                    screen_id,
                                    label: SCREEN_CONFIG[screen_id].label
                                }))
                            );
                            setIsAuthenticated(true);
                            setIsLoading(false);
                            return;
                        }
                        // Si no es dev, usar allowed_screens de rt_profiles
                        console.log('Perfil completo:', profile);
                        const allowedScreenIds = profile?.allowed_screens || [];
                        console.log('allowed_screens del perfil:', allowedScreenIds);
                        
                        // Buscar las screen_ids en rt_screens para obtener los nombres
                        const { data: screenData, error: screenError } = await supabase
                            .from('rt_screens')
                            .select('id, screen_id')
                            .in('id', allowedScreenIds);
                        
                        if (screenError) {
                            console.error('Error obteniendo screens:', screenError);
                        }
                        
                        console.log('Screens obtenidas de rt_screens:', screenData);
                        
                        // Mapear a las screens permitidas
                        let allowed = (screenData || [])
                            .map(s => ({
                                screen_id: s.screen_id,
                                label: SCREEN_CONFIG[s.screen_id]?.label || s.screen_id
                            }))
                            // Asegurar que la screen exista en SCREEN_CONFIG y no sea una sub-screen independiente
                            .filter(s => SCREEN_CONFIG[s.screen_id] && !s.screen_id.includes('_'));
                        console.log('Screens permitidas (allowedScreens):', allowed);
                        setAllowedScreens(allowed);
                        setIsAuthenticated(true);
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
                                setUserRole(userData.role);
                                setAllowedScreens(Object.keys(SCREEN_CONFIG)
                                    .filter(id => !id.includes('_'))
                                    .map(screen_id => ({
                                        screen_id,
                                        label: SCREEN_CONFIG[screen_id].label
                                    }))
                                );
                                setIsAuthenticated(true);
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
                const errorMsg = (error as any)?.message || JSON.stringify(error);
                alert('Error verificando autenticación o permisos: ' + errorMsg);
                console.error("Error verificando autenticación o permisos:", error);
                router.push("/admin/login");
            } finally {
                setIsLoading(false);
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
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 right-4 z-50 bg-blue8 text-white p-3 rounded-full shadow-lg hover:bg-blue6 transition-all duration-200 lg:hidden"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Botón para colapsar/expandir en pantallas grandes */}
            <button
                onClick={toggleCollapse}
                className="fixed top-4 z-50 text-gray-500 hover:text-gray-700 transition-all duration-200 hidden lg:block focus:outline-none"
                style={{ left: isCollapsed ? '4rem' : '16rem' }}
            >
                <svg className={`w-6 h-6 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Overlay para cerrar sidebar en mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar fijo en pantallas grandes */}
            <aside className={`fixed top-0 left-0 h-full bg-white text-gray-900 z-50 shadow-xl transition-all duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 lg:shadow-none ${
                isCollapsed ? 'w-16' : 'w-64'
            }`}>
                <div className="flex flex-col h-full p-4 space-y-4 bg-blue2">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        {!isCollapsed && (
                            <h2 className="text-2xl font-normal text-gray4">Admin Panel</h2>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
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
                        {allowedScreens.map(screen => {
                            const config = SCREEN_CONFIG[screen.screen_id];
                            if (!config) return null;
                            // Buscar sub screens dinámicamente
                            const subScreenEntries = Object.entries(SCREEN_CONFIG).filter(
                                ([key]) => key.startsWith(screen.screen_id + '_')
                            );
                            const hasSubScreens = subScreenEntries.length > 0;
                            const isOpen = openGroups[screen.screen_id] || false;
                            return (
                                <div key={screen.screen_id}>
                                    <button
                                        onClick={() => {
                                            if (hasSubScreens) {
                                                setOpenGroups(prev => ({
                                                    ...prev,
                                                    [screen.screen_id]: !isOpen
                                                }));
                                            } else {
                                                router.push(config.route);
                                                setIsOpen(false);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-gray8 hover:text-blue5 hover:bg-gray6 rounded transition-all duration-200 font-medium ${
                                            isCollapsed ? 'justify-center' : ''
                                        }`}
                                        title={config.label}
                                    >
                                        {config.icon}
                                        {!isCollapsed && <span className="truncate text-left">{config.label}</span>}
                                        {hasSubScreens && !isCollapsed && (
                                            <svg className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        )}
                                    </button>
                                    {hasSubScreens && isOpen && (
                                        <div className="ml-6 border-l border-gray-200 pl-2 mt-1 space-y-1">
                                            {subScreenEntries.map(([key, value]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        router.push(value.route);
                                                        setIsOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-gray8 hover:text-blue5 hover:bg-gray6 rounded transition-all duration-200 font-medium ${
                                                        isCollapsed ? 'justify-center' : ''
                                                    }`}
                                                    title={value.label}
                                                >
                                                    {value.icon}
                                                    {!isCollapsed && <span className="truncate text-left">{value.label}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="border-t border-gray-200 pt-4">
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 px-4 pb-2 text-red-600 hover:text-red-700 hover:bg-red-56 rounded transition-all duration-200 font-medium ${
                                isCollapsed ? 'justify-center' : ''
                            }`}
                            title="Cerrar sesión"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {!isCollapsed && <span>Cerrar sesión</span>}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

