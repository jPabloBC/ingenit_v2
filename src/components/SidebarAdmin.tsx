"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useSidebar } from "@/contexts/SidebarContext";

export default function SidebarAdmin() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const { isCollapsed, toggleCollapse } = useSidebar();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // No mostrar sidebar en páginas de login
                if (pathname === "/admin/login" || pathname === "/admin/reset-password") {
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                if (isSupabaseConfigured()) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        // Verificar que el usuario tenga permisos
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (profile && ['admin', 'dev'].includes(profile.role)) {
                            setIsAuthenticated(true);
                        } else {
                            router.push("/admin/login");
                        }
                    } else {
                        router.push("/admin/login");
                    }
                } else {
                    // Fallback a localStorage
                    const adminToken = localStorage.getItem("adminToken");
                    const adminUser = localStorage.getItem("adminUser");
                    
                    if (adminToken && adminUser) {
                        try {
                            const userData = JSON.parse(adminUser);
                            if (userData.email && userData.role) {
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
                console.error("Error verificando autenticación:", error);
                router.push("/admin/login");
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
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



    // No mostrar sidebar si está cargando, no está autenticado, o está en login
    if (isLoading || !isAuthenticated || pathname === "/admin/login" || pathname === "/admin/reset-password") {
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
                    <div className="flex items-center justify-between mb-6">
                        {!isCollapsed && (
                            <h2 className="text-2xl font-normal text-gray7">Admin Panel</h2>
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
                    <nav className="flex-1 space-y-2">
                        <button
                            onClick={() => {
                                router.push("/admin/dashboard");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                            title="Dashboard"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                            </svg>
                            {!isCollapsed && <span>Dashboard</span>}
                        </button>
                        
                        <button
                            onClick={() => {
                                router.push("/admin/chat");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                            title="Chat"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {!isCollapsed && <span>Chat</span>}
                        </button>
                        
                        <button
                            onClick={() => {
                                router.push("/admin/quotes");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                            title="Cotizaciones"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {!isCollapsed && <span>Cotizaciones</span>}
                        </button>
                        
                                    <button
                onClick={() => {
                    router.push("/admin/pricing-library");
                    setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                title="Biblioteca de Precios"
            >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {!isCollapsed && <span>Biblioteca de Precios</span>}
            </button>
            <button
                onClick={() => {
                    router.push("/admin/market-prices");
                    setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                title="Precios de Mercado"
            >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {!isCollapsed && <span>Precios de Mercado</span>}
            </button>
            
            
            {/* Servicios TI solo accesible desde cotización principal */}
            <button
                onClick={() => {
                    router.push("/admin/quotes/create");
                    setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                title="Crear Cotización (incluye Servicios TI)"
            >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {!isCollapsed && <span>Crear Cotización</span>}
            </button>
                        
                        <button
                            onClick={() => {
                                router.push("/admin/settings");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray8 hover:text-blue5 hover:bg-gray8 rounded-xl transition-all duration-200 font-medium"
                            title="Configuración"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {!isCollapsed && <span>Configuración</span>}
                        </button>


                    </nav>

                    {/* Logout */}
                    <div className="border-t border-gray-200 pt-4">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
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
