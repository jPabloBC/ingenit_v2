"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    Package, 
    Settings2, 
    Calculator,
    CheckCircle,
    XCircle,
    Plus,
    Minus,
    Save,
    RotateCcw
} from "lucide-react";
import { 
    getAllNetworkComponents,
    getAllNetworkPackages,
    getComponentsByCategory,
    getComponentsBySubcategory,
    createServiceConfiguration,
    calculateQuoteTotal,
    generateQuoteFromPackage,
    getComplexityDescription,
    getEstimatedDuration,
    TIServiceComponent,
    TIServicePackage,
    TIServiceConfiguration,
    TIServiceQuote
} from "@/lib/granularTIServices";
import { updatePricingFromMarket } from "@/lib/marketPricingService";
import { supabase } from "@/lib/supabaseClient";

export default function TIServicesPage() {
    const router = useRouter();
    const [components, setComponents] = useState<TIServiceComponent[]>([]);
    const [packages, setPackages] = useState<TIServicePackage[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPackage, setSelectedPackage] = useState<TIServicePackage | null>(null);
    const [configurations, setConfigurations] = useState<TIServiceConfiguration[]>([]);
    const [quote, setQuote] = useState<TIServiceQuote | null>(null);
    const [showPackageDetails, setShowPackageDetails] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        loadData();
        
        // Verificar que se accedió desde la cotización principal
        const selectedTIService = sessionStorage.getItem('selectedTIService');
        if (!selectedTIService) {
            // Si no hay servicio seleccionado, redirigir a la cotización principal
            router.push('/admin/quotes/create');
            return;
        }
        
        // Cargar datos del servicio seleccionado si existe
        try {
            const serviceData = JSON.parse(selectedTIService);
            console.log('🔧 Cargando servicio TI existente:', serviceData);
            
            // Si el servicio tiene componentes granulares, cargarlos
            if (serviceData.granularComponents && serviceData.granularComponents.length > 0) {
                console.log('🔧 Cargando componentes granulares existentes:', serviceData.granularComponents);
                
                // Crear configuraciones basadas en los componentes existentes
                const existingConfigurations = serviceData.granularComponents.map((comp: any) => {
                    const unitPrice = comp.unitPrice || comp.price || 0;
                    const quantity = comp.quantity || 1;
                    return {
                        componentId: comp.id || comp.name,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        totalPrice: unitPrice * quantity, // Calcular el totalPrice
                        name: comp.name,
                        category: comp.category,
                        subcategory: comp.subcategory
                    };
                });
                
                setConfigurations(existingConfigurations);
                console.log('✅ Configuraciones cargadas desde servicio existente:', existingConfigurations);
            }
            
            // Si el servicio tiene datos de paquete, cargarlos
            if (serviceData.packageId) {
                console.log('🔧 Cargando datos de paquete existente:', serviceData.packageId);
                // Aquí podrías cargar el paquete específico si es necesario
            }
            
        } catch (error) {
            console.error('❌ Error cargando servicio TI existente:', error);
        }
    }, []);

    // Monitorear cambios en configurations
    useEffect(() => {
        console.log('Configurations actualizadas:', configurations);
        console.log('Número de configuraciones:', configurations.length);
    }, [configurations]);

    const loadData = async () => {
        // Cargar base local
        let baseComponents = getAllNetworkComponents();
        const basePackages = getAllNetworkPackages();

        try {
            // Leer precios de biblioteca para Chile y mapear por service_id
            const { data: pricing, error } = await supabase
                .from('rt_pricing_library')
                .select('service_id, base_price, country, updated_at')
                .eq('country', 'Chile');
            if (!error && pricing) {
                const priceMap = new Map<string, number>();
                pricing.forEach(p => {
                    if (p.service_id && typeof p.base_price === 'number') {
                        // Sanitizar: evitar valores absurdos
                        const clean = Number(p.base_price);
                        if (Number.isFinite(clean) && clean > 0 && clean < 10_000_000) {
                            priceMap.set(p.service_id, Math.round(clean));
                        }
                    }
                });
                // Alias conocidos entre IDs de granular y service_id de biblioteca
                const aliasMap = new Map<string, string>([
                    ['cable_utp_cat6_metro', 'cable_utp_cat6'],
                    ['cable_utp_cat6a_metro', 'cable_utp_cat6a'],
                    ['switch_24puertos_basico', 'switch_24puertos'],
                    ['switch_48puertos_basico', 'switch_48puertos'],
                ]);
                // Actualizar en memoria los basePrice cuando exista match por id
                baseComponents = baseComponents.map(c => {
                    const mapped = priceMap.get(c.id) ?? priceMap.get(aliasMap.get(c.id) || '');
                    if (mapped && mapped > 0 && mapped < 10_000_000) {
                        return { ...c, basePrice: mapped };
                    }
                    return c;
                });
            }
        } catch (e) {
            console.warn('No se pudo leer pricing_library, se usan precios locales', e);
        }

        // Reemplazar precios de componentes también dentro de los paquetes
        const compMap = new Map(baseComponents.map(c => [c.id, c] as [string, TIServiceComponent]));
        const updatedPackages = basePackages.map(pkg => ({
            ...pkg,
            components: pkg.components.map(c => {
                const newer = compMap.get(c.id);
                return newer ? { ...c, basePrice: newer.basePrice } : c;
            })
        }));

        setComponents(baseComponents);
        setPackages(updatedPackages);
    };

    // Obtener categorías únicas
    const categories = [...new Set(components.map(c => c.category))];
    const subcategories = selectedCategory 
        ? [...new Set(components.filter(c => c.category === selectedCategory).map(c => c.subcategory))]
        : [];

    // Filtrar componentes
    const filteredComponents = components.filter(component => {
        const matchesCategory = !selectedCategory || component.category === selectedCategory;
        const matchesSubcategory = !selectedSubcategory || component.subcategory === selectedSubcategory;
        const matchesSearch = !searchTerm || 
            component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            component.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesCategory && matchesSubcategory && matchesSearch;
    });

    // Agregar componente a la cotización
    const addComponentToQuote = (component: TIServiceComponent, quantity: number = 1) => {
        const existingConfig = configurations.find(c => c.componentId === component.id);
        
        if (existingConfig) {
            setConfigurations(configurations.map(config => 
                config.componentId === component.id 
                    ? { ...config, quantity: config.quantity + quantity }
                    : config
            ));
        } else {
            const newConfig = createServiceConfiguration(component.id, quantity);
            setConfigurations([...configurations, newConfig]);
        }
    };

    // Agregar paquete completo a la cotización
    const addPackageToQuote = (package_: TIServicePackage) => {
        const packageConfigurations = package_.components.map(component => ({
            componentId: component.id,
            quantity: 1,
            unitPrice: component.basePrice,
            totalPrice: component.basePrice,
            notes: `Incluido en paquete ${package_.name}`
        }));
        
        setConfigurations(packageConfigurations);
        console.log(`Paquete "${package_.name}" agregado con ${package_.components.length} componentes`);
    };

    // Remover componente de la cotización
    const removeComponentFromQuote = (componentId: string) => {
        setConfigurations(configurations.filter(config => config.componentId !== componentId));
    };

    // Actualizar cantidad de componente
    const updateComponentQuantity = (componentId: string, quantity: number) => {
        if (quantity <= 0) {
            removeComponentFromQuote(componentId);
        } else {
            setConfigurations(configurations.map(config => 
                config.componentId === componentId 
                    ? { ...config, quantity, totalPrice: config.unitPrice * quantity }
                    : config
            ));
        }
    };

    // Generar cotización desde paquete
    const generateQuoteFromSelectedPackage = () => {
        if (!selectedPackage) return;
        
        // Solo seleccionar el paquete, no agregar configuraciones automáticamente
        // Las configuraciones se agregarán cuando el usuario haga clic en "Agregar Componentes del Paquete"
        console.log(`Paquete "${selectedPackage.name}" seleccionado. Haz clic en "Agregar Componentes del Paquete" para personalizar.`);
    };

    // Limpiar cotización
    const clearQuote = () => {
        setConfigurations([]);
        setQuote(null);
        setSelectedPackage(null);
    };

    // Función para continuar con la cotización
    const continueToQuote = async () => {
        // Permitir continuar si hay componentes O si hay un paquete seleccionado
        if (configurations.length > 0 || selectedPackage) {
            let tiQuoteData;
            
            if (selectedPackage && configurations.length > 0) {
                // Si hay un paquete seleccionado Y configuraciones modificadas, usar las configuraciones actuales
                const packageQuote = generateQuoteFromPackage(selectedPackage.id, configurations);
                tiQuoteData = {
                    type: 'ti_services',
                    packageId: selectedPackage.id,
                    packageName: selectedPackage.name,
                    configurations: configurations, // Usar las configuraciones modificadas
                    totalAmount: calculateQuoteTotal(configurations), // Usar el total calculado
                    complexity: packageQuote.complexity,
                    estimatedDuration: packageQuote.estimatedDuration,
                    isPackage: true, // Marcar como paquete
                    components: configurations.map(config => {
                        const component = components.find(c => c.id === config.componentId);
                        return {
                            id: config.componentId,
                            name: component?.name || 'Componente',
                            quantity: config.quantity,
                            unitPrice: config.unitPrice,
                            totalPrice: config.totalPrice,
                            unit: component?.unit || 'unidad'
                        };
                    })
                };
            } else if (selectedPackage && configurations.length === 0) {
                // Si hay un paquete seleccionado pero no hay configuraciones, crear las configuraciones por defecto
                const packageConfigurations = selectedPackage.components.map(component => ({
                    componentId: component.id,
                    quantity: 1,
                    unitPrice: component.basePrice,
                    totalPrice: component.basePrice,
                    notes: `Incluido en paquete ${selectedPackage.name}`
                }));
                
                const packageQuote = generateQuoteFromPackage(selectedPackage.id, packageConfigurations);
                tiQuoteData = {
                    type: 'ti_services',
                    packageId: selectedPackage.id,
                    packageName: selectedPackage.name,
                    configurations: packageConfigurations,
                    totalAmount: packageQuote.totalAmount,
                    complexity: packageQuote.complexity,
                    estimatedDuration: packageQuote.estimatedDuration,
                    isPackage: true, // Marcar como paquete
                    components: packageConfigurations.map(config => {
                        const component = components.find(c => c.id === config.componentId);
                        return {
                            id: config.componentId,
                            name: component?.name || 'Componente',
                            quantity: config.quantity,
                            unitPrice: config.unitPrice,
                            totalPrice: config.totalPrice,
                            unit: component?.unit || 'unidad'
                        };
                    })
                };
            } else {
                // Si no hay paquete, usar componentes individuales
                tiQuoteData = {
                    type: 'ti_services',
                    configurations: configurations,
                    totalAmount: currentTotal,
                    components: configurations.map(config => {
                        const component = components.find(c => c.id === config.componentId);
                        return {
                            id: config.componentId,
                            name: component?.name || 'Componente',
                            quantity: config.quantity,
                            unitPrice: config.unitPrice,
                            totalPrice: config.totalPrice,
                            unit: component?.unit || 'unidad'
                        };
                    })
                };
            }
            
            // Guardar en sessionStorage para recuperar en la página de cotización
            sessionStorage.setItem('tiQuoteData', JSON.stringify(tiQuoteData));
            
            // También guardar el servicio original seleccionado
            const selectedTIService = sessionStorage.getItem('selectedTIService');
            if (selectedTIService) {
                sessionStorage.setItem('originalTIService', selectedTIService);
            }
            
            console.log('Datos de servicios TI guardados:', tiQuoteData);
            
            // Continuar al paso 2 de la cotización (servicios)
            const urlParams = new URLSearchParams(window.location.search);
            const editMode = urlParams.get('edit');
            const quoteId = urlParams.get('id');
            
            console.log('🔍 DEBUG PARÁMETROS TI-SERVICES:');
            console.log('- URL completa:', window.location.href);
            console.log('- URL search:', window.location.search);
            console.log('- editMode:', editMode);
            console.log('- quoteId:', quoteId);
            
            // ACTUALIZAR SERVICIO TI DIRECTAMENTE EN FORM DATA Y BASE DE DATOS
            if (editMode === 'true' && quoteId) {
                const quoteFormData = sessionStorage.getItem('quoteFormData');
                if (quoteFormData) {
                    const formData = JSON.parse(quoteFormData);
                    const originalService = sessionStorage.getItem('originalTIService');
                    
                    if (originalService) {
                        const original = JSON.parse(originalService);
                        
                        // Actualizar el servicio existente
                        const updatedServices = formData.selected_services.map((service: any) => 
                            service.id === original.id 
                                ? { ...service, price: tiQuoteData.totalAmount, granularComponents: tiQuoteData.components }
                                : service
                        );
                        
                        const updatedFormData = {
                            ...formData,
                            selected_services: updatedServices,
                            total_amount: updatedServices.reduce((total: number, service: any) => total + (service.price || 0), 0) + (formData.equipment_total || 0)
                        };
                        
                        // Actualizar sessionStorage
                        sessionStorage.setItem('quoteFormData', JSON.stringify(updatedFormData));
                        console.log('✅ SERVICIO TI ACTUALIZADO EN SESSIONSTORAGE');
                        
                        // TAMBIÉN GUARDAR EN TIQUOTEDATA PARA DETECCIÓN AUTOMÁTICA
                        const tiDataForDetection = {
                            selected_services: updatedServices,
                            total_amount: updatedFormData.total_amount
                        };
                        sessionStorage.setItem('tiQuoteData', JSON.stringify(tiDataForDetection));
                        console.log('✅ DATOS TI GUARDADOS PARA DETECCIÓN AUTOMÁTICA:', tiDataForDetection);
                        
                        // ACTUALIZAR EN LA BASE DE DATOS
                        try {
                            console.log('🔄 ACTUALIZANDO COTIZACIÓN EN BASE DE DATOS:', quoteId);
                            const { data, error } = await supabase
                                .from("rt_quotes")
                                .update({
                                    services: updatedServices,
                                    total_amount: updatedFormData.total_amount,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', quoteId)
                                .select();

                            if (error) {
                                console.error('❌ Error actualizando en base de datos:', error);
                                throw error;
                            }

                            console.log('✅ COTIZACIÓN ACTUALIZADA EN BASE DE DATOS:', data);
                            console.log('📋 Servicios actualizados en DB:', data[0]?.services);
                            console.log('💰 Total actualizado en DB:', data[0]?.total_amount);
                        } catch (dbError) {
                            console.error('❌ Error al actualizar en base de datos:', dbError);
                            // No lanzar error para no interrumpir el flujo, solo log
                        }
                    }
                }
            }
            
            let redirectUrl = '/admin/quotes/create?step=2';
            if (editMode === 'true' && quoteId) {
                redirectUrl += `&edit=true&id=${quoteId}`;
            }
            console.log('🔒 VOLVIENDO AL PASO 2 (SERVICIOS):', redirectUrl);
            console.log('🔒 PARÁMETROS DE EDICIÓN PRESERVADOS:', { editMode, quoteId });
            
            // FORZAR PRESERVACIÓN DE PARÁMETROS DE EDICIÓN
            if (editMode === 'true' && quoteId) {
                sessionStorage.setItem('editMode', 'true');
                sessionStorage.setItem('editQuoteId', quoteId);
            }
            
            router.push(redirectUrl);
        } else {
            alert('Por favor selecciona al menos un componente o un paquete antes de continuar.');
        }
    };

    // Calcular total actual
    const currentTotal = calculateQuoteTotal(configurations);

    // Calcular precio del paquete seleccionado
    const calculateSelectedPackagePrice = () => {
        if (!selectedPackage) return 0;
        return selectedPackage.components.reduce((total, component) => {
            return total + component.basePrice;
        }, 0);
    };

    // Obtener precio del paquete seleccionado
    const selectedPackagePrice = calculateSelectedPackagePrice();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-[98%] sm:w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Configuración de Servicios TI
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Selecciona los componentes específicos para tu proyecto
                            </p>
                            {isClient && (() => {
                                try {
                                    const selectedTIService = sessionStorage.getItem('selectedTIService');
                                    if (selectedTIService) {
                                        const service = JSON.parse(selectedTIService);
                                        return (
                                            <p className="text-sm text-blue-600 mt-1">
                                                Configurando: <strong>{service.name}</strong>
                                            </p>
                                        );
                                    }
                                } catch (e) {
                                    console.error('Error reading sessionStorage:', e);
                                }
                                return null;
                            })()}
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={async () => {
                                    try {
                                        // 1) Actualizar pricing_library desde mercado
                                        await updatePricingFromMarket();
                                        // 2) Recargar componentes aplicando precios de biblioteca
                                        await loadData();
                                        alert('✅ Precios sincronizados con mercado y biblioteca');
                                    } catch (e) {
                                        console.error('Error sincronizando precios:', e);
                                        alert('❌ Error sincronizando precios');
                                    }
                                }}
                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                title="Sincronizar precios desde mercado a biblioteca y aplicar aquí"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Sincronizar precios
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Paso 2 de 3:</strong> Configuración detallada de servicios TI. 
                            Una vez que hayas seleccionado todos los componentes necesarios, 
                            haz clic en "Continuar con Cotización" para proceder al paso final.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Panel Izquierdo - Componentes */}
                    <div className="xl:col-span-2">
                        {/* Filtros */}
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <Settings2 className="w-5 h-5 text-gray-500" />
                                <h3 className="font-medium text-gray-900">Filtros</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Búsqueda */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar componentes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                    />
                                    <XCircle className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                </div>

                                {/* Categoría */}
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSelectedSubcategory("");
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                >
                                    <option value="">Todas las categorías</option>
                                    {categories.map(category => (
                                        <option key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </option>
                                    ))}
                                </select>

                                {/* Subcategoría */}
                                <select
                                    value={selectedSubcategory}
                                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                    disabled={!selectedCategory}
                                >
                                    <option value="">Todas las subcategorías</option>
                                    {subcategories.map(subcategory => (
                                        <option key={subcategory} value={subcategory}>
                                            {subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Lista de Componentes */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Componentes Disponibles ({filteredComponents.length})
                                </h3>
                                {!selectedPackage && (
                                    <p className="text-sm text-orange-600 mt-1">
                                        ⚠️ Primero debes seleccionar un paquete predefinido para poder agregar componentes
                                    </p>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {filteredComponents.map((component) => (
                                        <div key={component.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    <h4 className="font-medium text-gray-900">{component.name}</h4>
                                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                        {component.category}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{component.description}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span>Unidad: {component.unit}</span>
                                                    <span>Precio: ${component.basePrice.toLocaleString('es-CL')} CLP</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3 sm:mt-0">
                                                <button
                                                    onClick={() => addComponentToQuote(component)}
                                                    disabled={!selectedPackage}
                                                    className={`p-2 rounded-lg ${
                                                        selectedPackage 
                                                            ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                                                            : 'text-gray-400 cursor-not-allowed'
                                                    }`}
                                                    title={selectedPackage ? 'Agregar componente' : 'Primero selecciona un paquete predefinido'}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel Derecho - Cotización */}
                    <div className="space-y-6">
                        {/* Paquetes Predefinidos */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Paquetes Predefinidos
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {packages.map((package_) => (
                                        <div key={package_.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-900">{package_.name}</h4>
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    package_.complexity === 'basic' ? 'bg-green-100 text-green-800' :
                                                    package_.complexity === 'standard' ? 'bg-blue-100 text-blue-800' :
                                                    package_.complexity === 'advanced' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {package_.complexity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">{package_.description}</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPackage(package_);
                                                        setShowPackageDetails(!showPackageDetails);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                                >
                                                    Ver detalles
                                                    {showPackageDetails && selectedPackage?.id === package_.id ? 
                                                        <RotateCcw className="w-4 h-4" /> : 
                                                        <RotateCcw className="w-4 h-4" />
                                                    }
                                                </button>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPackage(package_);
                                                            generateQuoteFromSelectedPackage();
                                                        }}
                                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                                                    >
                                                        Seleccionar Paquete
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Detalles del paquete */}
                                            {showPackageDetails && selectedPackage?.id === package_.id && (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-medium text-gray-900 mb-2">Componentes incluidos:</h5>
                                                    <div className="space-y-2">
                                                        {package_.components.map((component, index) => (
                                                            <div key={index} className="flex items-center gap-2 text-sm">
                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                                <span>{component.name}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    ({component.unit})
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Duración estimada:</strong> {getEstimatedDuration(package_.complexity)}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Descripción:</strong> {getComplexityDescription(package_.complexity)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Cotización Actual */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Cotización Actual
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Total: ${currentTotal.toLocaleString('es-CL')} CLP
                                </p>
                            </div>
                            <div className="p-6">
                                {configurations.length > 0 ? (
                                    <div className="space-y-4">
                                        {configurations.map((config) => {
                                            const component = components.find(c => c.id === config.componentId);
                                            if (!component) return null;
                                            
                                            return (
                                                <div key={config.componentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900">{component.name}</h4>
                                                        <p className="text-sm text-gray-600">
                                                            ${config.unitPrice.toLocaleString('es-CL')} x {config.quantity} {component.unit}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateComponentQuantity(config.componentId, config.quantity - 1)}
                                                            className="p-1 text-gray-600 hover:text-gray-800"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={config.quantity}
                                                            onChange={(e) => {
                                                                const newQuantity = parseInt(e.target.value) || 1;
                                                                updateComponentQuantity(config.componentId, newQuantity);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                // Permitir solo números, backspace, delete, arrow keys
                                                                if (!/[0-9]/.test(e.key) && 
                                                                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="w-12 text-center text-sm font-medium border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            style={{
                                                                // Eliminar flechas del input number
                                                                WebkitAppearance: 'none',
                                                                MozAppearance: 'textfield',
                                                                appearance: 'none'
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => updateComponentQuantity(config.componentId, config.quantity + 1)}
                                                            className="p-1 text-gray-600 hover:text-gray-800"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-sm font-medium text-gray-900 ml-2">
                                                            ${config.totalPrice.toLocaleString('es-CL')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-lg font-medium text-gray-900">Total:</span>
                                                <span className="text-lg font-bold text-gray-900">
                                                    ${currentTotal.toLocaleString('es-CL')} CLP
                                                </span>
                                            </div>
                                            
                                            {/* Botones de acción */}
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await continueToQuote();
                                                        } catch (error) {
                                                            console.error('Error al continuar con la cotización:', error);
                                                        }
                                                    }}
                                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    Continuar con Cotización
                                                </button>
                                                <button
                                                    onClick={clearQuote}
                                                    className="w-full px-4 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                                >
                                                    Limpiar Cotización
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : selectedPackage && configurations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <Package className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                                            <h4 className="font-medium text-blue-900 mb-2">Paquete Seleccionado</h4>
                                            <p className="text-blue-800 font-medium">{selectedPackage.name}</p>
                                            <p className="text-sm text-blue-600 mt-1">
                                                ${selectedPackagePrice.toLocaleString('es-CL')} CLP
                                            </p>
                                            <div className="mt-3 text-xs text-blue-600">
                                                <p>• {selectedPackage.components.length} componentes incluidos</p>
                                                <p>• Duración: {getEstimatedDuration(selectedPackage.complexity)}</p>
                                                <p>• Complejidad: {getComplexityDescription(selectedPackage.complexity)}</p>
                                                <p className="mt-2 text-blue-700 font-medium">
                                                    💡 Haz clic en "Agregar Componentes del Paquete" para personalizar
                                                </p>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-3">
                                                <button
                                                    onClick={() => {
                                                        console.log('Botón "Agregar Componentes del Paquete" presionado');
                                                        console.log('selectedPackage:', selectedPackage);
                                                        
                                                        // Agregar el paquete completo usando la nueva función
                                                        addPackageToQuote(selectedPackage);
                                                    }}
                                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Agregar Componentes del Paquete
                                                </button>
                                                <button
                                                    onClick={clearQuote}
                                                    className="w-full px-4 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                                >
                                                    Cambiar Selección
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>No hay componentes en la cotización</p>
                                        <p className="text-sm">Agrega componentes o selecciona un paquete</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cotización Generada */}
                        {quote && (
                            <div className="bg-blue-50 rounded-lg p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Calculator className="w-6 h-6 text-blue-600" />
                                    <h3 className="text-lg font-medium text-blue-900">
                                        Cotización Generada
                                    </h3>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-blue-800">Paquete:</span>
                                        <span className="text-sm font-medium text-blue-900">{quote.packageId}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-blue-800">Complejidad:</span>
                                        <span className="text-sm font-medium text-blue-900">{quote.complexity}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-blue-800">Duración:</span>
                                        <span className="text-sm font-medium text-blue-900">{quote.estimatedDuration}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-blue-800">Total:</span>
                                        <span className="text-lg font-bold text-blue-900">
                                            ${quote.totalAmount.toLocaleString('es-CL')} CLP
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <button
                                        onClick={() => {
                                            // Aquí se podría guardar la cotización
                                            console.log('Guardando cotización:', quote);
                                        }}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Guardar Cotización
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 