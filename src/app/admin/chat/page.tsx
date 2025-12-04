"use client";

import { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Message {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    read: boolean;
    from_number?: string;
    to_number?: string;
    whatsapp_number?: string; // Número de WhatsApp que envió/recibió el mensaje
    media_url?: string | null;
    media_type?: "audio" | "image" | "video" | "document" | null;
}

interface Contact {
    id: string;
    name: string;
    phone: string;
    unreadCount: number;
    whatsapp_number?: string; // Número de WhatsApp asociado al contacto
}

interface WhatsAppNumber {
    id: string;
    number: string;
    name: string;
    isActive: boolean;
    lastUsed: string;
    phoneId?: string; // Identificador de número de teléfono
    businessAccountId?: string; // Identificador de la cuenta de WhatsApp Business
    primaryColor: string; // Color primario corporativo
    secondaryColor: string; // Color secundario corporativo
    accentColor: string; // Color de acento
    bgColor: string; // Color de fondo
}

export default function AdminChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [showContacts, setShowContacts] = useState(true);
    const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
    const [selectedWhatsappNumber, setSelectedWhatsappNumber] = useState<WhatsAppNumber | null>(null);
    const [showWhatsappSelector, setShowWhatsappSelector] = useState(false);
    const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
    const [openContactMenu, setOpenContactMenu] = useState<string | null>(null);
    const [newMessageIndicator, setNewMessageIndicator] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

    // Función para hacer scroll automático al final de los mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Reproducir media a través de la Web Audio API (fallback por si los controls nativos no aparecen)
    const playMedia = (url: string) => {
        try {
            const audio = new Audio(url);
            // permitir CORS si el servidor lo soporta
            (audio as any).crossOrigin = 'anonymous';
            audio.play().catch((err) => {
                console.warn('No se pudo reproducir vía Audio API:', err);
            });
        } catch (e) {
            console.error('playMedia error', e);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // small feedback could be added
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    const downloadFile = (url: string, filename?: string) => {
        try {
            // Use proxied url if needed
            const parsedUrl = (() => { try { return new URL(url); } catch { return null; } })();
            const shouldProxy = parsedUrl && (parsedUrl.hostname === 'lookaside.fbsbx.com' || parsedUrl.hostname === 'graph.facebook.com');
            const downloadUrl = shouldProxy ? `/api/media-proxy?u=${encodeURIComponent(url)}` : url;
            const a = document.createElement('a');
            a.href = downloadUrl;
            if (filename) a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error('Download failed', e);
            window.open(url, '_blank');
        }
    };

    // Componente interno para mostrar imagen con fallback si falla la carga
    const ImageWithFallback = ({ src, alt }: { src: string; alt?: string }) => {
        const [error, setError] = useState(false);
        if (!src || error) {
            return <span style={{ color: '#888' }}>Imagen no disponible</span>;
        }
        return (
            // crossOrigin in case storage requires it
            <img
                src={src}
                alt={alt || 'Imagen'}
                className="max-w-full max-h-[40vh] my-2 rounded object-contain"
                style={{ display: 'block' }}
                crossOrigin="anonymous"
                onError={() => setError(true)}
            />
        );
    };


    // Función helper para obtener colores corporativos
    const getCorporateColors = (whatsappNumber: WhatsAppNumber | null) => {
        if (!whatsappNumber) {
            return {
                primary: '#0078ff', // blue8
                secondary: '#005abf', // blue6
                accent: '#3393ff', // blue10
                bg: '#cce4ff', // blue15
                textPrimary: '#0078ff',
                textSecondary: '#005abf',
                borderPrimary: '#0078ff',
                borderSecondary: '#005abf'
            };
        }

        // Mapeo de colores corporativos
        const colorMap: { [key: string]: { [key: string]: string } } = {
            'blue8': {
                primary: '#0078ff',
                secondary: '#005abf',
                accent: '#3393ff',
                bg: '#cce4ff',
                textPrimary: '#0078ff',
                textSecondary: '#005abf',
                borderPrimary: '#0078ff',
                borderSecondary: '#005abf'
            },
            'blue4': {
                primary: '#003c80',
                secondary: '#001e40',
                accent: '#335c85',
                bg: '#ccd6e0',
                textPrimary: '#003c80',
                textSecondary: '#001e40',
                borderPrimary: '#003c80',
                borderSecondary: '#001e40'
            }
        };

        return colorMap[whatsappNumber.primaryColor] || colorMap['blue8'];
    };

    useEffect(() => {
        loadWhatsappNumbers();
        // En móvil, mostrar contactos por defecto
        if (window.innerWidth < 768) {
            setShowContacts(true);
        }
    }, []);

    // Actualizar contadores automáticamente cada 2 segundos como fallback
    useEffect(() => {
        if (whatsappNumbers.length > 0) {
            const interval = setInterval(() => {
                loadUnreadCounts();
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [whatsappNumbers]);

    // Cerrar menús cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.menu-dropdown')) {
                setOpenMessageMenu(null);
                setOpenContactMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Recargar contactos cuando cambie el número de WhatsApp seleccionado
    useEffect(() => {
        if (selectedWhatsappNumber) {
            loadContacts();
            // Limpiar contacto seleccionado cuando cambie el número
            setSelectedContact(null);
            setMessages([]);
        }
    }, [selectedWhatsappNumber]);

    const loadWhatsappNumbers = async () => {
        try {
            // TODO: En el futuro, cargar desde la base de datos
            // const { data, error } = await supabase
            //     .from("whatsapp_numbers")
            //     .select("*")
            //     .eq("isActive", true)
            //     .order("lastUsed", { ascending: false });
            
            // Números reales de WhatsApp Business con colores corporativos
            // AMBOS NÚMEROS ESTÁN CONFIGURADOS EN WHATSAPP BUSINESS API
            const numbers: WhatsAppNumber[] = [
                {
                    id: '1',
                    number: '+56975385487',
                    name: 'WhatsApp Business Principal',
                    isActive: true, // CONFIGURADO EN WHATSAPP BUSINESS API
                    lastUsed: new Date().toISOString(),
                    phoneId: '720256401177655', // PHONE ID ÚNICO DEL NÚMERO PRINCIPAL
                    businessAccountId: '512985415236720',
                    primaryColor: 'blue8', // Azul principal
                    secondaryColor: 'blue6', // Azul secundario
                    accentColor: 'blue10', // Azul de acento
                    bgColor: 'blue15' // Fondo azul claro
                },
                {
                    id: '2',
                    number: '+56990206618',
                    name: 'WhatsApp Business Secundario',
                    isActive: true, // CONFIGURADO EN WHATSAPP BUSINESS API
                    lastUsed: new Date().toISOString(),
                    phoneId: '731956903332850', // PHONE ID ÚNICO DEL NÚMERO SECUNDARIO
                    businessAccountId: '512985415236720',
                    primaryColor: 'blue4', // Azul más oscuro
                    secondaryColor: 'blue2', // Azul secundario oscuro
                    accentColor: 'blue7', // Azul de acento oscuro
                    bgColor: 'blue13' // Fondo azul grisáceo
                }
            ];
            
            setWhatsappNumbers(numbers);
            if (numbers.length > 0) {
                setSelectedWhatsappNumber(numbers[0]);
                // Cargar contadores después de establecer los números
                setTimeout(() => {
                    loadUnreadCounts();
                }, 100);
            }
        } catch (error) {
            console.error("Error cargando números de WhatsApp:", error);
        }
    };

    // Suscripción en tiempo real para mensajes
    useEffect(() => {
    // Configurando suscripción en tiempo real
        
        const channel = supabase
            .channel('messages-realtime')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'rt_messages'
                },
                (payload) => {
                    console.log('📨 Nuevo mensaje recibido en tiempo real:', payload);
                    
                    // Mostrar indicador de nuevo mensaje
                    setNewMessageIndicator(true);
                    
                    // Actualizar contadores inmediatamente
                    loadUnreadCounts();
                    
                    // Recargar contactos
                    loadContacts();
                    
                    // Si hay un contacto seleccionado, recargar sus mensajes
                    if (selectedContact) {
                        loadMessages(selectedContact.phone);
                    }
                    
                    // Ocultar indicador después de 3 segundos
                    setTimeout(() => {
                        setNewMessageIndicator(false);
                    }, 3000);
                }
            )
            .subscribe((status) => {
                // Estado de suscripción
            });

        return () => {
            // Desconectando suscripción en tiempo real
            supabase.removeChannel(channel);
        };
    }, [selectedContact, selectedWhatsappNumber]);

    // Cerrar dropdown cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showWhatsappSelector) {
                const target = event.target as Element;
                if (!target.closest('.whatsapp-selector')) {
                    setShowWhatsappSelector(false);
                }
            }
        };



        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showWhatsappSelector]);

    // Función para cargar contadores de mensajes no leídos por número de WhatsApp
    const loadUnreadCounts = async () => {
        try {
            const counts: {[key: string]: number} = {};
            for (const number of whatsappNumbers) {
                const { data } = await supabase
                    .from("rt_messages")
                    .select("id")
                    .eq("whatsapp_number", number.number)
                    .eq("sender", "client")
                    .eq("read", false);
                counts[number.number] = data?.length || 0;
            }
            setUnreadCounts(counts);
        } catch (error) {
            // Opcional: puedes dejar un solo log de error general si lo deseas
        }
    };

    const loadContacts = async () => {
        try {
            // Solo cargar contactos si hay un número de WhatsApp seleccionado
            if (!selectedWhatsappNumber) return;

            // Cargando contactos para WhatsApp

            const { data, error } = await supabase
                .from("rt_messages") // Vista en public
                .select("*")
                .eq("whatsapp_number", selectedWhatsappNumber.number)
                .order("timestamp", { ascending: false });

            if (error) {
                console.error("Supabase error:", error, error?.message, error?.code, error?.details);
                throw error;
            }

            if (!data) {
                // Supabase returned no data
                return;
            }

            console.log('📨 Mensajes encontrados:', data.length);

            const contactMap = new Map<string, Contact>();
            
            data.forEach((msg) => {
                // Determinar el número del contacto (el que no es el WhatsApp Business)
                // Si from_number es el WhatsApp Business, entonces to_number es el contacto
                // Si to_number es el WhatsApp Business, entonces from_number es el contacto
                const isFromWhatsApp = msg.from_number === selectedWhatsappNumber.number;
                const contactPhone = isFromWhatsApp ? msg.to_number : msg.from_number;
                
                // Mensaje: from_number → to_number, Contacto: contactPhone
                
                if (!contactMap.has(contactPhone)) {
                    contactMap.set(contactPhone, {
                        id: contactPhone,
                        name: contactPhone,
                        phone: contactPhone,
                        unreadCount: 0,
                        whatsapp_number: selectedWhatsappNumber.number
                    });
                }

                const contact = contactMap.get(contactPhone)!;
                if (msg.sender === "client" && !msg.read) {
                    contact.unreadCount++;
                }
            });

            console.log('👥 Contactos encontrados:', Array.from(contactMap.keys()));
            // Contactos encontrados
            setContacts(Array.from(contactMap.values()));
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error cargando contactos:", error, error.message, error.stack);
            } else {
                console.error("Error cargando contactos:", error);
            }
        }
    };

    const loadMessages = async (phone: string) => {
        try {
            if (!selectedWhatsappNumber) return;

            // Cargando mensajes para contacto

            // Cargar mensajes que involucren tanto al contacto como al número de WhatsApp seleccionado
            const { data, error } = await supabase
                .from("rt_messages")
                .select("*")
                .eq("whatsapp_number", selectedWhatsappNumber.number)
                .or(`from_number.eq.${phone},to_number.eq.${phone}`)
                .order("timestamp", { ascending: true });

            if (error) throw error;
            setMessages(data.map(msg => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: msg.timestamp,
                read: msg.read,
                from_number: msg.from_number,
                to_number: msg.to_number,
                whatsapp_number: msg.whatsapp_number,
                media_url: msg.media_url || null,
                media_type: msg.media_type || null
            })));

            // Hacer scroll al final después de cargar mensajes
            setTimeout(() => {
                scrollToBottom();
            }, 100);

            // Marcar como leídos loen el chat lass mensajes entrantes no leídos del cliente al renderizar
            const unreadIds = data
                .filter(msg =>
                    msg.sender === 'client' &&
                    !msg.read &&
                    (msg.from_number === phone || msg.to_number === phone) &&
                    msg.whatsapp_number === selectedWhatsappNumber.number
                )
                .map(msg => msg.id);

            if (unreadIds.length > 0) {
                const updateRes = await supabase
                    .from("rt_messages")
                    .update({ read: true })
                    .in("id", unreadIds)
                    .select();
                // Actualizar contadores y ocultar indicador
                setNewMessageIndicator(false);
                // Optimistically update contacts UI: set unreadCount to 0 for this contact
                setContacts(prev => prev.map(c => c.phone === phone ? { ...c, unreadCount: 0 } : c));
                // Reload counts and contacts to ensure consistency with DB
                await loadUnreadCounts();
                // Reload contacts to refresh unread counts per contact
                await loadContacts();
            }
        } catch (error) {
            console.error("Error cargando mensajes:", error);
        }
    };

    const handleContactSelect = (contact: Contact) => {
        setSelectedContact(contact);
        loadMessages(contact.phone);
        // En móvil, ocultar la lista de contactos después de seleccionar uno
        if (window.innerWidth < 768) {
            setShowContacts(false);
        }
    };

    // Funciones para manejar menús desplegables
    const handleShowMessageId = (messageId: string) => {
        alert(`ID del mensaje: ${messageId}`);
        setOpenMessageMenu(null);
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (confirm('⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n¿Estás seguro de que quieres eliminar este mensaje?\n\nEsta acción no se puede deshacer.')) {
            try {
                const { error } = await supabase
                    .from("rt_messages")
                    .delete()
                    .eq("id", messageId);

                if (error) throw error;

                // Recargar mensajes
                if (selectedContact) {
                    loadMessages(selectedContact.phone);
                }
                console.log('✅ Mensaje eliminado exitosamente');
            } catch (error) {
                console.error('❌ Error eliminando mensaje:', error);
                alert('Error al eliminar el mensaje');
            }
        }
        setOpenMessageMenu(null);
    };

    const handleDeleteContact = async (contactPhone: string) => {
        if (confirm('⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n¿Estás seguro de que quieres eliminar TODOS los mensajes de este contacto?\n\nEsta acción no se puede deshacer.')) {
            try {
                console.log('🗑️ Eliminando contacto:', contactPhone, 'de WhatsApp:', selectedWhatsappNumber?.number);
                
                // Eliminar mensajes entrantes (from_number = contactPhone)
                const { error: errorIncoming } = await supabase
                    .from("rt_messages")
                    .delete()
                    .eq("from_number", contactPhone)
                    .eq("whatsapp_number", selectedWhatsappNumber?.number);

                if (errorIncoming) {
                    console.error('❌ Error eliminando mensajes entrantes:', errorIncoming);
                    throw errorIncoming;
                }

                // Eliminar mensajes salientes (to_number = contactPhone)
                const { error: errorOutgoing } = await supabase
                    .from("rt_messages")
                    .delete()
                    .eq("to_number", contactPhone)
                    .eq("whatsapp_number", selectedWhatsappNumber?.number);

                if (errorOutgoing) {
                    console.error('❌ Error eliminando mensajes salientes:', errorOutgoing);
                    throw errorOutgoing;
                }

                console.log('✅ Mensajes entrantes y salientes eliminados exitosamente');

                // Recargar contactos
                loadContacts();
                
                // Si el contacto eliminado es el seleccionado, limpiar la selección
                if (selectedContact && selectedContact.phone === contactPhone) {
                    setSelectedContact(null);
                    setMessages([]);
                }
                
                console.log('✅ Contacto eliminado exitosamente');
            } catch (error) {
                console.error('❌ Error eliminando contacto:', error);
                alert('Error al eliminar el contacto');
            }
        }
        setOpenContactMenu(null);
    };

    const sendMessage = async () => {
        if (!input.trim() || !selectedContact || !selectedWhatsappNumber || sending) return;
        
        // Verificar que el número de WhatsApp esté disponible
        if (!selectedWhatsappNumber.isActive || !selectedWhatsappNumber.phoneId) {
            alert(`❌ El número ${selectedWhatsappNumber.number} no está disponible.`);
            return;
        }

        setSending(true);
        const text = input.trim();

        console.log("🚀 Enviando mensaje:", {
            from: selectedWhatsappNumber.number,
            to: selectedContact.phone,
            text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
            phoneId: selectedWhatsappNumber.phoneId,
            businessAccountId: selectedWhatsappNumber.businessAccountId,
            note: "⚠️ AMBOS NÚMEROS USAN EL MISMO PHONE ID - se enviará desde la cuenta principal"
        });

        try {
            // Primero guardar en la base de datos
            const { error: dbError } = await supabase
                .from("rt_messages")
                .insert({
                    content: text,
                    sender: "admin",
                    from_number: selectedWhatsappNumber.number,
                    to_number: selectedContact.phone,
                    type: "text",
                    direction: "out",
                    timestamp: new Date().toISOString(),
                    read: true,
                    whatsapp_number: selectedWhatsappNumber.number
                });

            if (dbError) {
                console.error("❌ Error guardando en BD:", dbError);
                throw dbError;
            }

            console.log("✅ Mensaje guardado en BD");

            // Luego enviar por WhatsApp
            const response = await fetch("/api/send-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    to: selectedContact.phone, 
                    text,
                    from: selectedWhatsappNumber.number,
                    phoneId: selectedWhatsappNumber.phoneId,
                    businessAccountId: selectedWhatsappNumber.businessAccountId
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error("❌ Error enviando mensaje:", result);
                throw new Error(result.error || "Error del sistema");
            }

            console.log("✅ Mensaje enviado exitosamente:", result);
            setInput("");
            loadMessages(selectedContact.phone);
            
            // Hacer scroll al final después de enviar mensaje
            setTimeout(() => {
                scrollToBottom();
            }, 200);
        } catch (error) {
            console.error("❌ Error completo enviando mensaje:", error);
            // Aquí podrías mostrar una notificación al usuario
            alert(`Error: ${error instanceof Error ? error.message : 'Error del sistema'}`);
        } finally {
            setSending(false);
        }
    };

    // Upload a file to Supabase and send it via WhatsApp
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFilePick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !selectedContact || !selectedWhatsappNumber) return;

        // Prevent sending while uploading
        setSending(true);

        try {
            for (const file of Array.from(files)) {
                const contactPhone = selectedContact.phone;
                const inferredType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'document';

                // Generate a filename with timestamp
                const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                const ext = (file.name.split('.').pop() || '').toLowerCase() || (file.type.split('/')[1] || 'bin');
                const folder = inferredType === 'document' ? 'file' : inferredType;
                const storagePath = `whatsapp-media/${contactPhone}/${folder}/${id}.${ext}`;

                // Upload to Supabase public bucket 'ingenit'
                const { error: uploadError } = await supabase.storage.from('ingenit').upload(storagePath, file as any, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: file.type || undefined
                });
                if (uploadError) {
                    console.error('Upload error for file', file.name, uploadError);
                    alert(`Error subiendo ${file.name}`);
                    continue; // proceed with next file
                }

                const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ingenit/${encodeURIComponent(storagePath)}`;

                // Insert outbound message optimistically
                const { error: dbError } = await supabase.from('rt_messages').insert({
                    content: `[${inferredType.toUpperCase()}] ${file.name}`,
                    sender: 'admin',
                    from_number: selectedWhatsappNumber.number,
                    to_number: selectedContact.phone,
                    type: inferredType,
                    direction: 'out',
                    timestamp: new Date().toISOString(),
                    read: true,
                    media_url: publicUrl,
                    media_type: inferredType,
                    storage_path: storagePath,
                    whatsapp_number: selectedWhatsappNumber.number
                });

                if (dbError) {
                    console.error('Error inserting outbound media message in DB:', dbError);
                } else {
                    // Refresh messages so UI shows the sent media
                    loadMessages(selectedContact.phone);
                }

                // Call server to actually send the media via WhatsApp
                const res = await fetch('/api/send-media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: selectedContact.phone,
                        media_url: publicUrl,
                        media_type: inferredType,
                        filename: file.name,
                        phoneId: selectedWhatsappNumber.phoneId,
                        businessAccountId: selectedWhatsappNumber.businessAccountId,
                        caption: '' // optional
                    })
                });

                const result = await res.json().catch(() => ({}));
                if (!res.ok) {
                    console.error('Error sending media via API:', result);
                    // Continue with next file but notify
                    alert(`Error enviando ${file.name}`);
                } else {
                    console.log('Media send initiated for', file.name, result);
                }
            }
        } catch (error) {
            console.error('Error uploading/sending files:', error);
            alert('No se pudo subir o enviar algunos archivos');
        } finally {
            // clear input value so same files can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSending(false);
        }
    };

    return (
        <div className="h-screen bg-gray-100 flex">
            {/* Sidebar de contactos - Estilo WhatsApp */}
            <div className={`${showContacts ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-white border-r flex-col absolute md:relative z-10 h-full`}>
                {/* Header del sidebar */}
                <div className="bg-gray-50 p-2 border-b">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-3xl font-nornal text-gray9 ml-4">Chats</h1>
                            {newMessageIndicator && (
                                <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                                    <span>Nuevo</span>
                                </div>
                            )}
                        </div>
                        {/* Botón para cerrar en móvil */}
                        <button 
                            onClick={() => setShowContacts(false)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Selector de número de WhatsApp */}
                    {/* Selector de números de WhatsApp - Siempre visible */}
                    <div className="mb-1">
                        
                        {/* Lista vertical de números */}
                        <div className="space-y-2">
                            {whatsappNumbers.map((number) => {
                                const colors = getCorporateColors(number);
                                const isSelected = selectedWhatsappNumber?.id === number.id;
                                
                                return (
                                    <button
                                        key={number.id}
                                        onClick={() => {
                                            setSelectedWhatsappNumber(number);
                                            setShowWhatsappSelector(false);
                                        }}
                                        className={`w-full flex items-center p-3 rounded-lg border-2 transition-all ${
                                            isSelected 
                                                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div 
                                            className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                                            style={{ backgroundColor: colors.primary }}
                                        ></div>
                                        <div className="text-left flex-1">
                                            <div 
                                                className={`text-sm font-medium ${
                                                    isSelected ? 'text-blue-900' : 'text-gray-900'
                                                }`}
                                            >
                                                {number.name}
                                            </div>
                                            <div 
                                                className={`text-xs ${
                                                    isSelected ? 'text-blue-600' : 'text-gray-500'
                                                }`}
                                            >
                                                {number.number}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {number.isActive ? (
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                            )}
                                            {unreadCounts[number.number] > 0 && (
                                                <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                                    {unreadCounts[number.number] > 99 ? '99+' : unreadCounts[number.number]}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            
                        </div>
                    </div>
                </div>

                {/* Lista de contactos */}
                <div className="flex-1 overflow-y-auto">
                    {contacts.map((contact) => (
                        <div
                            key={contact.id}
                            className={`p-4 border-b hover:bg-gray-50 ${
                                selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div 
                                    className="flex items-center flex-1 cursor-pointer"
                                    onClick={() => handleContactSelect(contact)}
                                >
                                    <div 
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white mr-3"
                                        style={{
                                            backgroundColor: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#0078ff'
                                        }}
                                    >
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{contact.name}</div>
                                        <div className="text-sm text-gray-500">{contact.phone}</div>
                                        {contact.unreadCount > 0 && (
                                            <div className="mt-1">
                                                <span 
                                                    className="text-white text-xs px-2 py-1 rounded-full"
                                                    style={{
                                                        backgroundColor: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#0078ff'
                                                    }}
                                                >
                                                    {contact.unreadCount}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Menú desplegable para contactos */}
                                <div className="relative menu-dropdown">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenContactMenu(openContactMenu === contact.id ? null : contact.id);
                                        }}
                                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                        </svg>
                                    </button>
                                    
                                    {openContactMenu === contact.id && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                            <button
                                                onClick={() => handleDeleteContact(contact.phone)}
                                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Eliminar mensajes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Área de chat - Estilo WhatsApp */}
            <div className="flex-1 flex flex-col bg-gray-100">
                {selectedContact ? (
                    <>
                        {/* Header del chat */}
                        <div className="bg-white py-3 px-1 border-b flex items-center">
                            {/* Botón para volver a contactos en móvil */}
                            <button 
                                onClick={() => setShowContacts(true)}
                                className="md:hidden mr-1 p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                               
                            </button>
                            <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-3"
                                style={{
                                    backgroundColor: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#0078ff'
                                }}
                            >
                                {selectedContact.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900">{selectedContact.name}</div>
                                <div className="text-sm text-gray-500">{selectedContact.phone}</div>
                                {selectedWhatsappNumber && (
                                    <div className="flex items-center mt-1">
                                        <div 
                                            className="w-3 h-3 rounded-full mr-1"
                                            style={{
                                                backgroundColor: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#10b981'
                                            }}
                                        ></div>
                                        <span 
                                            className="text-xs"
                                            style={{
                                                color: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).textSecondary : '#6b7280'
                                            }}
                                        >
                                            Enviando desde: {selectedWhatsappNumber.name} ({selectedWhatsappNumber.number})
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Área de mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                            <div className="space-y-3">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender === "admin" ? "justify-end" : "justify-start"}`}
                                        onMouseEnter={() => setHoveredMessageId(message.id)}
                                        onMouseLeave={() => setHoveredMessageId(prev => prev === message.id ? null : prev)}
                                    >
                                        <div className="relative group">
                                            <div
                                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                    message.sender === "admin" ? "text-white" : "bg-white text-gray-800 shadow-sm"
                                                }`}
                                                role="group"
                                                style={{
                                                    backgroundColor: message.sender === "admin" 
                                                        ? (selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#0078ff')
                                                        : undefined,
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {/* Mostrar media si hay media_url, aunque media_type esté vacío */}
                                                {(() => {
                                                    if (message.media_url) {
                                                        const url = message.media_url;
                                                        const ext = url.split('.').pop()?.toLowerCase() || "";
                                                        const parsedUrl = (() => { try { return new URL(url); } catch { return null; } })();
                                                        const shouldProxy = parsedUrl && (parsedUrl.hostname === 'lookaside.fbsbx.com' || parsedUrl.hostname === 'graph.facebook.com');
                                                        const proxied = shouldProxy ? `/api/media-proxy?u=${encodeURIComponent(url)}` : url;

                                                        // Mostrar reproductor de audio si es audio
                                                        if (message.media_type === "audio" || ["ogg","mp3","wav","m4a"].includes(ext)) {
                                                            return (
                                                                <div className="my-2">
                                                                    <audio controls src={proxied} className="w-full mb-2">
                                                                        Tu navegador no soporta audio.
                                                                    </audio>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                        <button onClick={() => playMedia(proxied)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Reproducir</button>
                                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">Descargar</a>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Documentos
                                                        if (message.media_type === "document" || (!message.media_type && ["pdf","doc","docx","xls","xlsx","ppt","pptx"].includes(ext))) {
                                                            return (
                                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline my-2 block">
                                                                    Descargar documento
                                                                </a>
                                                            );
                                                        }

                                                        // Imágenes
                                                        if (message.media_type === "image" || (!message.media_type && ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext))) {
                                                            return (
                                                                <div>
                                                                    <ImageWithFallback src={proxied} alt="Imagen" />
                                                                    <div className="text-sm text-gray-600"><a href={url} target="_blank" rel="noopener noreferrer" className="underline">Abrir / Descargar</a></div>
                                                                </div>
                                                            );
                                                        }

                                                        // Videos
                                                        if (message.media_type === "video" || (!message.media_type && ["mp4","mov","avi","webm","mkv"].includes(ext))) {
                                                            return (
                                                                <div>
                                                                    <video controls src={proxied} className="max-w-full max-h-[40vh] my-2 rounded object-contain block">
                                                                        Tu navegador no soporta video.
                                                                    </video>
                                                                    <div className="text-sm text-gray-600"><a href={url} target="_blank" rel="noopener noreferrer" className="underline">Abrir / Descargar</a></div>
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    // Si no hay media_url y el content indica un media, mostrar mensaje claro
                                                    if (!message.media_url && ["audio","image","video","document"].includes(message.media_type || "")) {
                                                        return <span style={{ color: '#888' }}>Archivo no disponible</span>;
                                                    }
                                                    // Solo mostrar [AUDIO] si no hay media_url y no se detectó tipo
                                                    if (message.content === '[AUDIO]' && !message.media_url) {
                                                        return <span style={{ color: '#888' }}>[AUDIO]</span>;
                                                    }
                                                    return <p className="text-sm">{message.content}</p>;
                                                })()}
                                                <p 
                                                    className="text-xs mt-1"
                                                    style={{
                                                        color: message.sender === "admin" 
                                                            ? (selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).bg : '#ccd6e0')
                                                            : '#6b7280'
                                                    }}
                                                >
                                                    {new Date(message.timestamp).toLocaleTimeString("es-CL", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            
                                            {/* Menú desplegable para mensajes */}
                                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity menu-dropdown">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMessageMenu(openMessageMenu === message.id ? null : message.id);
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-black hover:bg-opacity-20 transition-colors"
                                                >
                                                    <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                                    </svg>
                                                </button>
                                                
                                                {openMessageMenu === message.id && (
                                                    <div className={`absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 ${
                                                        message.sender === "admin" ? "right-0" : "left-0"
                                                    }`}>
                                                        {/* Mostrar ID */}
                                                        <button
                                                            onClick={() => handleShowMessageId(message.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            Mostrar ID
                                                        </button>

                                                        {/* Copiar si es texto */}
                                                        {(!message.media_url || message.media_type === null) && (
                                                            <button
                                                                onClick={() => { copyToClipboard(message.content); setOpenMessageMenu(null); }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8M8 8h8" />
                                                                </svg>
                                                                Copiar
                                                            </button>
                                                        )}

                                                        {/* Descargar si es archivo/media */}
                                                        {(message.media_url) && (
                                                            <button
                                                                onClick={() => { downloadFile(message.media_url || '', message.content || undefined); setOpenMessageMenu(null); }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3" />
                                                                </svg>
                                                                Descargar
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleDeleteMessage(message.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Eliminar mensaje
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Compact bubble hover menu: Copy / Download / Delete */}
                                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity menu-dropdown">
                                                <div className="flex items-center gap-1 bg-transparent p-1">
                                                    {/* Copy */}
                                                    <button
                                                        onClick={() => copyToClipboard(message.content)}
                                                        title="Copiar"
                                                        className="p-2 rounded hover:bg-gray-100"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8M8 8h8" />
                                                        </svg>
                                                    </button>

                                                    {/* Download (if media) */}
                                                    {message.media_url && (
                                                        <button
                                                            onClick={() => downloadFile(message.media_url || '', message.content || undefined)}
                                                            title="Descargar"
                                                            className="p-2 rounded hover:bg-gray-100"
                                                        >
                                                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id)}
                                                        title="Eliminar"
                                                        className="p-2 rounded hover:bg-red-50"
                                                    >
                                                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Referencia para scroll automático */}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input del mensaje */}
                        <div className="bg-white p-4 border-t">
                            <div className="flex items-center gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="*/*" />
                                <button
                                    onClick={handleFilePick}
                                    title="Adjuntar archivos"
                                    className="p-2 w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center"
                                >
                                    {/* Plus icon (bigger/thicker) */}
                                    <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v14M5 12h14" />
                                    </svg>
                                </button>

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && e.metaKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Escribe un mensaje..."
                                    className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 ${
                                        selectedWhatsappNumber 
                                            ? `focus:ring-${selectedWhatsappNumber.primaryColor}` 
                                            : 'focus:ring-blue8'
                                    }`}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={sending}
                                    className="text-white p-2 rounded-full disabled:opacity-50 flex items-center justify-center"
                                    style={{
                                        backgroundColor: selectedWhatsappNumber 
                                            ? getCorporateColors(selectedWhatsappNumber).primary 
                                            : '#0078ff'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!sending) {
                                            e.currentTarget.style.backgroundColor = selectedWhatsappNumber 
                                                ? getCorporateColors(selectedWhatsappNumber).secondary 
                                                : '#005abf';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!sending) {
                                            e.currentTarget.style.backgroundColor = selectedWhatsappNumber 
                                                ? getCorporateColors(selectedWhatsappNumber).primary 
                                                : '#0078ff';
                                        }
                                    }}
                                >
                                    {/* Filled paper-plane pointing right (solid) */}
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 6z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium">Selecciona un chat</p>
                            <p className="text-sm">Elige un contacto para comenzar a chatear</p>
                            {/* Botón para mostrar contactos en móvil cuando no hay chat seleccionado */}
                            <button 
                                onClick={() => setShowContacts(true)}
                                className="md:hidden mt-4 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
                                style={{
                                    backgroundColor: selectedWhatsappNumber 
                                        ? getCorporateColors(selectedWhatsappNumber).primary 
                                        : '#0078ff'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = selectedWhatsappNumber 
                                        ? getCorporateColors(selectedWhatsappNumber).secondary 
                                        : '#005abf';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = selectedWhatsappNumber 
                                        ? getCorporateColors(selectedWhatsappNumber).primary 
                                        : '#0078ff';
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Ver contactos
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
