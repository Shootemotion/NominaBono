import { Router } from 'express';
import { authenticateJWT, requireCap } from '../auth/auth.middleware.js';
import { obtenerAreas, crearArea, actualizarArea, eliminarArea, setReferentesArea } from '../controllers/areas.controller.js';

const router = Router();

router.get('/', authenticateJWT, obtenerAreas);
router.post('/', authenticateJWT, requireCap('estructura:crear'), crearArea);
router.put('/:id', authenticateJWT, requireCap('estructura:editar'), actualizarArea);
router.delete('/:id', authenticateJWT, requireCap('estructura:eliminar'), eliminarArea);

// 👇 nuevo
router.put('/:id/referentes', authenticateJWT, requireCap('estructura:editar'), setReferentesArea);

export default router