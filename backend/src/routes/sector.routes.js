import { Router } from 'express';
import { authenticateJWT, requireCap } from '../auth/auth.middleware.js';
import { obtenerSectores, crearSector, actualizarSector, eliminarSector, setReferentesSector } from '../controllers/sector.controller.js';

const router = Router();

router.get('/', authenticateJWT, obtenerSectores);
router.post('/', authenticateJWT, requireCap('estructura:crear'), crearSector);
router.put('/:id', authenticateJWT, requireCap('estructura:editar'), actualizarSector);
router.delete('/:id', authenticateJWT, requireCap('estructura:eliminar'), eliminarSector);

// 👇 nuevo
router.put('/:id/referentes', authenticateJWT, requireCap('estructura:editar'), setReferentesSector);

export default router;