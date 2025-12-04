import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase.from('rt_personal_banks').select('*').order('name', { ascending: true });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, banks: data });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const { id, initial_balance } = body;
    const { data, error } = await supabase.from('rt_personal_banks').update({ initial_balance }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, bank: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
