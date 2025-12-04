import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Dropbox } from 'dropbox';

// Create server-side Dropbox client with explicit fetch
const DROPBOX_TOKEN = process.env.NEXT_PUBLIC_DROPBOX_TOKEN || process.env.DROPBOX_TOKEN;
const dbxServer = new Dropbox({
  accessToken: DROPBOX_TOKEN,
  fetch: fetch // Explicitly provide fetch for server-side usage
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'missing jobId' }, { status: 400 });

    const { data, error } = await supabase
      .from('rt_storage')
      .select('id, dropbox_path, file_name, file_type, created_at, metadata')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

    const files = (data || []).filter((f: any) => f.metadata?.print_job_id === jobId);

    const filesWithLinks = await Promise.all(
      files.map(async (f: any) => {
        try {
          const response = await dbxServer.filesGetTemporaryLink({ path: f.dropbox_path });
          return {
            id: f.id,
            path: f.dropbox_path,
            file_name: f.file_name,
            file_type: f.file_type,
            url: response.result.link,
          };
        } catch (err: any) {
          return {
            id: f.id,
            path: f.dropbox_path,
            file_name: f.file_name,
            file_type: f.file_type,
            url: null,
            error: String(err),
          };
        }
      })
    );

    return NextResponse.json({ files: filesWithLinks });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
