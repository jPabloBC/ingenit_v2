// Catálogo de bancos autorizados y sus tipos de cuenta permitidos.
// Si un banco aparece aquí, la aplicación puede crear su entrada en la tabla
// `rt_personal_banks`. No se permiten bancos fuera de este catálogo.

export type BankCatalogItem = {
  code: string; // identificador corto
  name: string; // nombre oficial
  types: string[]; // tipos de cuentas permitidos e.g. ['checking','savings','credit']
  issuesCards?: boolean; // emite tarjetas (tarjetas de crédito/débito)
  logoUrl?: string; // optional external or hosted logo URL
};

export const BANK_CATALOG: BankCatalogItem[] = [
  // Principales bancos (tipos CLP + USD combinados)
  { code: 'BANCO_CHILE', name: 'Banco de Chile', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd'], issuesCards: true },
  { code: 'BANCO_ESTADO', name: 'BancoEstado', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd', 'store_credit', 'vista'], issuesCards: true, logoUrl: 'https://juupotamdjqzpxuqdtco.supabase.co/storage/v1/object/public/ingenit/banks/bancoestado.png' },
  { code: 'SANTANDER', name: 'Banco Santander', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd', 'store_credit'], issuesCards: true, logoUrl: 'https://juupotamdjqzpxuqdtco.supabase.co/storage/v1/object/public/ingenit/banks/banco-santander.png' },
  { code: 'BCI', name: 'Banco BCI', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd'], issuesCards: true },
  { code: 'ITAÚ', name: 'Banco Itaú', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd'], issuesCards: true },
  { code: 'SCOTIABANK', name: 'Scotiabank', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd'], issuesCards: true },
  { code: 'BBVA', name: 'BBVA', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd'], issuesCards: true },
  { code: 'BANCOFALABELLA', name: 'Banco Falabella', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd', 'store_credit'], issuesCards: true, logoUrl: 'https://juupotamdjqzpxuqdtco.supabase.co/storage/v1/object/public/ingenit/banks/banco-falabella.png' },
  { code: 'BANCO_RIPLEY', name: 'Banco Ripley', types: ['checking', 'checking_usd', 'savings', 'credit', 'credit_usd'], issuesCards: true },

  // Casas comerciales y emisores de tarjetas de marca propia (tipos combinados)
  { code: 'FALABELLA', name: 'Falabella', types: ['credit', 'credit_usd', 'store_credit'], issuesCards: true, logoUrl: 'https://juupotamdjqzpxuqdtco.supabase.co/storage/v1/object/public/ingenit/banks/banco-falabella.png' },
  { code: 'RIPLEY', name: 'Ripley', types: ['credit', 'credit_usd', 'store_credit'], issuesCards: true },
  { code: 'PARIS', name: 'Almacenes Paris', types: ['credit', 'credit_usd', 'store_credit'], issuesCards: true },
  { code: 'CENCOSUD', name: 'Cencosud (Jumbo, Santa Isabel, París)', types: ['credit'], issuesCards: true, logoUrl: 'https://juupotamdjqzpxuqdtco.supabase.co/storage/v1/object/public/ingenit/banks/tarjeta_cencosud.png' },
  { code: 'SODIMAC', name: 'Sodimac', types: ['credit', 'credit_usd', 'store_credit'], issuesCards: true },
  { code: 'WALMART', name: 'Walmart / Lider', types: ['credit', 'credit_usd', 'store_credit'], issuesCards: true },
  { code: 'EASY', name: 'Easy', types: ['credit', 'credit_usd', 'store_credit'], issuesCards: true },

  // Placeholder for others (not allowed to auto-create)
  { code: 'NOMATCH', name: 'Otro (no permitido para creación)', types: [] }
];

export function findBankByCodeOrName(q?: string) {
  if (!q) return undefined;
  const v = q.trim().toLowerCase();
  return BANK_CATALOG.find(b => b.code.toLowerCase() === v || b.name.toLowerCase() === v);
}
