import mongoose from 'mongoose';
import Empleado from '../models/Empleado.model.js';
import Plantilla from '../models/Plantilla.model.js';
import OverrideObjetivo from '../models/OverrideObjetivo.model.js';
import Sector from '../models/Sector.model.js';
import Evaluacion from "../models/Evaluacion.model.js";
import { generarHitos } from "../utils/generarHitos.js";

const asObjectId = (v) => new mongoose.Types.ObjectId(String(v));
const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

// Helper local para periodos (eliminado duplicado)

import Feedback from '../models/Feedback.model.js';



// Helper for Period comparison (matches EvaluacionFlujo frontend logic)
function getPeriodMonth(periodStr) {
  if (!periodStr) return 0;
  if (periodStr === "Q1") return 3;
  if (periodStr === "Q2") return 6;
  if (periodStr === "Q3") return 9;
  if (periodStr === "FINAL") return 12;

  const suffix = periodStr.slice(4); // Remove year "2025"?? No, usually "M01", "Q1". assuming strict format.
  // Backend generateHitos: "M01", "Q1".
  // EvaluacionFlujo format: periodStr.slice(4) assumes "2025Q1"? 
  // Let's stick to the simpler backend format: "M01", "Q1", "S1", "FINAL".

  // Actually, hitos in DB are usually "M01", etc.
  if (periodStr.startsWith("M")) {
    const m = parseInt(periodStr.slice(1));
    return m >= 9 ? m - 8 : m + 4; // Fiscal Year Sep-Aug logic?? 
    // Wait, the frontend says: "return m >= 9 ? m - 8 : m + 4;"
    // This implies Fiscal Year starting in Sept?
    // Let's copy it exactly.
  }
  if (periodStr.startsWith("Q")) {
    const q = parseInt(periodStr.slice(1));
    return q * 3;
  }
  if (periodStr === "FINAL") return 12;
  return 12;
}

