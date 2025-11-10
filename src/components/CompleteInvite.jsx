// src/components/CompleteInvite.jsx
import { useEffect, useState } from 'react';
import { api, setToken, setUser } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export default function CompleteInvite({ open, onClose, initialEmail = '', afterLoginRedirect = '/' }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || '');
      setTempPassword('');
      setNewPassword('');
      setConfirm('');
      setError('');
    }
  }, [open, initialEmail]);

  const submit = async () => {
    setError('');
    if (!email) return setError('Email requerido');
    if (!tempPassword) return setError('Clave temporal requerida');
    if (!newPassword || newPassword.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres');
    if (newPassword !== confirm) return setError('Las contraseñas no coinciden');

    setLoading(true);
    try {
      // 1) completar invitación en backend
      await api('/auth/complete-invite', {
        method: 'POST',
        body: { email, tempPassword, newPassword },
      });

      // 2) login automático con la nueva clave
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password: newPassword },
      });

      const token =
        data?.token ??
        data?.accessToken ??
        data?.jwt ??
        data?.data?.token;

      if (!token) {
        setError('No se pudo obtener token tras completar invitación.');
        setLoading(false);
        return;
      }

      setToken(token);
      setUser(data?.user ?? data?.data?.user ?? null);

      // cerrar modal y redirigir
      onClose?.();
      navigate(afterLoginRedirect, { replace: true });
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Error al completar invitación');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">Cambiar contraseña</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ingresá la clave temporal que te dieron y elegí tu nueva contraseña.
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground">Correo</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground">Clave temporal</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground">Nueva contraseña</label>
            <input
              type="password"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground">Confirmar nueva contraseña</label>
            <input
              type="password"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted/40"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            disabled={loading}
          >
            {loading ? 'Procesando…' : 'Confirmar y entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
