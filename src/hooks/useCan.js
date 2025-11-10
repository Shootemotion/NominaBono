// src/hooks/useCan.js
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

// Hook principal: recibe una capability string o array y devuelve { ok: boolean }
export default function useCan(cap) {
  const { user } = useAuth();

  const caps = useMemo(() => {
    if (!user) return [];
    // user.permisos puede tener '*' o permisos puntuales
    return user.permisos || [];
  }, [user]);

  const ok = useMemo(() => {
    if (!user) return false;
    if (user.rol === 'superadmin') return true;
    if (!cap) return true; // si no piden cap, permito (control a nivel de rutas)
    if (Array.isArray(cap)) {
      return cap.some(c => caps.includes(c) || c === '*');
    }
    return caps.includes(cap) || caps.includes('*');
  }, [user, caps, cap]);

  return { ok };
}

// helper export: check role(s)
export function useHasRole(roles = []) {
  const { user } = useAuth();
  const ok = useMemo(() => {
    if (!user) return false;
    if (user.rol === 'superadmin') return true;
    if (!roles || roles.length === 0) return false;
    return roles.includes(user.rol);
  }, [user, roles]);
  return { ok };
}
