"use client";

import { ArrowRight, CheckCircle } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

function ProductCard({
	name,
	tag,
	description,
	bullets,
	ctaLabel,
	href,
}: {
	name: string;
	tag: string;
	description: string;
	bullets: string[];
	ctaLabel: string;
	href: string;
}) {
	return (
		<article className="group bg-white border border-blue6/10 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-semibold text-gray-900">{name}</h3>
				<span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue6/10 text-blue6">
					{tag}
				</span>
			</div>
			<p className="text-sm text-gray-600 mb-4">{description}</p>
			<ul className="space-y-2 mb-6">
				{bullets.map((bullet) => (
					<li
						key={bullet}
						className="flex items-center gap-2 text-sm text-gray-700"
					>
						<CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
						<span>{bullet}</span>
					</li>
				))}
			</ul>
			<a
				href={href}
				target={href.startsWith("http") ? "_blank" : undefined}
				rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
				className="inline-flex items-center gap-2 text-blue6 font-semibold hover:text-blue4"
			>
				{ctaLabel}
				<ArrowRight className="w-4 h-4" />
			</a>
		</article>
	);
}

const PRODUCTS = [
	{
		name: "Gestor Hotelero",
		tag: "Producto activo",
		description:
			"Plataforma para administrar hospedajes con foco en operación clara, control de reservas y continuidad.",
		bullets: [
			"Interfaz simple",
			"Operación en línea",
			"Escalable por sucursal",
		],
		ctaLabel: "Ver producto",
		href: "https://hl.ingenit.cl",
	},
	{
		name: "ChatBots y canales WhatsApp",
		tag: "Automatización",
		description:
			"Solución conversacional para captación, soporte y continuidad de atención con flujos personalizables.",
		bullets: [
			"Atención 24/7",
			"Derivación a agente",
			"Monitoreo de conversaciones",
		],
		ctaLabel: "Solicitar demo",
		href: "/contact",
	},
	{
		name: "SoftLogic Integrations",
		tag: "Integración",
		description:
			"Módulos para conectar sistemas internos y externos, eliminando tareas manuales y errores de digitación.",
		bullets: [
			"Integración API",
			"Sincronización de datos",
			"Reglas de validación",
		],
		ctaLabel: "Evaluar integración",
		href: "/services",
	},
	{
		name: "AppWeb / App a medida",
		tag: "Desarrollo",
		description:
			"Desarrollo web y móvil para operaciones específicas de cada cliente, incluyendo paneles administrativos.",
		bullets: [
			"Arquitectura escalable",
			"Experiencia responsive",
			"Mantenimiento evolutivo",
		],
		ctaLabel: "Cotizar proyecto",
		href: "/contact",
	},
];

export default function ProductsPage() {
	return (
		<main className="relative z-0 min-h-screen bg-white text-gray-900 font-body">
			<Header />

			<section className="pt-32 pb-14 bg-gradient-to-br from-blue-50 via-white to-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-4xl mx-auto">
						<h1 className="text-4xl md:text-6xl font-title text-gray-900 mb-5 leading-tight">
							Productos y soluciones para{" "}
							<span className="text-blue6">clientes IngenIT</span>
						</h1>
						<p className="text-lg md:text-xl text-gray-600 leading-relaxed">
							Implementamos tecnología aplicable a operación real: integración,
							automatización y continuidad.
						</p>
					</div>
				</div>
			</section>

			<section className="py-16 bg-gray-50 border-y border-gray-100">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
						<div>
							<h2 className="text-3xl font-title text-gray-900 mb-2">
								Productos IngenIT
							</h2>
							<p className="text-gray-600">
								Portafolio con foco en resultados operativos y crecimiento
								sostenido.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-4">
							<a
								href="/clients"
								className="inline-flex items-center gap-2 text-gray-700 font-semibold hover:text-blue6"
							>
								Ver clientes y casos
								<ArrowRight className="w-4 h-4" />
							</a>
							<a
								href="/contact"
								className="inline-flex items-center gap-2 text-blue6 font-semibold hover:text-blue4"
							>
								Hablar con un consultor
								<ArrowRight className="w-4 h-4" />
							</a>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{PRODUCTS.map((product) => (
							<ProductCard
								key={product.name}
								name={product.name}
								tag={product.tag}
								description={product.description}
								bullets={product.bullets}
								ctaLabel={product.ctaLabel}
								href={product.href}
							/>
						))}
					</div>
				</div>
			</section>

			<section className="py-16 bg-blue6">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl md:text-4xl font-title text-white mb-4">
						¿Quieres implementar un producto en tu operación?
					</h2>
					<p className="text-blue-100 text-lg mb-8">
						Te ayudamos a definir alcance, arquitectura y plan de
						implementación.
					</p>
					<a
						href="/contact"
						className="inline-flex items-center gap-2 bg-white text-blue6 px-7 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
					>
						Solicitar contacto
						<ArrowRight className="w-4 h-4" />
					</a>
				</div>
			</section>

			<Footer />
		</main>
	);
}
