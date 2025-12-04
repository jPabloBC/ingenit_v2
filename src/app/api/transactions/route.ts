import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET: return transactions and banks
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bank = searchParams.get("bank");

    const { data: banks, error: banksError } = await supabase
      .from("rt_personal_banks")
      .select("id, name, initial_balance, created_at")
      .order("name", { ascending: true });
    if (banksError) return NextResponse.json({ success: false, error: banksError.message }, { status: 500 });

    let q = supabase.from("rt_personal_transactions").select("*").order("date", { ascending: false });
    if (bank) q = q.eq("bank_id", bank);
    const { data: transactions, error: txError } = await q;
    if (txError) return NextResponse.json({ success: false, error: txError.message }, { status: 500 });

    return NextResponse.json({ success: true, banks, transactions });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: create a transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // allow accountId; if provided, derive bank_id from account
    let bankId = body.bankId || null;
    const accountId = body.accountId || null;
    if (!bankId && accountId) {
      const { data: acc, error: accErr } = await supabase.from('rt_personal_accounts').select('bank_id').eq('id', accountId).single();
      if (!accErr && acc) bankId = acc.bank_id;
    }

    const payload = {
      date: body.date,
      tipo: body.tipo,
      metodo: body.metodo,
      categoria: body.categoria,
      monto: body.monto,
      descripcion: body.descripcion || null,
      bank_id: bankId,
      account_id: accountId,
    };

    const { data, error } = await supabase.from("rt_personal_transactions").insert(payload).select("*").single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, transaction: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE: delete a transaction by id
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    const { error } = await supabase.from("rt_personal_transactions").delete().eq("id", id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
