"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Laptop, Smartphone, Bot, Settings, CheckCircle } from "lucide-react";

function ProductCard({
    title,
    description,
    Icon,
    features,
    }: {
    title: string;
    description: string;
    Icon: React.ElementType;
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
            <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
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

    export default function ProductsPage() {
    return (
        <main className="relative z-0 min-h-screen bg-white text-gray-900 font-body">

        <Header />

        <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-title text-gray-900 mb-6 leading-tight">
                        Nuestros <span className="text-blue6">Productos</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
                        Tecnología orientada a integrar, automatizar y escalar tus procesos operativos de manera eficiente.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="group bg-white p-8 rounded-2xl shadow-lg transition-all duration-300 text-center border border-gray-100 hover:border-blue6 hover:shadow-xl hover:-translate-y-2">
                            <div className="flex flex-col items-center justify-center">
                                <div className="mb-6 p-4 bg-blue6/10 rounded-full group-hover:bg-blue6/20 transition-colors duration-300">
                                    <div className="flex gap-2">
                                        <Laptop className="w-12 h-12 text-blue6" strokeWidth={1.5} />
                                        <Smartphone className="w-12 h-12 text-blue6" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">AppWeb / App</h3>
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">Desarrollo multiplataforma para operaciones móviles y web con diseño responsive y optimización SEO.</p>
                                <ul className="space-y-2 text-left w-full">
                                    <li className="flex items-center space-x-2 text-sm text-gray-600">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span>Diseño responsive</span>
                                    </li>
                                    <li className="flex items-center space-x-2 text-sm text-gray-600">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span>Optimización SEO</span>
                                    </li>
                                    <li className="flex items-center space-x-2 text-sm text-gray-600">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span>Integración con APIs</span>
                                    </li>
                                    <li className="flex items-center space-x-2 text-sm text-gray-600">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span>Mantenimiento continuo</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <ProductCard
                            title="ChatBots"
                            description="Automatización conversacional con flujos inteligentes vía WhatsApp y otras plataformas."
                            Icon={Bot}
                            features={[
                                "IA conversacional",
                                "Integración 24/7",
                                "Análisis de datos",
                                "Personalización completa"
                            ]}
                        />
                        <ProductCard
                            title="SoftLogic"
                            description="Integración entre sistemas para flujos críticos y toma de decisiones automatizada."
                            Icon={Settings}
                            features={[
                                "Automatización avanzada",
                                "Integración de sistemas",
                                "Monitoreo en tiempo real",
                                "Escalabilidad garantizada"
                            ]}
                        />
                    </div>

                    <div className="mt-16 flex flex-col items-center">
                        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl border border-blue6/20 flex flex-col md:flex-row items-center p-6 md:p-8 gap-6 md:gap-10 hover:shadow-2xl transition-all">
                            <div className="flex-shrink-0 w-full md:w-64 flex justify-center">
                                <img
                                    src="/assets/logo_ingenIT.png"
                                    alt="HL - Gestor Hotelero"
                                    className="rounded-xl object-contain w-48 h-48 md:w-64 md:h-64 bg-gray-50 border border-gray-100 shadow-sm"
                                />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <a
                                    href="https://hl.ingenit.cl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mb-2 text-gray9 font-normal text-4xl hover:underline"
                                >
                                    Gestor Hotelero
                                </a>
                                <p className="text-gray-700 mb-3 text-base md:text-lg">
                                    Gestiona tu hotel de forma más fácil y eficiente con una plataforma intuitiva y segura, adaptable a cualquier tipo de hospedaje.
                                </p>
                                <a
                                    href="https://hl.ingenit.cl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 px-6 py-2 bg-blue6 text-white rounded-sm font-normal shadow hover:bg-blue4 transition"
                                >
                                    Ver producto
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <Footer />
        </main>
    );
}
