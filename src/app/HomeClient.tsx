// src/app/HomeClient.tsx
"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import {
	ArrowRight,
	Bot,
	CheckCircle,
	Laptop,
	Settings,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 54, scale: 0.96 },
	show: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.72 },
	},
};

const staggerContainer = {
	hidden: {},
	show: {
		transition: {
			staggerChildren: 0.12,
			delayChildren: 0.08,
		},
	},
};

const codeLines = [
	"syncERP();",
	"connectWhatsAppFlow();",
	"automateCriticalProcess();",
	'deploy("production");',
];

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
		<motion.div
			variants={fadeUp}
			whileHover={{ y: -10, scale: 1.015 }}
			transition={{ type: "spring", stiffness: 240, damping: 20 }}
			className="group relative overflow-hidden rounded-xl border border-blue13/70 bg-white p-8 shadow-lg transition-all duration-300 text-center hover:border-blue10 hover:shadow-[0_20px_45px_rgba(0,30,64,0.14)]"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue8 via-blue10 to-blue12 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
			/>
			<div className="flex flex-col items-center justify-center">
				<div className="mb-6 rounded-xl border border-blue13/80 bg-blue15 p-4 transition-colors duration-300 group-hover:bg-blue14/45">
					<Icon className="w-12 h-12 text-blue6" strokeWidth={1.5} />
				</div>
				<h3 className="text-xl font-semibold text-blue5 mb-3">{title}</h3>
				<p className="text-gray-600 text-sm mb-5 leading-relaxed">
					{description}
				</p>
				<ul className="space-y-2 text-left w-full">
					{features.map((feature) => (
						<li
							key={`${title}-${feature}`}
							className="flex items-center space-x-2 text-sm text-gray-600"
						>
							<CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
							<span>{feature}</span>
						</li>
					))}
				</ul>
			</div>
		</motion.div>
	);
}

