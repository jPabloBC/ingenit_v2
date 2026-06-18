"use client";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const pathname = usePathname();
	const currentPath = pathname ?? "";

	const isActive = (href: string) => {
		if (href === "/") return currentPath === "/";
		return currentPath === href || currentPath.startsWith(`${href}/`);
	};

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const closeMenu = () => setIsMenuOpen(false);

	return (
		<header
			className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
				isScrolled
					? "bg-blue1 backdrop-blur-md shadow-lg border-b border-gray-100"
					: "bg-blue3"
			}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16 lg:h-20">
					{/* Logo */}
					<Link
						href="/"
						className="flex items-center space-x-2 group focus:outline-none"
					>
						<Image
							src="/assets/logo_transparent_ingenIT_w.png"
							alt="IngenIT — Desarrollo de Aplicaciones, Web Apps y Automatización"
							width={140}
							height={39}
							priority
							className="transition-transform duration-300 group-hover:scale-105 w-28 sm:w-32 md:w-36 lg:w-40 h-auto"
							sizes="(max-width: 640px) 7rem, (max-width: 768px) 8rem, (max-width: 1024px) 9rem, 10rem"
							style={{ height: "auto" }}
						/>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden lg:flex items-center space-x-8">
						<Link
							href="/"
							className={`font-medium transition-colors duration-300 relative group focus:outline-none ${
								isActive("/")
									? "text-blue-300"
									: "text-gray10 hover:text-blue10"
							}`}
						>
							Inicio
							<span
								className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
									isActive("/")
										? "w-full bg-blue-200"
										: "w-0 group-hover:w-full bg-blue10"
								}`}
							></span>
						</Link>
						<Link
							href="/services"
							className={`font-medium transition-colors duration-300 relative group focus:outline-none ${
								isActive("/services")
									? "text-blue-300"
									: "text-gray10 hover:text-blue10"
							}`}
						>
							Servicios
							<span
								className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
									isActive("/services")
										? "w-full bg-blue-200"
										: "w-0 group-hover:w-full bg-blue10"
								}`}
							></span>
						</Link>
						<Link
							href="/products"
							className={`font-medium transition-colors duration-300 relative group focus:outline-none ${
								isActive("/products")
									? "text-blue-300"
									: "text-gray10 hover:text-blue10"
							}`}
						>
							Productos
							<span
								className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
									isActive("/products")
										? "w-full bg-blue-200"
										: "w-0 group-hover:w-full bg-blue10"
								}`}
							></span>
						</Link>
						<Link
							href="/clients"
							className={`font-medium transition-colors duration-300 relative group focus:outline-none ${
								isActive("/clients")
									? "text-blue-300"
									: "text-gray10 hover:text-blue10"
							}`}
						>
							Clientes
							<span
								className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
									isActive("/clients")
										? "w-full bg-blue-200"
										: "w-0 group-hover:w-full bg-blue10"
								}`}
							></span>
						</Link>
						<Link
							href="/contact"
							className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none ${
								isActive("/contact")
									? "bg-blue-300 text-white"
									: "bg-blue8 text-white hover:bg-blue6"
							}`}
						>
							Contacto
						</Link>
					</nav>

					{/* Mobile menu button */}
					<button
						type="button"
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						className="lg:hidden mr-1 rounded-2xl p-3 bg-blue2 text-white transition-all duration-200 hover:bg-blue4 hover:text-blue14 focus:outline-none"
						aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
					>
						<Menu className="w-6 h-6" />
					</button>
				</div>
			</div>

			{/* Mobile Navigation */}
			<div
				className={`lg:hidden fixed inset-0 z-50 ${
					isMenuOpen
						? "pointer-events-auto visible"
						: "pointer-events-none invisible"
				}`}
			>
				{/* Backdrop */}
				<button
					type="button"
					className={`absolute inset-0 transition-[background-color,opacity,backdrop-filter] duration-700 ease-out ${
						isMenuOpen
							? "bg-blue1/18 opacity-100 backdrop-blur-[10px]"
							: "bg-blue1/0 opacity-0 backdrop-blur-0"
					}`}
					onClick={closeMenu}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") closeMenu();
					}}
				/>

				{/* Menu Panel */}
				<div
					className={`absolute left-0 top-0 h-full w-[20vw] min-w-[160px] max-w-[20vw] border-r border-blue13/60 bg-[linear-gradient(180deg,rgba(230,239,250,0.82)_0%,rgba(219,232,247,0.78)_52%,rgba(236,243,251,0.86)_100%)] shadow-[0_24px_60px_rgba(0,26,51,0.18)] transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
						isMenuOpen
							? "translate-x-0 opacity-100"
							: "-translate-x-full opacity-90"
					}`}
				>
					<div className="flex flex-col h-full">
						{/* Header */}
						<div className="border-b border-blue13/80 px-5 py-5">
							<div className="pl-2">
								<Image
									src="/assets/logo_transparent_ingenIT.png"
									alt="IngenIT — Desarrollo de Aplicaciones, Web Apps y Automatización"
									width={120}
									height={35}
									className="w-24 sm:w-28 md:w-32 lg:w-36 h-auto"
									sizes="(max-width: 640px) 6rem, (max-width: 768px) 7rem, (max-width: 1024px) 8rem, 9rem"
									style={{ height: "auto" }}
								/>
							</div>
						</div>

						{/* Navigation Links */}
						<nav className="flex-1 px-4 py-6">
							<div className="space-y-2">
								<Link
									href="/"
									onClick={closeMenu}
									className={`block rounded-2xl px-4 py-3 text-base font-medium transition-all duration-200 focus:outline-none ${
										isActive("/")
											? "text-blue8"
											: "border border-transparent text-blue4 hover:border-white/45 hover:text-blue6 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
									}`}
								>
									Inicio
								</Link>
								<Link
									href="/services"
									onClick={closeMenu}
									className={`block rounded-2xl px-4 py-3 text-base font-medium transition-all duration-200 focus:outline-none ${
										isActive("/services")
											? "text-blue8"
											: "border border-transparent text-blue4 hover:border-white/45 hover:text-blue6 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
									}`}
								>
									Servicios
								</Link>
								<Link
									href="/products"
									onClick={closeMenu}
									className={`block rounded-2xl px-4 py-3 text-base font-medium transition-all duration-200 focus:outline-none ${
										isActive("/products")
											? "text-blue8"
											: "border border-transparent text-blue4 hover:border-white/45 hover:text-blue6 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
									}`}
								>
									Productos
								</Link>
								<Link
									href="/clients"
									onClick={closeMenu}
									className={`block rounded-2xl px-4 py-3 text-base font-medium transition-all duration-200 focus:outline-none ${
										isActive("/clients")
											? "text-blue8"
											: "border border-transparent text-blue4 hover:border-white/45 hover:text-blue6 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
									}`}
								>
									Clientes
								</Link>
								<Link
									href="/contact"
									onClick={closeMenu}
									className={`block rounded-2xl px-4 py-3 text-base font-medium transition-all duration-200 focus:outline-none ${
										isActive("/contact")
											? "text-blue8"
											: "border border-transparent text-blue4 hover:border-white/45 hover:text-blue6 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
									}`}
								>
									Contacto
								</Link>
							</div>
						</nav>

						{/* Footer */}
						<div className="border-t border-blue13/80 px-5 py-5">
							<div className="text-center text-sm text-blue9">
								© 2025 IngenIT ®
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
