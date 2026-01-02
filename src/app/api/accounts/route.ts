import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Helper para obtener el user id desde el request (auth)
async function getUserId(req: NextRequest) {
  const { headers } = req;
  const authHeader = headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    if (supabase?.auth?.getUser) {
      const maybe = await (supabase.auth.getUser as any)(token);
      if (maybe?.data?.user?.id) return maybe.data.user.id;
    }
  } catch (err) {}
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url) return null;
    const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey || '' }
    });
    if (!r.ok) return null;
    const user = await r.json();
    if (user?.id) return user.id;
  } catch (e) {}
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user_id = await getUserId(req);
    if (!user_id) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    const { data, error } = await supabase
      .from('rt_personal_accounts')
      .select('id, bank_id, name, type, balance, credit_limit, due_date')
      .eq('user_id', user_id)
      .order('name', { ascending: true });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, accounts: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, balance } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const { data, error } = await supabase.from('rt_personal_accounts').update({ balance }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, account: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bank_id, name, type, balance, credit_limit } = body;
    if (!bank_id || !name || !type) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    // Obtener el user id autenticado
    const user_id = await getUserId(req);
    if (!user_id) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    // Validar que el banco exista y pertenezca al usuario
    const { data: bank, error: bankErr } = await supabase.from('rt_personal_banks').select('id, user_id').eq('id', bank_id).single();
    if (bankErr || !bank) return NextResponse.json({ success: false, error: 'Banco no encontrado' }, { status: 400 });
    if (bank.user_id && bank.user_id !== user_id) return NextResponse.json({ success: false, error: 'No autorizado para usar este banco' }, { status: 403 });
    const payload: any = { bank_id, name, type, user_id };
    if (balance !== undefined) payload.balance = balance;
    if (credit_limit !== undefined) payload.credit_limit = credit_limit;
    const { data, error } = await supabase.from('rt_personal_accounts').insert(payload).select('*').single();
    if (error) {
      console.error('Error inserting account:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, account: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
