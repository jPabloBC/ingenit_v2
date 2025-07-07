 "use client";
import Image from "next/image";
import { Globe, Smartphone, Code2, Laptop, Bot, Settings } from "lucide-react";

function closeMobileMenu() {
  document.getElementById("mobile-menu")?.classList.add("translate-x-[100%]");
  document.getElementById("menu-overlay")?.classList.add("hidden");
}

function ProductCard({
  title,
  Icon,
}: {
  title: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="group bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center">
      <div className="flex flex-col items-center justify-center">
        <Icon
          className="w-12 h-12 text-blue4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 mb-2"
          strokeWidth={1}
        />
        <h3 className="text-base font-semibold text-gray4">{title}</h3>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray2 font-body">
      <header className="fixed top-0 left-0 w-full px-6 py-3 flex justify-between items-center shadow-md bg-white z-50">
        <Image
          src="/assets/logo_transparent_ingenIT.png"
          alt="Logo IngenIT"
          width={140}
          height={40}
          priority
        />

        <div className="md:hidden">
          <button
            onClick={() => {
              document.getElementById("mobile-menu")?.classList.toggle("translate-x-[100%]");
              document.getElementById("menu-overlay")?.classList.toggle("hidden");
            }}
          >
            <svg
              className="w-6 h-6 text-blue4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <nav className="hidden md:flex space-x-4 text-sm font-normal">
          <a href="#servicios" className="text-blue2 hover:text-blue4">Servicios</a>
          <a href="#productos" className="text-blue2 hover:text-blue4">Productos</a>
          <a href="#contacto" className="text-blue2 hover:text-blue4">Contacto</a>
        </nav>
      </header>
      
      <div
        id="menu-overlay"
        className="fixed inset-0 bg-blue1 bg-opacity-80 z-40 hidden md:hidden"
          onClick={() => {
            document.getElementById("mobile-menu")?.classList.toggle("translate-x-[100%]");
            document.getElementById("menu-overlay")?.classList.toggle("hidden");
          }}
      ></div>

      <div
        id="mobile-menu"
        className="fixed top-0 right-0 h-full w-[30vw] max-w-[280px] bg-white shadow-lg z-50 transform translate-x-[100%] transition-transform duration-300 md:hidden"
      >
        <div className="p-6 flex flex-col space-y-4 text-sm font-semibold text-gray2">
          <button
            onClick={() => {
              document.getElementById("mobile-menu")?.classList.add("translate-x-[100%]");
              document.getElementById("menu-overlay")?.classList.add("hidden");
            }}
            className="self-end text-blue4 text-xl"
          >
            ✕
          </button>
          <a href="#servicios" onClick={() => closeMobileMenu()}>Servicios</a>
          <a href="#productos" onClick={() => closeMobileMenu()}>Productos</a>
          <a href="#contacto" onClick={() => closeMobileMenu()}>Contacto</a>
        </div>
      </div>

      <section className="pt-[160px] flex flex-col items-center justify-center text-center px-6 py-24 bg-gray10">
        <h1 className="text-4xl font-title text-blue2 mb-4">Soluciones Web y App a tu medida</h1>
        <p className="text-lg max-w-xl mb-8">Desarrollamos software personalizado, apps móviles, web apps y herramientas para automatizar tu negocio.</p>
        <a href="#contacto" className="bg-blue4 text-white px-6 py-3 rounded-xl hover:bg-blue5 transition font-semibold">Contáctanos</a>
      </section>

      <section id="productos" className="px-6 py-16 text-center">
        <h2 className="text-2xl font-title text-blue2 mb-6">Nuestros Productos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 mb-2">
                <Laptop className="w-12 h-12 text-blue4" strokeWidth={1} />
                <Smartphone className="w-12 h-12 text-blue4" strokeWidth={1} />
              </div>
              <h3 className="text-base font-semibold text-gray4">AppWeb / App</h3>
            </div>
          </div>

          <ProductCard title="ChatBot" Icon={Bot} />
          <ProductCard title="SoftLogic" Icon={Settings} />
        </div>
      </section>

      <section id="contacto" className="px-6 py-16 text-center bg-gray10">
        <h2 className="text-2xl font-title text-blue2 mb-4">Hablemos</h2>
        <p className="mb-6">Escríbenos para empezar tu próximo proyecto tecnológico.</p>
        <a href="mailto:contacto@ingenit.cl" className="text-gray5 font-normal hover:text-gray3">gerencia@ingenit.cl</a>
      </section>

      <footer className="text-center py-6 text-sm text-gray5 border-t">© 2025 IngenIT. Todos los derechos reservados.</footer>
    </main>
  );
}
