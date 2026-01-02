import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { BANK_CATALOG, findBankByCodeOrName } from '@/lib/bankCatalog';

// Helper para obtener el user id desde el request (auth)
async function getUserId(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bankId,
      bankName,
      accountName,
      type,
      balance = 0,
      credit_limit = null,
      due_date = null,
      initial_tx // optional: { tipo: 'income'|'expense', monto, descripcion }
    } = body;

    const user_id = await getUserId(req);
    if (!user_id) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

    let finalBankId = bankId || null;

    // Bank must exist in the system or be present in the approved catalog.
    if (!finalBankId) {
      // If client provided bankName and it's in the catalog, create the bank record accordingly.
      if (bankName) {
        const catalogItem = findBankByCodeOrName(bankName);
        if (!catalogItem) {
          return NextResponse.json({ success: false, error: 'bankName no está en la lista de bancos permitidos' }, { status: 400 });
        }
        const { data: createdBank, error: bankErr } = await supabase.from('rt_personal_banks').insert({ name: catalogItem.name, user_id: user_id }).select('*').single();
        if (bankErr) return NextResponse.json({ success: false, error: bankErr.message }, { status: 500 });
        finalBankId = createdBank.id;
      } else {
        return NextResponse.json({ success: false, error: 'bankId o bankName requerido' }, { status: 400 });
      }
    } else {
      // verify bank belongs to user or is public
      const { data: bankCheck, error: bankCheckErr } = await supabase.from('rt_personal_banks').select('user_id').eq('id', finalBankId).single();
      if (bankCheckErr || !bankCheck) return NextResponse.json({ success: false, error: 'Banco no encontrado' }, { status: 400 });
      if (bankCheck.user_id && bankCheck.user_id !== user_id) return NextResponse.json({ success: false, error: 'No autorizado para usar este banco' }, { status: 403 });
    }

    // Validate that the chosen account type is allowed for this bank (if catalog info exists)
    const bankRow = await supabase.from('rt_personal_banks').select('id, name').eq('id', finalBankId).single();
    const catalogEntry = findBankByCodeOrName(bankRow.data?.name);
    if (catalogEntry && type && !catalogEntry.types.includes(type)) {
      return NextResponse.json({ success: false, error: `Tipo de cuenta '${type}' no permitido para banco ${catalogEntry.name}` }, { status: 400 });
    }

    // Create account
    const accountPayload: any = {
      bank_id: finalBankId,
      name: accountName,
      type: type || 'checking',
      user_id
    };
    if (balance !== undefined) accountPayload.balance = Number(balance) || 0;
    if (credit_limit !== undefined) accountPayload.credit_limit = credit_limit;
    if (due_date) accountPayload.due_date = due_date;

    const { data: createdAccount, error: accountErr } = await supabase.from('rt_personal_accounts').insert(accountPayload).select('*').single();
    if (accountErr) return NextResponse.json({ success: false, error: accountErr.message }, { status: 500 });

    // Optionally create initial transaction and adjust balance atomically-ish
    let createdTransaction = null;
    if (initial_tx && initial_tx.monto) {
      const txPayload: any = {
        date: initial_tx.date || new Date().toISOString(),
        tipo: initial_tx.tipo || (initial_tx.monto > 0 ? 'income' : 'expense'),
        metodo: initial_tx.metodo || null,
        categoria: initial_tx.categoria || null,
        monto: Number(initial_tx.monto),
        descripcion: initial_tx.descripcion || null,
        bank_id: finalBankId,
        account_id: createdAccount.id,
        user_id
      };
      const { data: txData, error: txErr } = await supabase.from('rt_personal_transactions').insert(txPayload).select('*').single();
      if (txErr) {
        // not fatal: return account but include transaction error
        return NextResponse.json({ success: false, account: createdAccount, error: txErr.message }, { status: 500 });
      }
      createdTransaction = txData;

      // update account balance accordingly
      const delta = (txPayload.tipo === 'income') ? Number(txPayload.monto) : -Number(txPayload.monto);
      const { data: updatedAccount, error: updErr } = await supabase.from('rt_personal_accounts').update({ balance: (createdAccount.balance || 0) + delta }).eq('id', createdAccount.id).select('*').single();
      if (updErr) {
        return NextResponse.json({ success: false, account: createdAccount, transaction: createdTransaction, error: updErr.message }, { status: 500 });
      }
      // replace createdAccount with updatedAccount
      // (note: createdAccount variable may be stale)
      // return updatedAccount below
      return NextResponse.json({ success: true, account: updatedAccount, transaction: createdTransaction });
    }

    return NextResponse.json({ success: true, account: createdAccount, transaction: createdTransaction });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
