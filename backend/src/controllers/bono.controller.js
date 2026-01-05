import BonoConfig from "../models/BonoConfig.model.js";
import BonoAnual from "../models/BonoAnual.model.js";
import Empleado from "../models/Empleado.model.js";
import Feedback from "../models/Feedback.model.js";
import { mixGlobal, bonoLineal, bonoTramos, montoBono } from "../lib/bono.js";
import { computeForEmployees } from "./dashboard.controller.js";

// --- CONFIG ---

export const getConfig = async (req, res, next) => {
    try {
        const { year } = req.params;
        const config = await BonoConfig.findOne({ anio: Number(year) });
        res.json(config || { anio: Number(year), isNew: true });
    } catch (err) {
        next(err);
    }
};

export const saveConfig = async (req, res, next) => {
    try {
        const { year } = req.params;
        const data = req.body;

        const config = await BonoConfig.findOneAndUpdate(
            { anio: Number(year) },
            { ...data, updatedBy: req.user._id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(config);
    } catch (err) {
        next(err);
    }
};

// --- CALCULATION ---

import { BonoService } from "../services/bono.service.js";
// ... (imports for other functions if needed, but calculateAll heavily used models directly)
// We need to keep imports used by other functions if they exist, or clean them up.
// Let's check the file content again to be safe about other functions.
// Actually I will replace the whole calculateAll function block.

export const calculateAll = async (req, res, next) => {
    try {
        const { year } = req.params;
        const { targetId, type } = req.query;

        const result = await BonoService.calculateAll(year, targetId, type);
        res.json(result);

    } catch (err) {
        // Simple error handling
        if (err.message === "No hay configuración para este año.") {
            return res.status(400).json({ message: err.message });
        }
        next(err);
    }
};

export const getResults = async (req, res, next) => {
    try {
        const { year } = req.params;
        const { area, sector } = req.query;
        const anio = Number(year);

        // 1. Get Config
        const config = await BonoConfig.findOne({ anio });
        if (!config) {
            // If no config, return empty or default
            return res.json([]);
        }

        // 2. Get All Active Employees (or filtered by area/sector if provided to optimize)
        // For now, get all and let computeForEmployees handle it, or filter here.
        // computeForEmployees expects IDs.
        const empleadosDocs = await Empleado.find({ estadoLaboral: "ACTIVO" }, "_id").lean();
        const ids = empleadosDocs.map(e => e._id);

        if (ids.length === 0) return res.json([]);

        // 3. Compute Metrics (Live)
        const metrics = await computeForEmployees(ids, anio);

        // 4. Map to Result Format
        const results = metrics.map(m => {
            const emp = m.empleado;
            const globalScore = m.scoreFinal || 0;

            // --- Apply Overrides Logic (Same as calculateAll) ---
            let activeConfig = { ...config.toObject() };

            if (config.overrides && config.overrides.length > 0) {
                // Empleado override
                const empOverride = config.overrides.find(o => o.type === "empleado" && String(o.targetId) === String(emp._id));
                if (empOverride) {
                    activeConfig.escala = { ...activeConfig.escala, ...empOverride.escala };
                    if (empOverride.bonoTarget !== undefined) activeConfig.bonoTarget = empOverride.bonoTarget;
                } else {
                    // Area override
                    const areaOverride = config.overrides.find(o => o.type === "area" && String(o.targetId) === String(emp.area?._id));
                    if (areaOverride) {
                        activeConfig.escala = { ...activeConfig.escala, ...areaOverride.escala };
                        if (areaOverride.bonoTarget !== undefined) activeConfig.bonoTarget = areaOverride.bonoTarget;
                    }
                }
            }

            // Calculate Bono Pct using ACTIVE config
            let bonoPct = 0;
            if (activeConfig.escala.tipo === "lineal") {
                bonoPct = bonoLineal({
                    global: globalScore,
                    minPct: activeConfig.escala.minPct,
                    maxPct: activeConfig.escala.maxPct,
                    umbral: activeConfig.escala.umbral
                }).pct;
            } else {
                bonoPct = bonoTramos({
                    global: globalScore,
                    tramos: activeConfig.escala.tramos
                }).pct;
            }

            // Calculate Amounts
            // Calculate Amounts
            const sueldo = emp.sueldoBase?.monto || 0;
            const bonoBase = sueldo * (activeConfig.bonoTarget || 0);
            const bonoFinal = bonoBase * bonoPct;

            // Get Feedback Comment (Defensive & Correct field)
            // m.feedbacks should be array, but safe check
            const safeFeedbacks = Array.isArray(m.feedbacks) ? m.feedbacks : [];
            const finalFeedback = safeFeedbacks.find(f => f.periodo === "FINAL");
            const feedbackComentario = finalFeedback?.comentario || ""; // Fixed field name

            return {
                _id: emp._id, // Virtual ID for the row
                empleado: {
                    _id: emp._id,
                    nombre: emp.nombre,
                    apellido: emp.apellido,
                    fotoUrl: emp.fotoUrl
                },
                snapshot: {
                    areaNombre: emp.area?.nombre || "Sin Área",
                    sectorNombre: emp.sector?.nombre || "Sin Sector",
                    puesto: emp.puesto,
                    fechaIngreso: emp.fechaIngreso,
                    sueldo: sueldo // Optional, for debug
                },
                pesos: {
                    objetivos: 70, // TODO: Get from config if dynamic
                    competencias: 30
                },
                resultado: {
                    objetivos: m.scoreObj,
                    competencias: m.scoreApt,
                    total: globalScore
                },
                feedbackComentario,
                bonoBase,
                bonoFinal,
                bonusConfig: {
                    target: activeConfig.bonoTarget || 0,
                    type: activeConfig.escala?.tipo || "N/A",
                    umbral: activeConfig.escala?.umbral || 0,
                    min: activeConfig.escala?.minPct || 0,
                    max: activeConfig.escala?.maxPct || 0,
                },
                estado: "calculado" // Indicate this is a live calculation
            };
        });

        // 5. Filter by Area/Sector if requested
        let filtered = results;
        if (area) filtered = filtered.filter(r => r.snapshot.areaNombre === area);

        res.json(filtered);

    } catch (err) {
        next(err);
    }
};


