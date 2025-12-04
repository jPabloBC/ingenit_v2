"use client";
import { useEffect, useMemo, useState } from "react";

type MetodoPago =
  | "tarjeta_credito"
  | "credito"
  | "linea_credito"
  | "efectivo"
  | "cuenta";

type Movimiento = {
  id: string;
  date: string; // ISO date
  tipo: "ingreso" | "egreso";
  metodo: MetodoPago;
  categoria: string;
  monto: number;
  descripcion?: string;
  bank?: string | null; // now stores account_id (uuid)
};

type Account = {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  balance: number;
  credit_limit?: number | null;
  currency?: string;
};

const LS_KEY = "personal_transactions_v1";
const BANKS_KEY = "personal_banks_v1";

function formatCurrency(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

export default function TransactionsPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string; initial: number }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState<{
    date: string;
    tipo: "ingreso" | "egreso";
    metodo: MetodoPago | "";
    categoria: string;
    monto: string;
    descripcion: string;
    bank: string; // stores selected account id (or empty string)
    accountType: string; // filter/selected account type (e.g. "bank_account", "tarjeta_credito")
  }>({
    date: new Date().toISOString().slice(0, 10),
    tipo: "egreso",
    metodo: "",
    categoria: "General",
    monto: "",
    descripcion: "",
    bank: "",
    accountType: "",
  });

  const [errors, setErrors] = useState<Record<string,string>>({});

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'account' | 'bank' | null;
    bankId?: string | null;
    type?: string | null;
    accountId?: string | null;
    name?: string;
    value?: string;
    error?: string;
  }>({ open: false, mode: null, bankId: null, type: null, accountId: null, name: '', value: '', error: '' });

  function closeModal() {
    setModalState({ open: false, mode: null, bankId: null, type: null, accountId: null, name: '', value: '', error: '' });
  }

  useEffect(() => {
    // Cargar datos desde API (Supabase)
    (async () => {
      try {
        const [txRes, accRes] = await Promise.all([fetch('/api/transactions'), fetch('/api/accounts')]);
        if (txRes.ok && accRes.ok) {
          const txData = await txRes.json();
          const accData = await accRes.json();
          if (txData.success && accData.success) {
            const txs = (txData.transactions || []).map((t: any) => ({
              id: t.id,
              date: t.date,
              tipo: t.tipo,
              metodo: t.metodo,
              categoria: t.categoria,
              monto: Number(t.monto),
              descripcion: t.descripcion || undefined,
              bank: t.account_id || null,
            }));
            setMovimientos(txs);
            
            // Filtrar solo Falabella
            const falabella = (txData.banks || []).find((b: any) => b.name === 'Falabella');
            if (falabella) {
              setBanks([{ id: falabella.id, name: falabella.name, initial: Number(falabella.initial_balance || 0) }]);
            } else {
              setBanks([{ id: 'temp', name: 'Falabella', initial: 0 }]);
            }
            
            // Cargar solo cuentas de Falabella
            const accs = (accData.accounts || [])
              .filter((a: any) => a.bank_id === falabella?.id)
              .map((a: any) => ({ 
                id: a.id, 
                bank_id: a.bank_id, 
                name: a.name, 
                type: a.type, 
                balance: Number(a.balance || 0), 
                credit_limit: a.credit_limit || null, 
                currency: a.currency || 'CLP' 
              }));
            setAccounts(accs);
            return;
          }
        }
      } catch (e) {
        console.error("Error cargando datos:", e);
      }

      // fallback temporal
      setBanks([{ id: 'temp', name: 'Falabella', initial: 0 }]);
    })();
  }, []);



  const resumen = useMemo(() => {
    const totals = { ingresos: 0, egresos: 0 };
    const byMetodo: Record<string, number> = {};
    const byAccount: Record<string, number> = {};
    const byAccountType: Record<string, number> = {};
    const byBank: Record<string, number> = {};
    for (const m of movimientos) {
      if (m.tipo === "ingreso") totals.ingresos += m.monto;
      else totals.egresos += m.monto;
      byMetodo[m.metodo] = (byMetodo[m.metodo] || 0) + (m.tipo === "ingreso" ? m.monto : -m.monto);
      if (m.bank) byAccount[m.bank] = (byAccount[m.bank] || 0) + (m.tipo === "ingreso" ? m.monto : -m.monto);
      // accumulate by account type
      const acc = accounts.find(a => a.id === m.bank);
      const type = acc ? acc.type : 'unknown';
      byAccountType[type] = (byAccountType[type] || 0) + (m.tipo === 'ingreso' ? m.monto : -m.monto);
    }
    // aggregate per bank by mapping accounts
    for (const acc of accounts) {
      const accSum = byAccount[acc.id] || 0;
      byBank[acc.bank_id] = (byBank[acc.bank_id] || 0) + accSum + (acc.balance || 0);
    }
    return { totals, byMetodo, byAccount, byAccountType, byBank, balance: totals.ingresos - totals.egresos };
  }, [movimientos, accounts]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const monto = parseFloat(form.monto.replace(/[^0-9.-]+/g, ""));
    const newErrors: Record<string,string> = {};
    if (!monto || isNaN(monto)) newErrors.monto = "Ingresa un monto válido";
    if (!form.metodo) newErrors.metodo = "Selecciona un método de pago";
    // business rule: for gastos (egreso) require bank and metodo
    if (form.tipo === 'egreso' && !form.bank) newErrors.bank = "Selecciona la cuenta afectada para este gasto";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const nuevo: Movimiento = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
      date: form.date,
      tipo: form.tipo as "ingreso" | "egreso",
      metodo: form.metodo as MetodoPago,
      categoria: form.categoria,
      monto: Math.round(monto),
      descripcion: form.descripcion || undefined,
      bank: (form as any).bank || null,
    };

    // Try to persist to API, fallback to local state
    (async () => {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: nuevo.date,
            tipo: nuevo.tipo,
            metodo: nuevo.metodo,
            categoria: nuevo.categoria,
            monto: nuevo.monto,
            descripcion: nuevo.descripcion,
            accountId: nuevo.bank || null,
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.transaction) {
            const tx = data.transaction;
            setMovimientos((s) => [{
              id: tx.id,
              date: tx.date,
              tipo: tx.tipo,
              metodo: tx.metodo,
              categoria: tx.categoria,
              monto: Number(tx.monto),
              descripcion: tx.descripcion || undefined,
              bank: tx.account_id || tx.bank_id || null,
            }, ...s]);
            setForm((f) => ({ ...f, monto: "", descripcion: "" }));
            return;
          }
        }
      } catch (e) {
        // ignore and fallback to local
      }

      // fallback local
      setMovimientos((s) => [nuevo, ...s]);
      setForm((f) => ({ ...f, monto: "", descripcion: "" }));
    })();
  }

  function remove(id: string) {
    if (!confirm("Eliminar movimiento?")) return;
    // try delete in API then update local state
    (async () => {
      try {
        const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setMovimientos((s) => s.filter((m) => m.id !== id));
            return;
          }
        }
      } catch (e) {}
      // fallback: just update local
      setMovimientos((s) => s.filter((m) => m.id !== id));
    })();
  }

  function setBankInitial(id: string) {
    const b = banks.find((x) => x.id === id);
    if (!b) return;
    setModalState({ open: true, mode: 'bank', bankId: id, name: b.name, value: String(b.initial || 0), error: '' });
  }

  async function setAccountInitialForType(bankId: string, type: string) {
    const accs = accounts.filter(a => a.bank_id === bankId && a.type === type);
    if (accs.length === 0) {
      // open modal to create a new account for this bank+type
      setModalState({ open: true, mode: 'account', bankId, type, accountId: null, name: '', value: '0', error: '' });
      return;
    }
    // if there's at least one account, preselect the first and show modal to edit
    const acc = accs[0];
    setModalState({ open: true, mode: 'account', bankId, type, accountId: acc.id, name: acc.name || '', value: String(acc.balance || 0), error: '' });
  }

  async function handleModalSave() {
    if (!modalState.mode) return;
    const raw = modalState.value || '';
    const v = parseFloat(String(raw).replace(/[^0-9.-]+/g, ''));
    if (isNaN(v)) {
      setModalState(s => ({ ...s, error: 'Ingresa un monto válido' }));
      return;
    }

    if (modalState.mode === 'bank') {
      const id = modalState.bankId!;
      const rounded = Math.round(v);
      setBanks((s) => s.map(b => b.id === id ? { ...b, initial: rounded } : b));
      try {
        await fetch('/api/banks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, initial_balance: rounded }),
        });
      } catch (e) {
        // ignore — local updated
      }
      closeModal();
      return;
    }

    // account mode (simple: only name + balance)
    const bankId = modalState.bankId!;
    const type = modalState.type!;
    const rounded = Math.round(v);
    // if accountId provided => patch existing
    if (modalState.accountId) {
      const id = modalState.accountId;
      try {
        const res = await fetch('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, balance: rounded }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.account) {
            setAccounts((s) => s.map(a => a.id === data.account.id ? data.account : a));
            closeModal();
            return;
          }
        }
      } catch (e) {}
      // fallback local update
      setAccounts((s) => s.map(a => a.id === id ? { ...a, balance: rounded } : a));
      closeModal();
      return;
    }

    // else create a new account (simple)
    const name = (modalState.name && modalState.name.trim()) || `${banks.find(b=>b.id===bankId)?.name || 'Cuenta'} - ${type}`;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_id: bankId, name, type, balance: rounded }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.account) {
          setAccounts((s) => [data.account, ...s]);
          closeModal();
          return;
        }
      }
    } catch (e) {}
    // fallback local create
    const newAcc: Account = { id: String(Date.now()) + Math.random().toString(36).slice(2,6), bank_id: bankId, name, type, balance: rounded };
    setAccounts((s) => [newAcc, ...s]);
    closeModal();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Finanzas Personales - Falabella</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg p-4 border shadow-sm">
          <h3 className="font-semibold mb-3">Agregar movimiento</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-xs">Fecha</label>
            <input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} className="w-full border rounded px-3 py-2" />

            <label className="text-xs">Tipo</label>
            <select value={form.tipo} onChange={(e)=>setForm({...form, tipo: e.target.value as "ingreso" | "egreso"})} className="w-full border rounded px-3 py-2">
              <option value="egreso">Egreso</option>
              <option value="ingreso">Ingreso</option>
            </select>

            <label className="text-xs">Método</label>
            <select value={form.metodo} onChange={(e)=>setForm({...form, metodo: e.target.value as MetodoPago | ""})} className="w-full border rounded px-3 py-2">
              <option value="">-- Selecciona método --</option>
              <option value="tarjeta_credito">Tarjeta crédito</option>
              <option value="credito">Crédito</option>
              <option value="linea_credito">Línea crédito</option>
              <option value="efectivo">Efectivo</option>
              <option value="cuenta">Cuenta</option>
            </select>
            {errors.metodo && <div className="text-xs text-red-600 mt-1">{errors.metodo}</div>}

            <label className="text-xs mt-2">Cuenta Falabella</label>
            <select value={form.bank || ""} onChange={(e)=>setForm({...form, bank: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="">-- Selecciona cuenta --</option>
              <option value="" disabled className="text-gray-400">--- Falabella ---</option>
              {accounts.map(a => {
                const label = a.type === 'tarjeta_credito' ? 'TC (Tarjeta de Crédito)' 
                  : a.type === 'linea_credito' ? 'LC (Línea de Crédito)'
                  : 'S (Saldo en Cuenta)';
                return (
                  <option key={a.id} value={a.id}>
                    {label} — {formatCurrency(a.balance || 0)}
                  </option>
                );
              })}
            </select>
            <div className="text-xs text-gray-400 mt-1">Selecciona dónde se registra este movimiento</div>
            {errors.bank && <div className="text-xs text-red-600 mt-1">{errors.bank}</div>}

            <label className="text-xs">Categoría</label>
            <input value={form.categoria} onChange={(e)=>setForm({...form, categoria: e.target.value})} className="w-full border rounded px-3 py-2" />

            <label className="text-xs">Monto</label>
            <input value={form.monto} onChange={(e)=>setForm({...form, monto: e.target.value})} placeholder="123456" className="w-full border rounded px-3 py-2" />
            {errors.monto && <div className="text-xs text-red-600 mt-1">{errors.monto}</div>}

            <label className="text-xs">Descripción</label>
            <input value={form.descripcion} onChange={(e)=>setForm({...form, descripcion: e.target.value})} className="w-full border rounded px-3 py-2" />

            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Agregar</button>
              <button type="button" onClick={()=>{setForm({date:new Date().toISOString().slice(0,10), tipo:'egreso', metodo:'', categoria:'General', monto:'', descripcion:'', bank: '', accountType: ''})}} className="px-4 py-2 border rounded">Limpiar</button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4 border mb-4">
            <h3 className="font-semibold">Resumen</h3>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Ingresos</div>
                <div className="text-lg font-medium">{formatCurrency(resumen.totals.ingresos)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Egresos</div>
                <div className="text-lg font-medium">{formatCurrency(resumen.totals.egresos)}</div>
              </div>
              <div className="p-3 rounded" style={{background: resumen.balance<0?"#fee2e2":"#ecfdf5"}}>
                <div className="text-xs text-gray-500">Balance</div>
                <div className="text-lg font-medium">{formatCurrency(resumen.balance)}</div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium">Por método</h4>
              <div className="flex gap-3 mt-2">
                {Object.entries(resumen.byMetodo).map(([k,v])=> (
                  <div key={k} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="text-xs text-gray-500">{k.replace(/_/g,' ')}</div>
                    <div>{formatCurrency(v)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium">Consolidado por banco</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {banks.map(b => {
                    const bankAccounts = accounts.filter(a => a.bank_id === b.id);
                    const bankTotal = (resumen.byBank[b.id] ?? (bankAccounts.reduce((s,a)=> s + ((resumen.byAccount[a.id]||0) + (a.balance||0)), 0) || b.initial));
                    // Always show the three main types with totals
                    const typesOrder = [
                      { key: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
                      { key: 'linea_credito', label: 'Línea de Crédito' },
                      { key: 'bank_account', label: 'Saldo en Cuenta' },
                    ];
                    const totalsByType: Record<string, number> = {};
                    for (const t of typesOrder) {
                      const accs = bankAccounts.filter(a => a.type === t.key);
                      const sum = accs.reduce((s,a) => s + ((a.balance||0) + (resumen.byAccount[a.id]||0)), 0);
                      totalsByType[t.key] = sum;
                    }

                    return (
                      <div key={b.id} className="p-4 bg-white rounded-lg border shadow-md hover:shadow-lg transform hover:-translate-y-1 transition">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">{b.name.split(' ')[0].slice(0,2).toUpperCase()}</div>
                            <div>
                              <div className="text-sm font-semibold">{b.name}</div>
                              <div className="text-xs text-gray-500">Total banco</div>
                            </div>
                          </div>
                          <div className="text-lg font-bold">{formatCurrency(bankTotal)}</div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          {typesOrder.map(t => {
                            const accsInline = bankAccounts.filter(a => a.type === t.key);
                            const hasValue = (totalsByType[t.key] || 0) !== 0 || accsInline.length > 0;
                            const shortLabel = t.key === 'tarjeta_credito' ? 'TC' : t.key === 'linea_credito' ? 'LC' : 'S';
                            return (
                              <div key={t.key} className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 border-blue-200 flex flex-col justify-between">
                                <div>
                                  <div className="text-sm font-bold text-blue-700">{shortLabel}</div>
                                  <div className="text-xs text-gray-600 mb-2">{t.label}</div>
                                  <div className="font-bold text-2xl text-gray-800">{formatCurrency(totalsByType[t.key] || 0)}</div>
                                </div>
                                <div className="mt-4">
                                  {hasValue ? (
                                    <button onClick={()=>setAccountInitialForType(b.id, t.key)} className="text-xs text-blue-700 hover:bg-blue-100 px-3 py-2 rounded w-full border border-blue-300">Editar saldo</button>
                                  ) : (
                                    <button onClick={()=>setAccountInitialForType(b.id, t.key)} className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded w-full font-medium">Establecer inicial</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>


                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium">Consolidado final</h4>
                  <div className="text-2xl font-bold mt-2">{formatCurrency(Object.values(resumen.byBank || {}).reduce((s:any,v:any)=>s+v, 0) || 0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border">
            <h3 className="font-semibold mb-2">Movimientos</h3>
            <div className="md:hidden space-y-3">
              {movimientos.map(m => (
                <div key={m.id} className="bg-white rounded-lg p-3 border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{m.categoria}</div>
                      <div className="text-xs text-gray-500">{m.date} • {m.metodo.replace(/_/g,' ')}</div>
                    </div>
                    <div className={`${m.tipo==='egreso'?'text-red-600':'text-green-600'} font-semibold`}>{formatCurrency(m.monto)}</div>
                  </div>
                </div>
              ))}
              {movimientos.length===0 && (<div className="text-center text-gray-400 py-6">No hay movimientos aún</div>)}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="px-2 py-1">Fecha</th>
                    <th className="px-2 py-1">Tipo</th>
                    <th className="px-2 py-1">Método</th>
                    <th className="px-2 py-1">Categoria</th>
                    <th className="px-2 py-1">Cuenta</th>
                    <th className="px-2 py-1">Tipo cuenta</th>
                    <th className="px-2 py-1">Monto</th>
                    <th className="px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(m=> (
                    <tr key={m.id} className="border-t">
                      <td className="px-2 py-2">{m.date}</td>
                      <td className="px-2 py-2">{m.tipo}</td>
                      <td className="px-2 py-2">{m.metodo.replace(/_/g,' ')}</td>
                      <td className="px-2 py-2">{m.categoria}</td>
                      <td className="px-2 py-2">{accounts.find(a=>a.id===m.bank)?.name ?? '-'}</td>
                      <td className="px-2 py-2">{accounts.find(a=>a.id===m.bank)?.type?.replace(/_/g,' ') ?? '-'}</td>
                      <td className={`px-2 py-2 ${m.tipo==='egreso'?'text-red-600':'text-green-600'}`}>{formatCurrency(m.monto)}</td>
                      <td className="px-2 py-2"><button onClick={()=>remove(m.id)} className="text-sm text-red-500">Eliminar</button></td>
                    </tr>
                  ))}
                  {movimientos.length===0 && (
                    <tr><td colSpan={7} className="text-center text-gray-400 py-6">No hay movimientos aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {modalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="bg-white rounded-lg shadow-lg z-10 w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">{modalState.mode === 'bank' ? 'Editar saldo inicial' : (modalState.accountId ? 'Editar cuenta' : 'Crear cuenta')}</h4>
                <div className="text-sm text-gray-700">{modalState.name}</div>
              </div>
              <button onClick={closeModal} className="text-gray-500">Cerrar</button>
            </div>

            {modalState.mode === 'account' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs">Nombre de la cuenta (opcional)</label>
                <input value={modalState.name || ''} onChange={(e)=>setModalState((s:any)=>({...s, name: e.target.value}))} className="w-full border rounded px-3 py-2" />

                <label className="text-xs">Saldo inicial</label>
                <input value={modalState.value || ''} onChange={(e)=>setModalState((s:any)=>({...s, value: e.target.value}))} className="w-full border rounded px-3 py-2" />
              </div>
            )}

            {modalState.mode === 'bank' && (
              <div className="flex flex-col gap-2">
                <div className="text-sm">Banco: <strong>{modalState.name}</strong></div>
                <label className="text-xs">Saldo inicial</label>
                <input value={modalState.value || ''} onChange={(e)=>setModalState((s:any)=>({...s, value: e.target.value}))} className="w-full border rounded px-3 py-2" />
              </div>
            )}

            {modalState.error && <div className="text-xs text-red-600 mt-2">{modalState.error}</div>}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeModal} className="px-3 py-2 border rounded">Cancelar</button>
              <button onClick={handleModalSave} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
