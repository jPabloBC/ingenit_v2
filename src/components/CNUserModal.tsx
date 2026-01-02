"use client";
import React, { useState } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { X } from "lucide-react";

interface Props {
  user?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

function capitalizeWords(input?: string) {
  if (!input) return '';
  return input
    .split(/\s+/)
    .map(part => {
      if (part.length === 0) return '';
      const first = part[0];
      const rest = part.slice(1);
      return first.toUpperCase() + rest.toLowerCase();
    })
    .join(' ')
    .trim();
}

export default function CNUserModal({ user, onClose, onSaved }: Props) {
  const [email, setEmail] = useState(user?.email || "");
  const [clientId, setClientId] = useState(user?.client_id || "");
  const [fullName, setFullName] = useState<string>(capitalizeWords(user?.full_name));
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [role, setRole] = useState(user?.role || "user");
  const [status, setStatus] = useState(user?.status || "active");
  const [isSaving, setIsSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // validate and normalize email to lowercase
      const emailValue = (email || '').trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(emailValue)) {
        setEmailError('Email inválido');
        setIsSaving(false);
        return;
      }
      setEmailError(null);

      // Ensure phone is stored in international format starting with '+'
      let processedPhone = phone || '';
      if (processedPhone && !processedPhone.startsWith('+')) processedPhone = '+' + processedPhone;
      const payload: any = { email: emailValue, full_name: capitalizeWords(fullName), phone: processedPhone, role, status, client_id: clientId || null, location: location || null };
      const method = user ? 'PUT' : 'POST';
      if (user) payload.id = user.id;

      const res = await fetch('/api/admin/cn/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Error saving user');
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{user ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              className="w-full border rounded-md px-3 py-2"
            />
            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
          </div>

          {user ? (
            <div>
              <label className="block text-sm text-gray-700 mb-1">Client ID</label>
              <input type="text" value={clientId} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-50" />
            </div>
          ) : null}

          <div>
            <label className="block text-sm text-gray-700 mb-1">Nombre completo</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setFullName(capitalizeWords(fullName))}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Teléfono</label>
              <div className="relative">
                <PhoneInput
                  country={'cl'}
                  value={phone}
                  onChange={(value: string) => setPhone(value)}
                  inputClass="!w-full !border !rounded !px-3 !py-2 !text-base !bg-white !pl-10 focus:!ring-2 focus:!ring-cyan-500"
                  buttonClass="!border-none !bg-transparent !px-0 !absolute !left-1 !top-1/2 !-translate-y-1/2"
                  containerClass="!w-full !relative"
                  dropdownClass="!z-50"
                  enableSearch
                  placeholder="Teléfono"
                  countryCodeEditable={true}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded-md px-3 py-2">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded-md px-3 py-2">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
