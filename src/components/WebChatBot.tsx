"use client";
import { useEffect, useState, useRef } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabaseClient";

const botFlow = [
    "Hola, ¿cómo podemos ayudarte hoy?",
    "¿Cuál es tu nombre?",
    "¿Cuál es tu correo electrónico?",
    "Gracias. Un agente te contactará pronto.",
];

export default function WebChatBot() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [messages, setMessages] = useState<{ sender: string; message: string }[]>([]);
    const [input, setInput] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [showBot, setShowBot] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    async function insertToSupabase(sender: "user" | "bot", message: string, step: number, sid: string) {
        await supabase!.from("web_chat").insert({ sender, message, step, session_id: sid });
    }

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();

        // Validaciones por paso
        if (step === 1 && userMessage.length < 2) {
            alert("Por favor, ingresa un nombre válido.");
            return;
        }

        if (step === 2 && !/\S+@\S+\.\S+/.test(userMessage)) {
            alert("Por favor, ingresa un correo electrónico válido.");
            return;
        }

        // Guardar mensaje del usuario
        setMessages((prev) => [...prev, { sender: "user", message: userMessage }]);
        await insertToSupabase("user", userMessage, step, sessionId);
        setInput("");

        const nextStep = step + 1;

        if (botFlow[nextStep]) {
            setIsTyping(true);
            setTimeout(async () => {
                const botMsg = botFlow[nextStep];
                setMessages((prev) => [...prev, { sender: "bot", message: botMsg }]);
                await insertToSupabase("bot", botMsg, nextStep, sessionId);
                setStep(nextStep);
                setIsTyping(false);
            }, 1000);
        }
    };

    const resetConversation = () => {
        const sid = uuidv4();
        setSessionId(sid);
        const firstMessage = botFlow[0];
        setMessages([{ sender: "bot", message: firstMessage }]);
        insertToSupabase("bot", firstMessage, 0, sid);
        setStep(0);
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
                            : "bg-blue6 text-white hover:bg-blue7"
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
                <div className="bg-gradient-to-r from-blue6 to-blue7 text-white p-4 rounded-t-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Asistente Virtual</h3>
                            <p className="text-xs opacity-90">IngenIT - Soporte en línea</p>
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
                                <div className={`px-4 py-2 rounded-2xl ${
                                    m.sender === "user" 
                                        ? "bg-blue6 text-white" 
                                        : "bg-white text-gray-800 shadow-sm"
                                }`}>
                                    <p className="text-sm">{m.message}</p>
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

                {/* Input Area */}
                {step < botFlow.length - 1 ? (
                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Escribe tu respuesta..."
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-transparent"
                                disabled={isTyping}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="bg-blue6 text-white p-3 rounded-xl hover:bg-blue7 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-white border-t border-gray-200">
                        <button
                            onClick={resetConversation}
                            className="w-full text-center px-4 py-3 text-sm text-blue6 hover:text-blue7 transition-colors duration-200 font-medium"
                        >
                            Iniciar nueva conversación
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
