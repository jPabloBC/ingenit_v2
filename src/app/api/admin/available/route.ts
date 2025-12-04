import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    const available = !!(SUPABASE_URL && SERVICE_ROLE_KEY);
    return NextResponse.json({ available });
  } catch (err: any) {
    return NextResponse.json({ available: false, error: String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
