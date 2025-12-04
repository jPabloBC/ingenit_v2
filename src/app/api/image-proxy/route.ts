import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const src = url.searchParams.get('src');
    if (!src) return NextResponse.json({ error: 'missing src' }, { status: 400 });

    const parsed = new URL(src);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'invalid protocol' }, { status: 400 });
    }

    // Opcional: limitar hosts permitidos (descomentar y ajustar si es necesario)
    // const allowedHosts = ['content.dropboxapi.com', 'dl.dropboxusercontent.com'];
    // if (!allowedHosts.includes(parsed.hostname)) return NextResponse.json({ error: 'host not allowed' }, { status: 403 });

    const res = await fetch(src);
    if (!res.ok) return NextResponse.json({ error: 'failed fetching source' }, { status: 502 });

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await res.arrayBuffer();
    return new Response(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
