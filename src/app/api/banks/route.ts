import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

// Helper para obtener el user id desde el request (auth)
async function getUserId(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  // Try supabase client method first (guarded)
  try {
    if (supabase?.auth?.getUser) {
      // some versions accept the token or none; wrap in try/catch
      const maybe = await (supabase.auth.getUser as any)(token);
      if (maybe?.data?.user?.id) return maybe.data.user.id;
    }
  } catch (err) {
    // ignore and fallback
  }
  // Fallback: call Supabase Auth REST endpoint to get user from access token
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url) return null;
    const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey || ''
      }
    });
    if (!r.ok) return null;
    const user = await r.json();
    if (user?.id) return user.id;
  } catch (e) {
    // ignore
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    const user_id = await getUserId(req);
    const debug: any = { hasAuthHeader: !!authHeader, tokenLength: token ? token.length : 0, user_id: user_id ?? null, supabaseConfigured: isSupabaseConfigured() };
    if (!user_id) return NextResponse.json({ success: false, error: 'No autorizado', debug: process.env.NODE_ENV !== 'production' ? debug : undefined }, { status: 401 });
    const { data, error } = await supabase.from('rt_personal_banks').select('*').eq('user_id', user_id).order('name', { ascending: true });
    if (error) {
      if (process.env.NODE_ENV !== 'production') debug.supabaseError = { message: error.message, details: error.details ?? null };
      return NextResponse.json({ success: false, error: error.message, debug: process.env.NODE_ENV !== 'production' ? debug : undefined }, { status: 500 });
    }
    return NextResponse.json({ success: true, banks: data, debug: process.env.NODE_ENV !== 'production' ? debug : undefined });
  } catch (e: any) {
    const debugErr = { message: e?.message, stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined };
    return NextResponse.json({ success: false, error: e.message, debug: process.env.NODE_ENV !== 'production' ? debugErr : undefined }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user_id = await getUserId(req);
    if (!user_id) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const { id, initial_balance } = body;
    // verificar pertenencia
    const { data: bankExisting, error: bankErr } = await supabase.from('rt_personal_banks').select('user_id').eq('id', id).single();
    if (bankErr || !bankExisting) return NextResponse.json({ success: false, error: 'Banco no encontrado' }, { status: 400 });
    if (bankExisting.user_id && bankExisting.user_id !== user_id) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    const { data, error } = await supabase.from('rt_personal_banks').update({ initial_balance }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, bank: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
