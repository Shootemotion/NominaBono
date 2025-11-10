import mongoose from 'mongoose';
import Empleado from '../models/Empleado.model.js';
import Plantilla from '../models/Plantilla.model.js';
import OverrideObjetivo from '../models/OverrideObjetivo.model.js';
import Sector from '../models/Sector.model.js';
import Evaluacion from "../models/Evaluacion.model.js";
import { generarHitos } from "../utils/generarHitos.js";

const asObjectId = (v) => new mongoose.Types.ObjectId(String(v));
const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

async function computeForEmployees(empleadoIds, anio) {
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
          if (p.scopeType === "empleado" && scopeIdStr === empIdStr)                   return true;
        return false;
      });

      const objetivosArr = [];
      const aptitudesArr = [];
      let sumPesoObj = 0,
        weightedProgressSum = 0;
      let sumPesoApt = 0,
        weightedAptScoreSum = 0;

      const empOverrides = overridesByEmp.get(empIdStr);

      for (const p of aplicables) {
        const tplIdStr = String(p._id);
        const ov = empOverrides ? empOverrides.get(tplIdStr) : null;
        if (ov && ov.excluido) continue;

          const basePeso = Number(p.pesoBase || 0);
  const peso = (ov && typeof ov.peso === "number")
    ? Number(ov.peso)
    : basePeso; // (si más adelante metés shares por participaciones, acá se multiplicaría)


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
              metas: metasCombinadas, // ✅ metas evaluadas por hito
            };
          })
        );

        if (p.tipo === "objetivo") {
          // progreso promedio de hitos
          const progresos = hitos.map((h) => h.actual ?? 0);
          const progreso = progresos.length
            ? Math.round(progresos.reduce((a, b) => a + b, 0) / progresos.length)
            : 0;

          objetivosArr.push({
            _id: p._id,
            nombre: p.nombre,
            descripcion: p.descripcion || "",
            metodo: p.metodo,
            target: p.target,
            unidad: p.unidad,
            peso,
            progreso,
            comentario: "",
            frecuencia: p.frecuencia,
            fechaLimite: p.fechaLimite,
            metas: hitos.flatMap((h) => h.metas || []), // ✅ ahora sí metas evaluadas
            hitos,
          });

          sumPesoObj += peso;
          weightedProgressSum += (progreso || 0) * peso;
        } else if (p.tipo === "aptitud") {
          const puntuaciones = hitos.map((h) => h.actual ?? 0);
          const puntuacion = puntuaciones.length
            ? Math.round(puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length)
            : 0;

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
            metas: hitos.flatMap((h) => h.metas || []), // ✅ metas evaluadas
            hitos,
          });

          sumPesoApt += peso;
          weightedAptScoreSum += puntuacion * peso;
        }
      }

      const scoreObj = sumPesoObj > 0 ? weightedProgressSum / sumPesoObj : 0;
      const scoreApt = sumPesoApt > 0 ? weightedAptScoreSum / sumPesoApt : 0;
      const scoreFinal = Math.round((0.8 * scoreObj + 0.2 * scoreApt) * 10) / 10;
      const bono =
        objetivosArr.length > 0 || aptitudesArr.length > 0 ? `${scoreFinal}%` : null;

      return {
        empleado: {
          _id: e._id,
          nombre: e.nombre,
          apellido: e.apellido,
          puesto: e.puesto,
          area: e.area ? { _id: e.area._id, nombre: e.area.nombre } : null,
          sector: e.sector ? { _id: e.sector._id, nombre: e.sector.nombre } : null,
        },
        objetivos: { count: objetivosArr.length, sumPeso: sumPesoObj, items: objetivosArr },
        aptitudes: { count: aptitudesArr.length, sumPeso: sumPesoApt, items: aptitudesArr },
        scoreObj,
        scoreApt,
        scoreFinal,
        bono,
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

    const areaId   = empleado.area   ? (empleado.area._id   ?? empleado.area)   : null;
    const sectorId = empleado.sector ? (empleado.sector._id ?? empleado.sector) : null;

    // 🔹 Traer plantillas del año para: área, sector y empleado
    const or = [];
    if (areaId)   or.push({ scopeType: "area",     scopeId: areaId   });
    if (sectorId) or.push({ scopeType: "sector",   scopeId: sectorId });
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
            metas: metasCombinadas,
          };
        })
      );

      if (p.tipo === "objetivo") {
        const progresos = hitos.map((h) => h.actual ?? 0);
        const progreso = progresos.length
          ? Math.round(progresos.reduce((a,b) => a+b, 0) / progresos.length)
          : 0;

        objetivosArr.push({
          _id: p._id,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          metodo: p.metodo,
          target: p.target,
          unidad: p.unidad,
          peso,
          progreso,
          comentario: "",
          frecuencia: p.frecuencia,
          fechaLimite: p.fechaLimite,
          metas: hitos.flatMap((h) => h.metas || []),
          hitos,
        });

        sumPesoObj += peso;
        weightedProgressSum += (progreso || 0) * peso;
      } else if (p.tipo === "aptitud") {
        const puntuaciones = hitos.map((h) => h.actual ?? 0);
        const puntuacion = puntuaciones.length
          ? Math.round(puntuaciones.reduce((a,b) => a+b, 0) / puntuaciones.length)
          : 0;

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
          metas: hitos.flatMap((h) => h.metas || []),
          hitos,
        });

        sumPesoApt += peso;
        weightedAptScoreSum += puntuacion * peso;
      }
    }

    const scoreObj   = sumPesoObj > 0 ? weightedProgressSum / sumPesoObj : 0;
    const scoreApt   = sumPesoApt > 0 ? weightedAptScoreSum / sumPesoApt : 0;
    const scoreFinal = Math.round((0.8 * scoreObj + 0.2 * scoreApt) * 10) / 10;
    const bono       = (objetivosArr.length || aptitudesArr.length) ? `${scoreFinal}%` : null;

    return res.json({
      empleado: {
        _id: empleado._id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        puesto: empleado.puesto,
        area:   empleado.area   ? { _id: empleado.area._id,   nombre: empleado.area.nombre }     : null,
        sector: empleado.sector ? { _id: empleado.sector._id, nombre: empleado.sector.nombre }   : null,
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