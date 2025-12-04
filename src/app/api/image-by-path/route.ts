import { NextResponse } from 'next/server';
import { getDbx } from '@/lib/dropboxClient';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 });

    // Descargar archivo desde Dropbox
    const dbx = await getDbx();
    const res = await dbx.filesDownload({ path });
    // El contenido viene en res.result.fileBlob (browser) o res.result.fileBinary (node)
    // Usamos fileBinary si está disponible, si no fileBlob
    let buffer: Buffer;
    let contentType = 'application/octet-stream';
    if ('fileBinary' in res.result && res.result.fileBinary) {
      buffer = Buffer.from(res.result.fileBinary as ArrayBuffer);
    } else if ('fileBlob' in res.result && res.result.fileBlob) {
      const arrayBuffer = await (res.result.fileBlob as Blob).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return NextResponse.json({ error: 'no file content' }, { status: 500 });
    }
    if ('fileBlob' in res.result && res.result.fileBlob && (res.result.fileBlob as Blob).type) {
      contentType = (res.result.fileBlob as Blob).type;
    }
    return new Response(new Uint8Array(buffer), {
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