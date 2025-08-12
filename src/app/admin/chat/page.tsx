"use client";

import { useEffect, useState } from "react";
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
            const numbers: WhatsAppNumber[] = [
                {
                    id: '1',
                    number: '+56975385487',
                    name: 'WhatsApp Business Principal',
                    isActive: true,
                    lastUsed: new Date().toISOString(),
                    phoneId: '731956903332850',
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
                    isActive: true,
                    lastUsed: new Date().toISOString(),
                    phoneId: '731956903332850',
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
            }
        } catch (error) {
            console.error("Error cargando números de WhatsApp:", error);
        }
    };

    useEffect(() => {
        const channel = supabase
            .channel('messages')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'messages' },
                () => {
                    loadContacts();
                    if (selectedContact) {
                        loadMessages(selectedContact.phone);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedContact]);

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

    const loadContacts = async () => {
        try {
            // Solo cargar contactos si hay un número de WhatsApp seleccionado
            if (!selectedWhatsappNumber) return;

            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .or(`whatsapp_number.eq.${selectedWhatsappNumber.number},from_number.eq.${selectedWhatsappNumber.number}`)
                .order("timestamp", { ascending: false });

            if (error) throw error;

            const contactMap = new Map<string, Contact>();
            
            data.forEach((msg) => {
                // Determinar el número del contacto (el que no es el WhatsApp seleccionado)
                const isIncoming = msg.whatsapp_number === selectedWhatsappNumber.number;
                const contactPhone = isIncoming ? msg.from_number : msg.to_number;
                
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

            setContacts(Array.from(contactMap.values()));
        } catch (error) {
            console.error("Error cargando contactos:", error);
        }
    };

    const loadMessages = async (phone: string) => {
        try {
            if (!selectedWhatsappNumber) return;

            // Cargar mensajes que involucren tanto al contacto como al número de WhatsApp seleccionado
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .or(`from_number.eq.${phone},to_number.eq.${phone}`)
                .eq("whatsapp_number", selectedWhatsappNumber.number)
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
                whatsapp_number: msg.whatsapp_number
            })));

            // Marcar como leídos solo los mensajes entrantes
            await supabase
                .from("messages")
                .update({ read: true })
                .eq("from_number", phone)
                .eq("whatsapp_number", selectedWhatsappNumber.number)
                .eq("sender", "client");

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
        if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
            try {
                const { error } = await supabase
                    .from("messages")
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
        if (confirm('¿Estás seguro de que quieres eliminar este contacto y todos sus mensajes?')) {
            try {
                const { error } = await supabase
                    .from("messages")
                    .delete()
                    .eq("from_number", contactPhone)
                    .eq("whatsapp_number", selectedWhatsappNumber?.number);

                if (error) throw error;

                // Recargar contactos
                loadContacts();
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

        setSending(true);
        const text = input.trim();

        try {
            const { error } = await supabase
                .from("messages")
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

            if (error) throw error;

            await fetch("/api/send-text", {
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

            setInput("");
            loadMessages(selectedContact.phone);
        } catch (error) {
            console.error("Error enviando mensaje:", error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-screen bg-gray-100 flex">
            {/* Sidebar de contactos - Estilo WhatsApp */}
            <div className={`${showContacts ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-white border-r flex-col absolute md:relative z-10 h-full`}>
                {/* Header del sidebar */}
                <div className="bg-gray-50 p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
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
                    <div className="relative whatsapp-selector">
                        <button
                            onClick={() => setShowWhatsappSelector(!showWhatsappSelector)}
                            className="w-full flex items-center justify-between p-2 bg-white border rounded-lg hover:bg-gray-50"
                            style={{
                                borderColor: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).borderPrimary : '#d1d5db'
                            }}
                        >
                            <div className="flex items-center">
                                <div 
                                    className="w-6 h-6 rounded-full mr-2"
                                    style={{
                                        backgroundColor: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#10b981'
                                    }}
                                ></div>
                                <span 
                                    className="text-sm font-medium"
                                    style={{
                                        color: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).textPrimary : '#374151'
                                    }}
                                >
                                    {selectedWhatsappNumber ? `${selectedWhatsappNumber.name} (${selectedWhatsappNumber.number})` : 'Seleccionar WhatsApp'}
                                </span>
                            </div>
                            <svg 
                                className="w-4 h-4" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                style={{
                                    color: selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).textSecondary : '#6b7280'
                                }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {/* Dropdown de números de WhatsApp */}
                        {showWhatsappSelector && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                                {whatsappNumbers.map((number) => {
                                    const colors = getCorporateColors(number);
                                    return (
                                        <button
                                            key={number.id}
                                            onClick={() => {
                                                setSelectedWhatsappNumber(number);
                                                setShowWhatsappSelector(false);
                                            }}
                                            className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                                            style={{
                                                backgroundColor: selectedWhatsappNumber?.id === number.id ? colors.bg : 'transparent'
                                            }}
                                        >
                                            <div className="flex items-center">
                                                <div 
                                                    className="w-4 h-4 rounded-full mr-3"
                                                    style={{ backgroundColor: colors.primary }}
                                                ></div>
                                                <div>
                                                    <div 
                                                        className="font-medium"
                                                        style={{ color: colors.textPrimary }}
                                                    >
                                                        {number.name}
                                                    </div>
                                                    <div 
                                                        className="text-xs"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        {number.number}
                                                    </div>
                                                    {number.phoneId && (
                                                        <div className="text-xs text-gray-400">
                                                            ID: {number.phoneId}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                
                                {/* Botón para agregar nuevo número */}
                                <button
                                    onClick={() => {
                                        // Aquí se puede abrir un modal para agregar nuevo número
                                        alert('Función para agregar nuevo número de WhatsApp - próximamente');
                                        setShowWhatsappSelector(false);
                                    }}
                                    className="w-full p-3 text-left hover:bg-gray-50 border-t border-gray-200 text-blue-600 font-medium"
                                >
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Agregar nuevo WhatsApp
                                    </div>
                                </button>
                            </div>
                        )}
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
                                                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Eliminar contacto
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
                                    >
                                        <div className="relative group">
                                            <div
                                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                    message.sender === "admin" ? "text-white" : "bg-white text-gray-800 shadow-sm"
                                                }`}
                                                style={{
                                                    backgroundColor: message.sender === "admin" 
                                                        ? (selectedWhatsappNumber ? getCorporateColors(selectedWhatsappNumber).primary : '#0078ff')
                                                        : undefined
                                                }}
                                            >
                                                <p className="text-sm">{message.content}</p>
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
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                                        <button
                                                            onClick={() => handleShowMessageId(message.id)}
                                                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            Mostrar ID
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMessage(message.id)}
                                                            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Eliminar mensaje
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Input del mensaje */}
                        <div className="bg-white p-4 border-t">
                            <div className="flex items-center gap-2">
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
                                    className="text-white p-2 rounded-full disabled:opacity-50"
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
                                    <Send className="w-5 h-5" />
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
