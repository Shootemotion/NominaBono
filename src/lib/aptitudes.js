// src/lib/aptitudes.js
import { api } from './api';

export const aptitudesListar = (params) => {
  const validParams = {};
  for (const key in params) {
    // Filtra parámetros con valores nulos, vacíos o indefinidos
    if (params[key]) {
      validParams[key] = params[key];
    }
  }
  const q = new URLSearchParams(validParams).toString();
  return api(`/aptitudes?${q}`);
};

export const aptitudesCrear = (body) => api('/aptitudes', { method: 'POST', body });
export const aptitudesEditar = (id, body) => api(`/aptitudes/${id}`, { method: 'PUT', body });
export const aptitudesEliminar = (id) => api(`/aptitudes/${id}`, { method: 'DELETE' });

// masiva a empleados seleccionados
export const aptitudesAsignacionMasivaEmpleados = (payload) =>
  api('/aptitudes/asignacion-masiva', { method: 'POST', body: payload });