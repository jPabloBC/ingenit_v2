"use client";
import { useEffect, useState, useRef } from "react";
import { MessageCircle, X, Send, Bot, User, Target, Phone, Mail, Zap, FileText, Clock, MessageSquare, CheckCircle, Shield, SkipForward, Monitor, Settings, MessageCircle as ChatBot, Link, Globe, FileText as Invoice, Wrench, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabaseClient";

  const botFlow = [
    "Hola, para poder ayudarte a encontrar la mejor solución tecnológica para tu empresa o proyecto, necesito algunos datos. ¿Comenzamos?",
 
    "Para personalizar tu consulta, necesito tu <strong>nombre y apellido</strong>.\n\n",
    "¡Gracias, {name}! <Phone className=\"inline w-4 h-4\" />\n\n" +
    "Ahora necesito tu <strong>número de teléfono</strong> para contactarte.\n\n",
 
    "Tu <strong>correo electrónico</strong> es opcional, pero nos ayuda a enviarte información detallada.\n\n" +
    "¿Deseas compartirlo?",

    "¿En qué <strong>servicio</strong> estás interesado?\n\n" +
    "Selecciona la opción que mejor describa tu necesidad:",

  "Ahora cuéntame brevemente sobre tu proyecto:\n\n" +
  "• ¿Qué objetivo quieres lograr?\n" +
  "• ¿Qué resultado esperas?\n" +
  "• ¿Hay algún desafío específico?",

    "¿Cuál es la <strong>urgencia</strong> de tu proyecto?",
  "¡Genial! <MessageSquare className=\"inline w-4 h-4\" />\n\n" +
  "¿Cómo prefieres que te contactemos?",
      "<FileText className=\"inline w-4 h-4\" /> <strong>¡Excelente! hemos recibido tu consulta</strong>\n\n" +
    "Nos contactaremos a la brevedad para iniciar la solución que esperas.",
      "<CheckCircle className=\"inline w-4 h-4\" /> <strong>¡CONSULTA ENVIADA EXITOSAMENTE!</strong>\n\n" +
    "Gracias por confiar en <strong>Ingenit</strong>, {name}.\n\n" +
    "Un especialista te contactará pronto por {contact_method}.\n\n" +
    "<Shield className=\"inline w-4 h-4\" /> <em>Tus datos están protegidos según nuestra política de privacidad.</em>\n\n" +
    "¿Hay algo más en lo que pueda ayudarte?"
];

export default function WebChatBot() {
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [countryCode, setCountryCode] = useState("+56");
    const [contactEmail, setContactEmail] = useState("");
    const [service, setService] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [urgency, setUrgency] = useState("");
    const [contactPreference, setContactPreference] = useState("");
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [messages, setMessages] = useState<{ sender: string; message: string }[]>([]);
    const [input, setInput] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [showBot, setShowBot] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isAdmin = window.location.pathname.includes("/admin");
            setShowBot(!isAdmin);
        }
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const chatElement = document.getElementById("chat-bot-container");
            if (chatElement && !chatElement.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        if (open) {
            // si ya hay mensajes no volver a inicializar
            if (messages.length === 0) {
                const sid = uuidv4();
                setSessionId(sid);
                const firstMessage = botFlow[0];
                setMessages([{ sender: "bot", message: firstMessage }]);
                insertToSupabase("bot", firstMessage, 0, sid);
            }

            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-focus en el input cuando cambie el step o termine el typing
    useEffect(() => {
        if (!isTyping && step < botFlow.length - 1) {
            // Pequeño delay para asegurar que el DOM se haya actualizado
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [step, isTyping]);

    // Auto-focus en el input cuando se abra el chat
    useEffect(() => {
        if (open && !isTyping && step < botFlow.length - 1) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [open, isTyping, step]);

    // Utilidades de validación
    const isValidName = (v: string) => /^\S+\s+\S+/.test(v.trim());
    const isE164 = (v: string) => /^\+[1-9]\d{7,14}$/.test(v.trim().replace(/\s+/g, ""));
    const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    const normalizePhone = (v: string) => v.replace(/\s+/g, "");



    async function insertToSupabase(sender: "user" | "bot", message: string, step: number, sid: string) {
        console.log('💾 Intentando insertar en Supabase:', { sender, message, step, session_id: sid });
        
        try {
            // Verificar que supabase esté disponible
            if (!supabase) {
                console.error('❌ Supabase client no está disponible');
                throw new Error('Supabase client no está disponible');
            }

            // Preparar datos adicionales según el step
            let additionalData: any = {};
            
            if (sender === "user") {
                switch (step) {
                  case 1: // Nombre
                    additionalData.contact_name = message;
                    break;
                  case 2: // Teléfono
                    additionalData.contact_phone = message;
                    break;
                  case 3: // Email (opcional)
                    additionalData.contact_email = message;
                    break;
                  case 4: // Servicio
                    additionalData.service = message;
                    break;
                  case 5: // Descripción
                    additionalData.project_description = message;
                    break;
                }
            }
            
            const insertData = { 
                sender, 
                message, 
                step, 
                session_id: sid,
                ...additionalData
            };
            
            console.log('📤 Datos a insertar:', insertData);
            
            const { data, error } = await supabase.from("rt_web_chat").insert(insertData);
            
            if (error) {
                console.error('❌ Error insertando en Supabase:', {
                    error: error,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    fullError: JSON.stringify(error, null, 2)
                });
                throw error;
            }
            
            console.log('✅ Insertado exitosamente en Supabase:', data);
            return data;
        } catch (error) {
            console.error('❌ Error en insertToSupabase:', {
                error: error,
                message: error instanceof Error ? error.message : 'Error desconocido',
                stack: error instanceof Error ? error.stack : undefined,
                fullError: JSON.stringify(error, null, 2),
                errorType: typeof error,
                errorKeys: error ? Object.keys(error) : 'No keys'
            });
            throw error;
        }
    }

    const handleSend = async () => {
        console.log('🚀 handleSend iniciado');
        console.log('📝 Input actual:', input);
        console.log('📊 Step actual:', step);
        
        if (!input.trim()) {
            console.log('❌ Input vacío, retornando');
            return;
        }

        const userMessage = input.trim();
        console.log('✅ Mensaje del usuario:', userMessage);

        // Captura de valores según el paso
        // Guardar datos del usuario según el paso
        let currentName = contactName;
        let currentPhone = contactPhone;
        let currentEmail = contactEmail;
        let currentService = service;
        let currentDescription = projectDescription;
        
        if (step === 1) {
          setContactName(userMessage);
          currentName = userMessage;
        }
        if (step === 2) {
          const phone = normalizePhone(countryCode + " " + userMessage);
          setContactPhone(phone);
          currentPhone = phone;
        }
        if (step === 3 && userMessage.toLowerCase() !== "omitir") {
          setContactEmail(userMessage);
          currentEmail = userMessage;
        }
        if (step === 4) {
          setService(userMessage);
          currentService = userMessage;
        }
        if (step === 5) {
          setProjectDescription(userMessage);
          currentDescription = userMessage;
        }
        // Los pasos 6 y 7 se manejan con botones
        if (step === 6) {
          // Manejar urgencia por texto (fallback)
          if (userMessage.toLowerCase().includes('alta')) setUrgency('Alta');
          else if (userMessage.toLowerCase().includes('media')) setUrgency('Media');
          else if (userMessage.toLowerCase().includes('baja')) setUrgency('Baja');
        }
        if (step === 7) {
          // Manejar preferencia de contacto por texto (fallback)
          if (userMessage.toLowerCase().includes('whatsapp')) setContactPreference('WhatsApp');
          else if (userMessage.toLowerCase().includes('llamada') || userMessage.toLowerCase().includes('llamar')) setContactPreference('Llamada');
          else if ((userMessage.toLowerCase().includes('email') || userMessage.toLowerCase().includes('correo')) && contactEmail && contactEmail.trim() !== "") {
            setContactPreference('Email');
          }
        }

        // Validaciones por paso (nuevo flujo)
        if (step === 0) {
          if (!userMessage.toLowerCase().match(/(iniciar conversación|iniciar|conversación|sí|si|no)/)) {
            alert("Por favor escribe 'Iniciar conversación' o responde 'Sí' o 'No'");
            return;
          }
          // Si responde "No", terminar la conversación
          if (userMessage.toLowerCase() === "no") {
            setMessages(prev => [...prev, { sender: "user", message: userMessage }]);
            const goodbyeMsg = "Entiendo. Si cambias de opinión, aquí estaré para ayudarte. ¡Que tengas un excelente día! <MessageCircle className=\"inline w-4 h-4\" />";
            setMessages(prev => [...prev, { sender: "bot", message: goodbyeMsg }]);
            setStep(botFlow.length - 1);
            await insertToSupabase("user", userMessage, step, sessionId);
            await insertToSupabase("bot", goodbyeMsg, botFlow.length - 1, sessionId);
            setInput("");
            return;
          }
        }
        if (step === 1) {
          // Validar que sea un nombre válido
          const nameRegex = /^[A-Za-záéíóúÁÉÍÓÚñÑ]+\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+(\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+)*$/;
          if (!nameRegex.test(userMessage.trim())) {
            alert("Nombre no válido. Ingresa solo letras, separadas por espacios (ej: Juan Pablo).");
            return;
          }
          
          // Validar longitud
          const words = userMessage.trim().split(' ').filter(word => word.length > 0);
          if (words.length < 2 || words.length > 4) {
            alert("Ingresa entre 2 y 4 palabras (nombre y apellidos).");
            return;
          }
          
          // Validar que cada palabra tenga al menos 2 caracteres
          for (let word of words) {
            if (word.length < 2) {
              alert("Cada palabra debe tener al menos 2 caracteres.");
              return;
            }
          }
        }
        if (step === 2 && !isE164(normalizePhone(countryCode + " " + userMessage))) {
          alert("Teléfono inválido. Ingresa solo el número sin código de país.");
          return;
        }
        if (step === 3 && userMessage.toLowerCase() !== "omitir" && !isEmail(userMessage)) {
          alert("Correo inválido. O escribe 'omitir'.");
          return;
        }
        if (step === 4 && userMessage.length < 3) {
          alert("Selecciona o escribe un servicio válido.");
          return;
        }
        if (step === 5 && userMessage.trim().length < 20) {
          alert("Descripción muy corta. Agrega 2–4 líneas (mín. 20 caracteres).");
          return;
        }
        if (step === 6) {
          // Validar urgencia
          if (!userMessage.toLowerCase().match(/(alta|media|baja)/)) {
            alert("Por favor selecciona: Alta, Media o Baja");
            return;
          }
        }
        if (step === 7) {
          // Validar preferencia de contacto
          const hasEmail = contactEmail && contactEmail.trim() !== "";
          const validOptions = hasEmail ? "whatsapp|llamada|email|correo" : "whatsapp|llamada";
          const message = hasEmail ? "Por favor selecciona: WhatsApp, Llamada o Email" : "Por favor selecciona: WhatsApp o Llamada";
          
          if (!userMessage.toLowerCase().match(new RegExp(`(${validOptions})`))) {
            alert(message);
            return;
          }
        }
        if (step === 8) {
          const ok = userMessage.toLowerCase();
          if (ok !== "sí" && ok !== "si") {
            if (ok === "reiniciar") {
              resetConversation();
              return;
            }
            alert("Responde 'sí' para enviar o 'reiniciar' para empezar de nuevo.");
            return;
          }
        }

        console.log('✅ Validaciones pasadas, guardando mensaje del usuario');
        
        // Guardar mensaje del usuario
        setMessages((prev) => {
            // Para el paso 2 (teléfono), mostrar el número completo con código de país
            const messageToShow = step === 2 ? currentPhone : userMessage;
            const newMessages = [...prev, { sender: "user", message: messageToShow }];
            console.log('📨 Mensajes actualizados:', newMessages);
            return newMessages;
        });
        
        try {
            // Para el paso 2 (teléfono), usar el número completo con código de país
            const messageToSave = step === 2 ? currentPhone : userMessage;
            await insertToSupabase("user", messageToSave, step, sessionId);
            console.log('✅ Mensaje guardado en Supabase');
        } catch (error) {
            console.error('❌ Error guardando en Supabase:', error);
            // No bloquear el flujo si falla Supabase, solo mostrar error
        }
        
        setInput("");
        console.log('🧹 Input limpiado');
        
        // Enfocar el input después de limpiarlo
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);

        const nextStep = step + 1;
        console.log('📈 Siguiente paso:', nextStep);

        if (botFlow[nextStep]) {
            console.log('🤖 Hay respuesta del bot, configurando typing...');
            setIsTyping(true);
            setTimeout(async () => {
                let botMsg = botFlow[nextStep];

                // Reemplazar variables en el mensaje
                botMsg = botMsg.replace('{name}', currentName || 'Usuario');

                // Construir resumen dinámico en el paso 7
                if (nextStep === 7) {
                  const emailOut = currentEmail ? currentEmail : "No proporcionado";
                  const contactMethod = contactPreference === 'Email' && !currentEmail ? 'WhatsApp' : contactPreference;
                  
                  botMsg =
                    "<FileText className=\"inline w-4 h-4\" /> <strong>¡EXCELENTE! HEMOS RECIBIDO TU CONSULTA</strong>\n\n" +
                    "Nos contactaremos a la brevedad para iniciar la solución que esperas:\n\n" +
                    `<User className=\"inline w-4 h-4\" /> <strong>Nombre:</strong> ${currentName}\n` +
                    `<Phone className=\"inline w-4 h-4\" /> <strong>Teléfono:</strong> ${currentPhone}\n` +
                    `<Mail className=\"inline w-4 h-4\" /> <strong>Email:</strong> ${emailOut}\n` +
                    `<Target className=\"inline w-4 h-4\" /> <strong>Servicio:</strong> ${currentService}\n` +
                    `<FileText className=\"inline w-4 h-4\" /> <strong>Descripción:</strong> ${currentDescription}\n` +
                    `<Clock className=\"inline w-4 h-4\" /> <strong>Urgencia:</strong> ${urgency}\n` +
                    `<MessageSquare className=\"inline w-4 h-4\" /> <strong>Contacto preferido:</strong> ${contactMethod}\n\n` +
                    "¿Está todo correcto? Responde 'sí' para enviar o 'reiniciar' para empezar de nuevo.";
                }

                // Manejar mensaje final en el paso 8
                if (nextStep === 8) {
                  const contactMethod = contactPreference === 'Email' && !currentEmail ? 'WhatsApp' : contactPreference;
                  botMsg = botMsg.replace('{contact_method}', contactMethod);
                }
                console.log('🤖 Mensaje del bot:', botMsg);
                
                setMessages((prev) => {
                    const newMessages = [...prev, { sender: "bot", message: botMsg }];
                    console.log('📨 Mensajes actualizados con bot:', newMessages);
                    return newMessages;
                });
                
                try {
                    await insertToSupabase("bot", botMsg, nextStep, sessionId);
                    console.log('✅ Respuesta del bot guardada en Supabase');
                } catch (error) {
                    console.error('❌ Error guardando respuesta del bot:', error);
                }
                
                setStep(nextStep);
                setIsTyping(false);
                console.log('✅ Conversación actualizada al paso:', nextStep);
                
                // Enfocar el input después de que termine el typing
                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            }, 1000);
        } else {
            console.log('🏁 No hay más pasos en el flujo');
        }
    };

    const resetConversation = () => {
        const sid = uuidv4();
        setSessionId(sid);
        const firstMessage = botFlow[0];
        setMessages([{ sender: "bot", message: firstMessage }]);
        insertToSupabase("bot", firstMessage, 0, sid);
        setStep(0);
        // Limpiar todos los estados
        setContactName("");
        setContactPhone("");
        setCountryCode("+56");
        setContactEmail("");
        setService("");
        setProjectDescription("");
        setUrgency("");
        setContactPreference("");
    };



    if (!showBot) return null;

    return (
        <>
            {/* Chat Toggle Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    id="chat-bot-toggle"
                    onClick={() => setOpen(!open)}
                    className={`p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
                        open 
                            ? "bg-red-500 text-white hover:bg-red-600" 
                            : "bg-blue6 text-white hover:bg-blue4"
                    }`}
                >
                    {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                </button>
            </div>

            {/* Chat Container */}
            <div
                id="chat-bot-container"
                className={`fixed bottom-24 right-6 w-[420px] max-h-[640px] bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col z-50 transition-all duration-300 ${
                    open 
                        ? "opacity-100 scale-100 translate-y-0" 
                        : "opacity-0 scale-95 translate-y-2 pointer-events-none"
                }`}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue6 to-blue4 text-white p-4 rounded-t-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Asistente Virtual</h3>
                            <p className="text-xs opacity-90">Ingenit — Desarrollo, Automatización y Chatbots</p>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`flex items-start space-x-2 max-w-[80%] ${m.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                                <div className={`p-2 rounded-full ${m.sender === "user" ? "bg-blue6" : "bg-gray-300"}`}>
                                    {m.sender === "user" ? (
                                        <User className="w-4 h-4 text-white" />
                                    ) : (
                                        <Bot className="w-4 h-4 text-gray-600" />
                                    )}
                                </div>
                                <div className="relative group">
                                    <div className={`px-4 py-2 rounded-2xl ${
                                        m.sender === "user" 
                                            ? "bg-blue6 text-white" 
                                            : "bg-white text-gray-800 shadow-sm"
                                    }`}>
                                        <p 
                                          className="text-sm" 
                                          dangerouslySetInnerHTML={{ __html: m.message.replace(/\n/g, '<br>') }}
                                        />
                                    </div>
                                    
                                    {/* Menú desplegable para mensajes */}
                                    <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity message-menu-dropdown ${
                                        m.sender === "user" ? "right-0" : "left-0"
                                    }`}>

                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="flex items-start space-x-2">
                                <div className="p-2 rounded-full bg-gray-300">
                                    <Bot className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="bg-white text-gray-800 px-4 py-2 rounded-2xl shadow-sm">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Opciones para email opcional */}
                {step === 3 && (
                  <div className="px-4 pt-3 pb-4 bg-white border-t border-gray-200">
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          setContactEmail("");
                          setInput("");
                          // Agregar la elección del usuario al chat
                          setMessages(prev => [...prev, { sender: "user", message: "Omitir email" }]);
                          const nextStep = step + 1;
                          setStep(nextStep);
                          // Enviar mensaje del bot automáticamente
                          setTimeout(async () => {
                            let botMsg = botFlow[nextStep];
                            setMessages((prev) => [...prev, { sender: "bot", message: botMsg }]);
                            try {
                              await insertToSupabase("user", "Omitir email", step, sessionId);
                              await insertToSupabase("bot", botMsg, nextStep, sessionId);
                            } catch (error) {
                              console.error('❌ Error guardando respuesta del bot en Supabase:', error);
                            }
                          }, 100);
                        }}
                        className="text-xs px-4 py-2 rounded-full border border-gray-300 hover:border-blue6 hover:text-blue6 transition flex items-center gap-2"
                      >
                        <SkipForward className="w-3 h-3" />
                        Omitir email
                      </button>
                    </div>
                  </div>
                )}

                {/* Botón para iniciar conversación */}
                {step === 0 && (
                  <div className="px-4 pt-3 pb-4 bg-white border-t border-gray-200">
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          setMessages(prev => [...prev, { sender: "user", message: "Iniciar conversación" }]);
                          setStep(1);
                          insertToSupabase("user", "Iniciar conversación", 0, sessionId);
                          setTimeout(async () => {
                            const botMsg = botFlow[1];
                            setMessages(prev => [...prev, { sender: "bot", message: botMsg }]);
                            try {
                              await insertToSupabase("bot", botMsg, 1, sessionId);
                            } catch (error) {
                              console.error('❌ Error guardando respuesta del bot en Supabase:', error);
                            }
                            setIsTyping(false);
                          }, 1000);
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue6 transition-colors text-sm font-medium"
                      >
                        Iniciar conversación
                      </button>
                    </div>
                  </div>
                )}

                {/* Opciones rápidas para servicios */}
                {step === 4 && (
                  <div className="px-4 pt-3 pb-4 bg-white border-t border-gray-200">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        { text: "Desarrollo de software", icon: <Monitor className="w-3 h-3" /> },
                        { text: "Automatización de procesos", icon: <Settings className="w-3 h-3" /> },
                        { text: "Chatbot WhatsApp Business", icon: <ChatBot className="w-3 h-3" /> },
                        { text: "Integraciones / APIs", icon: <Link className="w-3 h-3" /> },
                        { text: "Sitios web / Landing", icon: <Globe className="w-3 h-3" /> },
                        { text: "Facturación electrónica SII", icon: <Invoice className="w-3 h-3" /> },
                        { text: "Redes / Infraestructura", icon: <Wrench className="w-3 h-3" /> },
                        { text: "Otro", icon: <Plus className="w-3 h-3" /> }
                      ].map((opt) => (
                        <button
                          key={opt.text}
                          onClick={() => {
                            setService(opt.text);
                            setInput("");
                            // Agregar la elección del usuario al chat
                            setMessages(prev => [...prev, { sender: "user", message: opt.text }]);
                            const nextStep = step + 1;
                            setStep(nextStep);
                            // Enviar mensaje del bot automáticamente
                            setTimeout(async () => {
                              let botMsg = botFlow[nextStep];
                              setMessages((prev) => [...prev, { sender: "bot", message: botMsg }]);
                              try {
                                await insertToSupabase("user", opt.text, step, sessionId);
                                await insertToSupabase("bot", botMsg, nextStep, sessionId);
                              } catch (error) {
                                console.error('❌ Error guardando respuesta del bot en Supabase:', error);
                              }
                            }, 100);
                          }}
                          className="text-xs px-3 py-2 rounded-full border border-gray-300 hover:border-blue6 hover:text-blue6 transition"
                        >
                          {opt.icon} {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opciones rápidas para urgencia */}
                {step === 6 && (
                  <div className="px-4 pt-3 pb-4 bg-white border-t border-gray-200">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        { text: "Alta (48h)", value: "Alta", icon: <Zap className="w-3 h-3" /> },
                        { text: "Media (esta semana)", value: "Media", icon: <Clock className="w-3 h-3" /> },
                        { text: "Baja", value: "Baja", icon: <FileText className="w-3 h-3" /> }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setUrgency(opt.value);
                            setInput("");
                            // Agregar la elección del usuario al chat
                            setMessages(prev => [...prev, { sender: "user", message: opt.text }]);
                            const nextStep = step + 1;
                            setStep(nextStep);
                            setTimeout(async () => {
                              let botMsg = botFlow[nextStep];
                              setMessages((prev) => [...prev, { sender: "bot", message: botMsg }]);
                              try {
                                await insertToSupabase("user", opt.text, step, sessionId);
                                await insertToSupabase("bot", botMsg, nextStep, sessionId);
                              } catch (error) {
                                console.error('❌ Error guardando respuesta del bot en Supabase:', error);
                              }
                            }, 100);
                          }}
                          className="text-xs px-3 py-2 rounded-full border border-gray-300 hover:border-blue6 hover:text-blue6 transition"
                        >
                          {opt.icon} {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opciones rápidas para preferencia de contacto */}
                {step === 7 && (
                  <div className="px-4 pt-3 pb-4 bg-white border-t border-gray-200">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        { text: "WhatsApp", value: "WhatsApp", icon: <MessageSquare className="w-3 h-3" /> },
                        { text: "Llamada", value: "Llamada", icon: <Phone className="w-3 h-3" /> },
                        // Solo mostrar Email si se proporcionó un email
                        ...(contactEmail ? [{ text: "Email", value: "Email", icon: <Mail className="w-3 h-3" /> }] : [])
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setContactPreference(opt.value);
                            setInput("");
                            // Agregar la elección del usuario al chat
                            setMessages(prev => [...prev, { sender: "user", message: opt.text }]);
                            const nextStep = step + 1;
                            setStep(nextStep);
                            setTimeout(async () => {
                              let botMsg = botFlow[nextStep];
                              setMessages((prev) => [...prev, { sender: "bot", message: botMsg }]);
                              try {
                                await insertToSupabase("user", opt.text, step, sessionId);
                                await insertToSupabase("bot", botMsg, nextStep, sessionId);
                              } catch (error) {
                                console.error('❌ Error guardando respuesta del bot en Supabase:', error);
                              }
                            }, 100);
                          }}
                          className="text-xs px-3 py-2 rounded-full border border-gray-300 hover:border-blue6 hover:text-blue6 transition"
                        >
                          {opt.icon} {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                {step < botFlow.length - 1 && step !== 8 && step !== 0 && step !== 4 && step !== 6 && step !== 7 ? (
                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                            {step === 2 ? (
                              <>
                                <select
                                  value={countryCode}
                                  onChange={(e) => setCountryCode(e.target.value)}
                                  className="border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-transparent bg-white"
                                  disabled={isTyping}
                                >
                                  <option value="+56">🇨🇱 +56</option>
                                  <option value="+1">🇺🇸 +1</option>
                                  <option value="+52">🇲🇽 +52</option>
                                  <option value="+54">🇦🇷 +54</option>
                                  <option value="+57">🇨🇴 +57</option>
                                  <option value="+51">🇵🇪 +51</option>
                                  <option value="+593">🇪🇨 +593</option>
                                  <option value="+58">🇻🇪 +58</option>
                                  <option value="+34">🇪🇸 +34</option>
                                  <option value="+33">🇫🇷 +33</option>
                                  <option value="+49">🇩🇪 +49</option>
                                  <option value="+39">🇮🇹 +39</option>
                                  <option value="+44">🇬🇧 +44</option>
                                </select>
                                <input
                                  ref={inputRef}
                                  type="text"
                                  value={input}
                                  onChange={(e) => setInput(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                  placeholder="Ej: 9 12345678"
                                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-transparent"
                                  disabled={isTyping}
                                  autoFocus
                                />
                              </>
                            ) : (
                              <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => {
                                  if (step === 1) {
                                    // Filtrar y convertir a Capitalize para el nombre
                                    let value = e.target.value;
                                    
                                    // Limitar a 50 caracteres
                                    if (value.length > 50) {
                                      value = value.substring(0, 50);
                                    }
                                    
                                    // Solo permitir letras, espacios y algunos caracteres especiales
                                    value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                                    
                                    // Limitar a máximo 4 palabras (nombre + apellidos)
                                    const words = value.toLowerCase().split(' ').filter(word => word.length > 0);
                                    if (words.length > 4) {
                                      value = words.slice(0, 4).join(' ');
                                    }
                                    
                                    // Limitar cada palabra a máximo 15 caracteres
                                    const limitedWords = value.toLowerCase().split(' ').map(word => 
                                      word.length > 15 ? word.substring(0, 15) : word
                                    );
                                    value = limitedWords.join(' ');
                                    
                                    // Convertir a Capitalize
                                    const capitalizedWords = value.toLowerCase().split(' ').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    );
                                    setInput(capitalizedWords.join(' '));
                                  } else {
                                    setInput(e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder={
                                  step === 1 ? "Nombre y apellido (máx. 4 palabras)" :
                                  step === 2 ? "Ej: +56 9 12345678" :
                                  step === 3 ? "Correo o escribe 'omitir'" :
                                  step === 4 ? "Selecciona un botón o escribe el servicio" :
                                  step === 5 ? "Describe tu necesidad (mín. 20 caracteres)" :
                                  step === 6 ? "Alta, Media o Baja" :
                                  step === 7 ? "WhatsApp, Llamada o Email" :
                                  step === 8 ? "sí o reiniciar" :
                                  "Escribe tu respuesta..."
                                }
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-transparent"
                                disabled={isTyping}
                                autoFocus
                              />
                            )}
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="bg-blue6 text-white p-3 rounded-xl hover:bg-blue4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : step === 8 ? (
                    <div className="p-4 bg-white border-t border-gray-200">
                        <button
                            onClick={resetConversation}
                            className="w-full text-center px-4 py-3 text-sm text-blue6 hover:text-blue4 transition-colors duration-200 font-medium"
                        >
                            Iniciar nueva conversación
                        </button>
                    </div>
                ) : null}
            </div>
        </>
    );
}
