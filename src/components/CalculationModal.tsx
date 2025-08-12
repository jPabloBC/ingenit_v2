import { useState } from 'react';
import { X, Calculator, MapPin, Globe } from 'lucide-react';
import { Service, CalculationParams } from '@/lib/serviceCalculations';
import { getCurrencyByCountry } from '@/lib/currencyData';

interface CalculationModalProps {
    service: Service;
    onCalculate: (params: CalculationParams) => void;
    onClose: () => void;
    country: string;
    region: string;
}

export default function CalculationModal({ service, onCalculate, onClose, country, region }: CalculationModalProps) {
    const currency = getCurrencyByCountry(country);
    const [params, setParams] = useState<CalculationParams>({
        meters: 0,
        devices: 0,
        points: 0,
        rooms: 0,
        floors: 0,
        complexity: 'medium'
    });

    const getServiceFields = () => {
        switch (service.id) {
            case 'instalacion_redes':
            case 'cableado_estructurado':
                return [
                    { key: 'meters', label: 'Metros de cableado', type: 'number', placeholder: 'Ej: 100' },
                    { key: 'devices', label: 'Dispositivos a conectar', type: 'number', placeholder: 'Ej: 10' },
                    { key: 'points', label: 'Puntos de configuración', type: 'number', placeholder: 'Ej: 20' }
                ];
            case 'wifi_enterprise':
                return [
                    { key: 'devices', label: 'Access Points', type: 'number', placeholder: 'Ej: 5' },
                    { key: 'meters', label: 'Metros de cableado WiFi', type: 'number', placeholder: 'Ej: 50' }
                ];
            case 'switches_enterprise':
                return [
                    { key: 'devices', label: 'Switches', type: 'number', placeholder: 'Ej: 3' },
                    { key: 'points', label: 'Puertos a configurar', type: 'number', placeholder: 'Ej: 48' }
                ];
            case 'vpn_enterprise':
                return [
                    { key: 'devices', label: 'Usuarios VPN', type: 'number', placeholder: 'Ej: 25' },
                    { key: 'points', label: 'Sitios remotos', type: 'number', placeholder: 'Ej: 3' }
                ];
            case 'seguridad_red':
                return [
                    { key: 'devices', label: 'Dispositivos a proteger', type: 'number', placeholder: 'Ej: 15' },
                    { key: 'points', label: 'Políticas de seguridad', type: 'number', placeholder: 'Ej: 10' }
                ];
            case 'monitoreo_red':
                return [
                    { key: 'devices', label: 'Dispositivos a monitorear', type: 'number', placeholder: 'Ej: 20' },
                    { key: 'points', label: 'Alertas a configurar', type: 'number', placeholder: 'Ej: 15' }
                ];
            case 'backup_enterprise':
                return [
                    { key: 'devices', label: 'Servidores', type: 'number', placeholder: 'Ej: 5' },
                    { key: 'points', label: 'GB de almacenamiento', type: 'number', placeholder: 'Ej: 1000' }
                ];
            case 'voip_enterprise':
                return [
                    { key: 'devices', label: 'Extensiones', type: 'number', placeholder: 'Ej: 30' },
                    { key: 'points', label: 'Troncales', type: 'number', placeholder: 'Ej: 5' }
                ];
            case 'desarrollo_web':
                return [
                    { key: 'devices', label: 'Páginas', type: 'number', placeholder: 'Ej: 10' },
                    { key: 'points', label: 'Funcionalidades', type: 'number', placeholder: 'Ej: 15' }
                ];
            case 'desarrollo_mobile':
                return [
                    { key: 'devices', label: 'Pantallas', type: 'number', placeholder: 'Ej: 20' },
                    { key: 'points', label: 'Funcionalidades', type: 'number', placeholder: 'Ej: 25' }
                ];
            case 'desarrollo_desktop':
                return [
                    { key: 'devices', label: 'Módulos', type: 'number', placeholder: 'Ej: 8' },
                    { key: 'points', label: 'Reportes', type: 'number', placeholder: 'Ej: 12' }
                ];
            case 'mantenimiento_sistemas':
                return [
                    { key: 'devices', label: 'Dispositivos', type: 'number', placeholder: 'Ej: 25' },
                    { key: 'points', label: 'Horas de soporte', type: 'number', placeholder: 'Ej: 40' }
                ];
            case 'consultoria_it':
                return [
                    { key: 'devices', label: 'Horas de consultoría', type: 'number', placeholder: 'Ej: 20' },
                    { key: 'points', label: 'Reportes', type: 'number', placeholder: 'Ej: 5' }
                ];
            case 'soporte_tecnico':
                return [
                    { key: 'devices', label: 'Tickets', type: 'number', placeholder: 'Ej: 50' },
                    { key: 'points', label: 'Horas de soporte', type: 'number', placeholder: 'Ej: 30' }
                ];
            default:
                return [
                    { key: 'devices', label: 'Cantidad', type: 'number', placeholder: 'Ej: 1' }
                ];
        }
    };

    const handleInputChange = (key: string, value: string | number) => {
        setParams(prev => ({
            ...prev,
            [key]: typeof value === 'string' ? parseInt(value) || 0 : value
        }));
    };

    const handleCalculate = () => {
        onCalculate(params);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue8" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Calcular {service.name}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Información de ubicación */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue8">
                        <Globe className="w-4 h-4" />
                        <span>{country}</span>
                        {region && (
                            <>
                                <span>•</span>
                                <MapPin className="w-4 h-4" />
                                <span>{region}</span>
                            </>
                        )}
                        <span>•</span>
                        <span className="font-medium">{currency.name} ({currency.symbol})</span>
                    </div>
                </div>

                {/* Campos específicos del servicio */}
                <div className="space-y-4 mb-6">
                    {getServiceFields().map((field) => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label}
                            </label>
                            <input
                                type={field.type}
                                value={params[field.key as keyof CalculationParams] || ''}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                                placeholder={field.placeholder}
                            />
                        </div>
                    ))}

                    {/* Complejidad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Complejidad del proyecto
                        </label>
                        <select
                            value={params.complexity || 'medium'}
                            onChange={(e) => handleInputChange('complexity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
                        >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCalculate}
                        className="flex-1 px-4 py-2 bg-blue8 text-white rounded-lg hover:bg-blue6"
                    >
                        Calcular Precio
                    </button>
                </div>
            </div>
        </div>
    );
} 