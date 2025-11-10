// src/routes/templates.routes.js
import { Router } from "express";
import {
  createPlantilla,
  listPlantillas,
  updatePlantilla,
  deletePlantilla,
  getPlantillaById,
} from "../controllers/plantilla.controller.js";

const router = Router();

router.post("/", createPlantilla);
router.get("/", listPlantillas);
router.get("/:id", getPlantillaById);
router.put("/:id", updatePlantilla);
router.delete("/:id", deletePlantilla);

export default router;
