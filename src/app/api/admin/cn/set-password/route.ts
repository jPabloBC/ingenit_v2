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
      console.error('Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server configuration error: missing Supabase admin credentials' }, { status: 500 });
    }

    // Verify the recovery token with Supabase Auth
    let userId: string | null = null;
    let userEmail: string | null = email || null;

    try {
      // Exchange recovery token for a session to get user ID
      const { data: session, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (sessionError || !session?.user?.id) {
        console.warn('Token verification failed:', sessionError);
        return NextResponse.json({ error: 'Invalid or expired recovery token' }, { status: 400 });
      }

      userId = session.user.id;
      userEmail = session.user.email || userEmail;
    } catch (e) {
      console.error('Exception during token verification:', e);
      return NextResponse.json({ error: 'Failed to verify recovery token' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Could not extract user ID from token' }, { status: 400 });
    }

    // Update password via Supabase Admin API
    try {
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
        return NextResponse.json({ 
          error: 'Failed to set password via Supabase admin API', 
          status: res.status, 
          detail: resBody || null 
        }, { status: 500 });
      }
    } catch (e) {
      console.error('Exception setting password', e);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user_id: userId, email: userEmail });
  } catch (err) {
    console.error('Unexpected set-password error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
