import { api } from '@/lib/api';

export const setReferentesArea = (areaId, referentes) =>
  api(`/areas/${areaId}/referentes`, { method: 'PUT', body: { referentes } });

export const setReferentesSector = (sectorId, referentes) =>
  api(`/sectores/${sectorId}/referentes`, { method: 'PUT', body: { referentes } });