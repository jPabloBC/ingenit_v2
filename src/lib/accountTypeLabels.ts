export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  credit: 'Tarjeta de Crédito',
  store_credit: 'Línea de Credito',
  savings: 'Cuenta Ahorro',
  checking: 'Cuenta Corriente',
  vista: 'Cuenta Vista',
  checking_usd: 'Cuenta Corriente (USD)',
  credit_usd: 'Tarjeta de Crédito (USD)',
  store_credit_usd: 'Línea de Credito (USD)',
  // legacy or alternate keys
  debit: 'Cuenta Débito',
};

// BancoEstado: mostrar "Cuenta RUT" en vez de "Cuenta Corriente" para checking
export function getAccountTypeLabel(key?: string, bankCodeOrName?: string) {
  if (!key) return '';
  const bankId = String(bankCodeOrName || '').trim().toLowerCase();
  const isBancoEstado = bankId === 'banco_estado' || bankId === 'banestado' || bankId === 'bancoestado' || bankId.includes('estado');
   // BancoEstado: 'vista' es específicamente Cuenta RUT; 'checking' debe seguir siendo Cuenta Corriente
   if (isBancoEstado && key === 'vista') return 'Cuenta RUT';
  return ACCOUNT_TYPE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
