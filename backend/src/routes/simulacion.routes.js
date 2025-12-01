import { Router } from "express";
import { simular } from "../controllers/simulacion.controller.js";

const router = Router();

router.post("/calcular", simular);

export default router;
