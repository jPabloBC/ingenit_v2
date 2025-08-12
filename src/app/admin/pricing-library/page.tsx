"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
    ArrowLeft, 
    Plus, 
    Edit, 
    Save, 
    X, 
    DollarSign, 
    Globe, 
    Search
} from "lucide-react";

interface PricingItem {
    id: string;
    service_id: string;
    service_name: string;
    category: string;
    country: string;
    currency: string;
    base_price: number;
    unit_prices: {
        meters?: number;
        devices?: number;
        points?: number;
        rooms?: number;
        floors?: number;
        [key: string]: number | undefined;
    };
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface ServiceCategory {
    id: string;
    name: string;
    services: {
        id: string;
        name: string;
        description: string;
        unit_fields: string[];
    }[];
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
    {
        id: "componentes_red",
        name: "Componentes de Red",
        services: [
            {
                id: "cable_utp_cat6",
                name: "Cable UTP Cat6 por metro",
                description: "Cable UTP Cat6 por metro lineal",
                unit_fields: ["price_per_meter"]
            },
            {
                id: "punto_red_rj45",
                name: "Punto de Red RJ45",
                description: "Instalación y configuración de punto de red RJ45",
                unit_fields: ["price_per_point"]
            },
            {
                id: "switch_24puertos",
                name: "Switch 24 puertos",
                description: "Switch de 24 puertos",
                unit_fields: ["price_per_device"]
            },
            {
                id: "access_point_interior",
                name: "Access Point Interior",
                description: "Access point para interior",
                unit_fields: ["price_per_device"]
            },
            {
                id: "camara_ip_domo",
                name: "Cámara IP Domo",
                description: "Cámara IP domo",
                unit_fields: ["price_per_device"]
            }
        ]
    },
    {
        id: "servicios_instalacion",
        name: "Servicios de Instalación",
        services: [
            {
                id: "instalacion_cable_por_metro",
                name: "Instalación de Cable por Metro",
                description: "Instalación de cable por metro lineal",
                unit_fields: ["price_per_meter"]
            },
            {
                id: "instalacion_punto_red",
                name: "Instalación Punto de Red",
                description: "Instalación de punto de red",
                unit_fields: ["price_per_point"]
            },
            {
                id: "configuracion_switch",
                name: "Configuración de Switch",
                description: "Configuración básica de switch",
                unit_fields: ["price_per_device"]
            },
            {
                id: "configuracion_access_point",
                name: "Configuración Access Point",
                description: "Configuración de access point",
                unit_fields: ["price_per_device"]
            }
        ]
    },
    {
        id: "servicios_mantenimiento",
        name: "Servicios de Mantenimiento",
        services: [
            {
                id: "mantenimiento_switch_mensual",
                name: "Mantenimiento Switch Mensual",
                description: "Mantenimiento mensual por switch",
                unit_fields: ["price_per_device"]
            },
            {
                id: "monitoreo_red_mensual",
                name: "Monitoreo de Red Mensual",
                description: "Monitoreo mensual de red",
                unit_fields: ["price_per_month"]
            },
            {
                id: "backup_mensual",
                name: "Backup Mensual",
                description: "Backup mensual de configuraciones",
                unit_fields: ["price_per_month"]
            }
        ]
    },
    {
        id: "desarrollo_web",
        name: "Desarrollo Web",
        services: [
            {
                id: "desarrollo_pagina_web",
                name: "Desarrollo Página Web",
                description: "Desarrollo por página web",
                unit_fields: ["price_per_page"]
            },
            {
                id: "desarrollo_landing_page",
                name: "Desarrollo Landing Page",
                description: "Landing page profesional",
                unit_fields: ["price_per_landing"]
            },
            {
                id: "desarrollo_sitio_corporativo",
                name: "Desarrollo Sitio Corporativo",
                description: "Sitio web corporativo completo",
                unit_fields: ["price_per_site"]
            },
            {
                id: "desarrollo_ecommerce",
                name: "Desarrollo E-commerce",
                description: "Tienda online completa",
                unit_fields: ["price_per_store"]
            },
            {
                id: "desarrollo_cms_wordpress",
                name: "Desarrollo CMS WordPress",
                description: "Sistema de gestión de contenido",
                unit_fields: ["price_per_cms"]
            }
        ]
    },
    {
        id: "desarrollo_mobile",
        name: "Desarrollo Móvil",
        services: [
            {
                id: "desarrollo_app_movil_ios",
                name: "Desarrollo App iOS",
                description: "Aplicación móvil para iOS",
                unit_fields: ["price_per_app"]
            },
            {
                id: "desarrollo_app_movil_android",
                name: "Desarrollo App Android",
                description: "Aplicación móvil para Android",
                unit_fields: ["price_per_app"]
            },
            {
                id: "desarrollo_app_hibrida",
                name: "Desarrollo App Híbrida",
                description: "Aplicación móvil multiplataforma",
                unit_fields: ["price_per_app"]
            },
            {
                id: "desarrollo_app_react_native",
                name: "Desarrollo App React Native",
                description: "Aplicación con React Native",
                unit_fields: ["price_per_app"]
            },
            {
                id: "desarrollo_app_flutter",
                name: "Desarrollo App Flutter",
                description: "Aplicación con Flutter",
                unit_fields: ["price_per_app"]
            }
        ]
    },
    {
        id: "desarrollo_backend",
        name: "Desarrollo Backend",
        services: [
            {
                id: "desarrollo_api_rest",
                name: "Desarrollo API REST",
                description: "API REST completa",
                unit_fields: ["price_per_api"]
            },
            {
                id: "desarrollo_api_graphql",
                name: "Desarrollo API GraphQL",
                description: "API GraphQL completa",
                unit_fields: ["price_per_api"]
            },
            {
                id: "desarrollo_microservicios",
                name: "Desarrollo Microservicios",
                description: "Arquitectura de microservicios",
                unit_fields: ["price_per_service"]
            },
            {
                id: "desarrollo_backend_nodejs",
                name: "Desarrollo Backend Node.js",
                description: "Backend con Node.js",
                unit_fields: ["price_per_backend"]
            },
            {
                id: "desarrollo_backend_python",
                name: "Desarrollo Backend Python",
                description: "Backend con Python",
                unit_fields: ["price_per_backend"]
            }
        ]
    },
    {
        id: "desarrollo_frontend",
        name: "Desarrollo Frontend",
        services: [
            {
                id: "desarrollo_frontend_react",
                name: "Desarrollo Frontend React",
                description: "Frontend con React",
                unit_fields: ["price_per_frontend"]
            },
            {
                id: "desarrollo_frontend_vue",
                name: "Desarrollo Frontend Vue",
                description: "Frontend con Vue.js",
                unit_fields: ["price_per_frontend"]
            },
            {
                id: "desarrollo_frontend_angular",
                name: "Desarrollo Frontend Angular",
                description: "Frontend con Angular",
                unit_fields: ["price_per_frontend"]
            },
            {
                id: "diseño_ui_ux",
                name: "Diseño UI/UX",
                description: "Diseño de interfaz de usuario",
                unit_fields: ["price_per_screen"]
            },
            {
                id: "diseño_prototipo",
                name: "Diseño de Prototipo",
                description: "Prototipo interactivo",
                unit_fields: ["price_per_prototype"]
            }
        ]
    },
    {
        id: "integracion_automatizacion",
        name: "Integración y Automatización",
        services: [
            {
                id: "integracion_api_terceros",
                name: "Integración API Terceros",
                description: "Integración con APIs externas",
                unit_fields: ["price_per_integration"]
            },
            {
                id: "integracion_payment_gateway",
                name: "Integración Payment Gateway",
                description: "Integración de pasarela de pago",
                unit_fields: ["price_per_integration"]
            },
            {
                id: "integracion_crm",
                name: "Integración CRM",
                description: "Integración con sistema CRM",
                unit_fields: ["price_per_integration"]
            },
            {
                id: "automatizacion_procesos",
                name: "Automatización de Procesos",
                description: "Automatización de procesos empresariales",
                unit_fields: ["price_per_automation"]
            },
            {
                id: "desarrollo_bot_chat",
                name: "Desarrollo Bot Chat",
                description: "Chatbot inteligente",
                unit_fields: ["price_per_bot"]
            }
        ]
    },
    {
        id: "testing_quality",
        name: "Testing y Calidad",
        services: [
            {
                id: "testing_unitario",
                name: "Testing Unitario",
                description: "Pruebas unitarias",
                unit_fields: ["price_per_module"]
            },
            {
                id: "testing_integracion",
                name: "Testing de Integración",
                description: "Pruebas de integración",
                unit_fields: ["price_per_integration"]
            },
            {
                id: "testing_automation",
                name: "Testing Automation",
                description: "Automatización de pruebas",
                unit_fields: ["price_per_suite"]
            },
            {
                id: "testing_seguridad",
                name: "Testing de Seguridad",
                description: "Auditoría de seguridad",
                unit_fields: ["price_per_audit"]
            },
            {
                id: "testing_performance",
                name: "Testing de Performance",
                description: "Pruebas de rendimiento",
                unit_fields: ["price_per_test"]
            }
        ]
    },
    {
        id: "devops_deployment",
        name: "DevOps y Deployment",
        services: [
            {
                id: "configuracion_ci_cd",
                name: "Configuración CI/CD",
                description: "Pipeline de integración continua",
                unit_fields: ["price_per_pipeline"]
            },
            {
                id: "configuracion_docker",
                name: "Configuración Docker",
                description: "Contenedores Docker",
                unit_fields: ["price_per_container"]
            },
            {
                id: "configuracion_kubernetes",
                name: "Configuración Kubernetes",
                description: "Cluster de Kubernetes",
                unit_fields: ["price_per_cluster"]
            },
            {
                id: "deployment_produccion",
                name: "Deployment a Producción",
                description: "Despliegue en producción",
                unit_fields: ["price_per_deployment"]
            },
            {
                id: "monitoreo_aplicacion",
                name: "Monitoreo de Aplicación",
                description: "Monitoreo y alertas",
                unit_fields: ["price_per_application"]
            }
        ]
    },
    {
        id: "soluciones_empresariales",
        name: "Soluciones Empresariales",
        services: [
            {
                id: "desarrollo_erp_personalizado",
                name: "Desarrollo ERP Personalizado",
                description: "Sistema ERP a medida",
                unit_fields: ["price_per_system"]
            },
            {
                id: "desarrollo_crm_personalizado",
                name: "Desarrollo CRM Personalizado",
                description: "Sistema CRM a medida",
                unit_fields: ["price_per_system"]
            },
            {
                id: "desarrollo_sistema_inventario",
                name: "Desarrollo Sistema Inventario",
                description: "Sistema de gestión de inventario",
                unit_fields: ["price_per_system"]
            },
            {
                id: "desarrollo_sistema_facturacion",
                name: "Desarrollo Sistema Facturación",
                description: "Sistema de facturación",
                unit_fields: ["price_per_system"]
            },
            {
                id: "desarrollo_sistema_contabilidad",
                name: "Desarrollo Sistema Contabilidad",
                description: "Sistema de contabilidad",
                unit_fields: ["price_per_system"]
            }
        ]
    },
    {
        id: "desarrollo_especializado",
        name: "Desarrollo Especializado",
        services: [
            {
                id: "desarrollo_ia_machine_learning",
                name: "Desarrollo IA/Machine Learning",
                description: "Sistemas de inteligencia artificial",
                unit_fields: ["price_per_project"]
            },
            {
                id: "desarrollo_blockchain",
                name: "Desarrollo Blockchain",
                description: "Aplicaciones blockchain",
                unit_fields: ["price_per_project"]
            },
            {
                id: "desarrollo_iot",
                name: "Desarrollo IoT",
                description: "Sistemas de Internet de las Cosas",
                unit_fields: ["price_per_project"]
            },
            {
                id: "desarrollo_realidad_aumentada",
                name: "Desarrollo Realidad Aumentada",
                description: "Aplicaciones de realidad aumentada",
                unit_fields: ["price_per_project"]
            },
            {
                id: "desarrollo_chatbot_ai",
                name: "Desarrollo Chatbot AI",
                description: "Chatbot con inteligencia artificial",
                unit_fields: ["price_per_chatbot"]
            }
        ]
    },
    {
        id: "consultoria_planificacion",
        name: "Consultoría y Planificación",
        services: [
            {
                id: "consultoria_arquitectura",
                name: "Consultoría Arquitectura",
                description: "Consultoría en arquitectura de software",
                unit_fields: ["price_per_hour"]
            },
            {
                id: "consultoria_tecnologia",
                name: "Consultoría Tecnología",
                description: "Consultoría en tecnologías",
                unit_fields: ["price_per_hour"]
            },
            {
                id: "planificacion_proyecto",
                name: "Planificación de Proyecto",
                description: "Planificación y gestión de proyectos",
                unit_fields: ["price_per_hour"]
            },
            {
                id: "analisis_requerimientos",
                name: "Análisis de Requerimientos",
                description: "Análisis y documentación de requerimientos",
                unit_fields: ["price_per_hour"]
            },
            {
                id: "documentacion_tecnica",
                name: "Documentación Técnica",
                description: "Documentación técnica del proyecto",
                unit_fields: ["price_per_hour"]
            }
        ]
    }
];

const COUNTRIES = [
    "Chile", "Argentina", "Colombia", "México", "Perú", "Ecuador", 
    "Venezuela", "Paraguay", "Uruguay", "Bolivia", "Brasil", 
    "España", "Estados Unidos"
];

export default function PricingLibraryPage() {
    const router = useRouter();
    const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<string>("Todos");
    const [selectedCategory, setSelectedCategory] = useState<string>("todos");
    const [searchTerm, setSearchTerm] = useState("");
    const [newItem, setNewItem] = useState<Partial<PricingItem>>({
        service_id: "",
        service_name: "",
        category: "servicios_ti",
        country: "Chile",
        currency: "CLP",
        base_price: 0,
        unit_prices: {},
        description: "",
        is_active: true
    });

    useEffect(() => {
        loadPricingItems();
    }, []);

    // Función para verificar permisos
    const checkPermissions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log("Usuario actual:", user);
            
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                
                console.log("Perfil del usuario:", profile);
            }
        } catch (error) {
            console.error("Error verificando permisos:", error);
        }
    };

    useEffect(() => {
        checkPermissions();
    }, []);

    // Función para probar la conexión a Supabase
    const testSupabaseConnection = async () => {
        try {
            console.log("=== TEST DE CONEXIÓN SUPABASE ===");
            
            // Verificar autenticación
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Sesión actual:", session);
            
            // Verificar usuario
            const { data: { user } } = await supabase.auth.getUser();
            console.log("Usuario actual:", user);
            
            // Probar una consulta simple
            console.log("Probando consulta simple...");
            const { data, error } = await supabase
                .from("pricing_library")
                .select("count")
                .limit(1);
            
            console.log("Test de conexión:", { data, error });
            
            if (error) {
                console.error("Error de conexión:", error);
                console.error("Código de error:", error.code);
                console.error("Mensaje:", error.message);
            } else {
                console.log("Conexión exitosa");
            }
            
            console.log("=== FIN TEST DE CONEXIÓN ===");
        } catch (error) {
            console.error("Error en test de conexión:", error);
        }
    };

    useEffect(() => {
        testSupabaseConnection();
    }, []);

    const loadPricingItems = async () => {
        try {
            console.log("=== INICIO CARGA DE PRECIOS ===");
            console.log("Cargando precios desde Supabase...");
            
            // Verificar conexión a Supabase
            const { data: { user } } = await supabase.auth.getUser();
            console.log("Usuario autenticado:", user);
            
            // Intentar consulta simple primero
            console.log("Probando consulta simple...");
            const { data: testData, error: testError } = await supabase
                .from("pricing_library")
                .select("count")
                .limit(1);
            
            console.log("Test de conexión:", { testData, testError });
            
            if (testError) {
                console.error("Error en test de conexión:", testError);
                throw testError;
            }
            
            // Consulta principal
            console.log("Realizando consulta principal...");
            const { data, error } = await supabase
                .from("pricing_library")
                .select("*")
                .order("created_at", { ascending: false });

            console.log("Respuesta de Supabase:", { data, error });

            if (error) {
                console.error("Error de Supabase:", error);
                throw error;
            }
            
            console.log("Precios cargados:", data);
            console.log("Número de precios:", data?.length || 0);
            setPricingItems(data || []);
            
            console.log("=== FIN CARGA DE PRECIOS ===");
        } catch (error) {
            console.error("Error cargando precios:", error);
            if (error && typeof error === "object") {
                console.error("Detalles del error:", {
                    message: (error as any).message,
                    code: (error as any).code,
                    details: (error as any).details,
                    hint: (error as any).hint
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const savePricingItem = async (item: Partial<PricingItem>) => {
        try {
            if (editingItem) {
                // Actualizar item existente
                const { error } = await supabase
                    .from("pricing_library")
                    .update({
                        ...item,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", editingItem.id);

                if (error) throw error;
            } else {
                // Crear nuevo item
                const { error } = await supabase
                    .from("pricing_library")
                    .insert({
                        ...item,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (error) throw error;
            }

            setEditingItem(null);
            setShowAddModal(false);
            setNewItem({
                service_id: "",
                service_name: "",
                category: "servicios_ti",
                country: "Chile",
                currency: "CLP",
                base_price: 0,
                unit_prices: {},
                description: "",
                is_active: true
            });
            loadPricingItems();
        } catch (error) {
            console.error("Error guardando precio:", error);
        }
    };

    const deletePricingItem = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este precio?")) return;

        try {
            const { error } = await supabase
                .from("pricing_library")
                .delete()
                .eq("id", id);

            if (error) throw error;
            loadPricingItems();
        } catch (error) {
            console.error("Error eliminando precio:", error);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        const formatter = new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return formatter.format(amount);
    };

    const getFilteredItems = () => {
        return pricingItems.filter(item => {
            const matchesCountry = selectedCountry === "Todos" || item.country === selectedCountry;
            const matchesCategory = selectedCategory === "todos" || item.category === selectedCategory;
            const matchesSearch = item.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesCountry && matchesCategory && matchesSearch;
        });
    };



    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Biblioteca de Precios
                            </h1>
                            <p className="text-gray-600">
                                Gestiona los precios de servicios por país y región
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={testSupabaseConnection}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Test Conexión
                        </button>
                        <button
                            onClick={loadPricingItems}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Recargar
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Precio
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                País
                            </label>
                            <select
                                value={selectedCountry}
                                onChange={(e) => setSelectedCountry(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            >
                                <option value="Todos">Todos los países</option>
                                {COUNTRIES.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Categoría
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            >
                                <option value="todos">Todas las categorías</option>
                                {SERVICE_CATEGORIES.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar servicios..."
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                                />
                            </div>
                        </div>
                        <div className="flex items-end">
                                                    <button
                            onClick={() => {
                                setSelectedCountry("Todos");
                                setSelectedCategory("todos");
                                setSearchTerm("");
                            }}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Limpiar Filtros
                        </button>
                        </div>
                    </div>
                </div>

                {/* Lista de Precios */}
                <div className="bg-white rounded-lg shadow-sm">
                    {/* Información de depuración */}
                    <div className="p-4 bg-blue-50 border-b">
                        <div className="text-sm text-blue8 space-y-1">
                            <div><strong>Debug Info:</strong></div>
                            <div>• {pricingItems.length} precios cargados</div>
                            <div>• País filtro: {selectedCountry}</div>
                            <div>• Categoría filtro: {selectedCategory}</div>
                            <div>• Búsqueda: &quot;{searchTerm}&quot;</div>
                            <div>• Mostrando: {getFilteredItems().length} precios filtrados</div>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue8 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Cargando precios...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Servicio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            País
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Precio Base
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Precios Unitarios
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {getFilteredItems().map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.service_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {item.description}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-900">{item.country}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {typeof item.base_price === 'number' && item.base_price > 0
                                                            ? formatCurrency(item.base_price, item.currency)
                                                            : Object.entries(item.unit_prices || {}).map(([key, value]) =>
                                                                `${key.replace('price_per_', '')}: ${formatCurrency(value ?? 0, item.currency)}`
                                                            ).join(', ')
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {Object.entries(item.unit_prices).map(([key, value]) => (
                                                        <div key={key} className="mb-1">
                                                            <span className="text-gray-600">{key}: </span>
                                                            <span className="font-medium">
                                                                {formatCurrency(value || 0, item.currency)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    item.is_active 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {item.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="text-blue8 hover:text-blue6"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deletePricingItem(item.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pricingItems.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="mb-4">
                                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay precios cargados</h3>
                                    <p className="text-gray-600 mb-4">
                                        Parece que no hay precios en la base de datos. Esto puede deberse a:
                                    </p>
                                    <ul className="text-sm text-gray-600 text-left max-w-md mx-auto space-y-1">
                                        <li>• La tabla pricing_library no existe en Supabase</li>
                                        <li>• La tabla no tiene datos</li>
                                        <li>• Problemas de permisos RLS</li>
                                        <li>• Problemas de conexión</li>
                                    </ul>
                                    <div className="mt-6">
                                        <button
                                            onClick={loadPricingItems}
                                            className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6"
                                        >
                                            Intentar Cargar Nuevamente
                                        </button>
                                    </div>
                                </div>
                            )}
                            {pricingItems.length > 0 && getFilteredItems().length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No se encontraron precios con los filtros seleccionados
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Edición/Adición */}
            {(editingItem || showAddModal) && (
                <PricingModal
                    item={editingItem || newItem}
                    onSave={savePricingItem}
                    onClose={() => {
                        setEditingItem(null);
                        setShowAddModal(false);
                    }}
                    serviceCategories={SERVICE_CATEGORIES}
                    countries={COUNTRIES}
                />
            )}
        </div>
    );
}

interface PricingModalProps {
    item: Partial<PricingItem>;
    onSave: (item: Partial<PricingItem>) => void;
    onClose: () => void;
    serviceCategories: ServiceCategory[];
    countries: string[];
}

function PricingModal({ item, onSave, onClose, serviceCategories, countries }: PricingModalProps) {
    const [formData, setFormData] = useState<Partial<PricingItem>>(item);
    const [selectedService, setSelectedService] = useState<string>(item.service_id || "");

    const handleSave = () => {
        const service = getServiceByName(selectedService);
        if (service) {
            onSave({
                ...formData,
                service_id: selectedService,
                service_name: service.name,
                description: service.description
            });
        }
    };

    const getServiceByName = (serviceId: string) => {
        for (const category of serviceCategories) {
            const service = category.services.find(s => s.id === serviceId);
            if (service) return service;
        }
        return null;
    };

    const getSelectedService = () => getServiceByName(selectedService);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {item.id ? "Editar Precio" : "Nuevo Precio"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Servicio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Servicio *
                        </label>
                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        >
                            <option value="">Seleccionar servicio</option>
                            {serviceCategories.map(category => (
                                <optgroup key={category.id} label={category.name}>
                                    {category.services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* País */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            País *
                        </label>
                        <select
                            value={formData.country || ""}
                            onChange={(e) => setFormData({...formData, country: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        >
                            {countries.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>
                    </div>

                    {/* Moneda */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Moneda
                        </label>
                        <input
                            type="text"
                            value={formData.currency || ""}
                            onChange={(e) => setFormData({...formData, currency: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Ej: CLP, USD, EUR"
                        />
                    </div>

                    {/* Precio Base */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Precio Base *
                        </label>
                        <input
                            type="number"
                            value={formData.base_price || 0}
                            onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="0"
                        />
                    </div>

                    {/* Precios Unitarios */}
                    {getSelectedService() && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Precios Unitarios
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {getSelectedService()?.unit_fields.map(field => (
                                    <div key={field}>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            {field.charAt(0).toUpperCase() + field.slice(1)}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.unit_prices?.[field] || 0}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                unit_prices: {
                                                    ...formData.unit_prices,
                                                    [field]: parseFloat(e.target.value) || 0
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Estado */}
                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.is_active || false}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                className="rounded border-gray-300 text-blue8 focus:ring-blue8"
                            />
                            <span className="ml-2 text-sm text-gray-700">Precio activo</span>
                        </label>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedService || !formData.country}
                        className="flex-1 px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
} 