export async function computeForEmployees(empleadoIds, anio) {
  if (!Array.isArray(empleadoIds) || empleadoIds.length === 0) return [];
  const ids = empleadoIds.map(asObjectId);

  const empleados = await Empleado.find({ _id: { $in: ids } })
    .populate("area")
    .populate("sector")
    .lean();

  const plantillas = await Plantilla.find({ year: Number(anio), activo: true }).lean();

  // overrides
  const overridesArr = await OverrideObjetivo.find({
    empleado: { $in: ids },
    year: Number(anio),
  }).lean();

  const overridesByEmp = new Map();
  for (const o of overridesArr) {
    const emp = String(o.empleado);
    const tpl = String(o.template);
    if (!overridesByEmp.has(emp)) overridesByEmp.set(emp, new Map());
    overridesByEmp.get(emp).set(tpl, o);
  }

  // evaluaciones
  const evals = await Evaluacion.find({
    empleado: { $in: ids },
    year: Number(anio),
  }).lean();

  // feedbacks
  const feedbacksArr = await Feedback.find({
    empleado: { $in: ids },
    year: Number(anio),
  }).lean();

  return await Promise.all(
    empleados.map(async (e) => {
      const empIdStr = String(e._id);
      const areaIdStr = e.area ? String(e.area._id ?? e.area) : null;
      const sectorIdStr = e.sector ? String(e.sector._id ?? e.sector) : null;

      const aplicables = plantillas.filter((p) => {
        if (!p.scopeType || !p.scopeId) return false;
        const scopeIdStr = String(p.scopeId);
        if (p.scopeType === "area" && areaIdStr && scopeIdStr === areaIdStr) return true;
        if (p.scopeType === "sector" && sectorIdStr && scopeIdStr === sectorIdStr) return true;
        if (p.scopeType === "empleado" && scopeIdStr === empIdStr) return true;
        return false;
      });

      const objetivosArr = [];
      const aptitudesArr = [];
      let sumPesoObj = 0,
        weightedProgressSum = 0;
      let sumPesoApt = 0,
        weightedAptScoreSum = 0;

      const empOverrides = overridesByEmp.get(empIdStr);

      // Filter feedbacks for this employee (Needed for Latest Logic)
      const empFeedbacks = feedbacksArr.filter(f => String(f.empleado) === empIdStr);

      for (const p of aplicables) {
        const tplIdStr = String(p._id);
        const ov = empOverrides ? empOverrides.get(tplIdStr) : null;
        if (ov && ov.excluido) continue;

        const basePeso = Number(p.pesoBase || 0);
        const peso = (ov && typeof ov.peso === "number")
          ? Number(ov.peso)
          : basePeso;

        // 🔹 Generar hitos con resultados ya guardados
        const hitos = await Promise.all(
          generarHitos(p).map(async (h) => {
            const evHito = evals.find(
              (ev) =>
                String(ev.empleado) === empIdStr &&
                String(ev.plantillaId) === tplIdStr &&
                ev.periodo === h.periodo
            );

            const metasCombinadas = (p.metas || []).map((m) => {
              const evaluada = evHito?.metasResultados?.find(
                (em) => String(em._id) === String(m._id) || em.nombre === m.nombre
              );
              return {
                _id: m._id,
                nombre: m.nombre || m.descripcion || "Meta",
                esperado: m.esperado ?? m.target ?? null,
                unidad: m.unidad ?? "",
                resultado: evaluada?.resultado ?? null,
                cumple: evaluada?.cumple ?? false,
              };
            });

            return {
              ...h,
              actual: evHito?.actual ?? null,
              comentario: evHito?.comentario ?? "",
              estado: evHito?.estado ?? null,
              metas: metasCombinadas,
            };
          })
        );



        const latestFeedback = [...empFeedbacks].sort((a, b) => {
          if (a.periodo === b.periodo) return 0;
          if (a.periodo === 'FINAL') return 1;
          if (b.periodo === 'FINAL') return -1;
          return a.periodo.localeCompare(b.periodo, undefined, { numeric: true });
        }).pop();

        const feedbackLimit = latestFeedback ? getPeriodMonth(latestFeedback.periodo) : 12; // Default to full year if no feedback? Or 0?
        // If no feedback exists, maybe show 0? Or show 'current status'?
        // User wants "result obtained in their feedback". If no feedback, maybe 0.
        // Let's default to full year IF no feedback is found, or maybe just 0.
        // But if we default to 12, we include future hitos.
        // Let's default to 0 (no data) if no feedback.
        const effectiveLimit = latestFeedback ? feedbackLimit : 0;

        if (p.tipo === "objetivo") {
          const isCumulative = p.metas?.some(m => m.acumulativa || m.modoAcumulacion === 'acumulativo');

          // Filter hitos up to the latest feedback period
          const relevantHitos = hitos.filter(h => getPeriodMonth(h.periodo) <= effectiveLimit);

          let progreso = 0;
          if (isCumulative) {
            const progs = relevantHitos.map(h => h.actual).filter(v => v !== null && v !== undefined);
            progreso = progs.length ? Math.max(...progs, 0) : 0;
          } else {
            // Average of VALID values only (Matches EvaluacionFlujo logic)
            const validValues = relevantHitos.map(h => h.actual).filter(v => v !== null && v !== undefined);
            if (validValues.length > 0) {
              progreso = Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
            } else {
              progreso = 0;
            }
          }

          // Apply Capping / PermiteOver Logic to match EvaluacionFlujo
          const hasPermiteOver = p.metas?.some(m => m.permiteOver) || p.hitos?.some(h => h.metas?.some(m => m.permiteOver));
          const effectiveProgreso = hasPermiteOver ? progreso : Math.min(progreso, 100);

          objetivosArr.push({
            _id: p._id,
            nombre: p.nombre,
            descripcion: p.descripcion || "",
            metodo: p.metodo,
            target: p.target,
            unidad: p.unidad,
            peso,
            progreso: effectiveProgreso,
            comentario: "",
            frecuencia: p.frecuencia,
            fechaLimite: p.fechaLimite,
            metas: p.metas || [],
            hitos,
          });

          sumPesoObj += peso;
          weightedProgressSum += (effectiveProgreso || 0) * peso;
        } else if (p.tipo === "aptitud") {
          // Lógica Aptitudes: Igual que objetivos, tomar la última evaluación (foto actual)
          // a menos que queramos promedio explícito. Por consistencia con el pedido del usuario, usamos la última.
          // Aptitudes: Same logic (Average of evaluated)
          // Lógica Aptitudes: Igual que objetivos, tomar la última evaluación (foto actual)
          // Filter hitos up to the latest feedback period
          const relevantHitos = hitos.filter(h => getPeriodMonth(h.periodo) <= effectiveLimit);

          const validApt = relevantHitos.map(h => h.actual).filter(v => v !== null && v !== undefined);
          let puntuacion = 0;
          if (validApt.length > 0) {
            puntuacion = Math.round(validApt.reduce((a, b) => a + b, 0) / validApt.length);
          }
          aptitudesArr.push({
            _id: p._id,
            nombre: p.nombre,
            descripcion: p.descripcion || "",
            metodo: p.metodo,
            peso,
            puntuacion,
            comentario: "",
            frecuencia: p.frecuencia,
            fechaLimite: p.fechaLimite,
            metas: p.metas || [],
            hitos,
          });

          sumPesoApt += peso;
          weightedAptScoreSum += puntuacion * peso;
        }



      }

      // 🔹 CALCULO STANDARD (Recalculado)
      // Ajuste para matching con frontend: dashboard usually overrides averages with "latest status" 
      // Si hay feedback con Score guardado, usamos ESE como verdad.

      let finalObjScore = 0;
      let finalAptScore = 0;

      // Buscar feedback con scores (prioridad FINAL > Q3 > Q2 > Q1)
      const periodOrder = ["FINAL", "Q3", "Q2", "Q1"];
      // Ordenamos feedbacks del empleado por relevancia de periodo
      const sortedFeedbacks = feedbacksArr
        .filter(f => String(f.empleado) === empIdStr && f.scores && (f.scores.global || f.scores.obj || f.scores.comp))
        .sort((a, b) => {
          const ia = periodOrder.indexOf(a.periodo);
          const ib = periodOrder.indexOf(b.periodo);
          // Si ia es menor index (ej FINAL=0 vs Q1=3), es mas relevante. 
          // Ojo: indexOf devuelve -1 si no esta. Asumimos validos.
          return ia - ib;
        });

      const bestFeedback = sortedFeedbacks[0]; // El más relevante

      if (bestFeedback && bestFeedback.scores) {
        // USA SCORES GUARDADOS
        finalObjScore = Number(bestFeedback.scores.obj || 0);
        finalAptScore = Number(bestFeedback.scores.comp || 0);
      } else {
        // FALLBACK A CALCULO PREVIO (Promedios / Acumulados de lo que haya)
        // Nota: El calculo original de abajo promedia hitos. 
        // Si queremos que coincida con "lo ultimo", deberiamos tomar el ultimo hito.
        // Pero por seguridad, mantenemos la logica de promedio ponderado si no hay feedback oficial.

        if (sumPesoObj > 0) {
          finalObjScore = weightedProgressSum / sumPesoObj;
        }
        if (sumPesoApt > 0) {
          finalAptScore = weightedAptScoreSum / sumPesoApt;
        }
      }

      // Formatting
      // finalObjScore y finalAptScore están en 0..100
      // mixGlobal usa base 100 también.

      const scoreObj = Number(finalObjScore.toFixed(2));
      const scoreApt = Number(finalAptScore.toFixed(2));

      // Importar mixGlobal si no está o replicar lógica simple (70/30 default)
      // Replicamos la logica de mixGlobal del bono.js para no importar cruzado si no se puede
      const pObj = 0.7;
      const pApt = 0.3;
      const scoreFinal = Number(((scoreObj * pObj) + (scoreApt * pApt)).toFixed(2));

      return {
        empleado: {
          _id: e._id,
          nombre: e.nombre,
          apellido: e.apellido,
          fotoUrl: e.fotoUrl,
          area: e.area ? { _id: e.area._id, nombre: e.area.nombre } : null,
          sector: e.sector ? { _id: e.sector._id, nombre: e.sector.nombre } : null,
        },
        snapshot: {
          puesto: e.puesto,
          fechaIngreso: e.fechaIngreso,
          areaNombre: e.area?.nombre,
          sectorNombre: e.sector?.nombre,
        },
        pesos: {
          objetivos: 70,
          competencias: 30,
        },
        resultado: {
          objetivos: scoreObj,
          competencias: scoreApt,
          total: scoreFinal,
        },
        // Info extra para UI de Bonos
        feedbackComentario: bestFeedback?.comentario || "", // Usamos el del feedback elegido o nada
        feedbackPeriodo: bestFeedback?.periodo || "",
      };
    })
  );
}


