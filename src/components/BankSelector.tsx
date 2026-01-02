"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Bank = {
  id: string;
  name: string | null;
  code: string | null;
};

type DisplayMode = "code" | "code_name" | "name";

type Props = {
  value?: string | null; // selected bank code (preferred) or id
  onChange?: (bank: Bank | null) => void;
  placeholder?: string;
  className?: string;
  display?: DisplayMode; // how to show option labels
};

export default function BankSelector({ value, onChange, placeholder = "Selecciona un banco", className, display = "code" }: Props) {
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("rt_personal_banks")
          .select("id, name, code")
          .order("name", { ascending: true });

        if (err) throw err;

        if (!mounted) return;
        setBanks((data ?? []) as Bank[]);
      } catch (e: any) {
        console.error("Error loading banks:", e);
        if (!mounted) return;
        setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value;
    if (!banks) {
      onChange?.(null);
      return;
    }
    const found = banks.find((b) => (b.code ?? b.id) === val) ?? null;
    onChange?.(found);
  };

  if (loading) {
    return <select className={className} disabled><option>Cargando bancos...</option></select>;
  }

  if (error) {
    return <div className={className}>Error cargando bancos: {error}</div>;
  }

  return (
    <select className={className} value={value ?? ""} onChange={handleChange}>
      <option value="" disabled>
        {placeholder}
      </option>
      {banks && banks.length === 0 && (
        <option value="" disabled>
          (No hay bancos)
        </option>
      )}
      {banks?.map((b) => {
        const label =
          display === "code"
            ? (b.code ?? b.id)
            : display === "name"
            ? (b.name ?? b.code ?? b.id)
            : // code_name
              (b.code ? `${b.code} — ${b.name ?? "(sin nombre)"}` : (b.name ?? b.id));

        return (
          <option key={b.id} value={b.code ?? b.id}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
