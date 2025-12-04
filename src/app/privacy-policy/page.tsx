import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
    return (
        <>
        <Header />

        <main className="min-h-screen bg-white text-gray2 font-body px-6 py-16 max-w-3xl mx-auto mt-10">
        <h1 className="text-3xl font-title text-blue2 mb-6">Política de Privacidad</h1>

        <p className="mb-4">
            En IngenIT, respetamos y protegemos la privacidad de nuestros usuarios. Esta política describe cómo recogemos, usamos y compartimos la información personal que se obtiene a través de nuestros servicios.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">1. Recopilación de Información</h2>
        <p className="mb-4">
        Recopilamos información que nos proporcionas voluntariamente al utilizar nuestros servicios, incluyendo nombre, dirección de correo electrónico, número de teléfono y otros datos relacionados con el uso de nuestros productos y servicios.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">2. Uso de la Información</h2>
        <p className="mb-4">
            La información que recopilamos se utiliza para ofrecer, mantener, mejorar y desarrollar nuestros servicios, así como para comunicarnos contigo en relación a tus solicitudes o proporcionarte soporte.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">3. Compartir Información</h2>
        <p className="mb-4">
            o compartimos tu información personal con terceros sin tu consentimiento, excepto en los casos exigidos por ley o cuando sea necesario para cumplir con nuestras obligaciones legales.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">4. Seguridad de la Información</h2>
        <p className="mb-4">
            Tomamos medidas razonables para proteger la seguridad de tu información personal y evitar el acceso no autorizado, la alteración o divulgación de la misma.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">5. Tus Derechos</h2>
        <p className="mb-4">
            Tienes derecho a acceder, corregir o eliminar cualquier información personal que hayamos recopilado de ti. Si deseas ejercer estos derechos, puedes contactarnos en <a href="mailto:gerencia@ingenit.cl" className="text-blue4 underline">gerencia@ingenit.cl</a>.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">6. Cambios en la Política de Privacidad</h2>
        <p className="mb-4">
        Nos reservamos el derecho de actualizar esta política en cualquier momento. Te notificaremos de cualquier cambio importante a través de nuestro sitio web.
        </p>

        <p className="mt-6 mb-6">
            Si tienes alguna pregunta o inquietud sobre esta política, no dudes en contactarnos a través del correo <a href="mailto:gerencia@ingenit.cl" className="text-blue4 underline">gerencia@ingenit.cl</a>.
        </p>

        </main>
        
        <Footer />
        </>
    );
}