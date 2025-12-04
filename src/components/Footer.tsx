"use client";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <Image
                src="/assets/logo_transparent_ingenIT_white.png"
                alt="IngenIT — Desarrollo de Aplicaciones, Web Apps y Automatización"
                width={120}
                height={30}
                className="mb-4"
                style={{ width: 'auto', height: 'auto' }}
              />
              <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                Especialistas en integración y automatización de procesos críticos. 
                Creamos soluciones tecnológicas que optimizan tu operación y conectan con tus clientes.
              </p>
            </div>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="w-4 h-4 text-blue6" />
                <a 
                  href="mailto:gerencia@ingenit.cl" 
                  className="text-sm hover:text-blue6 transition-colors duration-200"
                >
                  gerencia@ingenit.cl
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="w-4 h-4 text-blue6" />
                <a 
                  href="tel:+56990206618" 
                  className="text-sm hover:text-blue6 transition-colors duration-200"
                >
                  +56 9 9020 6618
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <a 
                  href="https://wa.me/56990206618" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm hover:text-green-400 transition-colors duration-200"
                >
                  +56 9 9020 6618
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <a 
                  href="https://wa.me/56975385487" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm hover:text-green-400 transition-colors duration-200"
                >
                  +56 9 7538 5487
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPin className="w-4 h-4 text-blue6" />
                <span className="text-sm">Chile</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Servicios</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/services" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Desarrollo Web
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Aplicaciones Móviles
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  ChatBots
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Integraciones SoftLogic
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Enlaces</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Inicio
                </Link>
              </li>
              <li>
                <Link 
                  href="/products" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Productos
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms-of-service" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Condiciones del Servicio
                </Link>
              </li>
              <li>
                <Link 
                  href="/data-deletion" 
                  className="text-gray-300 hover:text-blue6 transition-colors duration-200 text-sm"
                >
                  Eliminación de Datos
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-400">
              © 2025 IngenIT ®. Todos los derechos reservados.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <Link 
                href="/privacy-policy" 
                className="hover:text-blue6 transition-colors duration-200"
              >
                Política de Privacidad
              </Link>
              <span>•</span>
              <Link 
                href="/terms-of-service" 
                className="hover:text-blue6 transition-colors duration-200"
              >
                Condiciones del Servicio
              </Link>
              <span>•</span>
              <Link 
                href="/data-deletion" 
                className="hover:text-blue6 transition-colors duration-200"
              >
                Eliminación de Datos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
