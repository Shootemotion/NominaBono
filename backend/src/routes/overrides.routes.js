// src/routes/overrides.routes.js
import { Router } from "express";
import {
  upsertOverride,
  listOverrides,
  deleteOverride,
} from "../controllers/overrides.controller.js";

const router = Router();

router.post("/", upsertOverride); // upsert
router.get("/", listOverrides);
router.delete("/:id", deleteOverride);

export default router;
