"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Layers3, Settings, RefreshCw, FileCog } from "lucide-react";

function ServiceCard({
    title,
    description,
    href,
    Icon,
    }: {
    title: string;
    description: string;
    href: string;
    Icon: React.ElementType;
    }) {
    return (
        <Link
        href={href}
        className="group bg-white p-8 rounded-2xl shadow-lg transition-all duration-300 text-center border border-gray-100 hover:border-blue6 hover:shadow-xl hover:-translate-y-2"
        >
        <div className="flex flex-col items-center justify-center">
            <div className="mb-6 p-4 bg-blue6/10 rounded-full group-hover:bg-blue6/20 transition-colors duration-300">
                <Icon 
                className="w-12 h-12 text-blue6"
                strokeWidth={1.5}
                />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
        </Link>
    );
    }

    export default function ServicesPage() {
    return (
        <main className="relative z-0 min-h-screen bg-white text-gray-900 font-body">

        <Header />

        <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-title text-gray-900 mb-6 leading-tight">
                        Servicios <span className="text-blue6">Profesionales</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
                        Selecciona un servicio para conocer cómo podemos mejorar tus operaciones y optimizar tus procesos.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <ServiceCard
                            title="Consultoría de procesos"
                            description="Diagnóstico técnico y operativo para detectar oportunidades de mejora en tus flujos de trabajo."
                            href="#services"
                            //href="/services/consulting"
                            Icon={Layers3}
                        />
                        <ServiceCard
                            title="Diseño e implementación"
                            description="Desarrollo de soluciones ajustadas a tus flujos internos y necesidades específicas."
                            href="#services"
                            //href="/services/implementation"
                            Icon={FileCog}
                        />
                        <ServiceCard
                            title="Integraciones"
                            description="Conexión entre sistemas internos, APIs o plataformas externas para optimizar tu operación."
                            href="#services"
                            //href="/services/integrations"
                            Icon={Settings}
                        />
                        <ServiceCard
                            title="Automatizaciones"
                            description="Bots, scripts y tareas programadas para liberar recursos y mejorar la eficiencia."
                            href="#services"
                            //href="/services/automation"
                            Icon={RefreshCw}
                        />
                    </div>
                </div>
            </div>
        </section>

        <Footer />
        </main>
    );
}
