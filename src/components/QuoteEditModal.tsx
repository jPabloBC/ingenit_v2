"use client";

import { useState, useEffect } from "react";
import { X, Save, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Quote {
    id: string;
    quote_number: string;
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
    services: any[];
    total_amount: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    valid_until: string;
    notes: string;
    terms_conditions: string;
    created_at: string;
}

interface QuoteEditModalProps {
    quote: Quote | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function QuoteEditModal({ quote, isOpen, onClose, onSave }: QuoteEditModalProps) {
    const [formData, setFormData] = useState<Partial<Quote>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [editingService, setEditingService] = useState<number | null>(null);

    useEffect(() => {
        if (quote) {
            setFormData(quote);
        }
    }, [quote]);

    const handleSave = async () => {
        if (!quote?.id) return;

        try {
            setIsLoading(true);
            const { error } = await supabase
                .from("rt_quotes")
                .update(formData)
                .eq("id", quote.id);

            if (error) throw error;
            
            onSave();
            onClose();
        } catch (error) {
            console.error("Error updating quote:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateService = (index: number, field: string, value: any) => {
        if (!formData) return;

        const updatedServices = [...formData.services];
        updatedServices[index] = {
            ...updatedServices[index],
            [field]: value
        };

        const total = updatedServices.reduce((sum, service) => sum + (service.price || 0), 0);

        setFormData({
            ...formData,
            services: updatedServices,
            total_amount: total
        });
    };

    const removeService = (index: number) => {
        if (!formData) return;

        const updatedServices = formData.services.filter((_, i) => i !== index);
        const total = updatedServices.reduce((sum, service) => sum + (service.price || 0), 0);

        setFormData({
            ...formData,
            services: updatedServices,
            total_amount: total
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(amount);
    };

    if (!isOpen || !formData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Editar Cotización #{formData.quote_number}
                        </h2>
                        <p className="text-sm text-gray-600">
                            {formData.client_name} - {formData.project_title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Información del Cliente */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del Cliente
                                </label>
                                <input
                                    type="text"
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.client_email}
                                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Teléfono
                                </label>
                                <input
                                    type="text"
                                    value={formData.client_phone}
                                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    value={formData.client_address}
                                    onChange={(e) => setFormData({...formData, client_address: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Información del Proyecto */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Proyecto</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Título del Proyecto
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_title}
                                    onChange={(e) => setFormData({...formData, project_title: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.project_description}
                                    onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Servicios */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Servicios</h3>
                        <div className="space-y-4">
                            {formData.services.map((service, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingService(editingService === index ? null : index)}
                                                className="p-1 text-blue-600 hover:text-blue-800"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => removeService(index)}
                                                className="p-1 text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {editingService === index ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nombre del Servicio
                                                </label>
                                                <input
                                                    type="text"
                                                    value={service.name}
                                                    onChange={(e) => updateService(index, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Descripción
                                                </label>
                                                <textarea
                                                    value={service.description || ''}
                                                    onChange={(e) => updateService(index, 'description', e.target.value)}
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Precio
                                                </label>
                                                <input
                                                    type="number"
                                                    value={service.price || 0}
                                                    onChange={(e) => updateService(index, 'price', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                                                />
                                            </div>
                                            {/* Mostrar componentes granulares si existen */}
                                            {service.granularComponents && service.granularComponents.length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Componentes Granulares
                                                    </label>
                                                    <div className="bg-gray-50 p-3 rounded-lg">
                                                        {service.granularComponents.map((comp: any, compIndex: number) => (
                                                            <div key={compIndex} className="text-xs text-gray-600 mb-1">
                                                                • {comp.name}: {comp.quantity} {comp.unit} x {formatCurrency(comp.unitPrice)} = {formatCurrency(comp.totalPrice)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-600">
                                            <p>{service.description}</p>
                                            <p className="font-medium text-gray-900 mt-1">
                                                Precio: {formatCurrency(service.price || 0)}
                                            </p>
                                            {/* Mostrar componentes granulares si existen */}
                                            {service.granularComponents && service.granularComponents.length > 0 && (
                                                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                                    <p className="text-xs font-medium text-blue-800 mb-1">Componentes Granulares:</p>
                                                    {service.granularComponents.map((comp: any, compIndex: number) => (
                                                        <div key={compIndex} className="text-xs text-blue-700">
                                                            • {comp.name}: {comp.quantity} {comp.unit} x {formatCurrency(comp.unitPrice)} = {formatCurrency(comp.totalPrice)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium text-gray-900">Total:</span>
                            <span className="text-2xl font-bold text-blue8">
                                {formatCurrency(formData.total_amount || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Notas y Términos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Términos y Condiciones
                            </label>
                            <textarea
                                value={formData.terms_conditions}
                                onChange={(e) => setFormData({...formData, terms_conditions: e.target.value})}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue8 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="bg-blue8 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
} 