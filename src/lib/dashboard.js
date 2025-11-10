// src/lib/dashboard.js
import { api } from './api';

export const dashArea   = (areaId, anio)   => api(`/dashboard/area/${areaId}?anio=${anio}`);
export const dashSector = (sectorId, anio) => api(`/dashboard/sector/${sectorId}?anio=${anio}`);

export const dashEmpleado = async (empleadoId, anio) => {
  if (!empleadoId) throw new Error("dashEmpleado: empleadoId requerido");

  // 1) dashboard base (puede no traer objetivos por empleado)
  let base = null;
  try {
    base = await api(`/dashboard/empleado/${empleadoId}?anio=${anio}`);
  } catch (e) {
    if (e?.data?.message === "Empleado no encontrado" || String(e?.message || "").includes("Empleado no encontrado")) {
      return null;
    }
    // otros errores => re-lanzamos
    throw e;
  }

  // 2) plantillas directas del empleado (scopeType=empleado) para ese año
  let directEmpTemplates = [];
  try {
    const qs = new URLSearchParams({
      year: String(anio),
      scopeType: "empleado",
      scopeId: String(empleadoId),
    }).toString();
    directEmpTemplates = await api(`/templates?${qs}`);
  } catch {
    directEmpTemplates = [];
  }

  // 3) overrides del empleado en ese año
  // si tu endpoint soporta ?empleado=... usalo; si no, filtramos a mano
  let overrides = [];
  try {
    // intenta con filtro por empleado (si tu API lo soporta)
    overrides = await api(`/overrides?year=${anio}&empleado=${empleadoId}`);
    if (!Array.isArray(overrides)) throw new Error("fallback");
  } catch {
    try {
      const all = await api(`/overrides?year=${anio}`);
      overrides = Array.isArray(all)
        ? all.filter(o => String(o.empleado) === String(empleadoId))
        : [];
    } catch {
      overrides = [];
    }
  }

  const ovIndex = Object.fromEntries(
    overrides.map(o => [String(o.template), o])
  );

  // 4) mapear plantillas directas, aplicar overrides (excluido, peso, meta)
  const mappedDirect = directEmpTemplates
    .filter(tpl => !(ovIndex[tpl._id]?.excluido)) // si está excluido, no lo muestres
    .map(tpl => ({
      ...tpl,
      // share 100% porque es objetivo directo del empleado
      share: 100,
      base: Number(tpl.pesoBase ?? 0),
      peso: ovIndex[tpl._id]?.peso ?? Number(tpl.pesoBase ?? 0),
      metaOverride: ovIndex[tpl._id]?.meta ?? null,
    }));

  // 5) unir con lo que venga del dashboard (evitar duplicados por _id)
  const ensureArray = (x) => (Array.isArray(x) ? x : (x?.items || []));
  const baseObj = base || {};
  const baseObjObjs = ensureArray(baseObj.objetivos);
  const baseObjApt  = ensureArray(baseObj.aptitudes);

  const already = new Set([
    ...baseObjObjs.map(o => String(o._id || o.id || "")),
    ...baseObjApt.map(a => String(a._id || a.id || "")),
  ]);

  const directObjs = mappedDirect.filter(t => t.tipo === "objetivo" && !already.has(String(t._id)));
  const directApt  = mappedDirect.filter(t => t.tipo === "aptitud" && !already.has(String(t._id)));

  const result = {
    ...baseObj,
    objetivos: [...baseObjObjs, ...directObjs],
    aptitudes: [...baseObjApt, ...directApt],
  };

  return result;
};
