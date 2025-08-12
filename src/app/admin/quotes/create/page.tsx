"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Send, ChevronDown, Search, User, Globe, Minus, Plus, Eye, FileText, Mail, Edit, ChevronLeft, XCircle, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { COMPLETE_GEO_DATA, getRegionsByCountry, getCommunesByRegion } from "@/lib/completeGeoData";
import { calculateServicePrice, CalculationParams, ServiceCalculation } from "@/lib/serviceCalculations";
import { getCurrencyByCountry } from "@/lib/currencyData";
import { calculateSalePrice, formatEquipmentPrice, getAllCategories, calculateActualMargin } from "@/lib/equipmentPricing";
import CalculationModal from "@/components/CalculationModal";
import { downloadProfessionalPDF, sendProfessionalPDFByEmail, previewProfessionalPDF } from "@/lib/pdfGeneratorProfessional";
import { generateQuoteId } from "@/lib/quoteIdGenerator";

interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    calculationParams?: CalculationParams;
    calculatedPrice?: ServiceCalculation;
    granularComponents?: unknown[];
    configurations?: unknown[];
    packageId?: string;
    packageName?: string;
    complexity?: string;
    estimatedDuration?: string;
    originalService?: unknown;
}

interface Equipment {
    id: string;
    name: string;
    description: string;
    internet_link: string;
    purchase_price: number;
    sale_price: number;
    quantity: number;
    category: string;
    notes?: string;
}

interface Client {
    id: string;
    rut: string;
    name: string;
    email: string;
    phone: string;
    phone_country: string;
    address: string;
    region: string;
    commune: string;
    country: string;
    created_at: string;
}

interface QuoteForm {
    client_rut: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_phone_country: string;
    client_address: string;
    client_region: string;
    client_commune: string;
    client_country: string;
    project_title: string;
    project_description: string;
    selected_services: Service[];
    selected_equipment: Equipment[];
    total_amount: number;
    equipment_total: number;
    valid_until: string;
    notes: string;
    terms_conditions: string;
    discount_type: 'percentage' | 'amount' | 'none';
    discount_value: number;
    discount_description: string;
    validity_message: string; // Mensaje personalizado de validez para el PDF
}



const COUNTRY_CODES = [
    { code: "+56", name: "Chile", flag: "🇨🇱" },
    { code: "+54", name: "Argentina", flag: "🇦🇷" },
    { code: "+57", name: "Colombia", flag: "🇨🇴" },
    { code: "+52", name: "México", flag: "🇲🇽" },
    { code: "+51", name: "Perú", flag: "🇵🇪" },
    { code: "+593", name: "Ecuador", flag: "🇪🇨" },
    { code: "+58", name: "Venezuela", flag: "🇻🇪" },
    { code: "+595", name: "Paraguay", flag: "🇵🇾" },
    { code: "+598", name: "Uruguay", flag: "🇺🇾" },
    { code: "+591", name: "Bolivia", flag: "🇧🇴" },
    { code: "+1", name: "Estados Unidos", flag: "🇺🇸" },
    { code: "+34", name: "España", flag: "🇪🇸" },
    { code: "+33", name: "Francia", flag: "🇫🇷" },
    { code: "+49", name: "Alemania", flag: "🇩🇪" },
    { code: "+44", name: "Reino Unido", flag: "🇬🇧" },
    { code: "+39", name: "Italia", flag: "🇮🇹" },
    { code: "+55", name: "Brasil", flag: "🇧🇷" },
];

const SERVICE_CATEGORIES = {
    "desarrollo_web": {
        name: "Desarrollo Web",
        services: [
            {
                id: "desarrollo_pagina_web",
                name: "Desarrollo Página Web",
                description: "Desarrollo por página web",
                price: 25000,
                category: "desarrollo_web"
            },
            {
                id: "desarrollo_landing_page",
                name: "Desarrollo Landing Page",
                description: "Landing page profesional",
                price: 150000,
                category: "desarrollo_web"
            },
            {
                id: "desarrollo_sitio_corporativo",
                name: "Desarrollo Sitio Corporativo",
                description: "Sitio web corporativo completo",
                price: 800000,
                category: "desarrollo_web"
            },
            {
                id: "desarrollo_ecommerce",
                name: "Desarrollo E-commerce",
                description: "Tienda online completa",
                price: 1200000,
                category: "desarrollo_web"
            },
            {
                id: "desarrollo_cms_wordpress",
                name: "Desarrollo CMS WordPress",
                description: "Sistema de gestión de contenido",
                price: 400000,
                category: "desarrollo_web"
            },
            {
                id: "desarrollo_portal_web",
                name: "Desarrollo Portal Web",
                description: "Portal web empresarial",
                price: 2000000,
                category: "desarrollo_web"
            },
            {
                id: "desarrollo_cms_personalizado",
                name: "Desarrollo CMS Personalizado",
                description: "CMS personalizado a medida",
                price: 800000,
                category: "desarrollo_web"
            }
        ]
    },
    "desarrollo_mobile": {
        name: "Desarrollo Móvil",
        services: [
            {
                id: "desarrollo_app_movil_ios",
                name: "Desarrollo App iOS",
                description: "Aplicación móvil para iOS",
                price: 2500000,
                category: "desarrollo_mobile"
            },
            {
                id: "desarrollo_app_movil_android",
                name: "Desarrollo App Android",
                description: "Aplicación móvil para Android",
                price: 2200000,
                category: "desarrollo_mobile"
            },
            {
                id: "desarrollo_app_hibrida",
                name: "Desarrollo App Híbrida",
                description: "Aplicación móvil multiplataforma",
                price: 1800000,
                category: "desarrollo_mobile"
            },
            {
                id: "desarrollo_app_react_native",
                name: "Desarrollo App React Native",
                description: "Aplicación con React Native",
                price: 2000000,
                category: "desarrollo_mobile"
            },
            {
                id: "desarrollo_app_flutter",
                name: "Desarrollo App Flutter",
                description: "Aplicación con Flutter",
                price: 1900000,
                category: "desarrollo_mobile"
            },
            {
                id: "desarrollo_app_web_progressive",
                name: "Desarrollo App Web Progressive",
                description: "Aplicación web progresiva",
                price: 800000,
                category: "desarrollo_mobile"
            }
        ]
    },
    "desarrollo_backend": {
        name: "Desarrollo Backend",
        services: [
            {
                id: "desarrollo_api_rest",
                name: "Desarrollo API REST",
                description: "API REST completa",
                price: 600000,
                category: "desarrollo_backend"
            },
            {
                id: "desarrollo_api_graphql",
                name: "Desarrollo API GraphQL",
                description: "API GraphQL completa",
                price: 800000,
                category: "desarrollo_backend"
            },
            {
                id: "desarrollo_microservicios",
                name: "Desarrollo Microservicios",
                description: "Arquitectura de microservicios",
                price: 1200000,
                category: "desarrollo_backend"
            },
            {
                id: "desarrollo_backend_nodejs",
                name: "Desarrollo Backend Node.js",
                description: "Backend con Node.js",
                price: 500000,
                category: "desarrollo_backend"
            },
            {
                id: "desarrollo_backend_python",
                name: "Desarrollo Backend Python",
                description: "Backend con Python",
                price: 600000,
                category: "desarrollo_backend"
            },
            {
                id: "desarrollo_backend_java",
                name: "Desarrollo Backend Java",
                description: "Backend con Java",
                price: 800000,
                category: "desarrollo_backend"
            },
            {
                id: "desarrollo_backend_php",
                name: "Desarrollo Backend PHP",
                description: "Backend con PHP",
                price: 400000,
                category: "desarrollo_backend"
            }
        ]
    },
    "desarrollo_frontend": {
        name: "Desarrollo Frontend",
        services: [
            {
                id: "desarrollo_frontend_react",
                name: "Desarrollo Frontend React",
                description: "Frontend con React",
                price: 400000,
                category: "desarrollo_frontend"
            },
            {
                id: "desarrollo_frontend_vue",
                name: "Desarrollo Frontend Vue",
                description: "Frontend con Vue.js",
                price: 350000,
                category: "desarrollo_frontend"
            },
            {
                id: "desarrollo_frontend_angular",
                name: "Desarrollo Frontend Angular",
                description: "Frontend con Angular",
                price: 500000,
                category: "desarrollo_frontend"
            },
            {
                id: "diseño_ui_ux",
                name: "Diseño UI/UX",
                description: "Diseño de interfaz de usuario",
                price: 80000,
                category: "desarrollo_frontend"
            },
            {
                id: "diseño_prototipo",
                name: "Diseño de Prototipo",
                description: "Prototipo interactivo",
                price: 120000,
                category: "desarrollo_frontend"
            },
            {
                id: "diseño_sistema_design",
                name: "Diseño Sistema Design",
                description: "Sistema de diseño completo",
                price: 200000,
                category: "desarrollo_frontend"
            },
            {
                id: "diseño_logo_branding",
                name: "Diseño Logo y Branding",
                description: "Logo y identidad visual",
                price: 150000,
                category: "desarrollo_frontend"
            }
        ]
    },
    "integracion_automatizacion": {
        name: "Integración y Automatización",
        services: [
            {
                id: "integracion_api_terceros",
                name: "Integración API Terceros",
                description: "Integración con APIs externas",
                price: 400000,
                category: "integracion_automatizacion"
            },
            {
                id: "integracion_payment_gateway",
                name: "Integración Payment Gateway",
                description: "Integración de pasarela de pago",
                price: 300000,
                category: "integracion_automatizacion"
            },
            {
                id: "integracion_crm",
                name: "Integración CRM",
                description: "Integración con sistema CRM",
                price: 500000,
                category: "integracion_automatizacion"
            },
            {
                id: "integracion_erp",
                name: "Integración ERP",
                description: "Integración con sistema ERP",
                price: 800000,
                category: "integracion_automatizacion"
            },
            {
                id: "automatizacion_procesos",
                name: "Automatización de Procesos",
                description: "Automatización de procesos empresariales",
                price: 600000,
                category: "integracion_automatizacion"
            },
            {
                id: "desarrollo_bot_chat",
                name: "Desarrollo Bot Chat",
                description: "Chatbot inteligente",
                price: 300000,
                category: "integracion_automatizacion"
            },
            {
                id: "integracion_webhook",
                name: "Integración Webhook",
                description: "Integración de webhooks",
                price: 200000,
                category: "integracion_automatizacion"
            }
        ]
    },
    "testing_quality": {
        name: "Testing y Calidad",
        services: [
            {
                id: "testing_unitario",
                name: "Testing Unitario",
                description: "Pruebas unitarias",
                price: 150000,
                category: "testing_quality"
            },
            {
                id: "testing_integracion",
                name: "Testing de Integración",
                description: "Pruebas de integración",
                price: 250000,
                category: "testing_quality"
            },
            {
                id: "testing_automation",
                name: "Testing Automation",
                description: "Automatización de pruebas",
                price: 400000,
                category: "testing_quality"
            },
            {
                id: "testing_seguridad",
                name: "Testing de Seguridad",
                description: "Auditoría de seguridad",
                price: 500000,
                category: "testing_quality"
            },
            {
                id: "testing_performance",
                name: "Testing de Performance",
                description: "Pruebas de rendimiento",
                price: 300000,
                category: "testing_quality"
            },
            {
                id: "testing_usabilidad",
                name: "Testing de Usabilidad",
                description: "Pruebas de usabilidad",
                price: 200000,
                category: "testing_quality"
            }
        ]
    },
    "devops_deployment": {
        name: "DevOps y Deployment",
        services: [
            {
                id: "configuracion_ci_cd",
                name: "Configuración CI/CD",
                description: "Pipeline de integración continua",
                price: 400000,
                category: "devops_deployment"
            },
            {
                id: "configuracion_docker",
                name: "Configuración Docker",
                description: "Contenedores Docker",
                price: 250000,
                category: "devops_deployment"
            },
            {
                id: "configuracion_kubernetes",
                name: "Configuración Kubernetes",
                description: "Cluster de Kubernetes",
                price: 600000,
                category: "devops_deployment"
            },
            {
                id: "configuracion_jenkins",
                name: "Configuración Jenkins",
                description: "Servidor Jenkins",
                price: 300000,
                category: "devops_deployment"
            },
            {
                id: "deployment_produccion",
                name: "Deployment a Producción",
                description: "Despliegue en producción",
                price: 200000,
                category: "devops_deployment"
            },
            {
                id: "monitoreo_aplicacion",
                name: "Monitoreo de Aplicación",
                description: "Monitoreo y alertas",
                price: 150000,
                category: "devops_deployment"
            }
        ]
    },
    "soluciones_empresariales": {
        name: "Soluciones Empresariales",
        services: [
            {
                id: "desarrollo_erp_personalizado",
                name: "Desarrollo ERP Personalizado",
                description: "Sistema ERP a medida",
                price: 5000000,
                category: "soluciones_empresariales"
            },
            {
                id: "desarrollo_crm_personalizado",
                name: "Desarrollo CRM Personalizado",
                description: "Sistema CRM a medida",
                price: 3000000,
                category: "soluciones_empresariales"
            },
            {
                id: "desarrollo_sistema_inventario",
                name: "Desarrollo Sistema Inventario",
                description: "Sistema de gestión de inventario",
                price: 2000000,
                category: "soluciones_empresariales"
            },
            {
                id: "desarrollo_sistema_facturacion",
                name: "Desarrollo Sistema Facturación",
                description: "Sistema de facturación",
                price: 1500000,
                category: "soluciones_empresariales"
            },
            {
                id: "desarrollo_sistema_contabilidad",
                name: "Desarrollo Sistema Contabilidad",
                description: "Sistema de contabilidad",
                price: 1800000,
                category: "soluciones_empresariales"
            },
            {
                id: "desarrollo_sistema_rrhh",
                name: "Desarrollo Sistema RRHH",
                description: "Sistema de recursos humanos",
                price: 2500000,
                category: "soluciones_empresariales"
            }
        ]
    },
    "desarrollo_especializado": {
        name: "Desarrollo Especializado",
        services: [
            {
                id: "desarrollo_ia_machine_learning",
                name: "Desarrollo IA/Machine Learning",
                description: "Sistemas de inteligencia artificial",
                price: 3000000,
                category: "desarrollo_especializado"
            },
            {
                id: "desarrollo_blockchain",
                name: "Desarrollo Blockchain",
                description: "Aplicaciones blockchain",
                price: 2500000,
                category: "desarrollo_especializado"
            },
            {
                id: "desarrollo_iot",
                name: "Desarrollo IoT",
                description: "Sistemas de Internet de las Cosas",
                price: 1800000,
                category: "desarrollo_especializado"
            },
            {
                id: "desarrollo_realidad_aumentada",
                name: "Desarrollo Realidad Aumentada",
                description: "Aplicaciones de realidad aumentada",
                price: 2000000,
                category: "desarrollo_especializado"
            },
            {
                id: "desarrollo_chatbot_ai",
                name: "Desarrollo Chatbot AI",
                description: "Chatbot con inteligencia artificial",
                price: 800000,
                category: "desarrollo_especializado"
            },
            {
                id: "desarrollo_sistema_recomendacion",
                name: "Desarrollo Sistema Recomendación",
                description: "Sistema de recomendaciones",
                price: 1500000,
                category: "desarrollo_especializado"
            }
        ]
    },
    "consultoria_planificacion": {
        name: "Consultoría y Planificación",
        services: [
            {
                id: "consultoria_arquitectura",
                name: "Consultoría Arquitectura",
                description: "Consultoría en arquitectura de software",
                price: 150000,
                category: "consultoria_planificacion"
            },
            {
                id: "consultoria_tecnologia",
                name: "Consultoría Tecnología",
                description: "Consultoría en tecnologías",
                price: 120000,
                category: "consultoria_planificacion"
            },
            {
                id: "planificacion_proyecto",
                name: "Planificación de Proyecto",
                description: "Planificación y gestión de proyectos",
                price: 100000,
                category: "consultoria_planificacion"
            },
            {
                id: "analisis_requerimientos",
                name: "Análisis de Requerimientos",
                description: "Análisis y documentación de requerimientos",
                price: 80000,
                category: "consultoria_planificacion"
            },
            {
                id: "documentacion_tecnica",
                name: "Documentación Técnica",
                description: "Documentación técnica del proyecto",
                price: 60000,
                category: "consultoria_planificacion"
            },
            {
                id: "capacitacion_usuarios",
                name: "Capacitación de Usuarios",
                description: "Capacitación y entrenamiento",
                price: 80000,
                category: "consultoria_planificacion"
            }
        ]
    },
    "servicios_ti": {
        name: "Servicios TI",
        services: [
            {
                id: "instalacion_redes",
                name: "Instalación de Redes",
                description: "Instalación completa de infraestructura de red",
                price: 550000,
                category: "servicios_ti"
            },
            {
                id: "cableado_estructurado",
                name: "Cableado Estructurado",
                description: "Instalación de cableado estructurado para redes",
                price: 250000,
                category: "servicios_ti"
            },
            {
                id: "wifi_enterprise",
                name: "WiFi Enterprise",
                description: "Configuración de redes WiFi empresariales",
                price: 400000,
                category: "servicios_ti"
            },
            {
                id: "switches_enterprise",
                name: "Switches Enterprise",
                description: "Configuración y gestión de switches empresariales",
                price: 350000,
                category: "servicios_ti"
            },
            {
                id: "vpn_enterprise",
                name: "VPN Enterprise",
                description: "Configuración de redes privadas virtuales",
                price: 300000,
                category: "servicios_ti"
            },
            {
                id: "seguridad_red",
                name: "Seguridad de Red",
                description: "Implementación de medidas de seguridad de red",
                price: 500000,
                category: "servicios_ti"
            },
            {
                id: "monitoreo_red",
                name: "Monitoreo de Red",
                description: "Sistemas de monitoreo y alertas de red",
                price: 200000,
                category: "servicios_ti"
            },
            {
                id: "backup_enterprise",
                name: "Backup Enterprise",
                description: "Sistemas de respaldo y recuperación de datos",
                price: 250000,
                category: "servicios_ti"
            },
            {
                id: "voip_enterprise",
                name: "VoIP Enterprise",
                description: "Configuración de telefonía IP empresarial",
                price: 300000,
                category: "servicios_ti"
            },
            {
                id: "mantenimiento_sistemas",
                name: "Mantenimiento de Sistemas",
                description: "Mantenimiento preventivo y correctivo de sistemas",
                price: 150000,
                category: "servicios_ti"
            },
            {
                id: "consultoria_it",
                name: "Consultoría IT",
                description: "Asesoramiento en tecnología y estrategia digital",
                price: 120000,
                category: "servicios_ti"
            },
            {
                id: "soporte_tecnico",
                name: "Soporte Técnico",
                description: "Soporte técnico especializado",
                price: 80000,
                category: "servicios_ti"
            }
        ]
    }
};