export default function HomeClient() {
	const [open, setOpen] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				menuRef.current &&
				(menuRef.current as HTMLElement).contains &&
				!(menuRef.current as HTMLElement).contains(event.target as Node)
			) {
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
		const isLocalhost = window.location.hostname === "localhost";
		if (isLocalhost) return; // Excluir visitas locales

		(async () => {
			try {
				await fetch("/api/visits", { method: "POST" });
			} catch (e) {
				// no bloquear la página por errores de tracking
				console.debug("visit tracking failed", e);
			}
		})();
	}, []);

	return (
		<main className="relative z-0 min-h-screen bg-white text-gray2 font-body">
			<Header />

			{/* Hero Section */}
			<section className="relative overflow-hidden pt-32 pb-16 bg-gradient-to-br from-blue14/70 via-blue15/45 to-white">
				<div
					aria-hidden
					className="pointer-events-none absolute -top-24 right-[15%] h-96 w-96 rounded-full bg-blue10/30 blur-[80px]"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-60"
					style={{
						background:
							"repeating-linear-gradient(135deg, rgba(0,120,255,0.08) 0px, rgba(0,120,255,0.08) 1px, transparent 1px, transparent 18px)",
					}}
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -top-20 -left-24 h-72 w-72 rounded-full bg-blue12/35 blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute bottom-8 right-8 h-64 w-64 rounded-full bg-blue6/18 blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-white/60 to-white"
				/>
				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						variants={staggerContainer}
						initial="hidden"
						animate="show"
						className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center"
					>
						<motion.div className="text-center lg:text-left">
							<motion.div
								variants={fadeUp}
								className="inline-flex items-center gap-2 rounded-lg border border-blue10/40 bg-blue15/70 px-4 py-2 text-xs sm:text-sm font-semibold text-blue4 mb-6"
							>
								<span className="h-2 w-2 rounded-full bg-blue8" />
								Ingeniería de software aplicada a operaciones reales
							</motion.div>

							<motion.h1
								variants={fadeUp}
								className="text-5xl md:text-6xl font-title text-blue3 mb-6 leading-tight"
							>
								Integración y <span className="text-blue6">automatización</span>{" "}
								de procesos críticos
							</motion.h1>

							<motion.p
								variants={fadeUp}
								className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto lg:mx-0"
							>
								En IngenIT desarrollamos software de automatización de procesos
								totalmente a medida, conectando sistemas y eliminando tareas
								manuales para mejorar la eficiencia de tu empresa.
							</motion.p>

							<motion.div
								variants={fadeUp}
								ref={menuRef}
								className="relative inline-block"
							>
								<motion.button
									type="button"
									onClick={() => setOpen(!open)}
									className="bg-blue6 text-white px-8 py-4 rounded-lg hover:bg-blue4 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center space-x-2 mx-auto lg:mx-0"
									whileHover={{ y: -4, scale: 1.03 }}
									whileTap={{ scale: 0.98 }}
								>
									<span>Contáctanos</span>
									<ArrowRight className="w-5 h-5" />
								</motion.button>

								{open && (
									<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
										<button
											type="button"
											aria-label="Cerrar menú de contacto"
											className="absolute inset-0"
											onClick={() => setOpen(false)}
										/>
										<div className="bg-white rounded-xl shadow-2xl w-80 p-8 text-center relative transform transition-all duration-300 scale-100">
											<button
												type="button"
												onClick={() => setOpen(false)}
												className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
											>
												<X className="w-6 h-6" />
											</button>

											<h3 className="text-xl font-semibold text-blue5 mb-6">
												Contáctanos
											</h3>

											<div className="space-y-3">
												<a
													href="mailto:contacto@ingenit.cl"
													className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-md transition-colors duration-200 font-medium"
												>
													Contacto por correo
												</a>
												<a
													href="/contact"
													className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-md transition-colors duration-200 font-medium"
												>
													Formulario de contacto
												</a>
												<a
													href="https://wa.me/56975385487?text=Hola%20quiero%20más%20información"
													target="_blank"
													className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-md transition-colors duration-200 font-medium"
													rel="noopener"
												>
													WhatsApp
												</a>
												<button
													type="button"
													onClick={() => {
														setOpen(false);
														const chatToggle =
															document.getElementById("chat-bot-toggle");
														if (chatToggle) chatToggle.click();
													}}
													className="block w-full px-6 py-3 text-gray-700 hover:bg-blue4 hover:text-gray9 rounded-md transition-colors duration-200 font-medium"
												>
													ChatBot en vivo
												</button>
											</div>
										</div>
									</div>
								)}
							</motion.div>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="relative mx-auto w-full max-w-xl"
						>
							<div className="rounded-xl border border-blue10/30 bg-gradient-to-b from-blue1 to-blue2 p-4 shadow-[0_20px_50px_rgba(0,30,64,0.35)]">
								<div className="mb-4 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
										<span className="h-2.5 w-2.5 rounded-full bg-yellow-300/85" />
										<span className="h-2.5 w-2.5 rounded-full bg-green-400/85" />
									</div>
									<span className="text-xs text-blue12/80 font-mono">
										ingenit/dev-console
									</span>
								</div>

								<div className="space-y-3 rounded-lg border border-blue10/20 bg-blue1/70 p-4 font-mono text-sm">
									{codeLines.map((line, index) => (
										<motion.div
											key={line}
											className="flex items-center gap-3 text-blue14"
											initial={{ opacity: 0, x: -12 }}
											whileInView={{ opacity: 1, x: 0 }}
											viewport={{ once: true }}
											transition={{ duration: 0.35, delay: index * 0.1 }}
										>
											<span className="text-blue10">{">"}</span>
											<span>{line}</span>
										</motion.div>
									))}
								</div>
							</div>

							<div
								aria-hidden
								className="pointer-events-none absolute -bottom-8 -right-6 h-24 w-24 rounded-lg border border-blue10/40 bg-blue8/20 backdrop-blur-md"
							/>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Why Choose Us Section */}
			<section className="relative overflow-hidden py-20 bg-white">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-40"
					style={{
						background:
							"repeating-linear-gradient(0deg, rgba(0,90,191,0.03) 0px, rgba(0,90,191,0.03) 1px, transparent 1px, transparent 22px)",
					}}
				/>
				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, amount: 0.18 }}
						variants={fadeUp}
						className="relative mb-14"
					>
						<div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-blue13/70 bg-gradient-to-br from-white via-blue15/45 to-blue15/20 px-6 py-8 shadow-[0_24px_60px_rgba(0,30,64,0.08)] sm:px-10">
							<div
								aria-hidden
								className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-blue10/80 to-transparent"
							/>
							<div className="flex flex-col items-center text-center">
								<div className="inline-flex items-center gap-2 rounded-lg border border-blue10/35 bg-white/75 px-4 py-2 text-xs sm:text-sm font-semibold text-blue5 mb-6 shadow-sm">
									<span className="h-2 w-2 rounded-full bg-blue8" />
									Arquitectura y ejecución
								</div>
								<motion.div
									initial={{ width: 0, opacity: 0 }}
									whileInView={{ width: 88, opacity: 1 }}
									viewport={{ once: true }}
									transition={{ duration: 0.7 }}
									className="mb-5 h-1 rounded-full bg-gradient-to-r from-blue6 to-blue10"
								/>
								<h2 className="max-w-3xl text-3xl md:text-4xl lg:text-5xl font-title text-blue5 mb-4 leading-tight">
									Software de automatización de procesos
								</h2>

								<p className="max-w-2xl text-lg md:text-xl text-gray-600 leading-relaxed">
									Nos especializamos en crear soluciones tecnológicas que
									optimizan tus proyectos, conectan tus sistemas y reducen
									fricción operativa.
								</p>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, amount: 0.12 }}
						variants={staggerContainer}
						className="grid grid-cols-1 md:grid-cols-3 gap-8"
					>
						<motion.div
							variants={fadeUp}
							whileHover={{ y: -8, scale: 1.02 }}
							className="text-center p-6 rounded-xl border border-blue13/60 bg-white/85 backdrop-blur-sm shadow-md"
						>
							<div className="flex justify-center mb-4">
								<div className="p-4 bg-blue6/10 rounded-full">
									<CheckCircle className="w-8 h-8 text-blue6" />
								</div>
							</div>
							<h3 className="text-xl font-semibold text-blue5 mb-3">
								Soluciones Personalizadas
							</h3>
							<p className="text-gray-600">
								Cada proyecto es único. Desarrollamos soluciones específicas que
								se adaptan perfectamente a tus necesidades.
							</p>
						</motion.div>

						<motion.div
							variants={fadeUp}
							whileHover={{ y: -8, scale: 1.02 }}
							className="text-center p-6 rounded-xl border border-blue13/60 bg-white/85 backdrop-blur-sm shadow-md"
						>
							<div className="flex justify-center mb-4">
								<div className="p-4 bg-blue6/10 rounded-full">
									<Settings className="w-8 h-8 text-blue6" />
								</div>
							</div>
							<h3 className="text-xl font-semibold text-blue5 mb-3">
								Tecnología Avanzada
							</h3>
							<p className="text-gray-600">
								Utilizamos las últimas tecnologías para garantizar que tu
								solución sea moderna y escalable.
							</p>
						</motion.div>

						<motion.div
							variants={fadeUp}
							whileHover={{ y: -8, scale: 1.02 }}
							className="text-center p-6 rounded-xl border border-blue13/60 bg-white/85 backdrop-blur-sm shadow-md"
						>
							<div className="flex justify-center mb-4">
								<div className="p-4 bg-blue6/10 rounded-full">
									<Bot className="w-8 h-8 text-blue6" />
								</div>
							</div>
							<h3 className="text-xl font-semibold text-blue5 mb-3">
								Soporte Continuo
							</h3>
							<p className="text-gray-600">
								No solo desarrollamos tu solución, también te acompañamos en su
								implementación y mantenimiento.
							</p>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Products Section */}
			<section
				id="productos"
				className="relative overflow-hidden py-20 bg-gray-50"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-blue10/15 blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-50"
					style={{
						background:
							"repeating-linear-gradient(0deg, rgba(0,90,191,0.028) 0px, rgba(0,90,191,0.028) 1px, transparent 1px, transparent 24px)",
					}}
				/>
				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, amount: 0.18 }}
						variants={fadeUp}
						className="relative mb-16"
					>
						<div className="mx-auto max-w-4xl rounded-2xl border border-blue13/70 bg-gradient-to-br from-white via-blue15/40 to-white px-6 py-8 shadow-[0_24px_60px_rgba(0,30,64,0.08)] sm:px-10">
							<div className="inline-flex items-center gap-2 rounded-lg border border-blue10/30 bg-white/80 px-4 py-2 text-xs sm:text-sm font-semibold text-blue5 mb-6">
								<span className="h-2 w-2 rounded-full bg-blue8" />
								Soluciones listas para escalar
							</div>
							<h2 className="text-3xl md:text-4xl lg:text-5xl font-title text-gray-900 mb-4 leading-tight">
								Nuestros Productos
							</h2>
							<p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
								Soluciones tecnológicas integrales diseñadas para optimizar tu
								proyecto.
							</p>
						</div>
					</motion.div>

					<motion.div
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, amount: 0.12 }}
						variants={staggerContainer}
						className="grid grid-cols-1 md:grid-cols-3 gap-8"
					>
						<ProductCard
							title="AppWeb / App"
							Icon={Laptop}
							description="Desarrollo de aplicaciones web y móviles personalizadas que se adaptan a tus necesidades específicas."
							features={[
								"Diseño responsive",
								"Optimización SEO",
								"Integración con APIs",
								"Mantenimiento continuo",
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
								"Personalización completa",
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
								"Escalabilidad garantizada",
							]}
						/>
					</motion.div>
				</div>
			</section>

			{/* CTA Section */}
			<section
				id="contacto"
				className="relative overflow-hidden py-20 bg-blue6"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-35"
					style={{
						background:
							"linear-gradient(135deg, rgba(0,26,51,0.22) 0%, rgba(255,255,255,0.04) 100%)",
					}}
				/>
				<motion.div
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.18 }}
					variants={staggerContainer}
					className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
				>
					<div className="overflow-hidden rounded-2xl border border-blue15/20 bg-[linear-gradient(145deg,rgba(0,26,51,0.26)_0%,rgba(0,60,128,0.18)_48%,rgba(255,255,255,0.08)_100%)] px-6 py-10 shadow-[0_24px_70px_rgba(0,26,51,0.28)] sm:px-10 sm:py-12 lg:px-14 lg:pb-16">
						<div
							aria-hidden
							className="pointer-events-none mb-8 h-px w-full bg-gradient-to-r from-transparent via-blue14/90 to-transparent"
						/>
						<div className="text-center lg:text-left">
							<motion.div
								variants={fadeUp}
								className="inline-flex items-center gap-2 rounded-lg border border-blue15/45 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-blue15 mb-6"
							>
								<span className="h-2 w-2 rounded-full bg-blue14" />
								Tu próximo sistema empieza aquí
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="max-w-3xl text-3xl md:text-4xl lg:text-5xl font-title text-white mb-6 leading-tight"
							>
								¿Listo para transformar tu empresa?
							</motion.h2>
							<motion.p
								variants={fadeUp}
								className="max-w-2xl text-lg md:text-xl text-blue-100/95 leading-relaxed"
							>
								Diseñamos software a medida para ordenar operaciones, integrar
								canales y automatizar procesos críticos con una implementación
								clara, escalable y útil desde el inicio.
							</motion.p>
						</div>
						<motion.div
							variants={fadeUp}
							className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
						>
							<a
								href="mailto:contacto@ingenit.cl"
								className="bg-white text-blue6 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
							>
								Contactar por email
							</a>
							<a
								href="/contact"
								className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue6 transition-all duration-300"
							>
								Formulario de contacto
							</a>
						</motion.div>
					</div>
				</motion.div>
			</section>

			<Footer />
		</main>
	);
}
