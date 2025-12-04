// Fresh single-file /api/prints implementation (written via heredoc)
import fs from 'fs/promises';
import path from 'path';
import { Dropbox } from 'dropbox';

const BASE_DIR = process.env.PRINTS_DIR || '/tmp/ingenit_prints';

const ensureBaseDir = async () => {
  await fs.mkdir(BASE_DIR, { recursive: true });
};

function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function getDropboxAccessTokenServer() {
  const params = new URLSearchParams({
    refresh_token: process.env.DROPBOX_REFRESH_TOKEN || '',
    grant_type: 'refresh_token',
  });
  const basicAuth = Buffer.from(`${process.env.DROPBOX_CLIENT_ID || ''}:${process.env.DROPBOX_CLIENT_SECRET || ''}`).toString('base64');
  const response = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Dropbox token refresh failed');
  return data.access_token as string;
}

export async function POST(req: Request) {
  try {
    await ensureBaseDir();
    const form = await req.formData();
    const file = form.get('file') as any;
    const printerId = form.get('printerId')?.toString() || 'default';

    if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const id = generateId();
    const filename = `${id}.pdf`;

    let temporaryLink: string | null = null;
    if (process.env.DROPBOX_CLIENT_ID && process.env.DROPBOX_CLIENT_SECRET && process.env.DROPBOX_REFRESH_TOKEN) {
      try {
        const accessToken = await getDropboxAccessTokenServer();
        const dbx = new Dropbox({ accessToken });
        const dropboxPath = `/prints/${filename}`;
        await dbx.filesUpload({ path: dropboxPath, contents: buffer, mode: { ".tag": "overwrite" } });
        const tmp = await dbx.filesGetTemporaryLink({ path: dropboxPath });
        temporaryLink = (tmp as any).result?.link || null;
      } catch (dropboxErr: any) {
        // If Dropbox fails (invalid token, network, etc.), fallback to local storage
        console.error('Dropbox upload failed, falling back to local write:', dropboxErr?.message || dropboxErr);
        const filePath = path.join(BASE_DIR, filename);
        await fs.writeFile(filePath, buffer);
        temporaryLink = null;
      }
    } else {
      const filePath = path.join(BASE_DIR, filename);
      await fs.writeFile(filePath, buffer);
      temporaryLink = null;
    }

    const meta = { id, filename, temporaryLink, printerId, status: 'queued', createdAt: new Date().toISOString() } as any;
    await fs.writeFile(path.join(BASE_DIR, `${id}.json`), JSON.stringify(meta, null, 2));

    return new Response(JSON.stringify({ id, temporaryLink }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await ensureBaseDir();
    const url = new URL(req.url);
    const next = url.searchParams.get('next');
    const agentKeyHeader = req.headers.get('x-agent-key');
    const configuredAgentKey = process.env.AGENT_KEY;

    if (next) {
      if (configuredAgentKey && agentKeyHeader !== configuredAgentKey) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const files = await fs.readdir(BASE_DIR);
      const metas = files.filter(f => f.endsWith('.json')).sort();
      for (const m of metas) {
        const data = JSON.parse(await fs.readFile(path.join(BASE_DIR, m), 'utf8'));
        if (data.status === 'queued') return new Response(JSON.stringify(data), { status: 200 });
      }
      return new Response(null, { status: 204 });
    }

    const files = await fs.readdir(BASE_DIR);
    const metas = files.filter(f => f.endsWith('.json'));
    const jobs = await Promise.all(metas.map(async (m) => JSON.parse(await fs.readFile(path.join(BASE_DIR, m), 'utf8'))));
    return new Response(JSON.stringify(jobs), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}
