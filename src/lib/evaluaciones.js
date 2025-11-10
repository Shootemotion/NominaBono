import { api } from "./api";

// Listado flexible (?empleado=&plantillaId=&periodo=)
export const listEvaluaciones = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return api(`/evaluaciones?${qs}`);
};

export const getEvaluacion = (id) => api(`/evaluaciones/detalle/${id}`);

// PATCH libre (manager en borrador)
export const patchEvaluacion = (id, body) =>
  api(`/evaluaciones/${id}`, { method: "PATCH", body });

// Flujo
export const submitToEmployee = (id) =>
  api(`/evaluaciones/${id}/submit-to-employee`, { method: "POST" });

export const employeeAck = (id) =>
  api(`/evaluaciones/${id}/employee-ack`, { method: "POST" });

export const employeeContest = (id, comentarioEmpleado) =>
  api(`/evaluaciones/${id}/employee-contest`, { method: "POST", body: { comentarioEmpleado } });

export const submitToHR = (id) =>
  api(`/evaluaciones/${id}/submit-to-hr`, { method: "POST" });

export const closeEvaluacion = (id, comentarioRRHH) =>
  api(`/evaluaciones/${id}/close`, { method: "POST", body: comentarioRRHH ? { comentarioRRHH } : {} });

export const reopenEvaluacion = (id, note) =>
  api(`/evaluaciones/${id}/reopen`, { method: "POST", body: note ? { note } : {} });

/**
 * Conveniencia: trae (o crea) un borrador para empleado+plantilla+periodo.
 * Si existe, lo devuelve. Si no, lo crea.
 */
export const ensureDraft = async ({ empleadoId, plantillaId, periodo }) => {
  const normalizedPeriodo = String(periodo).trim();

  // 1. Buscar si ya existe
  const found = await listEvaluaciones({
    empleado: empleadoId,
    plantillaId,
    periodo: normalizedPeriodo,
  });

  if (Array.isArray(found) && found.length > 0) {
    return found[0];
  }

  // 2. Crear nuevo si no existe
  const res = await api(`/evaluaciones`, {
    method: "POST",
    body: {
      empleado: empleadoId,
      plantillaId,
      periodo: normalizedPeriodo,
    },
  });

  return res;
};
