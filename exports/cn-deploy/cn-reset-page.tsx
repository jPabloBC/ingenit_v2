// Copy this file into the cn.ingenit.cl project at `src/app/admin/reset-password/page.tsx`
// It expects to POST to the local endpoint `/api/admin/cn/set-password` on cn.ingenit.cl

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = searchParams?.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!token) return setError('Token missing');
    if (!password) return setError('Ingresa una contraseña');
    if (password !== confirm) return setError('Las contraseñas no coinciden');

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/cn/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const bodyRes = await res.json().catch(() => null);
      if (!res.ok) {
        setError(bodyRes?.error || 'Error al actualizar contraseña');
      } else {
        setSuccess('Contraseña actualizada. Redirigiendo...');
        setTimeout(() => router.push('/admin/login'), 1500);
      }
    } catch (e) {
      setError('Error de red al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Crear contraseña</h2>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">Nueva contraseña</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" />
        <label className="block mb-2">Confirmar</label>
        <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="w-full p-2 border rounded mb-4" />
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {success && <div className="text-sm text-green-600 mb-2">{success}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded" disabled={isLoading}>{isLoading ? 'Enviando...' : 'Crear contraseña'}</button>
      </form>
    </div>
  );
}
