import { BANK_CATALOG } from "./bankCatalog";
import { getAccountTypeLabel } from "./accountTypeLabels";

export type BankTypeItem = { key: string; label: string };

export function getBankTypes(codeOrName?: string): BankTypeItem[] {
  if (!codeOrName) return [];
  const q = codeOrName.trim().toLowerCase();
  const entry = BANK_CATALOG.find(
    (b) => b.code.toLowerCase() === q || b.name.trim().toLowerCase() === q
  );
  if (!entry) return [];
  return (entry.types ?? []).map((t) => ({ key: t, label: getAccountTypeLabel(t) }));
}

export const BANK_TYPES_SPANISH: Record<string, BankTypeItem[]> = BANK_CATALOG.reduce(
  (acc, b) => {
    acc[b.code] = (b.types ?? []).map((t) => ({ key: t, label: getAccountTypeLabel(t) }));
    return acc;
  },
  {} as Record<string, BankTypeItem[]>
);

export function findBankCatalogEntry(codeOrName?: string) {
  if (!codeOrName) return undefined;
  const q = codeOrName.trim().toLowerCase();
  return BANK_CATALOG.find((b) => b.code.toLowerCase() === q || b.name.trim().toLowerCase() === q);
}
