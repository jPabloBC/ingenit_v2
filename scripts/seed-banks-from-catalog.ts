import dotenv from 'dotenv';
import { supabase } from '../src/lib/supabaseClient';
import { BANK_CATALOG } from '../src/lib/bankCatalog';

dotenv.config();

async function seed() {
  try {
    console.log('Starting seed: banks from BANK_CATALOG');
    // fetch existing banks
    const { data: existingBanks, error: fetchErr } = await supabase.from('rt_personal_banks').select('id, name, code');
    if (fetchErr) {
      console.error('Error fetching existing banks:', fetchErr);
      process.exit(1);
    }
    const existingNames = new Set((existingBanks || []).map((b: any) => (b.name || '').toLowerCase()));
    const toInsert = BANK_CATALOG.filter((c: any) => !existingNames.has((c.name || '').toLowerCase())).map((c: any) => ({
      name: c.name,
      code: c.code || null,
      metadata: { types: c.types, issuesCards: !!c.issuesCards }
    }));

    if (toInsert.length === 0) {
      console.log('No new banks to insert. All catalog banks already exist.');
      process.exit(0);
    }

    console.log(`Inserting ${toInsert.length} banks...`);
    const { data: inserted, error: insertErr } = await supabase.from('rt_personal_banks').insert(toInsert).select('id, name');
    if (insertErr) {
      console.error('Error inserting banks:', insertErr);
      process.exit(1);
    }

    console.log('Inserted banks:');
    (inserted || []).forEach((b: any) => console.log(` - ${b.name} (${b.id})`));
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
