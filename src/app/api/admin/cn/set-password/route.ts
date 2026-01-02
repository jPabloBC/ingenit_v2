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

    // Create a Supabase client with the recovery token as the session
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Set the session with the recovery token
    const { error: setSessionError } = await supabaseUser.auth.setSession({
      access_token: token,
      refresh_token: ''
    });

    if (setSessionError) {
      console.warn('Failed to set session from recovery token:', setSessionError);
      return NextResponse.json({ error: 'Invalid recovery token' }, { status: 400 });
    }

    // Get the authenticated user
    const { data: { user }, error: getUserError } = await supabaseUser.auth.getUser(token);

    if (getUserError || !user?.id) {
      console.warn('Could not get user from recovery token:', getUserError);
      return NextResponse.json({ error: 'Invalid or expired recovery token' }, { status: 400 });
    }

    const userId = user.id;
    const userEmail = user.email || email;

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
