import { NextRequest, NextResponse } from 'next/server';

const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID!;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api/dropbox-auth'
  : 'https://ingenit.cl/api/dropbox-auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    // Intercambiar el code por access_token y refresh_token
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: DROPBOX_CLIENT_ID,
      client_secret: DROPBOX_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    });

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    return NextResponse.json(data);
  }

  // Redirige a Dropbox para autorizar
  const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${DROPBOX_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&token_access_type=offline`;
  return NextResponse.redirect(authUrl);
}
