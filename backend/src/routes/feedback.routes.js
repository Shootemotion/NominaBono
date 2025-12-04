import { Router } from "express";
import { getFeedbacksByEmpleado, saveFeedback } from "../controllers/feedback.controller.js";
import { authenticateJWT } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/empleado/:empleadoId", getFeedbacksByEmpleado);
router.post("/", saveFeedback);

export default router;
