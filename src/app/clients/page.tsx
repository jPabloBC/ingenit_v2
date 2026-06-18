"use client";

import {
	ArrowRight,
	Building2,
	CheckCircle,
	Hotel,
	Store,
	Wrench,
} from "lucide-react";
import Image from "next/image";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

function ClientSegmentCard({
	title,
	description,
	Icon,
	points,
}: {
	title: string;
	description: string;
	Icon: React.ElementType;
	points: string[];
}) {
	return (
		<article className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
			<div className="flex items-start gap-3 mb-4">
				<div className="p-2.5 bg-blue6/10 rounded-lg">
					<Icon className="w-5 h-5 text-blue6" />
				</div>
				<div>
					<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					<p className="text-sm text-gray-600 mt-1">{description}</p>
				</div>
			</div>
			<ul className="space-y-2">
				{points.map((point) => (
					<li
						key={point}
						className="flex items-start gap-2 text-sm text-gray-700"
					>
						<CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
						<span>{point}</span>
					</li>
				))}
			</ul>
		</article>
	);
}

function CurrentClientCard({
	name,
	website,
	sector,
	detail,
	logo,
}: {
	name: string;
	website: string;
	sector: string;
	detail: string;
	logo: string;
}) {
	return (
		<article className="bg-white border border-blue6/10 rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
			<div className="relative mb-4 h-16 bg-blue3 border border-blue4 rounded-lg px-4 flex items-center justify-start">
				<span className="absolute top-2 right-2 text-[11px] font-semibold px-2 py-1 rounded-full bg-blue11 text-blue5 border border-blue7">
					{sector}
				</span>
				<Image
					src={logo}
					alt={`Logo ${name}`}
					width={180}
					height={44}
					className="h-10 w-auto object-contain"
				/>
			</div>
			<a
				href={website}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-2 text-blue6 font-semibold hover:text-blue4 mb-3"
			>
				<span className="sr-only">{name}</span>
				{website.replace(/^https?:\/\//, "")}
				<ArrowRight className="w-4 h-4" />
			</a>
			<p className="text-sm text-gray-700">{detail}</p>
		</article>
	);
}

const CLIENT_SEGMENTS = [
	{
		title: "Comercio y ventas",
		description:
			"Empresas con necesidad de control comercial y operación omnicanal.",
		Icon: Store,
		points: [
			"Catálogo y precios por perfil",
			"Automatización de ventas",
			"Integración de canales",
		],
	},
	{
		title: "Empresas de servicios",
		description:
			"Equipos con procesos internos que requieren orden, trazabilidad y control.",
		Icon: Building2,
		points: [
			"Flujos operativos",
			"Dashboards de seguimiento",
			"Alertas y tareas automáticas",
		],
	},
	{
		title: "Hotelería y hospedaje",
		description:
			"Negocios orientados a reservas, estado de operación y experiencia del huésped.",
		Icon: Hotel,
		points: [
			"Gestión de reservas",
			"Control de habitaciones",
			"Operación centralizada",
		],
	},
	{
		title: "Mantenimiento técnico",
		description:
			"Operaciones con técnicos, visitas, tickets y cumplimiento de niveles de servicio.",
		Icon: Wrench,
		points: [
			"Tareas por estado",
			"Asignación técnica",
			"Historial de intervenciones",
		],
	},
];

const CURRENT_CLIENTS = [
	{
		name: "Fasercon",
		website: "https://www.fasercon.cl",
		sector: "Construcción",
		logo: "/assets/clients/fasercon.svg",
		detail:
			"Acompañamiento en procesos de operación digital e integración para mejorar continuidad y control interno.",
	},
	{
		name: "RyM Aceros",
		website: "https://www.rymaceros.cl",
		sector: "Industria / Aceros",
		logo: "/assets/clients/rym.svg",
		detail:
			"Implementación de soluciones para fortalecer procesos comerciales y operativos con foco en trazabilidad.",
	},
];

export default function ClientsPage() {
	return (
		<main className="relative z-0 min-h-screen bg-white text-gray-900 font-body">
			<Header />

			<section className="pt-32 pb-16 bg-gradient-to-br from-blue-50 via-white to-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h1 className="text-4xl md:text-6xl font-title text-gray-900 mb-5 leading-tight">
						Clientes y casos de <span className="text-blue6">IngenIT</span>
					</h1>
					<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
						Trabajamos con operaciones reales que necesitan integrar sistemas,
						automatizar procesos y escalar.
					</p>
				</div>
			</section>

			<section className="py-16 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mb-10">
						<h2 className="text-3xl font-title text-gray-900 mb-2">
							Segmentos con los que trabajamos
						</h2>
						<p className="text-gray-600">
							Soluciones diseñadas según contexto operativo del cliente.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{CLIENT_SEGMENTS.map((segment) => (
							<ClientSegmentCard
								key={segment.title}
								title={segment.title}
								description={segment.description}
								Icon={segment.Icon}
								points={segment.points}
							/>
						))}
					</div>
				</div>
			</section>

			<section className="py-16 bg-gray-50 border-y border-gray-100">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mb-10">
						<h2 className="text-3xl font-title text-gray-900 mb-2">
							Nuestros Clientes
						</h2>
						<p className="text-gray-600">
							Empresas que actualmente trabajan con IngenIT.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{CURRENT_CLIENTS.map((client) => (
							<CurrentClientCard
								key={client.name}
								name={client.name}
								website={client.website}
								sector={client.sector}
								logo={client.logo}
								detail={client.detail}
							/>
						))}
					</div>
				</div>
			</section>

			<section className="py-16 bg-blue6">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl md:text-4xl font-title text-white mb-4">
						¿Quieres evaluar tu caso?
					</h2>
					<p className="text-blue-100 text-lg mb-8">
						Revisamos tu operación actual y proponemos una implementación viable
						por etapas.
					</p>
					<a
						href="/contact"
						className="inline-flex items-center gap-2 bg-white text-blue6 px-7 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
					>
						Hablar con IngenIT
						<ArrowRight className="w-4 h-4" />
					</a>
				</div>
			</section>

			<Footer />
		</main>
	);
}
