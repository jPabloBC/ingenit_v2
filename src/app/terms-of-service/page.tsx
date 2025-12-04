import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsOfServicePage() {
    return (
        <>
        <Header />

        <main className="min-h-screen bg-white text-gray2 font-body px-6 py-16 max-w-3xl mx-auto mt-10">
        <h1 className="text-3xl font-title text-blue2 mb-6">Condiciones del Servicio</h1>

        <p className="mb-4">
            Bienvenido a IngenIT SpA. Estos términos y condiciones describen las reglas y regulaciones para el uso de nuestros servicios de desarrollo web, aplicaciones y tecnología de la información.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">1. Información de la Empresa</h2>
        <p className="mb-4">
            <strong>Razón Social:</strong> INGENIT SpA<br />
            <strong>RUT:</strong> 78.000.171-2<br />
            <strong>Domicilio:</strong> Segunda Región de Antofagasta, Comuna de Antofagasta, Chile<br />
            <strong>Contacto:</strong> <a href="mailto:gerencia@ingenit.cl" className="text-blue4 underline">gerencia@ingenit.cl</a>
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">2. Aceptación de los Términos</h2>
        <p className="mb-4">
            Al acceder y utilizar nuestros servicios, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">3. Servicios Ofrecidos</h2>
        <p className="mb-4">
            IngenIT SpA ofrece servicios especializados en:
        </p>
        <ul className="list-disc list-inside mb-4 ml-4">
            <li>Desarrollo de aplicaciones web y móviles</li>
            <li>Integración y automatización de procesos</li>
            <li>Consultoría en tecnología de la información</li>
            <li>Desarrollo de software personalizado</li>
            <li>Mantenimiento y soporte técnico</li>
        </ul>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">4. Uso Permitido</h2>
        <p className="mb-4">
            Usted se compromete a utilizar nuestros servicios únicamente para fines legales y de manera que no infrinja los derechos de terceros o restrinja o inhiba el uso y disfrute de nuestros servicios por parte de terceros.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">5. Garantías</h2>
        <p className="mb-4">
            Nos comprometemos a prestar nuestros servicios con la debida diligencia profesional y de acuerdo con las mejores prácticas de la industria. Proporcionamos garantía sobre nuestros desarrollos según se especifique en cada contrato particular, generalmente por un período de 90 días posteriores a la entrega, cubriendo defectos de funcionamiento atribuibles a nuestro trabajo.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">6. Política de Reembolsos y Cancelaciones</h2>
        <p className="mb-4">
            Los reembolsos se evaluarán caso a caso según las circunstancias específicas del proyecto. Para cancelaciones de servicios en curso, se aplicarán los términos acordados en el contrato específico. El cliente tiene derecho a cancelar servicios con un preaviso mínimo de 30 días, siendo responsable del pago de los trabajos realizados hasta la fecha de cancelación.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">7. Limitación de Responsabilidad</h2>
        <p className="mb-4">
            IngenIT SpA no será responsable de daños indirectos, incidentales, especiales o consecuentes que resulten del uso o la incapacidad de usar nuestros servicios, incluso si hemos sido advertidos de la posibilidad de tales daños.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">8. Propiedad Intelectual</h2>
        <p className="mb-4">
            Los derechos de propiedad intelectual sobre los desarrollos realizados se regirán por lo acordado en cada contrato específico. Salvo acuerdo contrario, el cliente adquiere los derechos de uso sobre el producto final, mientras que IngenIT SpA conserva los derechos sobre metodologías, frameworks y herramientas propietarias utilizadas.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">9. Confidencialidad</h2>
        <p className="mb-4">
            Nos comprometemos a mantener la confidencialidad de toda la información proporcionada por nuestros clientes y a no divulgar información confidencial a terceros sin autorización expresa.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">10. Modificaciones de los Términos</h2>
        <p className="mb-4">
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en nuestro sitio web. Es responsabilidad del usuario revisar periódicamente estos términos.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">11. Ley Aplicable y Jurisdicción</h2>
        <p className="mb-4">
            Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa que surja en relación con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales competentes de Antofagasta, Chile, conforme a las disposiciones legales vigentes.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">12. Contacto</h2>
        <p className="mb-6">
            Si tiene alguna pregunta sobre estos términos y condiciones, puede contactarnos en:
        </p>
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <p><strong>Email:</strong> <a href="mailto:gerencia@ingenit.cl" className="text-blue4 underline">gerencia@ingenit.cl</a></p>
            <p><strong>Teléfono:</strong> <a href="tel:+56990206618" className="text-blue4 underline">+56 9 9020 6618</a></p>
        </div>

        <p className="text-sm text-gray-600 border-t pt-4">
            <strong>Última actualización:</strong> 5 de octubre de 2025
        </p>

        </main>
        
        <Footer />
        </>
    );
}