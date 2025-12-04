import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('u');
    if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 });

    const parsed = new URL(url);
    // Only allow proxying known hosts for safety
    const allowedHosts = ['lookaside.fbsbx.com', 'graph.facebook.com'];
    if (!allowedHosts.includes(parsed.hostname)) {
      return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
    }

    // If it's graph.facebook.com or lookaside.fbsbx.com, append access token if available
    const accessToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
    let fetchUrl = url;
    if ((parsed.hostname.includes('graph.facebook.com') || parsed.hostname.includes('lookaside.fbsbx.com')) && accessToken) {
      const u = new URL(url);
      if (!u.searchParams.get('access_token')) u.searchParams.set('access_token', accessToken);
      fetchUrl = u.toString();
    }

    // Make a server-side fetch and provide a permissive Accept header and a simple User-Agent
    const fetchOptions: any = {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'ingenit-media-proxy/1.0'
      },
      redirect: 'follow'
    };
    // Prefer passing token via Authorization header when available
    if (accessToken && (parsed.hostname.includes('graph.facebook.com') || parsed.hostname.includes('lookaside.fbsbx.com'))) {
      fetchOptions.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(fetchUrl, fetchOptions);
  // Log minimal upstream info to server console for easier debugging
  console.log('[media-proxy] upstream', { url: fetchUrl, status: res.status, ct: res.headers.get('content-type') });
  if (!res.ok) return NextResponse.json({ error: 'upstream error', status: res.status, ct: res.headers.get('content-type') }, { status: 502 });

    const headers: Record<string,string> = {};
    // copy content-type and cache headers
    const ct = res.headers.get('content-type');
    if (ct) headers['Content-Type'] = ct;
    const cl = res.headers.get('cache-control');
    if (cl) headers['Cache-Control'] = cl;

    const body = await res.arrayBuffer();
    return new NextResponse(Buffer.from(body), { headers });
  } catch (e) {
    return NextResponse.json({ error: 'proxy error', detail: String(e) }, { status: 500 });
  }
}
