// GET: Devuelve estadísticas de visitas
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  // Fecha local de Chile (YYYY-MM-DD)
  const cl = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
  const d = new Date(cl);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Contar visitas para una fecha específica (desde el calendario)
  if (date) {
    const { count, error } = await supabase
      .from("rt_visits")
      .select("id", { count: "exact" })
      .ilike("visit_datetime_local", `${date}%`);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: count ?? 0 });
  }

  // Contar visitas de hoy
  const { count: todayCount, error: todayError } = await supabase
    .from("rt_visits")
    .select("id", { count: "exact" })
    .ilike("visit_datetime_local", `${todayStr}%`);
  if (todayError) {
    return NextResponse.json({ success: false, error: todayError.message }, { status: 500 });
  }

  // Contar visitas del mes
  const monthStr = `${yyyy}-${mm}`;
  const { count: monthCount, error: monthError } = await supabase
    .from("rt_visits")
    .select("id", { count: "exact" })
    .ilike("visit_datetime_local", `${monthStr}%`);
  if (monthError) {
    return NextResponse.json({ success: false, error: monthError.message }, { status: 500 });
  }

  // Contar visitas del año
  const yearStr = `${yyyy}`;
  const { count: yearCount, error: yearError } = await supabase
    .from("rt_visits")
    .select("id", { count: "exact" })
    .ilike("visit_datetime_local", `${yearStr}%`);
  if (yearError) {
    return NextResponse.json({ success: false, error: yearError.message }, { status: 500 });
  }

  // Contar visitas totales
  const { count: totalCount, error: totalError } = await supabase
    .from("rt_visits")
    .select("id", { count: "exact" });
  if (totalError) {
    return NextResponse.json({ success: false, error: totalError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    today: todayCount ?? 0,
    month: monthCount ?? 0,
    year: yearCount ?? 0,
    total: totalCount ?? 0
  });
}
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// POST: Incrementa el contador de visitas para la fecha actual
export async function POST(req: NextRequest) {

  // Fecha y hora local de Chile en formato YYYY-MM-DD HH:mm:ss
  const nowChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
  const yyyy = nowChile.getFullYear();
  const mm = String(nowChile.getMonth() + 1).padStart(2, '0');
  const dd = String(nowChile.getDate()).padStart(2, '0');
  const hh = String(nowChile.getHours()).padStart(2, '0');
  const min = String(nowChile.getMinutes()).padStart(2, '0');
  const ss = String(nowChile.getSeconds()).padStart(2, '0');
  const visit_datetime_local = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

  const { error: insertError } = await supabase
    .from("rt_visits")
    .insert({ visit_datetime_local });
  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
