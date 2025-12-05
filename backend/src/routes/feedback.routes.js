import { Router } from "express";
import { getFeedbacksByEmpleado, saveFeedback, getPendingFeedbacks, closeFeedbacksBulk } from "../controllers/feedback.controller.js";
import { authenticateJWT } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/empleado/:empleadoId", getFeedbacksByEmpleado);
router.post("/", saveFeedback);

// Rutas para RRHH
router.get("/hr/pending", getPendingFeedbacks);
router.post("/hr/close-bulk", closeFeedbacksBulk);

export default router;