export default function CreateQuotePage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [showGeoDropdown, setShowGeoDropdown] = useState(false);
    const [phoneValidation, setPhoneValidation] = useState({ isValid: false, message: "" });
    const [showCalculationModal, setShowCalculationModal] = useState(false);
    const [selectedServiceForCalculation, setSelectedServiceForCalculation] = useState<Service | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
    // === FLAGS DE EDICIÓN / EQUIPOS ===
    const [loadedFromDB, setLoadedFromDB] = useState(false);
    const [equipmentDirty, setEquipmentDirty] = useState(false);

    const [formData, setFormData] = useState<QuoteForm>({
        client_rut: "",
        client_name: "",
        client_email: "",
        client_phone: "",
        client_phone_country: "+56",
        client_address: "",
        client_region: "",
        client_commune: "",
        client_country: "", // Inicialmente vacío para forzar selección
        project_title: "",
        project_description: "",
        selected_services: [] as Service[],
        selected_equipment: [] as Equipment[],
        total_amount: 0,
        equipment_total: 0,
        valid_until: "",
        notes: "",
        terms_conditions: "",
        discount_type: 'none',
        discount_value: 0,
        discount_description: "",
        validity_message: "Cotización válida hasta \"{fecha}\" por disponibilidad de equipos y cambios en costos de procesos"
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Client[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [rutValidation, setRutValidation] = useState({ isValid: false, message: "" });

    // Estado para el formulario de equipos
    const [equipmentForm, setEquipmentForm] = useState({
        name: "",
        description: "",
        internet_link: "",
        category: "",
        purchase_price: "",
        sale_price: "",
        quantity: "1",
        notes: ""
    });

    // Estado para edición inline de equipos existentes
    const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
    const [equipmentEditForm, setEquipmentEditForm] = useState<Partial<Equipment>>({});

    const updateFormData = (field: keyof QuoteForm, value: unknown) => {
        console.log(`🔄 ACTUALIZANDO: ${field} =`, value);
        
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Guardar inmediatamente en sessionStorage
            try {
                sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
                console.log('💾 GUARDADO:', updated);
            } catch (error) {
                console.error('❌ ERROR GUARDANDO:', error);
            }
            setEquipmentDirty(true);

            return updated;
        });
    };

    // Función de debug para verificar el estado actual
    const debugFormData = () => {
        console.log('=== DEBUG FORM DATA ===');
        console.log('Estado actual de formData:', formData);
        console.log('SessionStorage:', sessionStorage.getItem('quoteFormData'));
        console.log('Servicios seleccionados:', formData.selected_services);
        console.log('Equipos seleccionados:', formData.selected_equipment);
        console.log('Total servicios:', formData.total_amount);
        console.log('Total equipos:', formData.equipment_total);
        console.log('Modo edición:', isEditMode);
        console.log('ID de cotización actual:', currentQuoteId);
        console.log('URL params:', window.location.search);
    };
    
    // Función para forzar recálculo manual
    const forceRecalculate = () => {
        console.log('🔄 FORZANDO RECÁLCULO MANUAL');
        recalculateTotals();
    };
    
    // Función para verificar modo edición
    const checkEditMode = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlEditMode = urlParams.get('edit') === 'true';
        const urlQuoteId = urlParams.get('id');
        const sessionEditMode = sessionStorage.getItem('editMode') === 'true';
        const sessionQuoteId = sessionStorage.getItem('editQuoteId');
        
        console.log('🔍 VERIFICACIÓN MANUAL DE MODO EDICIÓN:', {
            urlEditMode,
            urlQuoteId,
            sessionEditMode,
            sessionQuoteId,
            isEditMode,
            currentQuoteId,
            finalDecision: (urlEditMode && urlQuoteId) || (sessionEditMode && sessionQuoteId)
        });
    };



    // Función para limpiar todos los datos de la cotización
    const clearQuoteData = () => {
        // Limpiar sessionStorage
        sessionStorage.removeItem('quoteFormData');
        sessionStorage.removeItem('tiQuoteData');
        sessionStorage.removeItem('selectedTIService');
        sessionStorage.removeItem('originalTIService');
        
        // Resetear el formulario
        setFormData({
            client_rut: '',
            client_name: '',
            client_email: '',
            client_phone: '',
            client_phone_country: '+56',
            client_address: '',
            client_region: '',
            client_commune: '',
            client_country: '',
            project_title: '',
            project_description: '',
            selected_services: [],
            selected_equipment: [],
            total_amount: 0,
            equipment_total: 0,
            valid_until: '',
            notes: '',
            terms_conditions: '',
            discount_type: 'none',
            discount_value: 0,
            discount_description: '',
            validity_message: "Cotización válida hasta \"{fecha}\" por disponibilidad de equipos y cambios en costos de procesos"
        });
        
        // Resetear el paso actual
        setCurrentStep(1);
        
        console.log('🗑️ Todos los datos de la cotización han sido limpiados');
    };

    // Función para limpiar datos solo para nueva cotización real
    const clearForNewQuote = () => {
        console.log('🆕 LIMPIANDO PARA NUEVA COTIZACIÓN REAL');
        clearQuoteData();
        
        // Limpiar modo edición
        sessionStorage.removeItem('editMode');
        sessionStorage.removeItem('editQuoteId');
        setIsEditMode(false);
        setCurrentQuoteId(null);
    };

    // Función para confirmar cancelación
    const confirmCancelQuote = () => {
        const hasData = formData.client_name || formData.client_rut || formData.project_title || 
                       formData.selected_services.length > 0 || formData.selected_equipment.length > 0;
        
        if (hasData) {
            const confirmed = window.confirm(
                '⚠️ ¿Estás seguro de que deseas cancelar esta cotización?\n\n' +
                'Se eliminarán todos los datos ingresados:\n' +
                '• Datos del cliente\n' +
                '• Servicios seleccionados\n' +
                '• Equipos seleccionados\n' +
                '• Cálculos realizados\n\n' +
                'Esta acción no se puede deshacer.'
            );
            
            if (confirmed) {
                clearQuoteData();
                // Redirigir a la lista de cotizaciones
                router.push('/admin/quotes');
            }
        } else {
            // Si no hay datos, ir directamente a la lista
            router.push('/admin/quotes');
        }
    };

    const addService = (service: Service) => {
        console.log('➕ AGREGANDO SERVICIO:', service);
        
        setFormData(prev => {
            if (prev.selected_services.find(s => s.id === service.id)) {
                console.log('⚠️ Servicio ya existe');
                return prev;
            }
            
            const newServices = [...prev.selected_services, service];
            
            const updated = {
                ...prev,
                selected_services: newServices
            };
            
            // Guardar inmediatamente
            sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
            console.log('✅ SERVICIO AGREGADO:', updated);
            setEquipmentDirty(true);

            return updated;
        });
        
        // Recalcular totales después de agregar
        setTimeout(() => recalculateTotals(), 0);
    };

    // Función para limpiar todos los servicios seleccionados
    const clearAllServices = () => {
        updateFormData('selected_services', []);
        updateFormData('total_amount', 0);
        console.log('Todos los servicios han sido limpiados');
    };

    // Función para agregar paquete (reemplaza servicios existentes)
    const addPackage = (packageServices: Service[]) => {
        console.log('📦 AGREGANDO PAQUETE:', packageServices);
        
        setFormData(prev => {
            const updated = {
                ...prev,
                selected_services: packageServices
            };
            
            // Guardar inmediatamente
            sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
            console.log('✅ PAQUETE AGREGADO:', updated);
            setEquipmentDirty(true);

            return updated;
        });
        
        // Recalcular totales después de agregar paquete
        setTimeout(() => recalculateTotals(), 0);
    };

    const toggleService = (service: Service) => {
        console.log('🔄 toggleService llamado para:', service.name, 'ID:', service.id);
        
        // Mejorar la lógica de comparación para servicios editados
        const isSelected = formData.selected_services.find(s => {
            // Comparar por ID exacto
            if (s.id === service.id) return true;
            // Comparar por nombre si los IDs no coinciden (para servicios editados)
            if (s.name === service.name && s.category === service.category) return true;
            return false;
        });
        
        console.log('🔍 Servicio encontrado como seleccionado:', isSelected ? 'SÍ' : 'NO');
        
        if (isSelected) {
            console.log('❌ Removiendo servicio:', service.name);
            removeService(service.id);
        } else {
            console.log('➕ Agregando servicio:', service.name);
            
            // Para servicios TI, permitir agregar directamente si ya tiene precio
            if (service.category === 'servicios_ti') {
                if (service.price && service.price > 0) {
                    // Si ya tiene precio, agregarlo directamente
                    addService(service);
                } else {
                    // Si no tiene precio, redirigir al sistema granular
                    sessionStorage.setItem('selectedTIService', JSON.stringify(service));
                    sessionStorage.setItem('quoteFormData', JSON.stringify(formData));
                    
                    // Preservar parámetros de edición si estamos en modo edición
                    const urlParams = new URLSearchParams(window.location.search);
                    const editMode = urlParams.get('edit');
                    const quoteId = urlParams.get('id');
                    
                    console.log('🔍 DEBUG NAVEGACIÓN A TI-SERVICES:');
                    console.log('- URL actual:', window.location.href);
                    console.log('- editMode detectado:', editMode);
                    console.log('- quoteId detectado:', quoteId);
                    console.log('- isEditMode state:', isEditMode);
                    console.log('- currentQuoteId state:', currentQuoteId);
                    
                    let tiServicesUrl = '/admin/ti-services';
                    if (editMode === 'true' && quoteId) {
                        tiServicesUrl += `?edit=true&id=${quoteId}`;
                        console.log('🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE EDICIÓN:', { editMode, quoteId });
                    } else if (isEditMode && currentQuoteId) {
                        // Fallback: usar el estado si los parámetros de URL no están disponibles
                        tiServicesUrl += `?edit=true&id=${currentQuoteId}`;
                        console.log('🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE ESTADO:', { editMode: 'true', quoteId: currentQuoteId });
                    } else {
                        console.log('⚠️ NO SE DETECTARON PARÁMETROS DE EDICIÓN');
                    }
                    
                    router.push(tiServicesUrl);
                    return;
                }
            } else {
                // Para otros servicios, usar el sistema de cálculo
                if ((service as any).calculatedPrice) {
                    addService(service);
                } else {
                    // Si no tiene precio calculado, abrir el modal de cálculo
                    openCalculationModal(service);
                }
            }
        }
    };

    const removeService = (serviceId: string) => {
        const newServices = formData.selected_services.filter(s => s.id !== serviceId);
        updateFormData('selected_services', newServices);
        // Recalcular totales después de remover
        setTimeout(() => recalculateTotals(), 0);
    };

    const getCurrentCurrency = () => {
        return getCurrencyByCountry(formData.client_country);
    };

    const formatCurrencyLocal = (amount: number) => {
        return formatEquipmentPrice(amount, formData.client_country);
    };

    // Función para calcular el descuento
    const calculateDiscount = () => {
        const subtotal = (formData.total_amount || 0) + (formData.equipment_total || 0);
        
        if (formData.discount_type === 'percentage' && formData.discount_value > 0) {
            return (subtotal * formData.discount_value) / 100;
        } else if (formData.discount_type === 'amount' && formData.discount_value > 0) {
            return formData.discount_value;
        }
        return 0;
    };

    // Función para calcular el total final con descuento
    const calculateFinalTotal = () => {
        const subtotal = (formData.total_amount || 0) + (formData.equipment_total || 0);
        const discount = calculateDiscount();
        return subtotal - discount;
    };

    // Función para calcular el IVA (19%)
    const calculateIVA = () => {
        const subtotal = (formData.total_amount || 0) + (formData.equipment_total || 0);
        const discount = calculateDiscount();
        const totalSinIVA = subtotal - discount;
        return totalSinIVA * 0.19;
    };

    // Función para calcular el total final con IVA
    const calculateTotalWithIVA = () => {
        const subtotal = (formData.total_amount || 0) + (formData.equipment_total || 0);
        const discount = calculateDiscount();
        const totalSinIVA = subtotal - discount;
        const iva = totalSinIVA * 0.19;
        return totalSinIVA + iva;
    };

    const validatePhoneNumber = (phone: string, countryCode: string) => {
        // Remover espacios y caracteres especiales
        const cleanPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
        
        // Validaciones específicas por país
        if (countryCode === "+56") { // Chile
            // Números chilenos: 9 dígitos para móviles, 8 para fijos
            const mobilePattern = /^9[0-9]{8}$/;
            const landlinePattern = /^[2-9][0-9]{7}$/;
            
            if (mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone)) {
                return { isValid: true, message: "Número válido" };
            } else {
                return { isValid: false, message: "Número chileno inválido (móvil: 9 dígitos, fijo: 8 dígitos)" };
            }
        } else if (countryCode === "+54") { // Argentina
            const pattern = /^[0-9]{10,11}$/;
            if (pattern.test(cleanPhone)) {
                return { isValid: true, message: "Número válido" };
            } else {
                return { isValid: false, message: "Número argentino inválido (10-11 dígitos)" };
            }
        } else if (countryCode === "+57") { // Colombia
            const pattern = /^[0-9]{10}$/;
            if (pattern.test(cleanPhone)) {
                return { isValid: true, message: "Número válido" };
            } else {
                return { isValid: false, message: "Número colombiano inválido (10 dígitos)" };
            }
        } else {
            // Validación general para otros países
            const pattern = /^[0-9]{7,15}$/;
            if (pattern.test(cleanPhone)) {
                return { isValid: true, message: "Número válido" };
            } else {
                return { isValid: false, message: "Número inválido (7-15 dígitos)" };
            }
        }
    };

    const handlePhoneChange = (phone: string) => {
        updateFormData('client_phone', phone);
        const validation = validatePhoneNumber(phone, formData.client_phone_country);
        setPhoneValidation(validation);
    };

    const validateRut = (rut: string) => {
        // Limpiar el RUT de puntos y guión
        const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');
        
        // Verificar longitud mínima (8 dígitos: 7 números + 1 dígito verificador)
        if (cleanRut.length < 8) {
            return { isValid: false, message: "RUT incompleto (faltan dígitos)" };
        }
        
        // Verificar longitud máxima (9 dígitos: 8 números + 1 dígito verificador)
        if (cleanRut.length > 9) {
            return { isValid: false, message: "RUT demasiado largo" };
        }
        
        // Separar número y dígito verificador
        const number = cleanRut.slice(0, -1);
        const dv = cleanRut.slice(-1).toUpperCase();
        
        // Verificar que el número solo contenga dígitos y tenga la longitud correcta
        if (!/^\d+$/.test(number) || number.length < 7 || number.length > 8) {
            return { isValid: false, message: "Número de RUT inválido" };
        }
        
        // Verificar que el dígito verificador sea válido
        if (!/^[0-9kK]$/.test(dv)) {
            return { isValid: false, message: "Dígito verificador inválido" };
        }
        
        // Solo validar si el RUT está completo (8 o 9 dígitos)
        if (cleanRut.length >= 8) {
            // Calcular dígito verificador
            let sum = 0;
            let multiplier = 2;
            
            for (let i = number.length - 1; i >= 0; i--) {
                sum += parseInt(number[i]) * multiplier;
                multiplier = multiplier === 7 ? 2 : multiplier + 1;
            }
            
            const expectedDv = 11 - (sum % 11);
            const calculatedDv = expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : expectedDv.toString();
            
            if (calculatedDv === dv) {
                return { isValid: true, message: "RUT válido" };
            } else {
                return { isValid: false, message: "Dígito verificador incorrecto" };
            }
        }
        
        // Si no está completo, no mostrar error pero tampoco validar como correcto
        return { isValid: false, message: "RUT incompleto" };
    };

    const formatRut = (rut: string) => {
        // Remover todos los caracteres no numéricos excepto 'k' y 'K'
        let cleanRut = rut.replace(/[^0-9kK]/g, '');
        
        if (cleanRut.length === 0) return '';
        
        // Convertir a mayúscula
        cleanRut = cleanRut.toUpperCase();
        
        // Si tiene menos de 2 caracteres, solo retornar el número
        if (cleanRut.length < 2) {
            return cleanRut;
        }
        
        // Separar número y dígito verificador
        const number = cleanRut.slice(0, -1);
        const dv = cleanRut.slice(-1);
        
        // Formatear número con puntos
        let formattedNumber = '';
        for (let i = number.length - 1, j = 0; i >= 0; i--, j++) {
            if (j > 0 && j % 3 === 0) {
                formattedNumber = '.' + formattedNumber;
            }
            formattedNumber = number[i] + formattedNumber;
        }
        
        // Solo agregar guión si hay al menos un dígito verificador
        if (cleanRut.length >= 2) {
            return formattedNumber + '-' + dv;
        }
        
        return formattedNumber;
    };

    const handleRutChange = (rut: string) => {
        const formattedRut = formatRut(rut);
        updateFormData('client_rut', formattedRut);
        const validation = validateRut(formattedRut);
        setRutValidation(validation);
    };

    const handleRutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Permitir solo números, 'k', 'K', backspace, delete, tab, enter, arrow keys
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        const allowedChars = /[0-9kK]/;
        
        if (!allowedKeys.includes(e.key) && !allowedChars.test(e.key)) {
            e.preventDefault();
        }
    };

    // Fallback: si no existe tabla `clients`, buscar en `quotes` y armar clientes únicos
    const searchClientsFromQuotes = async (term: string) => {
        const { data, error } = await supabase
            .from("quotes")
            .select("client_rut, client_name, client_email, client_phone, client_phone_country, client_address, client_region, client_commune, client_country")
            .or(`client_rut.ilike.%${term}%,client_name.ilike.%${term}%,client_email.ilike.%${term}%`)
            .limit(50);

        if (error) throw error;
        // Deduplicar por RUT o email
        const uniqueMap = new Map<string, any>();
        (data || []).forEach((row) => {
            const key = row.client_rut || row.client_email || `${row.client_name}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, {
                    id: key,
                    rut: row.client_rut || "",
                    name: row.client_name || "",
                    email: row.client_email || "",
                    phone: row.client_phone || "",
                    phone_country: row.client_phone_country || "",
                    address: row.client_address || "",
                    region: row.client_region || "",
                    commune: row.client_commune || "",
                    country: row.client_country || "",
                });
            }
        });
        return Array.from(uniqueMap.values());
    };

    const searchClients = async (term: string) => {
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .or(`rut.ilike.%${term}%,name.ilike.%${term}%,email.ilike.%${term}%`)
                .limit(10);

            if (error) {
                // Si la tabla no existe, intentar fallback desde `quotes`
                // Postgres error 42P01: relation does not exist
                if ((error as any).code === '42P01') {
                    const fallback = await searchClientsFromQuotes(term);
                    setSearchResults(fallback);
                    return;
                }
                throw error;
            }
            // Si existe tabla pero viene vacía, intentar fallback para aprovechar históricos
            if (!data || data.length === 0) {
                const fallback = await searchClientsFromQuotes(term);
                setSearchResults(fallback);
                return;
            }
            setSearchResults(data || []);
        } catch (error) {
            console.error("Error buscando clientes:", error);
            // Último intento: fallback desde quotes
            try {
                const fallback = await searchClientsFromQuotes(term);
                setSearchResults(fallback);
            } catch (e) {
            setSearchResults([]);
            }
        }
    };

    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
        searchClients(term);
        setShowSearchResults(true);
    };

    const selectClient = (client: Client) => {
        updateFormData('client_rut', client.rut);
        updateFormData('client_name', client.name);
        updateFormData('client_email', client.email);
        updateFormData('client_phone', client.phone);
        updateFormData('client_phone_country', client.phone_country);
        updateFormData('client_address', client.address);
        updateFormData('client_region', client.region);
        updateFormData('client_commune', client.commune);
        updateFormData('client_country', client.country);
        
        setSearchTerm("");
        setSearchResults([]);
        setShowSearchResults(false);
    };

    const handleCountryChange = (countryCode: string) => {
        updateFormData('client_phone_country', countryCode);
        setShowCountryDropdown(false);
        // Re-validar el número con el nuevo código de país
        if (formData.client_phone) {
            const validation = validatePhoneNumber(formData.client_phone, countryCode);
            setPhoneValidation(validation);
        }
    };

    const handleGeoCountryChange = (countryCode: string) => {
        console.log('🌍 Seleccionando país:', countryCode);
        const country = COMPLETE_GEO_DATA.find(c => c.code === countryCode);
        if (country) {
            console.log('✅ País encontrado:', country.name);
            updateFormData('client_country', country.name);
            updateFormData('client_region', '');
            updateFormData('client_commune', '');
        } else {
            console.log('❌ País no encontrado para código:', countryCode);
        }
        setShowGeoDropdown(false);
    };

    const openCalculationModal = (service: Service) => {
        setSelectedServiceForCalculation(service);
        setShowCalculationModal(true);
    };

    const calculateServiceWithParams = async (params: CalculationParams) => {
        if (!selectedServiceForCalculation) return;

        try {
            const calculation = await calculateServicePrice(selectedServiceForCalculation.id, {
                ...params,
                country: formData.client_country,
                location: formData.client_region
            });

            // Actualizar el servicio con el precio calculado
            const updatedService = {
                ...selectedServiceForCalculation,
                price: calculation.totalPrice,
                calculationParams: params,
                calculatedPrice: calculation
            };

            // Verificar si el servicio ya está en la lista seleccionada
            const existingServiceIndex = formData.selected_services.findIndex(s => s.id === selectedServiceForCalculation.id);
            
            if (existingServiceIndex >= 0) {
                // Actualizar servicio existente usando la nueva función
                updateService(selectedServiceForCalculation.id, updatedService);
            } else {
                // Agregar nuevo servicio
                addService(updatedService);
            }

            setShowCalculationModal(false);
            setSelectedServiceForCalculation(null);
        } catch (error) {
            console.error("Error calculando precio:", error);
        }
    };

    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        console.log('🖱️ Click fuera detectado, target:', target);
        console.log('🔍 Verificando country-dropdown:', target.closest('.country-dropdown'));
        console.log('🔍 Verificando geo-dropdown:', target.closest('.geo-dropdown'));
        
        if (!target.closest('.country-dropdown')) {
            console.log('❌ Cerrando country dropdown');
            setShowCountryDropdown(false);
        }
        if (!target.closest('.geo-dropdown')) {
            console.log('❌ Cerrando geo dropdown');
            setShowGeoDropdown(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // CARGA AUTORITATIVA DESDE DB EN MODO EDICIÓN
    useEffect(() => {
        const url = new URLSearchParams(window.location.search);
        const isEdit = url.get('edit') === 'true';
        const quoteId = url.get('id');
    
        if (!isEdit || !quoteId) return;
    
        (async () => {
        try {
            const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("id", quoteId)
            .single();
    
            if (error) throw error;
    
            const formDataFromQuote: QuoteForm = {
            client_rut: data.client_rut || '',
            client_name: data.client_name || '',
            client_email: data.client_email || '',
            client_phone: (data.client_phone || '').replace(data.client_phone_country || '', '').trim(),
            client_phone_country: data.client_phone_country || '+56',
            client_address: data.client_address || '',
            client_region: data.client_region || '',
            client_commune: data.client_commune || '',
            client_country: data.client_country || '',
            project_title: data.project_title || '',
            project_description: data.project_description || '',
            selected_services: Array.isArray(data.services) ? data.services : [],
            selected_equipment: Array.isArray(data.equipment) ? data.equipment : [],
            total_amount: data.total_amount || 0,
            equipment_total: data.equipment_total || 0,
            valid_until: data.valid_until || '',
            notes: data.notes || '',
            terms_conditions: data.terms_conditions || '',
            discount_type: data.discount_type || 'none',
            discount_value: data.discount_value || 0,
            discount_description: data.discount_description || '',
            validity_message: data.validity_message || 'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos'
            };
    
            setFormData(formDataFromQuote);
            setIsEditMode(true);
            setCurrentQuoteId(quoteId);
            setCurrentStep(4);
            setLoadedFromDB(true);
    
            // persistir para no perder al navegar
            sessionStorage.setItem('quoteFormData', JSON.stringify(formDataFromQuote));
            sessionStorage.setItem('editMode', 'true');
            sessionStorage.setItem('editQuoteId', quoteId);
            // limpiar posibles restos de otras pantallas
            sessionStorage.removeItem('editQuoteData');
            sessionStorage.removeItem('viewQuoteData');
        } catch (e) {
            console.error('❌ Error cargando cotización desde DB:', e);
        }
        })();
    }, []);
  

    // SIMPLE DATA RESTORATION - NO COMPLEXITY
    useEffect(() => {
        if (loadedFromDB) return; // ya cargado desde DB, no tocar

        console.log('🚀 INICIANDO RESTAURACIÓN DE DATOS');
        
        // 1. Check for edit/view data first
        const editQuoteData = sessionStorage.getItem('editQuoteData');
        const viewQuoteData = sessionStorage.getItem('viewQuoteData');
        
                    if (editQuoteData) {
                console.log('📝 MODO EDICIÓN DETECTADO');
                try {
                    const quoteData = JSON.parse(editQuoteData);
                    const formDataFromQuote = {
                        client_rut: quoteData.client_rut || '',
                        client_name: quoteData.client_name || '',
                        client_email: quoteData.client_email || '',
                        client_phone: quoteData.client_phone?.replace(quoteData.client_phone_country || '', '').trim() || '',
                        client_phone_country: quoteData.client_phone_country || '+56',
                        client_address: quoteData.client_address || '',
                        client_region: quoteData.client_region || '',
                        client_commune: quoteData.client_commune || '',
                        client_country: quoteData.client_country || '',
                        project_title: quoteData.project_title || '',
                        project_description: quoteData.project_description || '',
                        selected_services: Array.isArray(quoteData.selected_services) ? quoteData.selected_services : 
                                       Array.isArray(quoteData.services) ? quoteData.services : [],
                        selected_equipment: Array.isArray(quoteData.selected_equipment) ? quoteData.selected_equipment : 
                                         Array.isArray(quoteData.equipment) ? quoteData.equipment : [],
                        total_amount: quoteData.total_amount || 0,
                        equipment_total: quoteData.equipment_total || 0,
                        valid_until: quoteData.valid_until || '',
                        notes: quoteData.notes || '',
                        terms_conditions: quoteData.terms_conditions || '',
                        discount_type: quoteData.discount_type || 'none',
                        discount_value: quoteData.discount_value || 0,
                        discount_description: quoteData.discount_description || '',
                        validity_message: quoteData.validity_message || "Cotización válida hasta \"{fecha}\" por disponibilidad de equipos y cambios en costos de procesos"
                    };
                
                setFormData(formDataFromQuote);
                setIsEditMode(true);
                setCurrentQuoteId(quoteData.id);
                setCurrentStep(4);
                sessionStorage.removeItem('editQuoteData');
                console.log('✅ DATOS DE EDICIÓN CARGADOS:', formDataFromQuote);
                console.log('🔧 EQUIPOS CARGADOS EN EDICIÓN:', formDataFromQuote.selected_equipment);
                console.log('🔧 TOTAL EQUIPOS EN EDICIÓN:', formDataFromQuote.equipment_total);
                return;
            } catch (error) {
                console.error('❌ Error en modo edición:', error);
            }
        }
        
        if (viewQuoteData) {
            console.log('👁️ MODO VISUALIZACIÓN DETECTADO');
            try {
                const quoteData = JSON.parse(viewQuoteData);
                const formDataFromQuote = {
                    client_rut: quoteData.client_rut || '',
                    client_name: quoteData.client_name || '',
                    client_email: quoteData.client_email || '',
                    client_phone: quoteData.client_phone?.replace(quoteData.client_phone_country || '', '').trim() || '',
                    client_phone_country: quoteData.client_phone_country || '+56',
                    client_address: quoteData.client_address || '',
                    client_region: quoteData.client_region || '',
                    client_commune: quoteData.client_commune || '',
                    client_country: quoteData.client_country || '',
                    project_title: quoteData.project_title || '',
                    project_description: quoteData.project_description || '',
                    selected_services: Array.isArray(quoteData.selected_services) ? quoteData.selected_services : 
                                   Array.isArray(quoteData.services) ? quoteData.services : [],
                    selected_equipment: Array.isArray(quoteData.selected_equipment) ? quoteData.selected_equipment : 
                                     Array.isArray(quoteData.equipment) ? quoteData.equipment : [],
                    total_amount: quoteData.total_amount || 0,
                    equipment_total: quoteData.equipment_total || 0,
                    valid_until: quoteData.valid_until || '',
                    notes: quoteData.notes || '',
                    terms_conditions: quoteData.terms_conditions || '',
                    discount_type: quoteData.discount_type || 'none',
                    discount_value: quoteData.discount_value || 0,
                    discount_description: quoteData.discount_description || '',
                    validity_message: quoteData.validity_message || "Cotización válida hasta \"{fecha}\" por disponibilidad de equipos y cambios en costos de procesos"
                };
                
                setFormData(formDataFromQuote);
                setIsViewMode(true);
                setCurrentQuoteId(quoteData.id);
                setCurrentStep(4);
                sessionStorage.removeItem('viewQuoteData');
                console.log('✅ DATOS DE VISUALIZACIÓN CARGADOS:', formDataFromQuote);
                return;
            } catch (error) {
                console.error('❌ Error en modo visualización:', error);
            }
        }

        // 2. Check for saved form data - ONLY if not a real new quote
        const urlParams = new URLSearchParams(window.location.search);
        const isRealNewQuote = !editQuoteData && !viewQuoteData && !urlParams.get('edit') && !urlParams.get('view') && !urlParams.get('step');
        
        if (isRealNewQuote) {
            console.log('🆕 NUEVA COTIZACIÓN REAL - LIMPIANDO TODO');
            sessionStorage.removeItem('quoteFormData');
            sessionStorage.removeItem('tiQuoteData');
            sessionStorage.removeItem('originalTIService');
            sessionStorage.removeItem('selectedTIService');
        } else {
            // Solo cargar datos guardados si NO estamos en modo edición o visualización
            if (!editQuoteData && !viewQuoteData) {
                const savedFormData = sessionStorage.getItem('quoteFormData');
                if (savedFormData) {
                    console.log('💾 DATOS GUARDADOS ENCONTRADOS');
                    try {
                        const restoredData = JSON.parse(savedFormData);
                        console.log('🔧 EQUIPOS EN DATOS RESTAURADOS:', restoredData.selected_equipment);
                        console.log('🔧 TOTAL EQUIPOS EN DATOS RESTAURADOS:', restoredData.equipment_total);
                        
                        // VERIFICAR SI LOS DATOS RESTAURADOS ESTÁN VACÍOS Y ESTAMOS EN MODO EDICIÓN
                        const urlParams = new URLSearchParams(window.location.search);
                        const urlEditMode = urlParams.get('edit') === 'true';
                        const urlQuoteId = urlParams.get('id');
                        
                        if (urlEditMode && urlQuoteId && (!restoredData.selected_equipment || restoredData.selected_equipment.length === 0)) {
                            console.log('🔒 DETECTADO: Datos vacíos en sessionStorage pero estamos en modo edición');
                            console.log('🔒 NO SOBRESCRIBIENDO formData con datos vacíos');
                            return; // NO SOBRESCRIBIR EL FORM DATA
                        }
                        
                        setFormData(restoredData);
                        console.log('✅ DATOS RESTAURADOS:', restoredData);
                    } catch (error) {
                        console.error('❌ Error restaurando datos:', error);
                    }
                } else {
                    console.log('📝 CONTINUANDO COTIZACIÓN - SIN DATOS PREVIOS');
                }
            } else {
                console.log('🔒 MODO EDICIÓN/VISUALIZACIÓN - NO CARGAR DATOS GUARDADOS');
            }
        }
        
        // 3. SI ESTAMOS EN MODO EDICIÓN, RECARGAR TODO DESDE SUPABASE
        const urlEditMode = urlParams.get('edit') === 'true';
        const urlQuoteId = urlParams.get('id');
        
        if ((urlEditMode || isEditMode) && (urlQuoteId || currentQuoteId)) {
            const quoteId = urlQuoteId || currentQuoteId;
            console.log('🔒 MODO EDICIÓN DETECTADO - RECARGANDO DESDE SUPABASE:', quoteId);
            
            // Limpiar datos TI
            sessionStorage.removeItem('tiQuoteData');
            sessionStorage.removeItem('originalTIService');
            sessionStorage.removeItem('selectedTIService');
            
            // Recargar desde Supabase
            (async () => {
                try {
                    const { data: quoteData, error } = await supabase
                        .from("quotes")
                        .select("*")
                        .eq("id", quoteId)
                        .single();
                    
                    if (error) throw error;
                    
                    const formDataFromQuote: QuoteForm = {
                        client_rut: quoteData.client_rut || '',
                        client_name: quoteData.client_name || '',
                        client_email: quoteData.client_email || '',
                        client_phone: (quoteData.client_phone || '').replace(quoteData.client_phone_country || '', '').trim(),
                        client_phone_country: quoteData.client_phone_country || '+56',
                        client_address: quoteData.client_address || '',
                        client_region: quoteData.client_region || '',
                        client_commune: quoteData.client_commune || '',
                        client_country: quoteData.client_country || '',
                        project_title: quoteData.project_title || '',
                        project_description: quoteData.project_description || '',
                        selected_services: Array.isArray(quoteData.services) ? quoteData.services : [],
                        selected_equipment: Array.isArray(quoteData.equipment) ? quoteData.equipment : [],
                        total_amount: quoteData.total_amount || 0,
                        equipment_total: quoteData.equipment_total || 0,
                        valid_until: quoteData.valid_until || '',
                        notes: quoteData.notes || '',
                        terms_conditions: quoteData.terms_conditions || '',
                        discount_type: quoteData.discount_type || 'none',
                        discount_value: quoteData.discount_value || 0,
                        discount_description: quoteData.discount_description || '',
                        validity_message: quoteData.validity_message || 'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos'
                    };
                    
                    setFormData(formDataFromQuote);
                    setIsEditMode(true);
                    setCurrentQuoteId(quoteId);
                    sessionStorage.setItem('quoteFormData', JSON.stringify(formDataFromQuote));
                    
                    console.log('✅ DATOS RECARGADOS DESDE SUPABASE:', formDataFromQuote);
                    
                } catch (e) {
                    console.error('❌ Error recargando desde Supabase:', e);
                }
            })();
        } else {
            // Limpiar datos TI para nuevas cotizaciones
            sessionStorage.removeItem('tiQuoteData');
            sessionStorage.removeItem('originalTIService');
            sessionStorage.removeItem('selectedTIService');
        }

        console.log('🏁 RESTAURACIÓN COMPLETADA');
    }, []);

    // Handle URL step parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const stepParam = urlParams.get('step');
        if (stepParam) {
            const step = parseInt(stepParam);
            if (step >= 1 && step <= 3) {
                setCurrentStep(step);
                console.log('Paso establecido desde URL:', step);
            }
        }
        
        // Verificar si hay datos TI cuando cambia la URL (cuando regresas de la página TI)
        const tiQuoteData = sessionStorage.getItem('tiQuoteData');
        if (tiQuoteData) {
            console.log('🔄 DETECTADO REGRESO DE PÁGINA TI - VERIFICANDO DATOS');
            try {
                const updatedData = JSON.parse(tiQuoteData);
                console.log('🔄 DATOS TI ENCONTRADOS AL REGRESAR:', updatedData);
                
                // Actualizar servicios TI específicamente
                if (updatedData.selected_services && updatedData.selected_services.length > 0) {
                    updatedData.selected_services.forEach((service: any) => {
                        if (service.category === 'servicios_ti') {
                            console.log('🔄 ACTUALIZANDO SERVICIO TI AL REGRESAR:', service);
                            updateTIService(service as Service);
                        }
                    });
                }
                
                // Limpiar los datos TI del sessionStorage
                sessionStorage.removeItem('tiQuoteData');
                sessionStorage.removeItem('originalTIService');
                sessionStorage.removeItem('selectedTIService');
                
                console.log('✅ SERVICIOS TI ACTUALIZADOS AL REGRESAR');
            } catch (error) {
                console.error('❌ Error procesando datos TI al regresar:', error);
            }
        }
    }, [typeof window !== 'undefined' ? window.location.search : '']);

    // Auto-select category when services are already selected (for editing)
    useEffect(() => {
        console.log('🔍 useEffect - Verificando servicios seleccionados:', formData.selected_services.length);
        console.log('🔍 useEffect - Categoría actual:', selectedCategory);
        console.log('🔍 useEffect - Servicios:', formData.selected_services);
        
        if (formData.selected_services.length > 0 && !selectedCategory) {
            // Get the category of the first selected service
            const firstServiceCategory = formData.selected_services[0].category;
            console.log('🔍 Auto-seleccionando categoría:', firstServiceCategory, 'para servicios existentes');
            setSelectedCategory(firstServiceCategory);
        }
    }, [formData.selected_services, selectedCategory]);

    // Verificar y restaurar modo edición después de procesar tiQuoteData
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlEditMode = urlParams.get('edit') === 'true';
        const urlQuoteId = urlParams.get('id');
        
        // También verificar sessionStorage para modo edición
        const sessionEditMode = sessionStorage.getItem('editMode') === 'true';
        const sessionQuoteId = sessionStorage.getItem('editQuoteId');
        
        if ((urlEditMode && urlQuoteId) || (sessionEditMode && sessionQuoteId)) {
            const quoteId = urlQuoteId || sessionQuoteId;
            if (quoteId) {
                console.log('🔒 VERIFICACIÓN POST-TI: Restaurando modo edición:', { 
                    urlEditMode, 
                    urlQuoteId, 
                    sessionEditMode, 
                    sessionQuoteId,
                    isEditMode, 
                    currentQuoteId,
                    finalQuoteId: quoteId
                });
                setIsEditMode(true);
                setCurrentQuoteId(quoteId);
                
                // Persistir en sessionStorage
                sessionStorage.setItem('editMode', 'true');
                sessionStorage.setItem('editQuoteId', quoteId as string);
            }
        }
    }, [formData.selected_services, isEditMode, currentQuoteId]);

    // Recalcular totales cuando se cargan datos en modo edición
    useEffect(() => {
        if (isEditMode && loadedFromDB && (formData.selected_services.length > 0 || formData.selected_equipment.length > 0)) {
            console.log('🔄 RECALCULANDO TOTALES EN MODO EDICIÓN');
            setTimeout(() => recalculateTotals(), 200);
        }
    }, [isEditMode, loadedFromDB, formData.selected_services.length, formData.selected_equipment.length]);

    // Recalcular totales cuando cambian los servicios o equipos
    useEffect(() => {
        if (formData.selected_services.length > 0 || formData.selected_equipment.length > 0) {
            console.log('🔄 SERVICIOS O EQUIPOS CAMBIARON - RECALCULANDO TOTALES');
            console.log('Servicios actuales:', formData.selected_services);
            console.log('Equipos actuales:', formData.selected_equipment);
            
            // Recalcular inmediatamente
            recalculateTotals();
        }
    }, [formData.selected_services, formData.selected_equipment]);

    // Manejar actualizaciones de servicios TI cuando se regresa de la página de servicios TI
    useEffect(() => {
        const checkTIData = () => {
            const tiQuoteData = sessionStorage.getItem('tiQuoteData');
            if (tiQuoteData) {
                try {
                    const updatedData = JSON.parse(tiQuoteData);
                    console.log('🔄 ACTUALIZACIÓN DE SERVICIOS TI DETECTADA:', updatedData);
                    
                    // Verificar si los servicios han cambiado
                    const currentServices = formData.selected_services;
                    const newServices = updatedData.selected_services;
                    
                    console.log('🔍 COMPARANDO SERVICIOS:');
                    console.log('Servicios actuales:', currentServices);
                    console.log('Servicios nuevos:', newServices);
                    
                    // Actualizar servicios TI específicamente
                    if (newServices && newServices.length > 0) {
                        newServices.forEach((service: any) => {
                            if (service.category === 'servicios_ti') {
                                console.log('🔄 ACTUALIZANDO SERVICIO TI DESDE TIQUOTEDATA:', service);
                                updateTIService(service as Service);
                            }
                        });
                    } else {
                        // Actualizar el formData con los nuevos datos
                        setFormData(prevData => {
                            const newData = {
                                ...prevData,
                                ...updatedData
                            };
                            
                            console.log('🔄 FORM DATA ACTUALIZADO:', newData);
                            
                            // Guardar inmediatamente en sessionStorage
                            sessionStorage.setItem('quoteFormData', JSON.stringify(newData));
                            
                            return newData;
                        });
                        
                        // Recalcular totales después de la actualización con delay
                        setTimeout(() => {
                            console.log('🔄 RECALCULANDO TOTALES DESPUÉS DE ACTUALIZACIÓN TI');
                            recalculateTotals();
                        }, 200);
                    }
                    
                    // Limpiar los datos TI del sessionStorage
                    sessionStorage.removeItem('tiQuoteData');
                    sessionStorage.removeItem('originalTIService');
                    sessionStorage.removeItem('selectedTIService');
                    
                    console.log('✅ SERVICIOS TI ACTUALIZADOS Y TOTALES RECALCULADOS');
                } catch (error) {
                    console.error('❌ Error procesando actualización de servicios TI:', error);
                }
            }
        };
        
        // Verificar inmediatamente
        checkTIData();
        
        // Verificar cada 500ms para detectar cuando regresas de la página TI
        const interval = setInterval(checkTIData, 500);
        
        return () => clearInterval(interval);
    }, [formData.selected_services]);

    // Verificar datos TI cuando cambia el paso (cuando regresas de la página TI)
    useEffect(() => {
        console.log('🔄 VERIFICANDO DATOS TI EN PASO:', currentStep);
        const tiQuoteData = sessionStorage.getItem('tiQuoteData');
        if (tiQuoteData) {
            console.log('🔄 DATOS TI ENCONTRADOS EN PASO', currentStep);
            forceUpdateFromTIData();
        }
    }, [currentStep]);

    // Verificar constantemente el modo edición
    useEffect(() => {
        const checkEditMode = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const urlEditMode = urlParams.get('edit') === 'true';
            const urlQuoteId = urlParams.get('id');
            const sessionEditMode = sessionStorage.getItem('editMode') === 'true';
            const sessionQuoteId = sessionStorage.getItem('editQuoteId');
            
            if ((urlEditMode && urlQuoteId) || (sessionEditMode && sessionQuoteId)) {
                const quoteId = urlQuoteId || sessionQuoteId;
                if (quoteId && (!isEditMode || currentQuoteId !== quoteId)) {
                    console.log('🔒 VERIFICACIÓN CONSTANTE: Restaurando modo edición:', { 
                        urlEditMode, 
                        urlQuoteId, 
                        sessionEditMode, 
                        sessionQuoteId,
                        isEditMode, 
                        currentQuoteId,
                        finalQuoteId: quoteId
                    });
                    setIsEditMode(true);
                    setCurrentQuoteId(quoteId);
                }
            }
        };
        
        // Verificar inmediatamente
        checkEditMode();
        
        // Verificar cada segundo
        const interval = setInterval(checkEditMode, 1000);
        
        return () => clearInterval(interval);
    }, [isEditMode, currentQuoteId]);

    // Verificar datos TI al montar el componente
    useEffect(() => {
        console.log('🚀 VERIFICANDO DATOS TI AL MONTAR COMPONENTE');
        const tiQuoteData = sessionStorage.getItem('tiQuoteData');
        if (tiQuoteData) {
            console.log('🚀 DATOS TI ENCONTRADOS AL MONTAR');
            setTimeout(() => {
                forceUpdateFromTIData();
            }, 1000);
        } else {
            console.log('🚀 NO HAY DATOS TI AL MONTAR - VERIFICANDO QUOTEFORMDATA');
            // Verificar si hay datos en quoteFormData que necesiten actualización
            const quoteFormData = sessionStorage.getItem('quoteFormData');
            if (quoteFormData) {
                try {
                    const formData = JSON.parse(quoteFormData);
                    if (formData.selected_services && formData.selected_services.length > 0) {
                        console.log('🚀 SERVICIOS ENCONTRADOS EN QUOTEFORMDATA:', formData.selected_services);
                        
                        // FORZAR ACTUALIZACIÓN DEL ESTADO DESDE SESSIONSTORAGE
                        console.log('🚀 FORZANDO ACTUALIZACIÓN DEL ESTADO AL MONTAR');
                        setFormData(formData);
                        
                        // Recalcular totales para asegurar que estén actualizados
                        setTimeout(() => {
                            recalculateTotals();
                            console.log('✅ TOTALES RECALCULADOS AL MONTAR');
                        }, 500);
                    }
                } catch (error) {
                    console.error('❌ Error verificando quoteFormData al montar:', error);
                }
            }
        }
    }, []);



    const handlePreviewPDF = async () => {
        try {
            // Asegurar número de cotización en formato COTI00000-fecha para preview si no existe
            let previewQuoteNumber = formData as unknown as { quote_number?: string };
            let quoteNumberValue = (previewQuoteNumber && previewQuoteNumber.quote_number) ? previewQuoteNumber.quote_number : '';
            if (!quoteNumberValue) {
                try {
                    quoteNumberValue = await generateQuoteId();
                } catch {}
            }
            // Preparar datos para el PDF
            const pdfData = {
                client_rut: formData.client_rut,
                client_name: formData.client_name,
                client_email: formData.client_email,
                client_phone: `${formData.client_phone_country} ${formData.client_phone}`,
                client_address: formData.client_address,
                client_region: formData.client_region,
                client_commune: formData.client_commune,
                project_title: formData.project_title,
                project_description: formData.project_description,
                selected_services: formData.selected_services || [],
                selected_equipment: formData.selected_equipment || [],
                total_amount: formData.total_amount || 0,
                equipment_total: formData.equipment_total || 0,
                valid_until: formData.valid_until,
                notes: formData.notes,
                terms_conditions: formData.terms_conditions,
                discount_type: formData.discount_type,
                discount_value: formData.discount_value,
                discount_description: formData.discount_description,
                validity_message: formData.validity_message,
                final_total: calculateFinalTotal(),
                quote_number: quoteNumberValue,
                created_at: new Date().toISOString()
            };
            
            // Debug: Mostrar datos de descuento que se envían al PDF
            console.log('=== DATOS DE DESCUENTO PARA PDF (PREVIEW) ===');
            console.log('discount_type:', pdfData.discount_type);
            console.log('discount_value:', pdfData.discount_value);
            console.log('discount_description:', pdfData.discount_description);
            console.log('validity_message:', pdfData.validity_message);
            console.log('final_total:', pdfData.final_total);
            console.log('total_amount:', pdfData.total_amount);
            console.log('equipment_total:', pdfData.equipment_total);
            console.log('Subtotal calculado:', pdfData.total_amount + pdfData.equipment_total);
            console.log('Descuento calculado:', calculateDiscount());
            console.log('Total final calculado:', calculateFinalTotal());
            
            await previewProfessionalPDF(pdfData);
        } catch (error) {
            console.error('Error generando preview del PDF:', error);
            alert('❌ Error generando el preview del PDF');
        }
    };

    const handleGeneratePDF = async () => {
        try {
            // Asegurar número de cotización
            let previewQuoteNumber = formData as unknown as { quote_number?: string };
            let quoteNumberValue = (previewQuoteNumber && previewQuoteNumber.quote_number) ? previewQuoteNumber.quote_number : '';
            if (!quoteNumberValue) {
                try {
                    quoteNumberValue = await generateQuoteId();
                } catch {}
            }
            // Preparar datos para el PDF
            const pdfData = {
                client_rut: formData.client_rut,
                client_name: formData.client_name,
                client_email: formData.client_email,
                client_phone: `${formData.client_phone_country} ${formData.client_phone}`,
                client_address: formData.client_address,
                client_region: formData.client_region,
                client_commune: formData.client_commune,
                project_title: formData.project_title,
                project_description: formData.project_description,
                selected_services: formData.selected_services || [],
                selected_equipment: formData.selected_equipment || [],
                total_amount: formData.total_amount || 0,
                equipment_total: formData.equipment_total || 0,
                valid_until: formData.valid_until,
                notes: formData.notes,
                terms_conditions: formData.terms_conditions,
                discount_type: formData.discount_type,
                discount_value: formData.discount_value,
                discount_description: formData.discount_description,
                validity_message: formData.validity_message,
                final_total: calculateFinalTotal(),
                quote_number: quoteNumberValue,
                created_at: new Date().toISOString()
            };
            
            // Debug: Mostrar datos de descuento que se envían al PDF
            console.log('=== DATOS DE DESCUENTO PARA PDF (DOWNLOAD) ===');
            console.log('discount_type:', pdfData.discount_type);
            console.log('discount_value:', pdfData.discount_value);
            console.log('discount_description:', pdfData.discount_description);
            console.log('validity_message:', pdfData.validity_message);
            console.log('final_total:', pdfData.final_total);
            console.log('total_amount:', pdfData.total_amount);
            console.log('equipment_total:', pdfData.equipment_total);
            console.log('Subtotal calculado:', pdfData.total_amount + pdfData.equipment_total);
            console.log('Descuento calculado:', calculateDiscount());
            console.log('Total final calculado:', calculateFinalTotal());
            
            await downloadProfessionalPDF(pdfData);
            alert('✅ PDF generado y descargado exitosamente');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('❌ Error generando el PDF');
        }
    };

    const handleSendPDFByEmail = async () => {
        try {
            const email = prompt('Ingrese el email del cliente para enviar la cotización:');
            if (!email) return;
            
            // Asegurar número de cotización
            let previewQuoteNumber = formData as unknown as { quote_number?: string };
            let quoteNumberValue = (previewQuoteNumber && previewQuoteNumber.quote_number) ? previewQuoteNumber.quote_number : '';
            if (!quoteNumberValue) {
                try {
                    quoteNumberValue = await generateQuoteId();
                } catch {}
            }
            // Preparar datos para el PDF
            const pdfData = {
                client_rut: formData.client_rut,
                client_name: formData.client_name,
                client_email: formData.client_email,
                client_phone: `${formData.client_phone_country} ${formData.client_phone}`,
                client_address: formData.client_address,
                client_region: formData.client_region,
                client_commune: formData.client_commune,
                project_title: formData.project_title,
                project_description: formData.project_description,
                selected_services: formData.selected_services || [],
                selected_equipment: formData.selected_equipment || [],
                total_amount: formData.total_amount || 0,
                equipment_total: formData.equipment_total || 0,
                valid_until: formData.valid_until,
                notes: formData.notes,
                terms_conditions: formData.terms_conditions,
                discount_type: formData.discount_type,
                discount_value: formData.discount_value,
                discount_description: formData.discount_description,
                validity_message: formData.validity_message,
                final_total: calculateTotalWithIVA(),
                quote_number: quoteNumberValue,
                created_at: new Date().toISOString()
            };
            
            // Debug: Mostrar datos de descuento que se envían al PDF
            console.log('=== DATOS DE DESCUENTO PARA PDF (EMAIL) ===');
            console.log('discount_type:', pdfData.discount_type);
            console.log('discount_value:', pdfData.discount_value);
            console.log('discount_description:', pdfData.discount_description);
            console.log('final_total:', pdfData.final_total);
            console.log('total_amount:', pdfData.total_amount);
            console.log('equipment_total:', pdfData.equipment_total);
            console.log('Subtotal calculado:', pdfData.total_amount + pdfData.equipment_total);
            console.log('Descuento calculado:', calculateDiscount());
            console.log('Total final calculado:', calculateTotalWithIVA());
            
            await sendProfessionalPDFByEmail(pdfData, email);
        } catch (error) {
            console.error('Error enviando PDF por email:', error);
            alert('❌ Error enviando el PDF por email');
        }
    };

    // Función para validar el paso 1
    const validateStep1 = () => {
        const camposRequeridos = [];
        
        if (!formData.client_name || formData.client_name.trim() === '') {
            camposRequeridos.push('Nombre del Cliente');
        }
        
        if (!formData.project_title || formData.project_title.trim() === '') {
            camposRequeridos.push('Título del Proyecto');
        }
        
        if (!formData.client_rut || formData.client_rut.trim() === '') {
            camposRequeridos.push('RUT del Cliente');
        }
        
        if (camposRequeridos.length > 0) {
            alert(`Por favor completa los siguientes campos requeridos:\n${camposRequeridos.join('\n')}`);
            return false;
        }
        
        return true;
    };

    const handleSaveInternal = async (action: 'draft' | 'send' = 'draft') => {
        try {
            console.log('=== INICIANDO GUARDADO ===');
            console.log('formData:', formData);
            
            // Verificar si estamos editando una cotización existente
            const urlParams = new URLSearchParams(window.location.search);
            const urlEditMode = urlParams.get('edit') === 'true';
            const urlQuoteId = urlParams.get('id');
            
            // VERIFICAR SESSIONSTORAGE PARA MODO EDICIÓN
            const sessionEditMode = sessionStorage.getItem('editMode') === 'true';
            const sessionQuoteId = sessionStorage.getItem('editQuoteId');
            
            // DETECTAR MODO EDICIÓN DESDE MÚLTIPLES FUENTES
            const isEdit = urlEditMode || isEditMode || sessionEditMode || !!currentQuoteId || !!urlQuoteId || !!sessionQuoteId;
            const quoteId = urlQuoteId || currentQuoteId || sessionQuoteId;
            
            // FORZAR MODO EDICIÓN SI HAY PARÁMETROS EN URL
            if (urlEditMode && urlQuoteId) {
                console.log('🔒 FORZANDO MODO EDICIÓN DESDE URL:', { urlEditMode, urlQuoteId });
                setIsEditMode(true);
                setCurrentQuoteId(urlQuoteId);
            }
            
            // FORZAR MODO EDICIÓN SI HAY ID EN SESSIONSTORAGE
            if (sessionQuoteId) {
                console.log('🔒 FORZANDO MODO EDICIÓN DESDE SESSIONSTORAGE:', sessionQuoteId);
                setIsEditMode(true);
                setCurrentQuoteId(sessionQuoteId);
            }
            
            // FORZAR MODO EDICIÓN SI HAY PARÁMETROS EN URL
            if (urlEditMode && urlQuoteId) {
                console.log('🔒 FORZANDO MODO EDICIÓN:', { urlEditMode, urlQuoteId });
                setIsEditMode(true);
                setCurrentQuoteId(urlQuoteId);
            }
            
            console.log('🔍 DETECCIÓN MODO EDICIÓN:', {
                urlEditMode,
                isEditMode,
                sessionEditMode,
                currentQuoteId,
                urlQuoteId,
                sessionQuoteId,
                isEdit,
                quoteId
            });
            
            // RESTAURAR MODO EDICIÓN SI SE DETECTA EN URL
            if (urlEditMode && urlQuoteId) {
                setIsEditMode(true);
                setCurrentQuoteId(urlQuoteId);
            }
            
            console.log('🔍 DEBUG MODO EDICIÓN:');
            console.log('- urlParams.get("edit"):', urlParams.get('edit'));
            console.log('- isEditMode:', isEditMode);
            console.log('- isEdit (final):', isEdit);
            console.log('- urlParams.get("id"):', urlParams.get('id'));
            console.log('- currentQuoteId:', currentQuoteId);
            console.log('- quoteId (final):', quoteId);
            
            // Asegurar que la fecha tenga un valor válido
            const validUntil = formData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            // Validación completa de datos requeridos
            const camposRequeridos = [];
            
            console.log('🔍 Validando datos del cliente:');
            console.log('- client_name:', formData.client_name);
            console.log('- client_rut:', formData.client_rut);
            console.log('- project_title:', formData.project_title);
            
            if (!formData.client_name || formData.client_name.trim() === '') {
                camposRequeridos.push('Nombre del Cliente');
                console.log('❌ Nombre del cliente faltante');
            }
            
            if (!formData.project_title || formData.project_title.trim() === '') {
                camposRequeridos.push('Título del Proyecto');
                console.log('❌ Título del proyecto faltante');
            }
            
            if (!formData.client_rut || formData.client_rut.trim() === '') {
                camposRequeridos.push('RUT del Cliente');
                console.log('❌ RUT del cliente faltante');
            }
            
            if (camposRequeridos.length > 0) {
                console.log('❌ Campos faltantes:', camposRequeridos);
                alert(`Por favor completa los siguientes campos requeridos:\n${camposRequeridos.join('\n')}`);
                return;
            }
            
            console.log('✅ Todos los campos requeridos están completos');
            
            // Determinar el status basado en la acción
            const status = action === 'send' ? 'active' : 'draft';
            console.log(`📋 Guardando como: ${status} (acción: ${action})`);
            
            // Generar número de cotización solo para nuevas cotizaciones
            let quoteNumber = '';
            if (!isEdit || !quoteId) {
                try {
                    quoteNumber = await generateQuoteId();
                    console.log('📝 Número de cotización generado:', quoteNumber);
                } catch (error) {
                    console.error('❌ Error generando número de cotización:', error);
                }
            }
            
            // Recalcular totales antes de guardar para asegurar que estén actualizados
            console.log('🔄 RECALCULANDO TOTALES ANTES DE GUARDAR');
            recalculateTotals();
            
            // Esperar un momento para que se actualice el estado
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('📊 ESTADO FINAL ANTES DE GUARDAR:', {
                total_amount: formData.total_amount,
                equipment_total: formData.equipment_total,
                services_count: formData.selected_services.length,
                equipment_count: formData.selected_equipment.length
            });
            
            const datosAGuardar: any = {
                client_rut: formData.client_rut || '',
                client_name: formData.client_name,
                client_email: formData.client_email || '',
                client_phone: `${formData.client_phone_country || ''} ${formData.client_phone || ''}`.trim(),
                client_phone_country: formData.client_phone_country || '',
                client_address: formData.client_address || '',
                client_region: formData.client_region || '',
                client_commune: formData.client_commune || '',
                client_country: formData.client_country || 'Chile',
                project_title: formData.project_title,
                project_description: formData.project_description || '',
                services: formData.selected_services || [],
                equipment: formData.selected_equipment || [],
                total_amount: formData.total_amount || 0,
                equipment_total: formData.equipment_total || 0,
                valid_until: validUntil,
                notes: formData.notes || '',
                terms_conditions: formData.terms_conditions || '',
                discount_type: formData.discount_type || 'none',
                discount_value: formData.discount_value || 0,
                discount_description: formData.discount_description || '',
                final_total: calculateFinalTotal(),
                status: status
            };

            // Si estoy editando y NO toqué equipos, no enviar campos de equipos ni recalcular total
            if (isEdit && !equipmentDirty) {
            delete datosAGuardar.equipment;
            delete datosAGuardar.equipment_total;
            delete datosAGuardar.final_total; // evita sobreescribir con cálculos basados en un equipment_total no cargado
            }

            // Incluir quote_number solo cuando se creó una nueva cotización
            if (quoteNumber) {
                datosAGuardar.quote_number = quoteNumber;
            }

            console.log('=== DATOS A GUARDAR ===');
            console.log('Servicios:', datosAGuardar.services);
            console.log('Equipos:', datosAGuardar.equipment);
            console.log('Total servicios:', datosAGuardar.total_amount);
            console.log('Total equipos:', datosAGuardar.equipment_total);
            console.log('Datos completos:', datosAGuardar);
            console.log('🔍 DEBUG FINAL:');
            console.log('- isEdit:', isEdit);
            console.log('- quoteId:', quoteId);
            console.log('- currentQuoteId:', currentQuoteId);
            console.log('- URL params:', window.location.search);

            let result;
            console.log('🔍 DECISIÓN FINAL:');
            console.log('- isEdit:', isEdit);
            console.log('- quoteId:', quoteId);
            console.log('- ¿Actualizar?:', isEdit && quoteId);
            console.log('- ¿Crear nueva?:', !isEdit || !quoteId);
            
            if (isEdit && quoteId) {
                console.log('🔄 ACTUALIZANDO COTIZACIÓN EXISTENTE:', quoteId);
                // Actualizar cotización existente
                const { data, error } = await supabase
                    .from("quotes")
                    .update(datosAGuardar)
                    .eq('id', quoteId)
                    .select();

                if (error) {
                    console.error('Error de Supabase:', error);
                    throw error;
                }

                result = data;
                console.log('✅ Cotización actualizada exitosamente:', data);
                console.log('📋 Servicios actualizados:', data[0]?.services);
                console.log('🔧 Equipos actualizados:', data[0]?.equipment);
                console.log('💰 Total actualizado:', data[0]?.total_amount);
                console.log('🔧 Total equipos actualizado:', data[0]?.equipment_total);
                alert('✅ Cotización actualizada exitosamente');
            } else {
                console.log('🆕 CREANDO NUEVA COTIZACIÓN');
                // Crear nueva cotización
            const { data, error } = await supabase
                .from("quotes")
                .insert(datosAGuardar)
                .select();

            if (error) {
                console.error('Error de Supabase:', error);
                throw error;
            }

                result = data;
            console.log('✅ Cotización guardada exitosamente:', data);
                console.log('📋 Servicios guardados:', data[0]?.services);
                console.log('🔧 Equipos guardados:', data[0]?.equipment);
                console.log('💰 Total guardado:', data[0]?.total_amount);
                console.log('🔧 Total equipos guardado:', data[0]?.equipment_total);
            alert('✅ Cotización guardada exitosamente');
            }

            router.push("/admin/quotes");
        } catch (error) {
            console.error("Error guardando cotización:", error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            alert(`❌ Error al guardar la cotización: ${errorMessage}`);
        }
    };

    // Funciones wrapper para los botones
    const handleSaveDraft = () => handleSaveInternal('draft');
    const handleSendQuote = () => handleSaveInternal('send');

    const renderStep1 = () => (
        <div className="space-y-6">
            {/* Búsqueda de Cliente */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buscar Cliente Existente</h3>
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Buscar por RUT, nombre o email..."
                        />
                    </div>
                    
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                            {searchResults.map((client) => (
                                <button
                                    key={client.id}
                                    onClick={() => selectClient(client)}
                                    className="w-full p-3 hover:bg-gray-50 text-left border-b last:border-b-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-blue8" />
                                        <div>
                                            <div className="font-medium text-gray-900">{client.name}</div>
                                            <div className="text-sm text-gray-600">
                                                {client.rut} • {client.email}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Información del Cliente */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Información del Cliente</h3>
                    {formData.client_country && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="text-sm text-blue8 font-medium">
                                Moneda: {getCurrentCurrency().name} ({getCurrentCurrency().symbol})
                            </span>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            RUT del Cliente *
                        </label>
                        <input
                            type="text"
                            value={formData.client_rut}
                            onChange={(e) => handleRutChange(e.target.value)}
                            onKeyDown={handleRutKeyDown}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8 ${
                                formData.client_rut && rutValidation.isValid 
                                    ? 'border-green-300 focus:ring-green-500' 
                                    : formData.client_rut && !rutValidation.message.includes('incompleto')
                                    ? 'border-red-300 focus:ring-red-500' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="12.345.678-9"
                            maxLength={12}
                        />
                        {formData.client_rut && (
                            <div className={`text-xs mt-1 ${
                                rutValidation.isValid ? 'text-green-600' : 
                                rutValidation.message.includes('incompleto') ? 'text-gray-500' : 'text-red-600'
                            }`}>
                                {rutValidation.message}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del Cliente *
                        </label>
                        <input
                            type="text"
                            value={formData.client_name}
                            onChange={(e) => updateFormData('client_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Ingrese el nombre del cliente"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email del Cliente
                        </label>
                        <input
                            type="email"
                            value={formData.client_email}
                            onChange={(e) => updateFormData('client_email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="cliente@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono del Cliente
                        </label>
                        <div className="flex gap-2">
                            {/* Selector de código de país */}
                            <div className="relative country-dropdown">
                                <button
                                    type="button"
                                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue8 min-w-[100px]"
                                >
                                    <span className="text-lg">
                                        {COUNTRY_CODES.find(c => c.code === formData.client_phone_country)?.flag}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formData.client_phone_country}
                                    </span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                
                                {showCountryDropdown && (
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                        {COUNTRY_CODES.map((country) => (
                                            <button
                                                key={country.code}
                                                onClick={() => handleCountryChange(country.code)}
                                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                                            >
                                                <span className="text-lg">{country.flag}</span>
                                                <span className="text-sm font-medium">{country.code}</span>
                                                <span className="text-xs text-gray-500">{country.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Campo de teléfono */}
                            <div className="flex-1">
                                <input
                                    type="tel"
                                    value={formData.client_phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8 ${
                                        formData.client_phone && !phoneValidation.isValid 
                                            ? 'border-red-300 focus:ring-red-500' 
                                            : 'border-gray-300'
                                    }`}
                                    placeholder={formData.client_phone_country === "+56" ? "9 1234 5678" : "Número de teléfono"}
                                />
                                {formData.client_phone && (
                                    <div className={`text-xs mt-1 ${
                                        phoneValidation.isValid ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {phoneValidation.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dirección del Cliente */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dirección del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dirección
                        </label>
                        <input
                            type="text"
                            value={formData.client_address}
                            onChange={(e) => updateFormData('client_address', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Calle, número, departamento..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            País
                        </label>
                        <select
                            value={formData.client_country || ''}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                console.log('🌍 País seleccionado:', selectedValue);
                                const updated = {
                                    ...formData,
                                    client_country: selectedValue,
                                    client_region: '',
                                    client_commune: ''
                                };
                                setFormData(updated);
                                sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        >
                            <option value="">Seleccionar país</option>
                                    {COMPLETE_GEO_DATA.map((country) => (
                                <option key={country.code} value={country.name}>
                                    {country.flag} {country.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Región/Estado/Departamento
                        </label>
                        <select
                            value={formData.client_region || ''}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                console.log('🏛️ Región seleccionada:', selectedValue);
                                const updated = {
                                    ...formData,
                                    client_region: selectedValue,
                                    client_commune: ''
                                };
                                setFormData(updated);
                                sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        >
                            <option value="">
                                Seleccionar región
                            </option>
                            {getRegionsByCountry(
                                COMPLETE_GEO_DATA.find(c => c.name === formData.client_country)?.code || 'CL'
                            ).map((region) => (
                                <option key={region.id} value={region.name}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comuna/Ciudad/Municipio
                        </label>
                        <select
                            value={formData.client_commune || ''}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                console.log('🏘️ Comuna seleccionada:', selectedValue);
                                const updated = {
                                    ...formData,
                                    client_commune: selectedValue
                                };
                                setFormData(updated);
                                sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        >
                            <option value="">
                                Seleccionar comuna
                            </option>
                            {getCommunesByRegion(
                                COMPLETE_GEO_DATA.find(c => c.name === formData.client_country)?.code || 'CL',
                                getRegionsByCountry(
                                    COMPLETE_GEO_DATA.find(c => c.name === formData.client_country)?.code || 'CL'
                                ).find(r => r.name === formData.client_region)?.id || ''
                            ).map((commune) => (
                                <option key={commune} value={commune}>
                                    {commune}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Información del Proyecto */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Proyecto</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Título del Proyecto *
                        </label>
                        <input
                            type="text"
                            value={formData.project_title}
                            onChange={(e) => updateFormData('project_title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Ej: Desarrollo de plataforma web"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción del Proyecto
                        </label>
                        <textarea
                            value={formData.project_description}
                            onChange={(e) => updateFormData('project_description', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Describa los detalles del proyecto..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            {/* Información del flujo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue8 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        1
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-blue8 mb-1">Flujo de Cotización</h4>
                        <p className="text-sm text-blue8">
                            <strong>Para Servicios TI:</strong> Selecciona &quot;Servicios TI&quot; → Te llevará al sistema granular
                        </p>
                        <p className="text-sm text-blue8 mt-1">
                            <strong>Para Otros Servicios:</strong> Selecciona categoría → Elige servicio → Calcula precio
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            // Preservar parámetros de edición si estamos en modo edición
                            const urlParams = new URLSearchParams(window.location.search);
                            const editMode = urlParams.get('edit');
                            const quoteId = urlParams.get('id');
                            
                            console.log('🔍 DEBUG NAVEGACIÓN A TI-SERVICES (BOTÓN):');
                            console.log('- URL actual:', window.location.href);
                            console.log('- editMode detectado:', editMode);
                            console.log('- quoteId detectado:', quoteId);
                            console.log('- isEditMode state:', isEditMode);
                            console.log('- currentQuoteId state:', currentQuoteId);
                            
                            let tiServicesUrl = '/admin/ti-services';
                            if (editMode === 'true' && quoteId) {
                                tiServicesUrl += `?edit=true&id=${quoteId}`;
                                console.log('🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE EDICIÓN:', { editMode, quoteId });
                            } else if (isEditMode && currentQuoteId) {
                                // Fallback: usar el estado si los parámetros de URL no están disponibles
                                tiServicesUrl += `?edit=true&id=${currentQuoteId}`;
                                console.log('🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE ESTADO:', { editMode: 'true', quoteId: currentQuoteId });
                            } else {
                                console.log('⚠️ NO SE DETECTARON PARÁMETROS DE EDICIÓN');
                            }
                            
                            router.push(tiServicesUrl);
                        }}
                        className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 text-sm font-medium"
                    >
                        Ir a Servicios TI
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Categoría de Servicios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(SERVICE_CATEGORIES).map(([key, category]) => {
                        const servicesInCategory = formData.selected_services.filter(s => s.category === key).length;
                        return (
                            <button
                                key={key}
                                onClick={() => {
                                    // Solo limpiar servicios si NO estamos en modo edición y NO hay servicios ya seleccionados
                                    if (selectedCategory !== key && !isEditMode && formData.selected_services.length === 0) {
                                        clearAllServices();
                                        console.log('🔄 Categoría cambiada, servicios limpiados (nueva cotización)');
                                    } else if (selectedCategory !== key) {
                                        console.log('🔄 Categoría cambiada, manteniendo servicios existentes (modo edición)');
                                    }
                                    setSelectedCategory(key);
                                }}
                                className={`p-4 border-2 rounded-lg text-left transition-all ${
                                    selectedCategory === key
                                        ? 'border-blue8 bg-blue8 text-white'
                                        : 'border-gray-300 hover:border-blue8 hover:bg-blue-50'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold mb-2">{category.name}</h4>
                                        <p className="text-sm opacity-80">
                                            {key === 'servicios_ti' 
                                                ? `${category.services.length} servicios con sistema granular`
                                                : `${category.services.length} servicios con cálculo dinámico`
                                            }
                                        </p>
                                        {key === 'servicios_ti' && (
                                            <p className={`text-xs mt-1 ${
                                                selectedCategory === key 
                                                    ? 'text-blue-100' 
                                                    : 'text-blue-600'
                                            }`}>
                                                🔧 Sistema de componentes individuales
                                            </p>
                                        )}
                                    </div>
                                    {servicesInCategory > 0 && (
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            selectedCategory === key 
                                                ? 'bg-white text-blue8' 
                                                : 'bg-blue8 text-white'
                                        }`}>
                                            {servicesInCategory}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedCategory && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Servicios de {SERVICE_CATEGORIES[selectedCategory as keyof typeof SERVICE_CATEGORIES].name}
                        </h3>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                                {formData.selected_services.length} servicios seleccionados
                            </span>
                            <button
                                onClick={() => setSelectedCategory("")}
                                className="text-blue8 hover:text-blue6 text-sm font-medium"
                            >
                                Cambiar Categoría
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SERVICE_CATEGORIES[selectedCategory as keyof typeof SERVICE_CATEGORIES].services.map((service) => {
                            // Mejorar la lógica de comparación para servicios editados
                            const isSelected = formData.selected_services.find(s => {
                                // Comparar por ID exacto
                                if (s.id === service.id) return true;
                                // Comparar por nombre si los IDs no coinciden (para servicios editados)
                                if (s.name === service.name && s.category === service.category) return true;
                                return false;
                            });
                            
                            // Debug log para servicios seleccionados
                            if (isSelected) {
                                console.log('✅ Servicio encontrado como seleccionado:', service.name, 'ID:', service.id);
                            }
                            
                            // Debug log para todos los servicios en la grilla
                            console.log('🔍 Servicio en grilla:', service.name, 'ID:', service.id, 'Categoría:', service.category);
                            console.log('🔍 Servicios seleccionados:', formData.selected_services.map(s => ({ name: s.name, id: s.id, category: s.category })));
                            
                            return (
                                <div
                                    key={service.id}
                                    className={`p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                                        isSelected 
                                            ? 'border-blue8 bg-blue-50' 
                                            : 'border-gray-300 hover:border-blue8'
                                    }`}
                                    onClick={() => toggleService(service)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-semibold text-gray-900">{service.name}</h4>
                                            {isSelected && (
                                                <span className="text-xs bg-blue8 text-white px-2 py-1 rounded">Seleccionado</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-blue8">
                                            {(service as any).calculatedPrice ? formatCurrencyLocal(service.price) : "Calcular"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{service.description}</p>
                                    
                                    {/* Botón Calcular */}
                                    <div className="mt-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openCalculationModal(service);
                                            }}
                                            className="text-xs bg-blue8 text-white px-3 py-1 rounded hover:bg-blue6 transition-colors"
                                        >
                                            {(service as any).calculatedPrice ? "Recalcular" : "Calcular Precio"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Vista previa de servicios seleccionados */}
            {formData.selected_services.length > 0 && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Servicios Seleccionados ({formData.selected_services.length})</h4>
                    <div className="space-y-2">
                        {formData.selected_services.map((service) => (
                            <div key={service.id} className="p-3 bg-white rounded border">
                               <div className="mb-2">
                                    <div>
                                        <span className="font-medium text-gray-900">{service.name}</span>
                                        <span className="text-sm text-gray-600 ml-2">({service.category})</span>
                                    </div>
                                   <div className="mt-1 flex items-center gap-3 text-sm">
                                        <span className="font-medium text-blue8">{formatCurrencyLocal(service.price)}</span>
                                       {(service as any).category === 'servicios_ti' && (
                                           <span className="text-blue-600">• Granular</span>
                                       )}
                                       {!isViewMode && (
                                        <button
                                            onClick={() => removeService(service.id)}
                                               className="text-red-600 hover:text-red-800 text-xs"
                                        >
                                               Eliminar
                                        </button>
                                       )}
                                       {/* Botón Editar para servicios TI */}
                                       {!isViewMode && (service as any).category === 'servicios_ti' && (
                                           <button
                                               onClick={() => {
                                                   // Guardar el servicio seleccionado y redirigir al sistema granular
                                                   sessionStorage.setItem('selectedTIService', JSON.stringify(service));
                                                   sessionStorage.setItem('quoteFormData', JSON.stringify(formData));
                                                   
                                                   // Preservar parámetros de edición si estamos en modo edición
                                                   const urlParams = new URLSearchParams(window.location.search);
                                                   const editMode = urlParams.get('edit');
                                                   const quoteId = urlParams.get('id');
                                                   
                                                   console.log('🔍 DEBUG NAVEGACIÓN A TI-SERVICES (EDITAR):');
                                                   console.log('- URL actual:', window.location.href);
                                                   console.log('- editMode detectado:', editMode);
                                                   console.log('- quoteId detectado:', quoteId);
                                                   console.log('- isEditMode state:', isEditMode);
                                                   console.log('- currentQuoteId state:', currentQuoteId);
                                                   
                                                   let tiServicesUrl = '/admin/ti-services';
                                                   if (editMode === 'true' && quoteId) {
                                                       tiServicesUrl += `?edit=true&id=${quoteId}`;
                                                       console.log('🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE EDICIÓN:', { editMode, quoteId });
                                                   } else if (isEditMode && currentQuoteId) {
                                                       // Fallback: usar el estado si los parámetros de URL no están disponibles
                                                       tiServicesUrl += `?edit=true&id=${currentQuoteId}`;
                                                       console.log('🔒 NAVEGANDO A TI-SERVICES CON PARÁMETROS DE ESTADO:', { editMode: 'true', quoteId: currentQuoteId });
                                                   } else {
                                                       console.log('⚠️ NO SE DETECTARON PARÁMETROS DE EDICIÓN');
                                                   }
                                                   
                                                   router.push(tiServicesUrl);
                                               }}
                                               className="text-blue-600 hover:text-blue-800 text-xs"
                                           >
                                               Editar
                                           </button>
                                       )}
                                    </div>
                                </div>
                                
                               {/* Mostrar detalles del cálculo/paquete y granulares en una sola columna */}
                               {service.packageId && (
                                   <div className="mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                                       <div className="font-medium text-blue-800 mb-1 inline-flex items-center gap-1.5"><Package className="w-4 h-4" /> Paquete: {service.packageName}</div>
                                       {(service as any).complexity && (
                                           <div className="text-blue-600">Complejidad: {(service as any).complexity}</div>
                                       )}
                                       {(service as any).estimatedDuration && (
                                           <div className="text-blue-600">Duración: {(service as any).estimatedDuration}</div>
                                       )}
                                   </div>
                               )}
                               {(service as any).granularComponents && (service as any).granularComponents.length > 0 && (
                                   <div className="mt-2">
                                       <div className="text-xs text-gray-500 font-medium">Componentes incluidos:</div>
                                       <ul className="text-xs text-gray-600 mt-1 space-y-1">
                                           {(service as any).granularComponents.map((comp: any, index: number) => (
                                               <li key={index} className="flex justify-between">
                                                   <span>• {comp.name}</span>
                                                   <span className="text-gray-500">{comp.quantity} {comp.unit} × ${comp.unitPrice?.toLocaleString() || 0}</span>
                                               </li>
                                           ))}
                                       </ul>
                                    </div>
                                )}
                                
                                {/* Botón para recalcular */}
                                <div className="mt-2">
                                    <button
                                        onClick={() => openCalculationModal(service)}
                                        className="text-xs bg-blue8 text-white px-2 py-1 rounded hover:bg-blue6 transition-colors"
                                    >
                                        Recalcular
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between items-center font-semibold">
                                <span>Total:</span>
                                <span className="text-blue8">{formatCurrencyLocal(formData.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cálculo */}
            {showCalculationModal && selectedServiceForCalculation && (
                <CalculationModal
                    service={selectedServiceForCalculation}
                    onCalculate={calculateServiceWithParams}
                    onClose={() => setShowCalculationModal(false)}
                    country={formData.client_country}
                    region={formData.client_region}
                />
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            

            

            

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Equipos y Materiales</h3>
                <p className="text-sm text-gray-600">
                    Agrega los equipos y materiales necesarios para el proyecto. Incluye enlaces de compra y precios.
                </p>
            </div>

            {/* Formulario para agregar equipos */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Agregar Nuevo Equipo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre del Equipo *
                        </label>
                        <input
                            type="text"
                            value={equipmentForm.name}
                            onChange={(e) => updateEquipmentForm('name', e.target.value)}
                            placeholder="Ej: Switch Cisco 24 puertos"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción
                        </label>
                        <input
                            type="text"
                            value={equipmentForm.description}
                            onChange={(e) => updateEquipmentForm('description', e.target.value)}
                            placeholder="Descripción breve del equipo"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enlace de Compra
                        </label>
                        <input
                            type="url"
                            value={equipmentForm.internet_link}
                            onChange={(e) => updateEquipmentForm('internet_link', e.target.value)}
                            placeholder="https://ejemplo.com/producto"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categoría
                        </label>
                        <select 
                            value={equipmentForm.category}
                            onChange={(e) => {
                                updateEquipmentForm('category', e.target.value);
                                // Recalcular precio de venta si hay precio de compra
                                if (equipmentForm.purchase_price && e.target.value) {
                                    const pricing = calculateSalePrice(parseFloat(equipmentForm.purchase_price), e.target.value);
                                    updateEquipmentForm('sale_price', pricing.salePrice.toString());
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Seleccionar categoría</option>
                            {getAllCategories().map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name} ({category.margin}% margen)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio de Compra *
                        </label>
                        <input
                            type="number"
                            value={equipmentForm.purchase_price}
                            onChange={(e) => {
                                updateEquipmentForm('purchase_price', e.target.value);
                                // Recalcular precio de venta si hay categoría seleccionada
                                if (e.target.value && equipmentForm.category) {
                                    const pricing = calculateSalePrice(parseFloat(e.target.value), equipmentForm.category);
                                    updateEquipmentForm('sale_price', pricing.salePrice.toString());
                                }
                            }}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio de Venta * (calculado automáticamente)
                        </label>
                        <input
                            type="number"
                            value={equipmentForm.sale_price}
                            onChange={(e) => updateEquipmentForm('sale_price', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        />
                        {equipmentForm.purchase_price && equipmentForm.sale_price && equipmentForm.category && (
                            <p className="text-xs text-gray-500 mt-1">
                                Margen: {calculateActualMargin(parseFloat(equipmentForm.purchase_price), parseFloat(equipmentForm.sale_price))}%
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={equipmentForm.quantity}
                            onChange={(e) => updateEquipmentForm('quantity', e.target.value)}
                            placeholder="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas Adicionales
                        </label>
                        <textarea
                            value={equipmentForm.notes}
                            onChange={(e) => updateEquipmentForm('notes', e.target.value)}
                            placeholder="Notas sobre el equipo, especificaciones, etc."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <button 
                        onClick={handleAddEquipment}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Agregar Equipo
                    </button>
                </div>
            </div>

            {/* Lista de equipos seleccionados */}
            {(() => {
                console.log('🔧 RENDER STEP 3 - EQUIPOS EN FORM DATA:', formData.selected_equipment);
                console.log('🔧 RENDER STEP 3 - CANTIDAD DE EQUIPOS:', formData.selected_equipment?.length || 0);
                return null;
            })()}
            {(formData.selected_equipment?.length || 0) > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h4 className="font-medium text-gray-900">
                            Equipos Seleccionados ({(formData.selected_equipment?.length || 0)})
                        </h4>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {(formData.selected_equipment || []).map((equipment) => (
                                <div key={equipment.id} className="p-4 border border-gray-200 rounded-lg">
                                    {editingEquipmentId === equipment.id ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                                                    <input
                                                        type="text"
                                                        defaultValue={equipment.name}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                                                    <input
                                                        type="text"
                                                        defaultValue={equipment.description}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Enlace</label>
                                                    <input
                                                        type="text"
                                                        defaultValue={equipment.internet_link}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, internet_link: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                                                    <select
                                                        defaultValue={equipment.category || ''}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, category: e.target.value as string }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                    >
                                                        <option value="" disabled>Seleccionar categoría</option>
                                                        {getAllCategories().map((category) => (
                                                            <option key={category.id} value={category.id}>
                                                                {category.name} ({category.margin}% margen)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Precio Compra</label>
                                                    <input
                                                        type="number"
                                                        defaultValue={equipment.purchase_price}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, purchase_price: parseFloat(e.target.value || '0') }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Precio Venta</label>
                                                    <input
                                                        type="number"
                                                        defaultValue={equipment.sale_price}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, sale_price: parseFloat(e.target.value || '0') }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        defaultValue={equipment.quantity}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value || '1') }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs text-gray-500 mb-1">Notas</label>
                                                    <input
                                                        type="text"
                                                        defaultValue={equipment.notes || ''}
                                                        onChange={(e) => setEquipmentEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingEquipmentId(null)}
                                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const current = formData.selected_equipment || [];
                                                        const updatedList = current.map(e =>
                                                            e.id === equipment.id ? { ...e, ...equipmentEditForm } as Equipment : e
                                                        );
                                                        const newTotal = updatedList.reduce((sum, e) => sum + (e.sale_price * e.quantity), 0);
                                                        updateFormData('selected_equipment', updatedList);
                                                        updateFormData('equipment_total', newTotal);
                                                        setEditingEquipmentId(null);
                                                        setEquipmentEditForm({});
                                                    }}
                                                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h5 className="font-medium text-gray-900">{equipment.name}</h5>
                                        <p className="text-sm text-gray-600">{equipment.description}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                            <span>Cantidad: {equipment.quantity}</span>
                                            <span>Compra: {formatEquipmentPrice(equipment.purchase_price || 0, formData.client_country)}</span>
                                            <span>Venta: {formatEquipmentPrice(equipment.sale_price || 0, formData.client_country)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateEquipmentQuantity(equipment.id, equipment.quantity - 1)}
                                            className="p-1 text-gray-600 hover:text-gray-800"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={equipment.quantity}
                                            onChange={(e) => {
                                                const newQuantity = parseInt(e.target.value) || 1;
                                                updateEquipmentQuantity(equipment.id, newQuantity);
                                            }}
                                            className="w-12 text-center text-sm font-medium border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield', appearance: 'none' }}
                                        />
                                        <button
                                            onClick={() => updateEquipmentQuantity(equipment.id, equipment.quantity + 1)}
                                            className="p-1 text-gray-600 hover:text-gray-800"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-medium text-gray-900 ml-2">
                                            {formatEquipmentPrice(((equipment.sale_price || 0) * (equipment.quantity || 1)), formData.client_country)}
                                        </span>
                                                <button
                                                    onClick={() => { setEditingEquipmentId(equipment.id); setEquipmentEditForm(equipment); }}
                                                    className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-200 rounded"
                                                >
                                                    Editar
                                                </button>
                                        <button
                                            onClick={() => removeEquipment(equipment.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-medium text-gray-900">Total Equipos:</span>
                                    <span className="text-lg font-bold text-gray-900">
                                        {formatEquipmentPrice((formData.equipment_total || 0), formData.client_country)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resumen de totales */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Resumen de Totales</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-blue-800">Total Servicios:</span>
                        <span className="font-medium">{formatEquipmentPrice((formData.total_amount || 0), formData.client_country)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-blue-800">Total Equipos:</span>
                        <span className="font-medium">{formatEquipmentPrice((formData.equipment_total || 0), formData.client_country)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                        <span className="text-blue-900 font-medium">Total General:</span>
                        <span className="text-blue-900 font-bold">
                            {formatEquipmentPrice(((formData.total_amount || 0) + (formData.equipment_total || 0)), formData.client_country)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            {/* Se removieron bloques de recuperación TI y debug para una UI limpia */}
            
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Servicios Seleccionados 
                    {(formData.selected_services?.length || 0) > 0 && (
                        <span className="ml-2 text-sm font-normal text-green-600">
                            ({(formData.selected_services?.length || 0)} servicio{(formData.selected_services?.length || 0) !== 1 ? 's' : ''})
                        </span>
                    )}
                </h3>
                {(formData.selected_services?.length || 0) === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No hay servicios seleccionados</p>
                        <p className="text-sm mt-2">Selecciona servicios en el paso 2</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(formData.selected_services || []).map((service) => (
                            <div
                                key={service.id}
                                className="bg-white border border-gray-300 rounded-lg p-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                                        
                                        {/* Mostrar información de paquete si existe */}
                                        {service.packageId && (
                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded mr-4">
                                                <p className="text-xs font-medium text-blue-800 inline-flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Paquete: {service.packageName}</p>
                                                {service.complexity && (
                                                    <p className="text-xs text-blue-600">Complejidad: {service.complexity}</p>
                                                )}
                                                {service.estimatedDuration && (
                                                    <p className="text-xs text-blue-600">Duración: {service.estimatedDuration}</p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Mostrar componentes granulares */}
                                        {service.granularComponents && service.granularComponents.length > 0 && (
                                            <div className="mt-2 mr-4">
                                                <p className="text-xs text-gray-500 font-medium">Componentes incluidos:</p>
                                                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                                                    {service.granularComponents.map((comp: unknown, idx: number) => {
                                                        const component = comp as { name: string; quantity: number; unit: string; unitPrice?: number };
                                                        return (
                                                            <li key={idx} className="flex justify-between">
                                                                <span>• {component.name}</span>
                                                                <span className="text-gray-500">
                                                                    {component.quantity} {component.unit} × ${component.unitPrice?.toLocaleString() || 0}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium text-blue8">
                                            {formatCurrencyLocal(service.price)}
                                        </span>
                                        {service.category === 'servicios_ti' && (
                                            <p className="text-xs text-blue-600 mt-1">• Granular</p>
                                        )}
                                        {!isViewMode && (
                                        <button
                                            onClick={() => removeService(service.id)}
                                            className="text-red-600 hover:text-red-800 text-sm mt-2"
                                        >
                                            Eliminar
                                        </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Total:</span>
                                <span className="text-blue8">{formatCurrencyLocal(formData.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

                        {/* Sección de Equipos */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Equipos Seleccionados 
                    {(formData.selected_equipment?.length || 0) > 0 && (
                        <span className="ml-2 text-sm font-normal text-green-600">
                            ({(formData.selected_equipment?.length || 0)} equipo{(formData.selected_equipment?.length || 0) !== 1 ? 's' : ''})
                        </span>
                    )}
                </h3>
                {(formData.selected_equipment?.length || 0) === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No hay equipos seleccionados</p>
                        <p className="text-sm mt-2">Agrega equipos en el paso 3</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(formData.selected_equipment || []).map((equipment) => (
                            <div
                                key={equipment.id}
                                className="bg-white border border-gray-300 rounded-lg p-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900">{equipment.name}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{equipment.description}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                            <span>Cantidad: {equipment.quantity}</span>
                                            <span>Compra: {formatEquipmentPrice(equipment.purchase_price || 0, formData.client_country)}</span>
                                            <span>Venta: {formatEquipmentPrice(equipment.sale_price || 0, formData.client_country)}</span>
                                            <span>Categoría: {equipment.category}</span>
                                        </div>
                                        {equipment.notes && (
                                            <p className="text-xs text-gray-500 mt-2">Notas: {equipment.notes}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium text-green-600">
                                            {formatEquipmentPrice((equipment.sale_price || 0) * (equipment.quantity || 1), formData.client_country)}
                                        </span>
                                        {!isViewMode && (
                                            <button
                                                onClick={() => removeEquipment(equipment.id)}
                                                className="text-red-600 hover:text-red-800 text-sm mt-2 block"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Total Equipos:</span>
                                <span className="text-green-600">{formatEquipmentPrice(formData.equipment_total || 0, formData.client_country)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Resumen Final */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Resumen Final</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-700">Total Servicios:</span>
                        <span className="font-medium">{formatCurrencyLocal(formData.total_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-700">Total Equipos:</span>
                        <span className="font-medium">{formatEquipmentPrice(formData.equipment_total || 0, formData.client_country)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2">
                        <span className="text-gray-900 font-semibold">Subtotal:</span>
                        <span className="font-medium">
                            {formatCurrencyLocal((formData.total_amount || 0) + (formData.equipment_total || 0))}
                        </span>
                    </div>
                    
                    {/* Mostrar descuento si existe */}
                    {formData.discount_type !== 'none' && formData.discount_value > 0 && (
                        <>
                            <div className="flex justify-between text-green-600">
                                <span>Descuento ({formData.discount_type === 'percentage' ? `${formData.discount_value}%` : formatCurrencyLocal(formData.discount_value)}):</span>
                                <span className="font-medium">-{formatCurrencyLocal(calculateDiscount())}</span>
                            </div>
                            {formData.discount_description && (
                                <div className="text-xs text-gray-500 italic">
                                    {formData.discount_description}
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="flex justify-between">
                        <span className="text-gray-900 font-semibold">Total sin IVA:</span>
                        <span className="font-medium">
                            {formatCurrencyLocal(calculateFinalTotal())}
                        </span>
                    </div>
                    
                    <div className="flex justify-between">
                        <span className="text-gray-900 font-semibold">IVA 19%:</span>
                        <span className="font-medium">
                            {formatCurrencyLocal(calculateIVA())}
                        </span>
                    </div>
                    
                    <div className="flex justify-between border-t border-gray-300 pt-2">
                        <span className="text-gray-900 font-semibold">Total Final:</span>
                        <span className="text-gray-900 font-bold text-lg">
                            {formatCurrencyLocal(calculateTotalWithIVA())}
                        </span>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles Adicionales</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de Validez
                        </label>
                        <input
                            type="date"
                            value={formData.valid_until}
                            onChange={(e) => updateFormData('valid_until', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        />
                    </div>

                    {/* Sistema de Descuentos */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-3">Descuento Personalizado</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                    Tipo de Descuento
                                </label>
                                <select
                                    value={formData.discount_type}
                                    onChange={(e) => {
                                        const newType = e.target.value as 'percentage' | 'amount' | 'none';
                                        updateFormData('discount_type', newType);
                                        if (newType === 'none') {
                                            updateFormData('discount_value', 0);
                                            updateFormData('discount_description', '');
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="none">Sin descuento</option>
                                    <option value="percentage">Porcentaje (%)</option>
                                    <option value="amount">Monto fijo</option>
                                </select>
                            </div>

                            {formData.discount_type !== 'none' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-800 mb-2">
                                            {formData.discount_type === 'percentage' ? 'Porcentaje de Descuento' : 'Monto de Descuento'}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max={formData.discount_type === 'percentage' ? "100" : undefined}
                                                step={formData.discount_type === 'percentage' ? "0.01" : "1"}
                                                value={formData.discount_value}
                                                onChange={(e) => updateFormData('discount_value', parseFloat(e.target.value) || 0)}
                                                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder={formData.discount_type === 'percentage' ? "0.00" : "0"}
                                            />
                                            <span className="text-sm font-medium text-blue-800">
                                                {formData.discount_type === 'percentage' ? '%' : getCurrentCurrency().symbol}
                                            </span>
                                        </div>
                                        {formData.discount_type === 'percentage' && formData.discount_value > 100 && (
                                            <p className="text-xs text-red-600 mt-1">El porcentaje no puede ser mayor al 100%</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-blue-800 mb-2">
                                            Descripción del Descuento
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.discount_description}
                                            onChange={(e) => updateFormData('discount_description', e.target.value)}
                                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: Descuento por cliente frecuente, promoción especial, etc."
                                        />
                                    </div>

                                    {/* Vista previa del descuento */}
                                    {formData.discount_value > 0 && (
                                        <div className="bg-white border border-blue-300 rounded-lg p-3">
                                            <div className="text-sm text-blue-800">
                                                <div className="flex justify-between mb-1">
                                                    <span>Subtotal:</span>
                                                    <span>{formatCurrencyLocal((formData.total_amount || 0) + (formData.equipment_total || 0))}</span>
                                                </div>
                                                <div className="flex justify-between mb-1 text-green-600">
                                                    <span>Descuento ({formData.discount_type === 'percentage' ? `${formData.discount_value}%` : formatCurrencyLocal(formData.discount_value)}):</span>
                                                    <span>-{formatCurrencyLocal(calculateDiscount())}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total sin IVA:</span>
                                                    <span>{formatCurrencyLocal(calculateFinalTotal())}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>IVA 19%:</span>
                                                    <span>{formatCurrencyLocal(calculateIVA())}</span>
                                                </div>
                                                <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
                                                    <span>Total Final:</span>
                                                    <span className="text-lg">{formatCurrencyLocal(calculateTotalWithIVA())}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notas Adicionales
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => updateFormData('notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Notas adicionales para el cliente..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Términos y Condiciones
                        </label>
                        <textarea
                            value={formData.terms_conditions}
                            onChange={(e) => updateFormData('terms_conditions', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Términos y condiciones de la cotización..."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mensaje de Validez del PDF
                        </label>
                        <textarea
                            value={formData.validity_message}
                            onChange={(e) => updateFormData('validity_message', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                            placeholder="Mensaje que aparecerá en el PDF después de los totales..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            💡 Usa {"{fecha}"} para que se reemplace automáticamente con la fecha de validez. 
                            Ejemplo: "Cotización válida hasta {"{fecha}"} por disponibilidad de equipos"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );



    // Funciones para manejar equipos
    const addEquipment = (equipment: Equipment) => {
        console.log('🔧 AGREGANDO EQUIPO:', equipment);
        
        setFormData(prev => {
            const currentEquipment = prev.selected_equipment || [];
            
            if (currentEquipment.find(e => e.id === equipment.id)) {
                console.log('⚠️ Equipo ya existe');
                return prev;
            }
            
            const newEquipment = [...currentEquipment, equipment];
            
            const updated = {
                ...prev,
                selected_equipment: newEquipment
            };
            
            // Guardar inmediatamente
            sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
            console.log('✅ EQUIPO AGREGADO:', updated);
            setEquipmentDirty(true);

            return updated;
        });
        
        // Recalcular totales después de agregar equipo
        setTimeout(() => recalculateTotals(), 0);
    };

    const removeEquipment = (equipmentId: string) => {
        const currentEquipment = formData.selected_equipment || [];
        const newEquipment = currentEquipment.filter(e => e.id !== equipmentId);
        updateFormData('selected_equipment', newEquipment);
        // Recalcular totales después de remover equipo
        setTimeout(() => recalculateTotals(), 0);
    };

    const updateEquipmentQuantity = (equipmentId: string, quantity: number) => {
        const currentEquipment = formData.selected_equipment || [];
        const newEquipment = currentEquipment.map(e => 
            e.id === equipmentId 
                ? { ...e, quantity: Math.max(1, quantity) }
                : e
        );
        updateFormData('selected_equipment', newEquipment);
        // Recalcular totales después de actualizar cantidad
        setTimeout(() => recalculateTotals(), 0);
    };

    // Funciones para manejar el formulario de equipos
    const updateEquipmentForm = (field: string, value: string) => {
        setEquipmentForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddEquipment = () => {
        // Validar campos requeridos
        if (!equipmentForm.name || !equipmentForm.purchase_price || !equipmentForm.sale_price) {
            alert('Por favor completa los campos requeridos: Nombre, Precio de Compra y Precio de Venta');
            return;
        }

        // Crear nuevo equipo
        const newEquipment: Equipment = {
            id: `equipment_${Date.now()}`,
            name: equipmentForm.name,
            description: equipmentForm.description,
            internet_link: equipmentForm.internet_link,
            purchase_price: parseFloat(equipmentForm.purchase_price),
            sale_price: parseFloat(equipmentForm.sale_price),
            quantity: parseInt(equipmentForm.quantity),
            category: equipmentForm.category,
            notes: equipmentForm.notes
        };

        // Agregar equipo a la lista
        addEquipment(newEquipment);

        // Limpiar formulario
        setEquipmentForm({
            name: "",
            description: "",
            internet_link: "",
            category: "",
            purchase_price: "",
            sale_price: "",
            quantity: "1",
            notes: ""
        });

        console.log('Equipo agregado:', newEquipment);
    };

    // Función para recalcular totales cuando se modifican servicios
    const recalculateTotals = () => {
        console.log('🔄 INICIANDO RECÁLCULO DE TOTALES');
        
        // Usar el estado actual del formData
        setFormData(prev => {
            console.log('Servicios actuales:', prev.selected_services);
            console.log('Equipos actuales:', prev.selected_equipment);
            
            const servicesTotal = prev.selected_services.reduce((sum, service) => {
                const servicePrice = service.price || 0;
                console.log(`Servicio ${service.name}: $${servicePrice}`);
                return sum + servicePrice;
            }, 0);
            
            const equipmentTotal = prev.selected_equipment.reduce((sum, equipment) => {
                const equipmentPrice = (equipment.sale_price || 0) * (equipment.quantity || 1);
                console.log(`Equipo ${equipment.name}: $${equipment.sale_price} × ${equipment.quantity} = $${equipmentPrice}`);
                return sum + equipmentPrice;
            }, 0);
            
            console.log('🔄 TOTALES CALCULADOS:', {
                servicesTotal,
                equipmentTotal,
                finalTotal: servicesTotal + equipmentTotal
            });
            
            const updated = {
                ...prev,
                total_amount: servicesTotal,
                equipment_total: equipmentTotal
            };
            
            // Guardar inmediatamente en sessionStorage
            sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
            
            return updated;
        });
    };

    // Función para actualizar un servicio existente y recalcular totales
    const updateService = (serviceId: string, updatedService: Service) => {
        console.log('🔄 ACTUALIZANDO SERVICIO:', serviceId, updatedService);
        
        setFormData(prev => {
            const updatedServices = prev.selected_services.map(s => 
                s.id === serviceId ? updatedService : s
            );
            
            const updated = {
                ...prev,
                selected_services: updatedServices
            };
            
            // Guardar inmediatamente
            sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
            setEquipmentDirty(true);
            
            console.log('✅ SERVICIO ACTUALIZADO EN ESTADO');
            console.log('Servicios actualizados:', updatedServices);
            
            return updated;
        });
        
        // Recalcular totales después de actualizar
        setTimeout(() => {
            console.log('🔄 RECALCULANDO TOTALES DESPUÉS DE ACTUALIZAR SERVICIO');
            recalculateTotals();
        }, 100);
    };
    
    // Función específica para actualizar servicios TI
    const updateTIService = (updatedService: Service) => {
        console.log('🔄 ACTUALIZANDO SERVICIO TI:', updatedService);
        
        setFormData(prev => {
            const updatedServices = prev.selected_services.map(s => 
                s.id === updatedService.id ? updatedService : s
            );
            
            const updated = {
                ...prev,
                selected_services: updatedServices
            };
            
            // Guardar inmediatamente
            sessionStorage.setItem('quoteFormData', JSON.stringify(updated));
            setEquipmentDirty(true);
            
            console.log('✅ SERVICIO TI ACTUALIZADO EN ESTADO');
            console.log('Servicios actualizados:', updatedServices);
            
            return updated;
        });
        
        // Recalcular totales inmediatamente
        setTimeout(() => {
            console.log('🔄 RECALCULANDO TOTALES DESPUÉS DE ACTUALIZAR SERVICIO TI');
            recalculateTotals();
        }, 50);
    };

    // Función para forzar actualización desde tiQuoteData
    const forceUpdateFromTIData = () => {
        console.log('🔧 FORZANDO ACTUALIZACIÓN DESDE DATOS TI');
        const tiQuoteData = sessionStorage.getItem('tiQuoteData');
        if (tiQuoteData) {
            try {
                const updatedData = JSON.parse(tiQuoteData);
                console.log('🔧 DATOS TI ENCONTRADOS:', updatedData);
                
                if (updatedData.selected_services && updatedData.selected_services.length > 0) {
                    console.log('🔧 ACTUALIZANDO SERVICIOS TI:', updatedData.selected_services);
                    
                    // Actualizar cada servicio TI
                    updatedData.selected_services.forEach((service: any) => {
                        if (service.category === 'servicios_ti') {
                            console.log('🔧 FORZANDO ACTUALIZACIÓN DE SERVICIO TI:', service.name, 'Precio:', service.price);
                            updateTIService(service as Service);
                        }
                    });
                    
                    // Limpiar datos TI después de actualizar
                    setTimeout(() => {
                        sessionStorage.removeItem('tiQuoteData');
                        sessionStorage.removeItem('originalTIService');
                        sessionStorage.removeItem('selectedTIService');
                        console.log('✅ DATOS TI LIMPIADOS DESPUÉS DE ACTUALIZACIÓN');
                    }, 500);
                    
                    console.log('✅ ACTUALIZACIÓN FORZADA COMPLETADA');
                } else {
                    console.log('❌ No hay servicios en los datos TI');
                }
            } catch (error) {
                console.error('❌ Error en actualización forzada:', error);
            }
        } else {
            console.log('❌ No hay datos TI para actualizar');
            
            // Verificar si hay datos en quoteFormData que necesiten actualización
            const quoteFormData = sessionStorage.getItem('quoteFormData');
            if (quoteFormData) {
                try {
                    const formData = JSON.parse(quoteFormData);
                    console.log('🔧 VERIFICANDO DATOS EN QUOTEFORMDATA:', formData.selected_services);
                    
                    // FORZAR ACTUALIZACIÓN DEL ESTADO DESDE SESSIONSTORAGE
                    console.log('🔧 FORZANDO ACTUALIZACIÓN DEL ESTADO DESDE SESSIONSTORAGE');
                    setFormData(formData);
                    
                    // Recalcular totales para asegurar que estén actualizados
                    setTimeout(() => {
                        recalculateTotals();
                        console.log('✅ TOTALES RECALCULADOS DESDE QUOTEFORMDATA');
                    }, 100);
                } catch (error) {
                    console.error('❌ Error verificando quoteFormData:', error);
                }
            }
        }
    };





    return (
        <div className="p-4 sm:p-6 w-[98%] sm:w-[95%] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/admin/quotes")}
                        className="p-2 text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isViewMode ? 'Ver Cotización' : isEditMode ? 'Editar Cotización' : 'Nueva Cotización'}
                        </h1>
                        <p className="text-gray-600">
                            {isViewMode ? 'Visualizar cotización existente' : isEditMode ? 'Modificar cotización existente' : 'Crear una nueva cotización para el cliente'}
                        </p>
                        {isViewMode && (
                            <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full inline-flex items-center gap-1.5">
                                <Eye className="w-4 h-4" />
                                <span>Modo Solo Lectura</span>
                    </div>
                        )}
                        {isEditMode && (
                            <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full inline-flex items-center gap-1.5">
                                <Edit className="w-4 h-4" />
                                <span>Modo Edición</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                    {/* Botón Nueva Cotización */}
                    {!isViewMode && !isEditMode && (
                        <button
                            onClick={clearForNewQuote}
                            className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm"
                            title="Iniciar una nueva cotización desde cero"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Cotización
                        </button>
                    )}
                    
                    
                    
                    {/* Botón Cancelar */}
                    {!isViewMode && (
                        <button
                            onClick={confirmCancelQuote}
                            className="px-4 py-2 text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm"
                        >
                            <XCircle className="w-4 h-4" />
                            Cancelar
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-center">
                    {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= step
                                    ? 'bg-blue8 text-white'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                {step}
                            </div>
                            {step < 4 && (
                                <div className={`w-16 h-1 mx-2 ${
                                    currentStep > step ? 'bg-blue8' : 'bg-gray-200'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-center mt-2">
                    <span className="text-sm text-gray-600">
                        {currentStep === 1 && "Información del Cliente"}
                        {currentStep === 2 && "Selección de Servicios"}
                        {currentStep === 3 && "Equipos y Materiales"}
                        {currentStep === 4 && "Revisión y Finalización"}
                    </span>
                </div>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}

                {/* Navigation Buttons */}
            <div className="mt-8 pt-6 border-t">
                {/* Botones de navegación - Una sola fila */}
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        {currentStep > 1 && (
                    <button
                                onClick={() => setCurrentStep(1)}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                                <ChevronLeft className="w-4 h-4" />
                                Editar Cliente
                    </button>
                        )}
                        {currentStep > 2 && (
                            <button
                                onClick={() => setCurrentStep(2)}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Editar Servicios
                            </button>
                        )}
                        {currentStep > 3 && (
                            <button
                                onClick={() => setCurrentStep(3)}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Editar Equipos
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {currentStep < 4 ? (
                            <>
                                {/* Botón "Guardar y Volver" para modo edición en paso 1 */}
                                {isEditMode && currentStep === 1 && (
                                    <button
                                        onClick={async () => {
                                            // Guardar los cambios del cliente
                                            await handleSaveDraft();
                                            // Volver al resumen (paso 4)
                                            setCurrentStep(4);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar Cliente
                                    </button>
                                )}
                                {/* Botón "Guardar y Volver" para modo edición en paso 2 */}
                                {isEditMode && currentStep === 2 && (
                                    <button
                                        onClick={async () => {
                                            // Guardar los cambios de servicios
                                            await handleSaveDraft();
                                            // Volver al resumen (paso 4)
                                            setCurrentStep(4);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar Servicios
                                    </button>
                                )}
                                {/* Botón "Guardar y Volver" para modo edición en paso 3 */}
                                {isEditMode && currentStep === 3 && (
                                    <button
                                        onClick={async () => {
                                            // Guardar los cambios de equipos
                                            await handleSaveDraft();
                                            // Volver al resumen (paso 4)
                                            setCurrentStep(4);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar Equipos
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (currentStep === 1) {
                                            if (validateStep1()) {
                                                setCurrentStep(currentStep + 1);
                                            }
                                        } else {
                                            setCurrentStep(currentStep + 1);
                                        }
                                    }}
                                    className="px-6 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 transition-colors flex items-center gap-2 text-sm"
                                >
                                    Siguiente
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </>
                        ) : null}
                        {currentStep === 4 && (
                            <>
                                {isViewMode ? (
                                    <>
                                        <button
                                            onClick={handlePreviewPDF}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Preview PDF
                                        </button>
                                        <button
                                            onClick={handleGeneratePDF}
                                            className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Generar PDF
                                        </button>
                                        <button
                                            onClick={handleSendPDFByEmail}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Enviar Email
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsViewMode(false);
                                                setIsEditMode(true);
                                                // Agregar parámetro edit=true a la URL para que se guarde como edición
                                                const url = new URL(window.location.href);
                                                url.searchParams.set('edit', 'true');
                                                url.searchParams.set('view', 'false');
                                                if (currentQuoteId) {
                                                    url.searchParams.set('id', currentQuoteId);
                                                }
                                                window.history.replaceState({}, '', url.toString());
                                            }}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Editar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleSaveDraft}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Save className="w-4 h-4" />
                                            Guardar Borrador
                                        </button>
                                        <button
                                            onClick={handleSendQuote}
                                            className="px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Send className="w-4 h-4" />
                                            Enviar Cotización
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 