import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BANK_CATALOG } from '@/lib/bankCatalog';

// Server-side seeding endpoint. Requires SUPABASE_SERVICE_ROLE_KEY env var.
export async function POST(req: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in environment' }, { status: 500 });
    }

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    const body = await req.json().catch(() => ({}));
    const singleCode: string | undefined = body?.code;

    // fetch existing banks
    const { data: existingBanks, error: fetchErr } = await svc.from('rt_personal_banks').select('id, name, code');
    if (fetchErr) {
      return NextResponse.json({ error: 'Error fetching existing banks', details: fetchErr }, { status: 500 });
    }

    const existingNames = new Set((existingBanks || []).map((b: any) => (b.name || '').toLowerCase()));

    if (singleCode) {
      const catalogEntry = BANK_CATALOG.find((c: any) => c.code === singleCode || c.name === singleCode || c.code.toLowerCase() === (singleCode || '').toLowerCase() || c.name.toLowerCase() === (singleCode || '').toLowerCase());
      if (!catalogEntry) return NextResponse.json({ error: 'Bank code not found in catalog' }, { status: 400 });
      if (existingNames.has((catalogEntry.name || '').toLowerCase())) {
        return NextResponse.json({ inserted: 0, message: 'Bank already exists' });
      }
      const payload = { name: catalogEntry.name, code: catalogEntry.code || null, metadata: { types: catalogEntry.types, issuesCards: !!catalogEntry.issuesCards } };
      const { data: inserted, error: insertErr } = await svc.from('rt_personal_banks').insert([payload]).select('id, name, code').single();
      if (insertErr) return NextResponse.json({ error: 'Error inserting bank', details: insertErr }, { status: 500 });
      return NextResponse.json({ inserted: 1, bank: inserted });
    }

    // otherwise insert all missing
    const toInsert = BANK_CATALOG.filter((c: any) => !existingNames.has((c.name || '').toLowerCase())).map((c: any) => ({
      name: c.name,
      code: c.code || null,
      metadata: { types: c.types, issuesCards: !!c.issuesCards }
    }));

    if (toInsert.length === 0) {
      return NextResponse.json({ inserted: 0, message: 'No new banks to insert.' });
    }

    const { data: inserted, error: insertErr } = await svc.from('rt_personal_banks').insert(toInsert).select('id, name, code');
    if (insertErr) {
      return NextResponse.json({ error: 'Error inserting banks', details: insertErr }, { status: 500 });
    }

    return NextResponse.json({ inserted: (inserted || []).length, banks: inserted });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}