export async function dashByArea(req, res) {
  try {
    const { areaId } = req.params;
    const { anio } = req.query;
    const user = req.user;

    // 🔹 Si es director/RRHH y no se pasa areaId → traer todos
    if ((!areaId || areaId === "null") && (user.rol === "directivo" || user.isRRHH)) {
      const empleadosDocs = await Empleado.find({}, { _id: 1 }).lean();
      const ids = empleadosDocs.map((e) => e._id);
      const data = await computeForEmployees(ids, anio || new Date().getFullYear());
      return res.json(data);
    }

    if (!areaId || !isValidObjectId(areaId))
      return res.status(400).json({ message: "areaId inválido" });

    // 🔹 Verificación solo para referentes
    const esReferente = user.referenteAreas?.map(String).includes(String(areaId));
    if (!esReferente) {
      return res.status(403).json({ message: "No autorizado para esta área" });
    }

    const sectores = await Sector.find({ areaId: asObjectId(areaId) }, "_id").lean();
    const sectorIds = sectores.map((s) => s._id);

    const empleadosDocs = await Empleado.find(
      {
        $or: [{ area: asObjectId(areaId) }, { sector: { $in: sectorIds } }],
      },
      { _id: 1 }
    ).lean();

    const ids = empleadosDocs.map((e) => e._id);
    const data = await computeForEmployees(ids, anio || new Date().getFullYear());
    res.json(data);
  } catch (e) {
    console.error("dashByArea error:", e);
    return res.status(500).json({ message: e.message || "Error interno" });
  }
}

