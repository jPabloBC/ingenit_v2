import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin API');

const supabaseAdmin = createClient(SUPABASE_URL || '', SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;
    if (!token || !password) return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });

    // lookup token
    const { data: rows, error: rowErr } = await supabaseAdmin
      .from('cn_password_resets')
      .select('token,user_id,expires_at')
      .eq('token', token)
      .limit(1)
      .single();

    if (rowErr || !rows) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

    const expiresAt = new Date(rows.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    const userId = rows.user_id;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server configuration error: missing Supabase admin credentials' }, { status: 500 });
    }

    // Attempt to update password via Supabase Admin API
    try {
      // supabase-js may not expose updateUserById; use admin REST endpoint
      const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const resBody = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('Failed to set password via admin API', { status: res.status, body: resBody });
        return NextResponse.json({ error: 'Failed to set password via Supabase admin API', status: res.status, detail: resBody || null }, { status: 500 });
      }
    } catch (e) {
      console.error('Exception setting password', e);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    // delete used token
    try {
      await supabaseAdmin.from('cn_password_resets').delete().eq('token', token);
    } catch (delErr) {
      console.warn('Failed to delete used password reset token', delErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Unexpected set-password error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
