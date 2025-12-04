import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createServerSupabase() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await req.json();
    const { project_code, project_url } = body;

    if (!project_code || !project_url) {
      return NextResponse.json({ error: 'project_code and project_url are required' }, { status: 400 });
    }

    // Obtener información del visitante
    const forwarded = req.headers.get('x-forwarded-for');
    const visitor_ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';

    // Insertar registro de visita
    const { error } = await supabase
      .from('project_visits')
      .insert([{
        project_code,
        project_url,
        visitor_ip,
        user_agent,
        referrer
      }]);

    if (error) {
      console.error('Error registering visit:', error);
      return NextResponse.json({ error: 'Failed to register visit' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in track-visit:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';