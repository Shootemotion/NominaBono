// backend/src/routes/seguimiento.routes.js
import { Router } from 'express';
import { seguimientoEjecutivo } from '../controllers/seguimiento.controller.js';
const router = Router();

router.get('/ejecutivo', seguimientoEjecutivo);

export default router;
