import BonoConfig from "../models/BonoConfig.model.js";
import Feedback from "../models/Feedback.model.js";
import Empleado from "../models/Empleado.model.js";
import BonoAnual from "../models/BonoAnual.model.js";
import { computeForEmployees } from "../lib/scoringGlobal.js";
import { bonoLineal, bonoTramos } from "../lib/calculoBono.js";

export const BonoService = {
    /**
     * Calculates yearly bonus for a scope of employees
     */
    async calculateAll(year, targetId, type) {
        const anio = Number(year);

        // 1. Get Config
        const config = await BonoConfig.findOne({ anio });
        if (!config) {
            throw new Error("No hay configuración para este año.");
        }

        // 2. Determine Scope (Employees with FINAL Feedback logic)
        const feedbackFilter = {
            year: anio,
            periodo: "FINAL",
            estado: { $in: ["SENT", "PENDING_HR", "CLOSED", "ACKNOWLEDGED"] }
        };

        // Optimization: Filter at feedback level if possible
        if (targetId && type === 'empleado') {
            feedbackFilter.empleado = targetId;
        }

        const feedbacks = await Feedback.find(feedbackFilter, 'empleado updatedAt').lean();
        let empIds = feedbacks.map(f => f.empleado.toString());

        // Area Filter (if applicable)
        if (targetId && type === 'area') {
            const areaEmps = await Empleado.find({ area: targetId }, '_id').lean();
            const areaEmpSet = new Set(areaEmps.map(e => e._id.toString()));
            empIds = empIds.filter(id => areaEmpSet.has(id));
        }

        // De-duplicate IDs
        empIds = [...new Set(empIds)];

        if (empIds.length === 0) {
            return { count: 0, message: "No se encontraron empleados con feedback final para calcular.", debugs: [] };
        }

        // 3. Compute Metrics Bulk (Heavy Lifting)
        const metrics = await computeForEmployees(empIds, anio);

        const bulkOps = [];
        const debugs = [];

        // 4. Process Results (In Memory)
        for (const m of metrics) {
            const emp = m.empleado;
            if (!emp) continue;

            const globalScore = m.scoreFinal || 0;
            const feedbackDate = feedbacks.find(f => String(f.empleado) === String(emp._id))?.updatedAt;

            // --- Rules & Overrides ---
            let activeConfig = { ...config.toObject() };
            let configSource = "GLOBAL";

            if (config.overrides && config.overrides.length > 0) {
                // Empleado override?
                const empOverride = config.overrides.find(o => o.type === "empleado" && String(o.targetId) === String(emp._id));
                if (empOverride) {
                    activeConfig.escala = { ...activeConfig.escala, ...empOverride.escala };
                    if (empOverride.success) activeConfig.escala = empOverride.escala;
                    if (empOverride.bonoTarget !== undefined) activeConfig.bonoTarget = empOverride.bonoTarget;
                    configSource = "OVERRIDE_EMP";
                } else {
                    // Area override?
                    const areaOverride = config.overrides.find(o => o.type === "area" && String(o.targetId) === String(emp.area?._id));
                    if (areaOverride) {
                        activeConfig.escala = { ...activeConfig.escala, ...areaOverride.escala };
                        if (areaOverride.bonoTarget !== undefined) activeConfig.bonoTarget = areaOverride.bonoTarget;
                        configSource = "OVERRIDE_AREA";
                    }
                }
            }

            // --- Calculation ---
            let bonoPct = 0;
            let calcMeta = "";

            if (activeConfig.escala.tipo === "lineal") {
                const lin = bonoLineal({
                    global: globalScore,
                    minPct: activeConfig.escala.minPct,
                    maxPct: activeConfig.escala.maxPct,
                    umbral: activeConfig.escala.umbral
                });
                bonoPct = lin.pct;
                calcMeta = lin.meta;
            } else {
                const tr = bonoTramos({
                    global: globalScore,
                    tramos: activeConfig.escala.tramos
                });
                bonoPct = tr.pct;
                calcMeta = "tramos";
            }

            const sueldo = emp.sueldoBase?.monto || 0;
            const bonoBase = sueldo * (activeConfig.bonoTarget || 0);
            const bonoFinal = bonoBase * bonoPct;

            if (targetId) {
                debugs.push(`${emp.apellido}: Score=${globalScore} -> Pct=${bonoPct} ($${bonoFinal}) [Cfg: ${configSource}]`);
            }

            // Prepare Bulk Operation
            bulkOps.push({
                updateOne: {
                    filter: { empleado: emp._id, anio },
                    update: {
                        estado: "borrador",
                        snapshot: {
                            puesto: emp.puesto,
                            fechaCierre: feedbackDate || new Date(),
                            areaNombre: emp.area?.nombre,
                            sectorNombre: emp.sector?.nombre
                        },
                        bonoBase,
                        bonoFinal
                    },
                    upsert: true
                }
            });
        }

        // 5. Execute Bulk Write (1 Query)
        if (bulkOps.length > 0) {
            await BonoAnual.bulkWrite(bulkOps);
        }

        return {
            count: bulkOps.length,
            message: "Cálculo masivo finalizado exitosamente.",
            debugs: debugs.slice(0, 20)
        };
    }
};
