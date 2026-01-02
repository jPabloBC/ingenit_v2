import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
if (!ADMIN_AVAILABLE) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin API');
}

const supabaseAdmin = createClient(SUPABASE_URL || '', SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false }
});

function adminConfigUnavailableResponse() {
  return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
}
export async function GET(request: Request) {
  if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') || '0', 10) : undefined;
    // fetch users
    let { data: users, error: usersError } = await supabaseAdmin
      .from('cn_users')
      .select('*')
      .maybeSingle();

    // If limit requested, use a paginated select
    if (limit && limit > 0) {
      const res = await supabaseAdmin.from('cn_users').select('*').limit(limit);
      users = res.data as any;
      usersError = res.error as any;
    } else {
      // ensure users is array
      if (!Array.isArray(users)) {
        // if maybeSingle returned a single object, fetch array instead
        const res = await supabaseAdmin.from('cn_users').select('*');
        users = res.data as any;
        usersError = res.error as any;
      }
    }

    if (usersError) {
      console.error('Admin GET cn_users error', usersError);
      return NextResponse.json({ error: usersError.message || usersError }, { status: 500 });
    }

    // If we have users, fetch latest session per user from cn_sessions
    const userIds = (users || []).map((u: any) => u.id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: sessions, error: sessErr } = await supabaseAdmin
        .from('cn_sessions')
        .select('user_id,revoked,last_activity')
        .in('user_id', userIds)
        .order('last_activity', { ascending: false });

      if (sessErr) {
        console.warn('Could not fetch cn_sessions', sessErr);
      } else if (sessions && sessions.length > 0) {
        const sessionMap = new Map<string, any>();
        for (const s of sessions) {
          if (!sessionMap.has(s.user_id)) sessionMap.set(s.user_id, s);
        }
        // attach session info to users
        users = users.map((u: any) => {
          const s = sessionMap.get(u.id);
          return {
            ...u,
            last_session_revoked: s?.revoked ?? null,
            last_session_last_activity: s?.last_activity ?? null
          };
        });
      }
    }

    return NextResponse.json({ users });
  } catch (err) {
    console.error('Unexpected admin GET error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
export async function POST(request: Request) {
  if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

  try {
    const body = await request.json();
    const clientId = body.client_id || crypto.randomUUID();

    // Validate and normalize email early
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    body.email = email;

    // Create auth user first if not provided so we can use the auth user id as cn_users.id
    let authUserId: string | null = (body as any).auth_user_id || (body as any).user_id || null;
    let createdAuthUser = false;
    if (!authUserId) {
      try {
        const randomPassword = crypto.randomUUID();
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: randomPassword,
          email_confirm: true
        });
        if (authErr) {
          console.error('Error creating auth user:', authErr);
          if (authErr.message && authErr.message.includes('already')) {
            return NextResponse.json({ error: 'El correo ya está registrado en Auth' }, { status: 409 });
          }
          return NextResponse.json({ error: authErr.message || String(authErr) }, { status: 400 });
        }
        if (!authData || !authData.user || !authData.user.id) {
          return NextResponse.json({ error: 'No se pudo crear usuario en Auth' }, { status: 500 });
        }
        authUserId = authData.user.id;
        createdAuthUser = true;
      } catch (e) {
        console.error('Unexpected error creating auth user', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
      }
    }

    const isMissingColumnError = (err: any) => {
      const msg = (err?.message || String(err || '')).toLowerCase();
      return msg.includes('could not find the') || msg.includes('in the schema cache') || msg.includes('does not exist');
    };

    // build payload for cn_users insert
    const payload: any = {
      ...body,
      client_id: clientId,
      // set id to authUserId when available
      id: authUserId ?? undefined
    };

    let { data, error } = await supabaseAdmin
      .from('cn_users')
      .insert(payload)
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      // retry without status field if column is not present in the DB
      console.warn('Status column missing, retrying insert without status');
      delete payload.status;
      ({ data, error } = await supabaseAdmin
        .from('cn_users')
        .insert(payload)
        .select()
        .single());
    }

    if (error) {
      console.error('Admin POST cn_users error', error);
      // rollback auth user if we created one
      if (createdAuthUser && authUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch (delErr) {
          console.error('Failed to rollback auth user after cn_users insert failure', delErr);
        }
      }
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    // Use Supabase's resetPasswordForEmail to generate valid recovery tokens
    try {
      const base = process.env.CN_BASE_URL || 'https://cn.ingenit.cl';
      const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${base.replace(/\/$/, '')}/reset.html`
      });
      
      if (resetErr) {
        console.warn('Could not send Supabase password reset email:', resetErr);
      } else {
        console.info('Supabase password reset email sent to:', body.email);
      }
    } catch (e) {
      console.warn('Error triggering Supabase password reset:', e);
    }

    // Return user data
    const responseBody: any = { user: data };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error('Unexpected admin POST error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const updates: any = {};

    ['email', 'full_name', 'phone', 'status', 'role'].forEach((k) => {
      if (body[k] !== undefined) updates[k] = body[k];
    });

    // Normalize and validate email if present
    if (updates.email !== undefined) {
      if (!updates.email || typeof updates.email !== 'string') {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
      }
      const normalized = updates.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalized)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
      updates.email = normalized;
    }

    const isMissingColumnError = (err: any) => {
      const msg = (err?.message || String(err || '')).toLowerCase();
      return msg.includes('could not find the') || msg.includes('in the schema cache') || msg.includes('does not exist');
    };

    let { data, error } = await supabaseAdmin
      .from('cn_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      console.warn('Status column missing, retrying update without status');
      delete updates.status;
      ({ data, error } = await supabaseAdmin
        .from('cn_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single());
    }

    if (error) {
      console.error('Admin PUT cn_users error', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error('Unexpected admin PUT error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('cn_users')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Admin DELETE cn_users error', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ deleted: data });
  } catch (err) {
    console.error('Unexpected admin DELETE error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
