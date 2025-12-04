import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('rt_personal_accounts')
      .select('id, bank_id, name, type, balance, credit_limit, due_date')
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
    const payload: any = { bank_id, name, type };
    if (balance !== undefined) payload.balance = balance;
    if (credit_limit !== undefined) payload.credit_limit = credit_limit;
    const { data, error } = await supabase.from('rt_personal_accounts').insert(payload).select('*').single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, account: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
