"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    RefreshCw, 
    TrendingUp, 
    TrendingDown,
    DollarSign,
    Globe,
    Clock,
    ChevronDown,
    ChevronUp,
    Search,
    X
} from "lucide-react";
import { getLocalPricingData, updatePricingFromLocal } from "@/lib/localPricingService";

interface PricingItem {
  id: string;
  name: string;
  category: string;
  base_price: number;
  country: string;
  region?: string;
  last_updated: string;
}

interface PriceTrend {
  date: string;
  price: number;
}

export default function MarketPricesPage() {
    const router = useRouter();
    const [pricingData, setPricingData] = useState<PricingItem[]>([]);
    const [filteredData, setFilteredData] = useState<PricingItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedCountry, setSelectedCountry] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
    const [priceHistory, setPriceHistory] = useState<PriceTrend[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [showAllPrices, setShowAllPrices] = useState(false);
    const [showAllTrends, setShowAllTrends] = useState(false);
    const [searchTrends, setSearchTrends] = useState("");

    useEffect(() => {
        loadMarketData();
    }, []);

    const loadMarketData = async () => {
        try {
            setLoading(true);
            const data = await getLocalPricingData();
            // Convertir los datos al formato correcto
            const pricingItems: PricingItem[] = data.prices?.map((price: any) => ({
                id: price.component || price.id || Math.random().toString(),
                name: price.component || price.name || 'Componente',
                category: price.category || 'general',
                base_price: price.price || 0,
                country: price.country || 'Chile',
                region: price.region,
                last_updated: price.lastUpdated || new Date().toISOString()
            })) || [];
            setPricingData(pricingItems);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Error cargando datos locales:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePrices = async () => {
        try {
            setUpdating(true);
            await updatePricingFromLocal();
            await loadMarketData();
        } catch (error) {
            console.error("Error actualizando precios:", error);
        } finally {
            setUpdating(false);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-CL');
    };

    // Función para filtrar precios por término de búsqueda
    const getFilteredPrices = () => {
        if (!pricingData) return [];
        if (!searchTerm.trim()) return pricingData;
        
        return pricingData.filter((price: PricingItem) =>
            String(price.name).toLowerCase().replace(/_/g, ' ').includes(searchTerm.toLowerCase())
        );
    };

    // Función para filtrar tendencias por término de búsqueda
    const getFilteredTrends = () => {
        if (!pricingData) return [];
        if (!searchTrends.trim()) return pricingData.map(item => [String(item.name), item.base_price]);
        
        return pricingData
            .filter(item => String(item.name).toLowerCase().replace(/_/g, ' ').includes(searchTrends.toLowerCase()))
            .map(item => [String(item.name), item.base_price]);
    };

    // Función para limpiar búsquedas
    const clearSearch = () => {
        setSearchTerm("");
        setSearchTrends("");
    };

    const getPriceTrends = async (itemId: string) => {
    try {
      // Simular datos de tendencias de precios
      const trends = [
        { date: "2024-01", price: 100 },
        { date: "2024-02", price: 110 },
        { date: "2024-03", price: 105 },
        { date: "2024-04", price: 120 },
        { date: "2024-05", price: 115 }
      ];
      
      setPriceHistory(trends);
    } catch (error) {
      console.error("Error fetching price trends:", error);
    }
  };

  const handleEdit = (item: PricingItem) => {
    setEditingItem(item);
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
                                Precios de Mercado
                            </h1>
                            <p className="text-gray-600">
                                Monitoreo de precios en tiempo real
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {(searchTerm || searchTrends) && (
                            <button
                                onClick={clearSearch}
                                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <X className="w-4 h-4" />
                                Limpiar Búsquedas
                            </button>
                        )}
                        <button
                            onClick={handleUpdatePrices}
                            disabled={updating}
                            className="flex items-center gap-2 px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                            {updating ? 'Actualizando...' : 'Actualizar Precios'}
                        </button>
                    </div>
                </div>

                {/* Buscadores */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Buscador de Precios */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Search className="w-5 h-5 text-gray-500" />
                            <h3 className="font-medium text-gray-900">Buscar Servicios</h3>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por nombre de servicio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                            />
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {searchTerm && (
                            <p className="text-sm text-gray-600 mt-2">
                                {getFilteredPrices().length} resultados encontrados
                            </p>
                        )}
                    </div>

                    {/* Buscador de Tendencias */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingUp className="w-5 h-5 text-gray-500" />
                            <h3 className="font-medium text-gray-900">Buscar Tendencias</h3>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por nombre de servicio..."
                                value={searchTrends}
                                onChange={(e) => setSearchTrends(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                            />
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            {searchTrends && (
                                <button
                                    onClick={() => setSearchTrends("")}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {searchTrends && (
                            <p className="text-sm text-gray-600 mt-2">
                                {getFilteredTrends().length} resultados encontrados
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <Globe className="w-8 h-8 text-blue-500" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Servicios de Desarrollo</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {pricingData.length || 0}
                            </p>
                            <p className="text-xs text-gray-500">de 80+ servicios disponibles</p>
                        </div>
                    </div>
                </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                                                    <div className="flex items-center">
                                <DollarSign className="w-8 h-8 text-green-500" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Tendencias</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {Object.keys(pricingData || {}).length}
                                    </p>
                                </div>
                            </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center">
                            <Clock className="w-8 h-8 text-purple-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Última Actualización</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {lastUpdate ? formatDate(lastUpdate.toISOString()) : 'Nunca'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue8 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Cargando datos de mercado...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Precios de Componentes */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Precios de Componentes (CLP)
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="mb-4 flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                        Mostrando {getFilteredPrices().length} servicios
                                        {searchTerm && ` (filtrados por "${searchTerm}")`}
                                    </span>
                                    {getFilteredPrices().length > 10 && !searchTerm && (
                                        <button
                                            onClick={() => setShowAllPrices(!showAllPrices)}
                                            className="text-blue8 hover:text-blue6 text-sm font-medium flex items-center gap-1"
                                        >
                                            {showAllPrices ? 'Ver menos' : 'Ver todos'}
                                            {showAllPrices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {(searchTerm ? getFilteredPrices() : (showAllPrices ? getFilteredPrices() : getFilteredPrices().slice(0, 10)))?.length > 0 ? (
                                        (searchTerm ? getFilteredPrices() : (showAllPrices ? getFilteredPrices() : getFilteredPrices().slice(0, 10)))?.map((price: PricingItem) => (
                                        <div key={price.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-blue-600">
                                                        {price.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {price.name.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Fuente: {price.country}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900">
                                                    {formatCurrency(price.base_price, 'CLP')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(price.last_updated)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No se encontraron servicios</p>
                                            <p className="text-sm">Intenta con otro término de búsqueda</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tendencias de Precios */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Tendencias de Precios (%)
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="mb-4 flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                        Mostrando {getFilteredTrends().length} tendencias
                                        {searchTrends && ` (filtradas por "${searchTrends}")`}
                                    </span>
                                    {getFilteredTrends().length > 10 && !searchTrends && (
                                        <button
                                            onClick={() => setShowAllTrends(!showAllTrends)}
                                            className="text-blue8 hover:text-blue6 text-sm font-medium flex items-center gap-1"
                                        >
                                            {showAllTrends ? 'Ver menos' : 'Ver todos'}
                                            {showAllTrends ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {(searchTrends ? getFilteredTrends() : (showAllTrends ? getFilteredTrends() : getFilteredTrends().slice(0, 10))).length > 0 ? (
                                        (searchTrends ? getFilteredTrends() : (showAllTrends ? getFilteredTrends() : getFilteredTrends().slice(0, 10))).map(([component, trend]) => {
                                        const trendValue = trend as number;
                                        return (
                                            <div key={component} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        trendValue > 0 ? 'bg-red-100' : 'bg-green-100'
                                                    }`}>
                                                        {trendValue > 0 ? (
                                                            <TrendingUp className="w-4 h-4 text-red-600" />
                                                        ) : (
                                                            <TrendingDown className="w-4 h-4 text-green-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {String(component).replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Último mes
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold ${
                                                        trendValue > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                        {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
                                                    </p>
                                                                                            </div>
                                        </div>
                                    );
                                })
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p className="text-lg font-medium">No se encontraron tendencias</p>
                                        <p className="text-sm">Intenta con otro término de búsqueda</p>
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Información adicional */}
                <div className="mt-8 bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-4">
                        Información del Sistema
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                        <div>
                            <p><strong>• Actualización automática:</strong> Cada hora</p>
                            <p><strong>• Fuente de datos:</strong> Investigación de mercado</p>
                            <p><strong>• Variación:</strong> ±10% para simular mercado real</p>
                        </div>
                        <div>
                            <p><strong>• Componentes:</strong> 80+ servicios de desarrollo y TI</p>
                            <p><strong>• Multiplicadores:</strong> Por región y país</p>
                            <p><strong>• Tendencias:</strong> Análisis de 6 meses</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 