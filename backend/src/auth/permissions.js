// backend/src/auth/permissions.js
export const ROLE_PERMS = {
  admin: ['*'],

  rrhh: [
    'nomina:*',                // ver/crear/editar/eliminar empleados
    'estructura:ver',
    'estructura:crear',
    'estructura:editar',
    'estructura:eliminar',
  ],

  jefe: [
    'nomina:ver', 'nomina:evaluar',"nomina:editar",             // solo consulta de nómina
  ],

  finanzas: [
    'nomina:ver',
  ],

  editor: [
    'estructura:ver',
    'estructura:editar',
  ],

  visor: ['estructura:ver'],                  // por defecto, solo lectura muy limitada
};

// comodines tipo "nomina:*"
const matchCap = (grants, need) =>
  grants.some(p => p === '*' || p === need || (p.endsWith(':*') && need.startsWith(p.slice(0, -2))));

export const can = (rol, cap) => {
  const grants = ROLE_PERMS[rol] || [];
  return matchCap(grants, cap);
};
