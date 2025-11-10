// backend/src/auth/scope.helper.js
import Area from '../models/Area.model.js';
import Sector from '../models/Sector.model.js';

/**
 * canAccessScope(user, { areaId, sectorId })
 *  - user: objeto req.user (ya poblado por authenticateJWT)
 *  - uno de areaId o sectorId debe existir
 *
 * Reglas (OR):
 *  - superadmin / rrhh / directivo / permiso dashboard:all => acceso
 *  - si sectorId:
 *      * jefe_sector del mismo sector
 *      * jefe_area cuya area coincide con el sector.areaId
 *      * referente del sector (emp or user id)
 *      * referente del área madre (emp or user id)
 *  - si areaId:
 *      * jefe_area del área
 *      * referente del área (emp or user id)
 */
export async function canAccessScope(user, { areaId = null, sectorId = null } = {}) {
  if (!user) return false;

  // atajos globales
  if (user.rol === 'superadmin') return true;
  if (user.rol === 'rrhh') return true;
  if (user.rol === 'directivo') return true;
  if (Array.isArray(user.permisos) && (user.permisos.includes('dashboard:all') || user.permisos.includes('*'))) return true;

  // helper ids
  const empleadoId = user.empleadoId ? String(user.empleadoId) : null;
  const userId = user._id ? String(user._id) : null;

  // ------------------------------------------------
  // SECTOR-level check (incluye herencia area -> sector)
  // ------------------------------------------------
  if (sectorId) {
    const s = await Sector.findById(sectorId).select('referentes areaId').lean();
    if (!s) return false;

    // 1) jefe del sector
    if (user.rol === 'jefe_sector' && String(user.sectorId) === String(s._id)) return true;

    // 2) jefe de área que cubre el sector
    if (user.rol === 'jefe_area' && user.areaId && String(user.areaId) === String(s.areaId)) return true;

    // 3) referente directo del sector (puede estar guardado empleadoId o userId)
    if (s.referentes && s.referentes.length > 0) {
      const refs = s.referentes.map(r => String(r));
      if ((empleadoId && refs.includes(empleadoId)) || (userId && refs.includes(userId))) return true;
    }

    // 4) referente del área madre
    if (s.areaId) {
      const a = await Area.findById(s.areaId).select('referentes').lean();
      if (a?.referentes && a.referentes.length > 0) {
        const refsA = a.referentes.map(r => String(r));
        if ((empleadoId && refsA.includes(empleadoId)) || (userId && refsA.includes(userId))) return true;
      }
    }

    return false;
  }

  // ------------------------------------------------
  // AREA-level check
  // ------------------------------------------------
  if (areaId) {
    const a = await Area.findById(areaId).select('referentes').lean();
    if (!a) return false;

    // 1) jefe_area propio
    if (user.rol === 'jefe_area' && String(user.areaId) === String(a._id)) return true;

    // 2) referente del area (empleado o user)
    if (a.referentes && a.referentes.length > 0) {
      const refs = a.referentes.map(r => String(r));
      if ((empleadoId && refs.includes(empleadoId)) || (userId && refs.includes(userId))) return true;
    }

    return false;
  }

  // si no se pasó scope, negar
  return false;
}