export const dashBySector = async (req, res) => {
  try {
    const { sectorId } = req.params;
    const { anio } = req.query;
    const user = req.user;

    if ((!sectorId || sectorId === "null") && (user.rol === "directivo" || user.isRRHH)) {
      const empleadosDocs = await Empleado.find({}, { _id: 1 }).lean();
      const ids = empleadosDocs.map((e) => e._id);
      const data = await computeForEmployees(ids, anio || new Date().getFullYear());
      return res.json(data);
    }

    if (!sectorId || !isValidObjectId(sectorId)) {
      return res.status(400).json({ message: "sectorId inválido" });

    }

    const empleadosDocs = await Empleado.find(
      { sector: asObjectId(sectorId) },
      { _id: 1 }
    ).lean();

    const ids = empleadosDocs.map((e) => e._id);
    const data = await computeForEmployees(ids, anio || new Date().getFullYear());

    res.json(data);
  } catch (err) {
    console.error("dashBySector error:", err);
    res.status(500).json({ message: err.message || "Error interno en dashBySector" });
  }
};

export const dashByEmpleado = async (req, res, next) => {
  try {
    const { empleadoId } = req.params;
    const year = Number(req.params.year || req.query.year || new Date().getFullYear());

    const empleado = await Empleado.findById(empleadoId)
      .populate("area")
      .populate("sector")
      .lean();

    if (!empleado) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    const areaId = empleado.area ? (empleado.area._id ?? empleado.area) : null;
    const sectorId = empleado.sector ? (empleado.sector._id ?? empleado.sector) : null;

    // 🔹 Traer plantillas del año para: área, sector y empleado
    const or = [];
    if (areaId) or.push({ scopeType: "area", scopeId: areaId });
    if (sectorId) or.push({ scopeType: "sector", scopeId: sectorId });
    or.push({ scopeType: "empleado", scopeId: empleado._id });

    const plantillas = await Plantilla.find({
      year: year,
      activo: true,
      $or: or
    }).lean();

    // 🔹 Overrides del empleado para ese año
    const overridesArr = await OverrideObjetivo.find({
      empleado: empleado._id,
      year: year,
    }).lean();
    const ovByTpl = new Map(overridesArr.map(o => [String(o.template), o]));

    // 🔹 Evaluaciones del empleado para ese año
    const evals = await Evaluacion.find({
      empleado: empleado._id,
      year: year,
    }).lean();

    const objetivosArr = [];
    const aptitudesArr = [];
    let sumPesoObj = 0, weightedProgressSum = 0;
    let sumPesoApt = 0, weightedAptScoreSum = 0;

    for (const p of plantillas) {
      const tplIdStr = String(p._id);
      const ov = ovByTpl.get(tplIdStr);
      if (ov?.excluido) continue;

      // Peso base (share 100% en empleado directo)
      const basePeso = Number(p.pesoBase || 0);
      const peso = (ov && typeof ov.peso === "number") ? Number(ov.peso) : basePeso;

      // Hitos + metas evaluadas
      const hitos = await Promise.all(
        generarHitos(p).map(async (h) => {
          const evHito = evals.find(
            (ev) =>
              String(ev.plantillaId) === tplIdStr &&
              ev.periodo === h.periodo
          );

          if (p.tipo === "aptitud") {
            console.log("DEBUG DASH APTITUD:", {
              tplId: tplIdStr,
              periodo: h.periodo,
              found: !!evHito,
              actual: evHito?.actual,
              escala: evHito?.escala
            });
          }

          const metasCombinadas = (p.metas || []).map((m) => {
            const evaluada = evHito?.metasResultados?.find(
              (em) => String(em._id) === String(m._id) || em.nombre === m.nombre
            );
            return {
              _id: m._id,
              nombre: m.nombre || m.descripcion || "Meta",
              esperado: m.esperado ?? m.target ?? null,
              unidad: m.unidad ?? "",
              resultado: evaluada?.resultado ?? null,
              cumple: evaluada?.cumple ?? false,
            };
          });

          return {
            ...h,
            actual: evHito?.actual ?? null,
            comentario: evHito?.comentario ?? "",
            estado: evHito?.estado ?? null,
            metas: metasCombinadas,
          };
        })
      );

      if (p.tipo === "objetivo") {
        const isCumulative = p.metas?.some(m => m.acumulativa || m.modoAcumulacion === 'acumulativo');

        let progreso = 0;
        if (isCumulative) {
          const progresos = hitos.map((h) => h.actual).filter(v => v !== null && v !== undefined);
          progreso = Math.max(...progresos, 0);
        } else {
          // Average of VALID values only
          const validValues = hitos.map(h => h.actual).filter(v => v !== null && v !== undefined);
          progreso = validValues.length ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length) : 0;
        }

        objetivosArr.push({
          _id: p._id,
          tipo: "objetivo",
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          metodo: p.metodo,
          target: p.target,
          unidad: p.unidad,
          peso,
          pesoBase: basePeso,
          progreso,
          comentario: "",
          frecuencia: p.frecuencia,
          fechaLimite: p.fechaLimite,
          metas: p.metas || [],
          hitos,
        });

        sumPesoObj += peso;
        weightedProgressSum += (progreso || 0) * peso;
      } else if (p.tipo === "aptitud") {
        // Lógica Aptitudes: Igual que objetivos, promedio valido
        const validApt = hitos.map(h => h.actual).filter(v => v !== null && v !== undefined);
        const puntuacion = validApt.length ? Math.round(validApt.reduce((a, b) => a + b, 0) / validApt.length) : 0;

        aptitudesArr.push({
          _id: p._id,
          tipo: "aptitud",
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          metodo: p.metodo,
          peso,
          pesoBase: basePeso,
          puntuacion,
          comentario: "",
          frecuencia: p.frecuencia,
          fechaLimite: p.fechaLimite,
          metas: p.metas || [],
          hitos,
        });

        sumPesoApt += peso;
        weightedAptScoreSum += puntuacion * peso;
      }
    }

    // Calculate sums of base weights
    const sumBasePesoObj = objetivosArr.reduce((acc, curr) => acc + (curr.pesoBase || 0), 0);
    const sumBasePesoApt = aptitudesArr.reduce((acc, curr) => acc + (curr.pesoBase || 0), 0);

    const scoreObj = sumBasePesoObj > 0 ? weightedProgressSum / sumBasePesoObj : 0;
    const scoreApt = sumBasePesoApt > 0 ? weightedAptScoreSum / sumBasePesoApt : 0;
    const scoreFinal = Math.round((0.7 * scoreObj + 0.3 * scoreApt) * 10) / 10;
    const bono = (objetivosArr.length || aptitudesArr.length) ? `${scoreFinal}%` : null;

    return res.json({
      empleado: {
        _id: empleado._id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        puesto: empleado.puesto,
        area: empleado.area ? { _id: empleado.area._id, nombre: empleado.area.nombre } : null,
        sector: empleado.sector ? { _id: empleado.sector._id, nombre: empleado.sector.nombre } : null,
      },
      objetivos: { count: objetivosArr.length, sumPeso: sumPesoObj, items: objetivosArr },
      aptitudes: { count: aptitudesArr.length, sumPeso: sumPesoApt, items: aptitudesArr },
      scoreObj, scoreApt, scoreFinal, bono,
    });
  } catch (err) {
    console.error("dashByEmpleado error:", err);
    next(err);
  }
};
