// src/lib/ejecutivo.js
import { api } from './api';

// GET /dashboard/ejecutivo/resumen?anio=2025
export const ejecutivoResumen = (anio) =>
  api(`/dashboard/ejecutivo/resumen?anio=${encodeURIComponent(anio)}`);

// GET /dashboard/ejecutivo/departamentos?anio=2025[&sectorId=...]
export const ejecutivoDepartamentos = (anio, sectorId) => {
  const q = new URLSearchParams({ anio });
  if (sectorId) q.append('sectorId', sectorId);
  return api(`/dashboard/ejecutivo/departamentos?${q.toString()}`);
};
