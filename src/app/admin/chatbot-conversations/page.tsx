"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MessageCircle, User, Bot, Calendar, Clock, Phone, Mail, Target, FileText } from "lucide-react";
// No necesitamos CSS específico - usamos globals.css

interface ChatMessage {
  id: number;
  session_id: string;
  sender: "user" | "bot";
  message: string;
  step: number;
  created_at: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  service?: string;
  project_description?: string;
}

interface Conversation {
  session_id: string;
  messages: ChatMessage[];
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  service?: string;
  project_description?: string;
  created_at: string;
  last_message_at: string;
  total_messages: number;
}

export default function ChatbotConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los mensajes del chatbot
      const { data: messages, error } = await supabase
        .from("rt_web_chat")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      // Agrupar mensajes por session_id
      const conversationsMap = new Map<string, ChatMessage[]>();
      
      messages?.forEach((message: ChatMessage) => {
        if (!conversationsMap.has(message.session_id)) {
          conversationsMap.set(message.session_id, []);
        }
        conversationsMap.get(message.session_id)!.push(message);
      });

      // Convertir a array de conversaciones
      const conversationsArray: Conversation[] = Array.from(conversationsMap.entries()).map(([sessionId, messages]) => {
        const sortedMessages = messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const firstMessage = sortedMessages[0];
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        
        // Extraer datos de contacto del primer mensaje que los tenga
        const contactMessage = sortedMessages.find(msg => msg.contact_name || msg.contact_phone || msg.contact_email);
        
        return {
          session_id: sessionId,
          messages: sortedMessages,
          contact_name: contactMessage?.contact_name,
          contact_phone: contactMessage?.contact_phone,
          contact_email: contactMessage?.contact_email,
          service: contactMessage?.service,
          project_description: contactMessage?.project_description,
          created_at: firstMessage.created_at,
          last_message_at: lastMessage.created_at,
          total_messages: messages.length
        };
      });

      // Ordenar por fecha de último mensaje (más reciente primero)
      conversationsArray.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      
      setConversations(conversationsArray);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getContactInfo = (conversation: Conversation) => {
    const info = [];
    if (conversation.contact_name) info.push(conversation.contact_name);
    if (conversation.contact_phone) info.push(conversation.contact_phone);
    if (conversation.contact_email) info.push(conversation.contact_email);
    return info.join(" • ") || "Sin datos de contacto";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto xs-screen-optimized">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Conversaciones del Chatbot
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Revisa todas las conversaciones del asistente virtual
          </p>
        </div>

        {/* Layout responsivo */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Lista de conversaciones */}
          <div className={`${selectedConversation ? 'xl:col-span-1' : 'xl:col-span-3'}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Conversaciones ({conversations.length})
                  </h2>
                  {selectedConversation && (
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="xl:hidden mobile-back-button text-sm text-blue-600 hover:text-blue-800"
                    >
                      ← Volver
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No hay conversaciones aún
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.session_id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`conversation-list-item conversation-transition p-3 sm:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation?.session_id === conversation.session_id
                          ? "bg-blue-50 border-blue-200"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <MessageCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {conversation.contact_name || "Usuario"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {conversation.total_messages} msgs
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                        {getContactInfo(conversation)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span className="hidden sm:inline">{formatDate(conversation.last_message_at)}</span>
                          <span className="sm:hidden">{new Date(conversation.last_message_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Detalle de la conversación */}
          <div className={`${selectedConversation ? 'xl:col-span-2' : 'hidden xl:block'}`}>
            {selectedConversation ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Header de la conversación */}
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {selectedConversation.contact_name || "Usuario"}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {getContactInfo(selectedConversation)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-gray-500">
                        {formatDate(selectedConversation.created_at)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {selectedConversation.total_messages} mensajes
                      </p>
                    </div>
                  </div>
                  
                  {/* Información de contacto */}
                  {(selectedConversation.contact_name || selectedConversation.contact_phone || selectedConversation.contact_email || selectedConversation.service) && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Información del Lead</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        {selectedConversation.contact_name && (
                          <div className="flex items-center space-x-2 min-w-0">
                            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{selectedConversation.contact_name}</span>
                          </div>
                        )}
                        {selectedConversation.contact_phone && (
                          <div className="flex items-center space-x-2 min-w-0">
                            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{selectedConversation.contact_phone}</span>
                          </div>
                        )}
                        {selectedConversation.contact_email && (
                          <div className="flex items-center space-x-2 min-w-0">
                            <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{selectedConversation.contact_email}</span>
                          </div>
                        )}
                        {selectedConversation.service && (
                          <div className="flex items-center space-x-2 min-w-0">
                            <Target className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{selectedConversation.service}</span>
                          </div>
                        )}
                        {selectedConversation.project_description && (
                          <div className="flex items-start space-x-2 sm:col-span-2">
                            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-xs sm:text-sm">{selectedConversation.project_description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mensajes */}
                <div className="messages-container p-3 sm:p-4 max-h-64 sm:max-h-96 overflow-y-auto">
                  <div className="space-y-3 sm:space-y-4">
                    {selectedConversation.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-[85%] sm:max-w-[80%] ${
                          message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                        }`}>
                          <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                            message.sender === "user" ? "bg-blue-600" : "bg-gray-300"
                          }`}>
                            {message.sender === "user" ? (
                              <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            ) : (
                              <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                            )}
                          </div>
                          <div className={`message-bubble px-3 py-2 sm:px-4 sm:py-2 rounded-2xl ${
                            message.sender === "user" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            <p 
                              className="message-text text-xs sm:text-sm" 
                              dangerouslySetInnerHTML={{ __html: message.message.replace(/\n/g, '<br>') }}
                            />
                            <p className="text-xs mt-1 opacity-70">
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
                <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Selecciona una conversación
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Elige una conversación de la lista para ver los detalles
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
