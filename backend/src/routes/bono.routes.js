import { Router } from "express";
import { authenticateJWT, requireCap } from "../auth/auth.middleware.js";
import { getConfig, saveConfig, calculateAll, getResults } from "../controllers/bono.controller.js";

const router = Router();

router.use(authenticateJWT);

// Configuración (Solo RRHH/Directivo)
// Usamos 'nomina:ver' o 'nomina:evaluar' como proxy, o creamos cap específica 'bono:manage'
// Por ahora, restringimos a RRHH/Directivo en el controlador o middleware.
// Vamos a usar requireCap('rrhh:evaluaciones:cierre') como proxy de "alto nivel" o simplemente checkear rol.
// Mejor: requireCap('nomina:evaluar') que suelen tener los jefes, pero esto es CONFIG.
// Vamos a asumir que solo RRHH y Directivos pueden tocar esto.

// GET /config/:year
router.get("/config/:year", getConfig);

// POST /config/:year
router.post("/config/:year", saveConfig);

// POST /calculate/:year
router.post("/calculate/:year", calculateAll);

// GET /results/:year
router.get("/results/:year", getResults);

export default router;
