"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";

export default function ContactoPage() {
    const [sent, setSent] = useState(false);
    const [phone, setPhone] = useState<string>();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    return (
        <main className="relative z-0 min-h-screen bg-white text-gray-900 font-body">
        <Header />

        <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-title text-gray-900 mb-6 leading-tight">
                        <span className="text-blue6">Contáctanos</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
                        Completa el formulario para comunicarte con nuestro equipo y comenzar tu próximo proyecto tecnológico.
                    </p>

                    {!sent ? (
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();

                            if (!phone || !isValidPhoneNumber(phone)) {
                                alert("Teléfono inválido");
                                return;
                            }

                            if (!/\S+@\S+\.\S+/.test(email)) {
                                alert("Correo inválido");
                                return;
                            }

                            const { supabase } = await import("@/lib/supabaseClient");

                            const { error } = await supabase!.from("rt_contacts").insert({
                                full_name: fullName,
                                email,
                                phone,
                                message,
                            });

                            if (error) {
                                console.error("❌ Error al guardar en Supabase:", error.message);
                                return;
                            }

                            setSent(true);
                            setTimeout(() => setSent(false), 4000);
                            setFullName("");
                            setEmail("");
                            setPhone(undefined);
                            setMessage("");
                        }}

                        className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-8 space-y-6 text-left border border-gray-100"
                    >
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Nombre completo</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-all duration-200"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Teléfono</label>
                            <PhoneInput
                                international
                                defaultCountry="CL"
                                value={phone}
                                onChange={setPhone}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-all duration-200"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Correo electrónico</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-all duration-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Mensaje</label>
                            <textarea
                                required
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-all duration-200"
                                placeholder="Cuéntanos sobre tu proyecto..."
                            />
                        </div>
                        
                        <button
                        type="submit"
                        className="w-full bg-blue6 text-white px-8 py-4 rounded-xl hover:bg-blue4 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                        Enviar mensaje
                        </button>
                    </form>
                    ) : (
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-gray-100">
                        <div className="text-center">
                            <div className="mb-4 p-4 bg-green-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">¡Mensaje enviado!</h3>
                            <p className="text-gray-600">Tu mensaje fue enviado correctamente. Nos pondremos en contacto contigo pronto.</p>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </section>

        <Footer />
        </main>
    );
}
