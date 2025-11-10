// src/routes/participaciones.routes.js
import { Router } from "express";
import {
  upsertParticipacion,
  listParticipaciones,
  deleteParticipacion,
} from "../controllers/participaciones.controller.js";

const router = Router();

router.post("/", upsertParticipacion); // upsert
router.get("/", listParticipaciones);
router.delete("/:id", deleteParticipacion);

export default router;
