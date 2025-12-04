import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DataDeletionPage() {
    return (
        <>
        <Header />

        <main className="min-h-screen bg-white text-gray2 font-body px-6 py-16 max-w-3xl mx-auto mt-10">
        <h1 className="text-3xl font-title text-blue2 mb-6">Instrucciones para la Eliminación de Datos</h1>

        <p className="mb-4">
            En IngenIT SpA respetamos tu derecho a la privacidad y el control sobre tus datos personales. Esta página te proporciona información sobre cómo solicitar la eliminación de tus datos personales de nuestros sistemas.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">1. Derecho a la Eliminación</h2>
        <p className="mb-4">
            Conforme a las normativas de protección de datos vigentes, tienes derecho a solicitar la eliminación de tus datos personales que tengamos almacenados, sujeto a ciertas excepciones legales.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">2. Qué Datos Podemos Eliminar</h2>
        <p className="mb-4">Podemos proceder con la eliminación de los siguientes tipos de datos:</p>
        <ul className="list-disc list-inside mb-4 ml-4">
            <li>Información de contacto (nombre, email, teléfono)</li>
            <li>Datos de comunicaciones y correspondencia</li>
            <li>Información de proyectos completados (sujeto a obligaciones contractuales)</li>
            <li>Datos de uso de nuestros servicios web</li>
            <li>Preferencias y configuraciones de usuario</li>
        </ul>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">3. Excepciones a la Eliminación</h2>
        <p className="mb-4">
            No podremos eliminar ciertos datos cuando sea necesario mantenerlos por:
        </p>
        <ul className="list-disc list-inside mb-4 ml-4">
            <li>Obligaciones legales o regulatorias</li>
            <li>Cumplimiento de contratos vigentes</li>
            <li>Resolución de disputas legales</li>
            <li>Requisitos contables y tributarios</li>
            <li>Protección de derechos de propiedad intelectual</li>
        </ul>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">4. Cómo Solicitar la Eliminación</h2>
        <p className="mb-4">
            Para solicitar la eliminación de tus datos, sigue estos pasos:
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue6 p-4 mb-4">
            <h3 className="font-semibold text-blue2 mb-2">Paso 1: Envía tu solicitud</h3>
            <p className="text-sm mb-2">
                Envía un correo electrónico a <a href="mailto:gerencia@ingenit.cl" className="text-blue4 underline">gerencia@ingenit.cl</a> con el asunto "Solicitud de Eliminación de Datos".
            </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue6 p-4 mb-4">
            <h3 className="font-semibold text-blue2 mb-2">Paso 2: Incluye la información requerida</h3>
            <p className="text-sm mb-2">Tu solicitud debe incluir:</p>
            <ul className="list-disc list-inside text-sm ml-4">
                <li>Tu nombre completo</li>
                <li>Dirección de correo electrónico asociada</li>
                <li>Número de teléfono (si aplica)</li>
                <li>Descripción específica de los datos que deseas eliminar</li>
                <li>Copia de tu cédula de identidad o documento de identificación</li>
            </ul>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue6 p-4 mb-4">
            <h3 className="font-semibold text-blue2 mb-2">Paso 3: Verificación de identidad</h3>
            <p className="text-sm mb-2">
                Verificaremos tu identidad antes de procesar la solicitud para proteger tu privacidad y seguridad.
            </p>
        </div>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">5. Tiempo de Procesamiento</h2>
        <p className="mb-4">
            Procesaremos tu solicitud dentro de <strong>30 días hábiles</strong> a partir de la recepción de una solicitud completa y verificada. Te notificaremos sobre el estado de tu solicitud y cualquier acción tomada.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">6. Consecuencias de la Eliminación</h2>
        <p className="mb-4">
            Ten en cuenta que la eliminación de tus datos puede resultar en:
        </p>
        <ul className="list-disc list-inside mb-4 ml-4">
            <li>Pérdida de acceso a servicios personalizados</li>
            <li>Imposibilidad de brindar soporte técnico continuo</li>
            <li>Pérdida del historial de proyectos y comunicaciones</li>
            <li>Necesidad de proporcionar información nuevamente para futuros servicios</li>
        </ul>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">7. Eliminación Parcial</h2>
        <p className="mb-4">
            En algunos casos, podemos ofrecer la eliminación parcial de datos, manteniendo únicamente la información mínima necesaria para cumplir con obligaciones legales o contractuales.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">8. Confirmación de Eliminación</h2>
        <p className="mb-4">
            Una vez completado el proceso de eliminación, te enviaremos una confirmación por escrito detallando qué datos fueron eliminados y cuáles (si los hay) se mantuvieron por razones legales.
        </p>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">9. Recursos Adicionales</h2>
        <p className="mb-4">
            Si no estás satisfecho con cómo hemos manejado tu solicitud, tienes derecho a:
        </p>
        <ul className="list-disc list-inside mb-4 ml-4">
            <li>Contactar a nuestro supervisor de protección de datos</li>
            <li>Presentar una queja ante la autoridad de protección de datos competente</li>
            <li>Buscar recursos legales según las leyes aplicables</li>
        </ul>

        <h2 className="text-xl font-normal text-blue3 mt-6 mb-2">10. Contacto para Consultas</h2>
        <p className="mb-6">
            Si tienes preguntas sobre este proceso o necesitas asistencia con tu solicitud:
        </p>
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <p><strong>Email:</strong> <a href="mailto:gerencia@ingenit.cl" className="text-blue4 underline">gerencia@ingenit.cl</a></p>
            <p><strong>Teléfono:</strong> <a href="tel:+56990206618" className="text-blue4 underline">+56 9 9020 6618</a></p>
            <p><strong>Asunto del correo:</strong> "Consulta sobre Eliminación de Datos"</p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm">
                <strong>Nota importante:</strong> Esta página describe nuestros procedimientos actuales para la eliminación de datos. Los procedimientos pueden cambiar para cumplir con nuevas regulaciones. Consulta esta página regularmente para obtener la información más actualizada.
            </p>
        </div>

        <p className="text-sm text-gray-600 border-t pt-4">
            <strong>Última actualización:</strong> 5 de octubre de 2025
        </p>

        </main>
        
        <Footer />
        </>
    );
}