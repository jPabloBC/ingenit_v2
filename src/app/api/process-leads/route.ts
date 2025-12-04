import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        // Obtener conversaciones completas que no han sido procesadas como leads
        const { data: conversations, error: convError } = await supabase
            .from("app_rt.rt_web_chat_conversations")
            .select("*")
            .not("contact_email", "is", null)
            .not("contact_name", "is", null);

        if (convError) {
            console.error("Error obteniendo conversaciones:", convError);
            return NextResponse.json({ error: convError.message }, { status: 500 });
        }

        const processedLeads = [];

        for (const conversation of conversations) {
            // Verificar si ya existe un lead para esta sesión
            const { data: existingLead } = await supabase
                .from("app_rt.rt_automation_leads")
                .select("id")
                .eq("session_id", conversation.session_id)
                .single();

            if (existingLead) {
                console.log(`Lead ya existe para sesión: ${conversation.session_id}`);
                continue;
            }

            // Calcular lead score
            const usersCount = parseInt(conversation.users_count) || 0;
            const budgetRange = conversation.budget_range || "";
            const timeline = conversation.timeline || "";
            const solutionType = conversation.solution_type || "";

            let leadScore = 0;
            
            // Score por número de usuarios
            if (usersCount >= 100) leadScore += 30;
            else if (usersCount >= 50) leadScore += 25;
            else if (usersCount >= 20) leadScore += 20;
            else if (usersCount >= 10) leadScore += 15;
            else if (usersCount >= 5) leadScore += 10;
            
            // Score por presupuesto
            if (budgetRange.includes("$50,000") || budgetRange.includes("$100,000")) {
                leadScore += 30;
            } else if (budgetRange.includes("$20,000") || budgetRange.includes("$30,000")) {
                leadScore += 25;
            } else if (budgetRange.includes("$10,000") || budgetRange.includes("$15,000")) {
                leadScore += 20;
            } else if (budgetRange.includes("$5,000") || budgetRange.includes("$8,000")) {
                leadScore += 15;
            } else if (budgetRange.includes("$2,000") || budgetRange.includes("$3,000")) {
                leadScore += 10;
            }
            
            // Score por timeline (urgencia)
            if (timeline.includes("1 mes") || timeline.includes("2 meses") || timeline.includes("urgente")) {
                leadScore += 25;
            } else if (timeline.includes("3 meses") || timeline.includes("4 meses")) {
                leadScore += 20;
            } else if (timeline.includes("6 meses")) {
                leadScore += 15;
            }
            
            // Score por tipo de solución
            if (solutionType.includes("aplicación") || solutionType.includes("app") || solutionType.includes("software")) {
                leadScore += 20;
            } else if (solutionType.includes("automatización") || solutionType.includes("chatbot")) {
                leadScore += 15;
            } else if (solutionType.includes("integración")) {
                leadScore += 10;
            }

            // Determinar status basado en el score
            let status = "new";
            if (leadScore >= 60) status = "hot";
            else if (leadScore >= 40) status = "warm";
            else if (leadScore >= 20) status = "cold";

            // Insertar el lead
            const { data: newLead, error: leadError } = await supabase
                .from("app_rt.rt_automation_leads")
                .insert({
                    session_id: conversation.session_id,
                    contact_name: conversation.contact_name,
                    contact_email: conversation.contact_email,
                    industry: conversation.industry,
                    solution_type: conversation.solution_type,
                    project_description: conversation.project_description,
                    users_count: usersCount,
                    timeline: timeline,
                    current_systems: conversation.current_systems,
                    budget_range: budgetRange,
                    technical_requirements: conversation.technical_requirements,
                    lead_score: leadScore,
                    status: status,
                    notes: `Conversación completada en ${conversation.duration_minutes?.toFixed(1)} minutos`
                })
                .select()
                .single();

            if (leadError) {
                console.error(`Error creando lead para sesión ${conversation.session_id}:`, leadError);
                continue;
            }

            processedLeads.push(newLead);
        }

        return NextResponse.json({
            success: true,
            processed: processedLeads.length,
            leads: processedLeads
        });

    } catch (error) {
        console.error("Error procesando leads:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { data: leads, error } = await supabase
            .from("app_rt.rt_automation_leads")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error obteniendo leads:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            total: leads.length,
            leads: leads
        });

    } catch (error) {
        console.error("Error obteniendo leads:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
