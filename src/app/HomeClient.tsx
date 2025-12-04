// src/app/HomeClient.tsx
"use client";

import { Laptop, Bot, Settings, X, ArrowRight, CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ProductCard({
  title,
  Icon,
  description,
  features,
}: {
  title: string;
  Icon: React.ElementType;
  description: string;
  features: string[];
}) {
  return (
    <div className="group bg-white p-8 rounded-2xl shadow-lg transition-all duration-300 text-center border border-gray-100 hover:border-blue6 hover:shadow-xl hover:-translate-y-2">
      <div className="flex flex-col items-center justify-center">
        <div className="mb-6 p-4 bg-blue6/10 rounded-full group-hover:bg-blue6/20 transition-colors duration-300">
          <Icon
            className="w-12 h-12 text-blue6"
            strokeWidth={1.5}
          />
        </div>
        <h3 className="text-xl font-semibold text-blue5 mb-3">{title}</h3>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>
        <ul className="space-y-2 text-left w-full">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HomeClient() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && (menuRef.current as HTMLElement).contains && !(menuRef.current as HTMLElement).contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  useEffect(() => {
    // Registrar visita mediante el endpoint POST /api/visits
    const isLocalhost = window.location.hostname === 'localhost';
    if (isLocalhost) return; // Excluir visitas locales

    (async () => {
      try {
        await fetch('/api/visits', { method: 'POST' });
      } catch (e) {
        // no bloquear la página por errores de tracking
        console.debug('visit tracking failed', e);
      }
    })();
  }, []);

  return (
    <main className="relative z-0 min-h-screen bg-white text-gray2 font-body">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-10 bg-gradient-to-br from-blue15 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-title text-blue3 mb-6 leading-tight">
              Integración y{" "}
              <span className="text-blue6">automatización</span> de procesos críticos
            </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                En IngenIT desarrollamos software de automatización de procesos totalmente a medida, 
                conectando sistemas y eliminando tareas manuales para mejorar la eficiencia de tu empresa.
              </p>
            <div ref={menuRef} className="relative inline-block">
              <button
                onClick={() => setOpen(!open)}
                className="bg-blue6 text-white px-8 py-4 rounded-xl hover:bg-blue4 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center space-x-2 mx-auto"
              >
                <span>Contáctanos</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              {open && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                  onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                  tabIndex={-1}
                >
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-80 p-8 text-center relative transform transition-all duration-300 scale-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setOpen(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <h3 className="text-xl font-semibold text-blue5 mb-6">Contáctanos</h3>

                    <div className="space-y-3">
                      <a
                        href="mailto:gerencia@ingenit.cl"
                        className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-lg transition-colors duration-200 font-medium"
                      >
                        Contacto por correo
                      </a>
                      <a
                        href="/contact"
                        className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-lg transition-colors duration-200 font-medium"
                      >
                        Formulario de contacto
                      </a>
                      <a
                        href="https://wa.me/56975385487?text=Hola%20quiero%20más%20información"
                        target="_blank"
                        className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-lg transition-colors duration-200 font-medium"
                      >
                        WhatsApp
                      </a>
                      <button
                        onClick={() => {
                          setOpen(false);
                          const chatToggle = document.getElementById("chat-bot-toggle");
                          if (chatToggle) chatToggle.click();
                        }}
                        className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-lg transition-colors duration-200 font-medium"
                      >
                        ChatBot en vivo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-title text-blue5 mb-4">
              Software de automatización de procesos
            </h2>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Nos especializamos en crear soluciones tecnológicas que optimizan tus proyectos
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue6/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-blue6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-blue5 mb-3">Soluciones Personalizadas</h3>
              <p className="text-gray-600">
                Cada proyecto es único. Desarrollamos soluciones específicas que se adaptan perfectamente a tus necesidades.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue6/10 rounded-full">
                  <Settings className="w-8 h-8 text-blue6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-blue5 mb-3">Tecnología Avanzada</h3>
              <p className="text-gray-600">
                Utilizamos las últimas tecnologías para garantizar que tu solución sea moderna y escalable.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue6/10 rounded-full">
                  <Bot className="w-8 h-8 text-blue6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-blue5 mb-3">Soporte Continuo</h3>
              <p className="text-gray-600">
                No solo desarrollamos tu solución, también te acompañamos en su implementación y mantenimiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-title text-gray-900 mb-4">
              Nuestros Productos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Soluciones tecnológicas integrales diseñadas para optimizar tu proyecto
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProductCard 
              title="AppWeb / App" 
              Icon={Laptop}
              description="Desarrollo de aplicaciones web y móviles personalizadas que se adaptan a tus necesidades específicas."
              features={[
                "Diseño responsive",
                "Optimización SEO",
                "Integración con APIs",
                "Mantenimiento continuo"
              ]}
            />
            
            <ProductCard 
              title="ChatBot" 
              Icon={Bot}
              description="ChatBots inteligentes que mejoran la atención al cliente y automatizan procesos de comunicación."
              features={[
                "IA conversacional",
                "Integración 24/7",
                "Análisis de datos",
                "Personalización completa"
              ]}
            />
            
            <ProductCard 
              title="SoftLogic" 
              Icon={Settings}
              description="Integraciones y automatizaciones que conectan todos tus sistemas y optimizan procesos críticos."
              features={[
                "Automatización avanzada",
                "Integración de sistemas",
                "Monitoreo en tiempo real",
                "Escalabilidad garantizada"
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contacto" className="py-20 bg-blue6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-title text-white mb-6">
            ¿Listo para transformar tu empresa?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Escríbenos para empezar tu próximo proyecto tecnológico y llevar tu empresa al siguiente nivel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:gerencia@ingenit.cl" 
              className="bg-white text-blue6 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Contactar por email
            </a>
            <a 
              href="/contact" 
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue6 transition-all duration-300"
            >
              Formulario de contacto
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
