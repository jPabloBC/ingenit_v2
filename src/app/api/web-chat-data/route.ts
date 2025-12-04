import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
    try {
        // Obtener todas las conversaciones del chat web
        const { data: conversations, error } = await supabase
            .from("app_rt.rt_web_chat")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error obteniendo datos del chat web:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Agrupar por session_id para ver conversaciones completas
        const groupedConversations = conversations.reduce((acc, message) => {
            const sessionId = message.session_id;
            if (!acc[sessionId]) {
                acc[sessionId] = [];
            }
            acc[sessionId].push(message);
            return acc;
        }, {} as Record<string, any[]>);

        // Ordenar mensajes dentro de cada conversación por step y created_at
        Object.keys(groupedConversations).forEach(sessionId => {
            groupedConversations[sessionId].sort((a, b) => {
                if (a.step !== b.step) {
                    return a.step - b.step;
                }
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
        });

        return NextResponse.json({
            success: true,
            totalMessages: conversations.length,
            totalConversations: Object.keys(groupedConversations).length,
            conversations: groupedConversations
        });

    } catch (error) {
        console.error("Error en web-chat-data:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
