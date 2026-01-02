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

// GET: return transactions and banks (filtrando por user_id autenticado)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bank = searchParams.get("bank");
    const user_id = await getUserId(req);
    if (!user_id) {
      console.error("/api/transactions: No autorizado (sin user_id)");
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: banks, error: banksError } = await supabase
      .from("rt_personal_banks")
      .select("id, name, created_at")
      .order("name", { ascending: true });
    if (banksError) {
      console.error("/api/transactions: Error bancos", banksError);
      return NextResponse.json({ success: false, error: banksError.message, details: banksError }, { status: 500 });
    }

    let q = supabase.from("rt_personal_transactions").select("*").eq('user_id', user_id).order("date", { ascending: false });
    if (bank) q = q.eq("bank_id", bank);
    const { data: transactions, error: txError } = await q;
    if (txError) {
      console.error("/api/transactions: Error transacciones", txError);
      return NextResponse.json({ success: false, error: txError.message, details: txError }, { status: 500 });
    }

    return NextResponse.json({ success: true, banks, transactions });
  } catch (e: any) {
    console.error("/api/transactions: Error inesperado", e);
    return NextResponse.json({ success: false, error: e?.message || String(e), details: e }, { status: 500 });
  }
}

// POST: create a transaction (asociando user_id autenticado)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Debug log: record incoming body to help diagnose missing fields
    console.error('/api/transactions POST body:', JSON.stringify(body));
    const user_id = await getUserId(req);
    if (!user_id) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    // allow accountId; if provided, derive bank_id from account
    // support both naming conventions from frontend: accountId / account_id
    let bankId = body.bankId || body.bank_id || null;
    const accountId = body.accountId || body.account_id || null;
    // Fetch account row early so we can capture balance/currency snapshots
    let accountRowForSnapshot: any = null;
    if (accountId) {
      const { data: acc, error: accErr } = await supabase
        .from('rt_personal_accounts')
        .select('bank_id, balance, currency')
        .eq('id', accountId)
        .single();
      if (!accErr && acc) {
        accountRowForSnapshot = acc;
        if (!bankId) bankId = acc.bank_id;
      }
    }
    console.error('/api/transactions: accountRowForSnapshot:', accountRowForSnapshot);

    // Normalize incoming fields: support both Spanish/English keys
    const payload: any = {
      date: body.date,
      type: body.type || body.tipo || null,
      metodo: body.metodo || null,
      categoria: body.categoria || null,
      amount: body.amount ?? body.monto ?? null,
      description: body.description ?? body.descripcion ?? null,
      bank_id: bankId,
      account_id: accountId,
      user_id,
      // accept client-provided snapshots/fallbacks; server will override if it can compute authoritative values
      currency: body.currency ?? body.moneda ?? null,
      balance_before: body.balance_before ?? body.balanceBefore ?? null,
      balance_after: body.balance_after ?? body.balanceAfter ?? null,
    };

    // If we have the account row, capture snapshot fields for audit: balance_before, balance_after, currency
    let computedNewBalance: number | null = null;
    try {
      const amt = Number(payload.amount ?? 0) || 0;
      if (accountRowForSnapshot && !isNaN(amt)) {
        const currentBal = Number(accountRowForSnapshot.balance ?? 0) || 0;
        const t = String(payload.type || '').toLowerCase();
        // Usar currency del payload (rt_personal_transactions)
        const currency = payload.currency || null;
        const delta = t === 'egreso' ? -Math.abs(amt) : Math.abs(amt);
        const newBal = currentBal + delta;
        payload.balance_before = currentBal;
        payload.balance_after = newBal;
        payload.currency = currency;
        computedNewBalance = newBal;
        console.log(`[API/transactions] Calculando balance: id=${accountRowForSnapshot.id}, moneda=${currency}, currentBal=${currentBal}, delta=${delta}, newBal=${newBal}`);
      }
      // Log payload before insert to ensure fields are present
      console.error('[API/transactions] Payload to insert:', JSON.stringify(payload));
    } catch (e) {
      console.error('[API/transactions] Error computing balance snapshot:', e);
      // if anything fails computing snapshots, continue without them
    }

    const { data, error } = await supabase.from("rt_personal_transactions").insert(payload).select("*").single();
    if (error) {
      console.error('[API/transactions] Error inserting transaction:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    // If the transaction references an account, update that account's balance.
    // Prefer using the already-computed new balance from snapshot computation to avoid a redundant fetch.
    try {
      const acctId = payload.account_id || payload.accountId || null;
      const amt = Number(payload.amount ?? 0) || 0;
      if (acctId && !isNaN(amt) && amt !== 0) {
        // Forzar update de balance para toda moneda
        if (computedNewBalance != null) {
          const { error: updateErr, data: updateData } = await supabase.from('rt_personal_accounts').update({ balance: computedNewBalance }).eq('id', acctId).select();
          if (updateErr) {
            console.error(`[API/transactions] Error updating balance for account ${acctId}:`, updateErr);
          } else {
            const affected = Array.isArray(updateData) ? updateData.length : (updateData ? 1 : 0);
            console.log(`[API/transactions] Updated balance for account ${acctId} to ${computedNewBalance}. Filas afectadas: ${affected}`);
          }
        } else {
          // fallback: fetch current account and update
          const { data: accRow, error: accErr } = await supabase.from('rt_personal_accounts').select('id, balance').eq('id', acctId).single();
          if (!accErr && accRow) {
            const t = String(payload.type || '').toLowerCase();
            // Usar currency del payload (rt_personal_transactions)
            const currency = payload.currency || null;
            const delta = t === 'egreso' ? -Math.abs(amt) : Math.abs(amt);
            const currentBal = Number(accRow.balance ?? 0) || 0;
            const newBal = currentBal + delta;
            console.log(`[API/transactions] (fallback) Calculando balance: id=${accRow.id}, moneda=${currency}, currentBal=${currentBal}, delta=${delta}, newBal=${newBal}`);
            const { error: updateErr2, data: updateData2 } = await supabase.from('rt_personal_accounts').update({ balance: newBal }).eq('id', acctId).select();
            if (updateErr2) {
              console.error(`[API/transactions] Error updating balance (fallback) for account ${acctId}:`, updateErr2);
            } else {
              const affected2 = Array.isArray(updateData2) ? updateData2.length : (updateData2 ? 1 : 0);
              console.log(`[API/transactions] Updated balance (fallback) for account ${acctId} to ${newBal}. Filas afectadas: ${affected2}`);
            }
          } else {
            console.error(`[API/transactions] Could not fetch account for balance update. acctId=${acctId}, error=`, accErr);
          }
        }
      } else {
        console.warn(`[API/transactions] No valid account or amount for balance update. acctId=${acctId}, amount=${amt}`);
      }
    } catch (e) {
      // non-fatal: log and continue returning the created transaction
      console.error('[API/transactions] Error updating account balance', e);
    }

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
