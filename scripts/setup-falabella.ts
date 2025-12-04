import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan variables de entorno');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function setupFalabella() {
  console.log('🏦 Configurando Falabella...\n');

  // 1. Verificar/crear banco Falabella
  const { data: banks } = await supabase
    .from('rt_personal_banks')
    .select('*')
    .eq('name', 'Falabella');

  let falabellaBank;
  if (!banks || banks.length === 0) {
    console.log('📝 Creando banco Falabella...');
    const { data: newBank, error } = await supabase
      .from('rt_personal_banks')
      .insert({ name: 'Falabella', initial_balance: 0 })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creando banco:', error.message);
      return;
    }
    falabellaBank = newBank;
    console.log('✅ Banco creado:', falabellaBank.id);
  } else {
    falabellaBank = banks[0];
    console.log('✅ Banco existe:', falabellaBank.id);
  }

  // 2. Verificar/crear las 3 cuentas
  const accountTypes = [
    { type: 'tarjeta_credito', name: 'Falabella TC', label: 'Tarjeta de Crédito' },
    { type: 'linea_credito', name: 'Falabella LC', label: 'Línea de Crédito' },
    { type: 'bank_account', name: 'Falabella S', label: 'Saldo en Cuenta' }
  ];

  console.log('\n💳 Verificando cuentas...');
  for (const accType of accountTypes) {
    const { data: existing } = await supabase
      .from('rt_personal_accounts')
      .select('*')
      .eq('bank_id', falabellaBank.id)
      .eq('type', accType.type);

    if (!existing || existing.length === 0) {
      console.log(`📝 Creando cuenta: ${accType.label}`);
      const { data: newAcc, error } = await supabase
        .from('rt_personal_accounts')
        .insert({
          bank_id: falabellaBank.id,
          name: accType.name,
          type: accType.type,
          balance: 0,
          currency: 'CLP'
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creando ${accType.label}:`, error.message);
      } else {
        console.log(`✅ ${accType.label} creada:`, newAcc.id);
      }
    } else {
      console.log(`✅ ${accType.label} existe:`, existing[0].id, `- Balance: $${existing[0].balance}`);
    }
  }

  // 3. Mostrar resumen
  console.log('\n📊 Estado actual:');
  const { data: allAccounts } = await supabase
    .from('rt_personal_accounts')
    .select('*')
    .eq('bank_id', falabellaBank.id)
    .order('type');

  allAccounts?.forEach(acc => {
    console.log(`  - ${acc.name} (${acc.type}): $${acc.balance}`);
  });

  // 4. Mostrar movimientos recientes
  console.log('\n📋 Movimientos recientes:');
  const { data: txs } = await supabase
    .from('rt_personal_transactions')
    .select('*, rt_personal_accounts(name)')
    .limit(5)
    .order('created_at', { ascending: false });

  if (txs && txs.length > 0) {
    txs.forEach(tx => {
      const acc = (tx as any).rt_personal_accounts;
      console.log(`  ${tx.date} - ${tx.tipo} - $${tx.monto} - ${acc?.name || 'N/A'}`);
    });
  } else {
    console.log('  No hay movimientos registrados aún');
  }

  console.log('\n✅ Configuración completa');
}

setupFalabella().catch(console.error);
