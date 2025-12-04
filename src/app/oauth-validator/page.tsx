"use client";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ValidationResult {
    valid: boolean;
    message: string;
    details: string[];
}

function validateRedirectURI(uri: string): ValidationResult {
    const details: string[] = [];
    let valid = true;
    
    try {
        const url = new URL(uri);
        
        // Verificar protocolo
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            valid = false;
            details.push('Protocolo debe ser HTTP o HTTPS');
        }
        
        // Recomendar HTTPS
        if (url.protocol === 'http:' && !url.hostname.includes('localhost') && url.hostname !== '127.0.0.1') {
            valid = false;
            details.push('Se requiere HTTPS para URLs de producción');
        }
        
        // Verificar que no tenga fragmento
        if (url.hash) {
            valid = false;
            details.push('Las URIs de redireccionamiento no deben contener fragmentos (#)');
        }
        
        // Verificar localhost/IPs locales en "producción"
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.')) {
            details.push('⚠️ Direcciones locales solo para desarrollo');
        }
        
        // Verificar formato del hostname
        if (url.hostname.includes('*') || url.hostname.includes('?')) {
            valid = false;
            details.push('El hostname no debe contener wildcards');
        }
        
        // Detalles adicionales si es válida
        if (valid) {
            details.push(`Protocolo: ${url.protocol}`);
            details.push(`Host: ${url.hostname}`);
            details.push(`Path: ${url.pathname || '/'}`);
            if (url.search) {
                details.push(`Query: ${url.search}`);
            }
        }
        
    } catch (error) {
        valid = false;
        details.push('Formato de URL inválido');
        details.push((error as Error).message);
    }
    
    return {
        valid,
        message: valid ? 'URI de redireccionamiento válida' : 'URI de redireccionamiento inválida',
        details
    };
}

export default function OAuthValidatorPage() {
    const [uri, setUri] = useState('');
    const [result, setResult] = useState<ValidationResult | null>(null);

    const handleValidate = () => {
        if (!uri.trim()) {
            setResult({
                valid: false,
                message: 'Por favor ingresa una URI',
                details: []
            });
            return;
        }
        
        const validation = validateRedirectURI(uri.trim());
        setResult(validation);
    };

    return (
        <>
        <Header />

        <main className="min-h-screen bg-white text-gray2 font-body px-6 py-16 max-w-4xl mx-auto mt-10">
        <h1 className="text-3xl font-title text-blue2 mb-6">Validador de URI de Redireccionamiento</h1>

        <p className="mb-6">
            Esta herramienta te permite validar URIs de redireccionamiento para aplicaciones OAuth y servicios de autenticación.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue3 mb-4">Validar URI</h2>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="uri-input" className="block text-sm font-medium text-gray-700 mb-2">
                        URI de redireccionamiento para comprobar
                    </label>
                    <input 
                        type="url" 
                        id="uri-input"
                        name="uri-input"
                        value={uri}
                        onChange={(e) => setUri(e.target.value)}
                        placeholder="https://example.com/oauth.php"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-colors"
                    />
                </div>
                
                <button 
                    type="button"
                    onClick={handleValidate}
                    className="w-full bg-blue6 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue6 focus:ring-offset-2"
                >
                    Comprobar URI
                </button>
            </div>
            
            {result && (
                <div className="mt-6">
                    <div className={`${result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
                        <div className="flex items-start">
                            <div className={`${result.valid ? 'text-green-400' : 'text-red-400'} mr-3 mt-1`}>
                                {result.valid ? '✓' : '✗'}
                            </div>
                            <div className="flex-1">
                                <p className={`${result.valid ? 'text-green-700' : 'text-red-700'} font-medium mb-2`}>
                                    {result.message}
                                </p>
                                <div className={`text-sm ${result.valid ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.details.map((detail, index) => (
                                        <p key={index}>• {detail}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Información sobre validación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue2 mb-3">✅ URIs Válidas</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                    <li>• Usan HTTPS (recomendado)</li>
                    <li>• Tienen formato URL válido</li>
                    <li>• No contienen fragmentos (#)</li>
                    <li>• Dominios registrados y válidos</li>
                    <li>• Paths específicos y seguros</li>
                </ul>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-700 mb-3">❌ URIs Inválidas</h3>
                <ul className="text-sm text-red-700 space-y-2">
                    <li>• HTTP en producción (inseguro)</li>
                    <li>• Formato URL incorrecto</li>
                    <li>• Contienen fragmentos (#)</li>
                    <li>• IPs locales (127.0.0.1, localhost)</li>
                    <li>• Wildcards o patrones dinámicos</li>
                </ul>
            </div>
        </div>

        {/* Ejemplos */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ejemplos de URIs</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ Válidas</h4>
                    <div className="space-y-2 text-sm font-mono">
                        <div className="bg-white p-2 rounded border">https://miapp.com/oauth/callback</div>
                        <div className="bg-white p-2 rounded border">https://app.ejemplo.cl/auth/redirect</div>
                        <div className="bg-white p-2 rounded border">https://secure.domain.com/login</div>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-medium text-red-700 mb-2">❌ Inválidas</h4>
                    <div className="space-y-2 text-sm font-mono">
                        <div className="bg-white p-2 rounded border">http://miapp.com/oauth</div>
                        <div className="bg-white p-2 rounded border">https://localhost:3000/callback</div>
                        <div className="bg-white p-2 rounded border">https://app.com/auth#fragment</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Guía de implementación */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Guía de Implementación</h3>
            
            <div className="space-y-4 text-sm">
                <div>
                    <h4 className="font-medium text-blue3">1. Configuración en OAuth Provider</h4>
                    <p className="text-gray-600">Registra las URIs exactas en tu proveedor OAuth (Google, Facebook, etc.)</p>
                </div>
                
                <div>
                    <h4 className="font-medium text-blue3">2. Validación del Lado del Servidor</h4>
                    <p className="text-gray-600">Siempre valida las URIs en el servidor antes de redirigir</p>
                </div>
                
                <div>
                    <h4 className="font-medium text-blue3">3. Lista Blanca</h4>
                    <p className="text-gray-600">Mantén una lista blanca de URIs permitidas en tu aplicación</p>
                </div>
                
                <div>
                    <h4 className="font-medium text-blue3">4. HTTPS Obligatorio</h4>
                    <p className="text-gray-600">Usa siempre HTTPS en producción para proteger los tokens</p>
                </div>
            </div>
        </div>

        </main>
        
        <Footer />
        </>
    );
}