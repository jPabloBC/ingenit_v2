"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100" 
            : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group focus:outline-none">
              <Image
                src="/assets/logo_transparent_ingenIT.png"
                alt="Logo IngenIT"
                width={160}
                height={45}
                priority
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-blue6 font-medium transition-colors duration-200 relative group focus:outline-none"
              >
                Inicio
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue6 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/services" 
                className="text-gray-700 hover:text-blue6 font-medium transition-colors duration-200 relative group focus:outline-none"
              >
                Servicios
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue6 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/products" 
                className="text-gray-700 hover:text-blue6 font-medium transition-colors duration-200 relative group focus:outline-none"
              >
                Productos
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue6 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/contact" 
                className="bg-blue6 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue7 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none"
              >
                Contacto
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-blue6 hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
            isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div 
            className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <Image
                  src="/assets/logo_transparent_ingenIT.png"
                  alt="Logo IngenIT"
                  width={120}
                  height={35}
                />
                <button
                  onClick={closeMenu}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 px-6 py-8">
                <div className="space-y-6">
                  <Link 
                    href="/" 
                    onClick={closeMenu}
                    className="block text-lg font-medium text-gray-700 hover:text-blue6 transition-colors duration-200 py-2 focus:outline-none"
                  >
                    Inicio
                  </Link>
                  <Link 
                    href="/services" 
                    onClick={closeMenu}
                    className="block text-lg font-medium text-gray-700 hover:text-blue6 transition-colors duration-200 py-2 focus:outline-none"
                  >
                    Servicios
                  </Link>
                  <Link 
                    href="/products" 
                    onClick={closeMenu}
                    className="block text-lg font-medium text-gray-700 hover:text-blue6 transition-colors duration-200 py-2 focus:outline-none"
                  >
                    Productos
                  </Link>
                  <Link 
                    href="/contact" 
                    onClick={closeMenu}
                    className="block text-lg font-medium text-gray-700 hover:text-blue6 transition-colors duration-200 py-2 focus:outline-none"
                  >
                    Contacto
                  </Link>
                </div>
              </nav>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100">
                <div className="text-sm text-gray-500 text-center">
                  © 2025 IngenIT ®
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
