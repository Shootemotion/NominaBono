// src/routes/assignments.routes.js
import { Router } from "express";
import { getEmployeeAssignments } from "../controllers/assignments.controller.js";

const router = Router();

router.get("/employee/:empleadoId", getEmployeeAssignments);

export default router;
