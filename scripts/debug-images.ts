
import { createClient } from '@supabase/supabase-js';
import { Dropbox } from 'dropbox';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dropboxToken = process.env.NEXT_PUBLIC_DROPBOX_TOKEN || process.env.DROPBOX_TOKEN;

console.log('Checking environment variables...');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
console.log('DROPBOX_TOKEN:', dropboxToken ? 'SET' : 'MISSING');

if (!supabaseUrl || !supabaseKey || !dropboxToken) {
  console.error('Missing environment variables. Exiting.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dbx = new Dropbox({ accessToken: dropboxToken });

const JOB_ID = '6316b68b-bdbd-4093-bf9c-92296e1c34a1';

async function main() {
  console.log(`\nQuerying Supabase for job ID: ${JOB_ID}`);
  
  const { data: files, error } = await supabase
    .from('rt_storage')
    .select('*')
    .eq('metadata->>print_job_id', JOB_ID); // Note: metadata is JSONB, need to query correctly or filter in app

  // The app does: .select('...').order(...) then filters in memory.
  // Let's try to replicate the app's query exactly first to see what it gets.
  const { data: allFiles, error: allError } = await supabase
    .from('rt_storage')
    .select('id, dropbox_path, file_name, file_type, created_at, metadata')
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('Supabase Error:', allError);
    return;
  }

  console.log(`Total files in rt_storage: ${allFiles?.length}`);
  
  const jobFiles = (allFiles || []).filter((f: any) => f.metadata?.print_job_id === JOB_ID);
  console.log(`Files for job ${JOB_ID}: ${jobFiles.length}`);

  if (jobFiles.length === 0) {
    console.log('No files found for this job in Supabase.');
    return;
  }

  console.log('\nChecking Dropbox links for found files...');
  for (const file of jobFiles) {
    console.log(`Checking file: ${file.file_name} (${file.dropbox_path})`);
    try {
      const response = await dbx.filesGetTemporaryLink({ path: file.dropbox_path });
      console.log(`  - Link generated successfully: ${response.result.link.substring(0, 50)}...`);
    } catch (err: any) {
      console.error(`  - Dropbox Error: ${err.error?.error_summary || err.message}`);
    }
  }
}

main().catch(console.error);
