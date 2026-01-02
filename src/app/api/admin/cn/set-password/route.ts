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
    const { token, password, email } = body;
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Step 1: Validate token by calling Supabase user endpoint with the token as Bearer
    let userId: string | null = null;
    try {
      const userRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SERVICE_ROLE_KEY
        }
      });

      if (!userRes.ok) {
        console.error('Failed to validate token:', userRes.status);
        return NextResponse.json({ error: 'Invalid or expired recovery token' }, { status: 400 });
      }

      const userData = await userRes.json();
      userId = userData.id;

      if (!userId) {
        return NextResponse.json({ error: 'Could not extract user ID from token' }, { status: 400 });
      }
    } catch (e) {
      console.error('Error validating token:', e);
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Step 2: Update password via Supabase Admin API
    try {
      const updateRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => null);
        console.error('Failed to update password:', errorData);
        return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
      }
    } catch (e) {
      console.error('Exception updating password:', e);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
