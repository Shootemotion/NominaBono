import { api } from './api';

const base = '/objetivos';

export const objetivosListar = (params = {}) => {
  const validParams = {};
  for (const key in params) {
    // Filtra parámetros con valores nulos, vacíos o indefinidos
    if (params[key]) {
      validParams[key] = params[key];
    }
  }
  const q = new URLSearchParams(validParams).toString();
  return api(`${base}?${q}`);
};

export const objetivosCrear = (payload) => api(base, { method: 'POST', body: payload });

export const objetivosEditar = (id, payload) => api(`${base}/${id}`, { method: 'PUT', body: payload });

export const objetivosEliminar = (id) => api(`${base}/${id}`, { method: 'DELETE' });
export const objetivosAsignacionMasivaEmpleados = (payload) =>
  api('/objetivos/asignacion-masiva', { method: 'POST', body: payload });

export const objetivosAsignacionMasiva = (payload) =>
  api(`${base}/asignacion-masiva`, { method: 'POST', body: payload });