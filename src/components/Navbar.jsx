// src/components/Navbar.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/DiagnosLogo.png';
import { Button } from '@/components/ui/button';
import useCan, { useHasRole } from '@/hooks/useCan';
import { API_ORIGIN } from "@/lib/api";

function Navbar({ showDisabledInsteadOfHiding = false }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  // ====== Avatar (misma lógica que EmpleadoCard) ======
const fotoSrc = (empleado) => {
  const url = empleado?.fotoUrl;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url; // ya absoluta
  // une origin + ruta SIN duplicar slashes
  const base = (typeof API_ORIGIN === 'string' && API_ORIGIN) ? API_ORIGIN : window.location.origin;
  return `${base.replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`;
};
  const avatarSrc = useMemo(() => fotoSrc(user?.empleado), [user?.empleado?.fotoUrl]);
  // ====================================================

  // Permisos / roles
  const { ok: canViewEstructura } = useCan('estructura:ver');
  const { ok: canViewNomina } = useCan('nomina:ver');
  const { ok: canManageUsuarios } = useCan('usuarios:manage');
  const { ok: hasRoleRRHH } = useHasRole(['rrhh', 'jefe_area', 'jefe_sector']);
  const { ok: hasRoleDirectivo } = useHasRole(['directivo']);

  // Si es referente (aunque sea visor)
  const hasReferente = !!(
    user &&
    (
      (Array.isArray(user.referenteAreas) && user.referenteAreas.length > 0) ||
      (Array.isArray(user.referenteSectors) && user.referenteSectors.length > 0)
    )
  );

  // Estructura visible si tiene permiso directo, es referente o tiene rol jerárquico
  const canViewEstructuraFinal = useMemo(() => {
    return Boolean(
      canViewEstructura ||
      hasReferente ||
      user?.isJefeArea ||
      user?.isJefeSector ||
      user?.isRRHH ||
      user?.isSuper ||
      user?.rol === 'directivo'
    );
  }, [canViewEstructura, hasReferente, user]);

  // 🚩 Caso especial: VISOR puro (no referente)
  const isNormalUser = user?.rol === 'visor' && !hasReferente;

  // 🚩 Caso: es referente (aunque sea visor)
  const isReferenteReal = hasReferente;

  function handleLogout() {
    logout();
    nav('/login', { replace: true });
  }

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'text-foreground bg-muted' : 'text-white/90 hover:text-white hover:bg-white/10'
    }`;

  const renderNavItem = (to, label, allowed) => {
    if (allowed) return <NavLink to={to} className={linkClass}>{label}</NavLink>;
    if (!showDisabledInsteadOfHiding) return null;
    return (
      <span className="px-3 py-2 rounded-md text-sm text-white/40 cursor-not-allowed" title="No tiene permisos">
        {label}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-700 bg-[var(--color-1)] text-white">
      <nav className="flex items-center h-16 justify-between">
        {/* Logo */}
        <div className="flex items-center h-full">
          <Link to="/" className="h-full flex items-center px-6 bg-white hover:bg-gray-200 transition-colors">
            <img src={logo} alt="Diagnos" className="h-9 w-auto filter invert(1)" />
          </Link>
        </div>

        {/* LINKS */}
        <div className="flex-1 flex justify-center items-center">
          <div className="flex items-center gap-3">
            {isNormalUser ? (
              <>
                {/* 🚩 VISOR puro → solo Seguimiento y Mi desempeño */}
                {renderNavItem('/seguimiento', 'Seguimiento', true)}
                {user && renderNavItem('/mi-desempeno', 'Mi desempeño', true)}
              </>
            ) : (
              <>
                {/* Nómina */}
                {renderNavItem('/gestion-estructura', 'Nomina', canViewEstructuraFinal)}

                {/* Departamentos */}
                {renderNavItem('/gestion-departamentos', 'Departamentos', canViewEstructuraFinal)}

                {/* Seguimiento Ejecutivo */}
                {renderNavItem('/seguimiento-ejecutivo', 'Seguimiento Ejecutivo', true)}

                {/* Objetivos (solo RRHH o Directivos) */}
                {(hasRoleRRHH || hasRoleDirectivo) && renderNavItem('/plantillas', 'Objetivos', true)}

                {/* Asignaciones (solo RRHH o Directivos) */}
                {(hasRoleRRHH || hasRoleDirectivo) && renderNavItem('/asignaciones', 'Asignaciones', true)}

                {/* Seguimiento (lo ven RRHH, Directivos, nominadores o referentes) */}
                {(hasRoleRRHH || hasRoleDirectivo || canViewNomina || isReferenteReal) &&
                  renderNavItem('/seguimiento', 'Seguimiento', true)}

                {/* Mi desempeño (todos los usuarios logueados) */}
                {user && renderNavItem('/mi-desempeno', 'Mi desempeño', true)}

                {/* Usuarios (solo admins de usuarios, NO RRHH ni Directivos) */}
                {canManageUsuarios && renderNavItem('/usuarios', 'Usuarios', true)}
              </>
            )}
          </div>
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-3 px-6">
          {user ? (
            <>
              {/* Avatar */}
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user?.fullName || user?.email || 'Usuario'}
                  className="h-12 w-12 rounded-full object-cover border-2 border-white/30 shadow-md"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
                  {(user?.fullName || user?.email || "?")[0]}
                </div>
              )}

              {/* Info usuario */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium opacity-90">
                  {user?.fullName || (user?.apellido ? `${user.apellido}, ${user.nombre}` : user?.email)}
                </span>
                <span className="text-xs text-gray-200">
                  {user?.empleado?.puesto || "—"}
                </span>
                <span className="text-xs text-gray-400">
                  {user?.rol}
                </span>
              </div>

              {/* Logout */}
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                onClick={handleLogout}
              >
                Salir
              </Button>
            </>
          ) : (
            <Link to="/login" className="text-sm underline">Ingresar</Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
