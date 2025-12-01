// src/lib/recalculoEmpleado.js

import mongoose from "mongoose";
import Evaluacion from "../models/Evaluacion.model.js";
import Plantilla from "../models/Plantilla.model.js";

import {
  calcularResultadoMeta,
} from "./calculoMetas.js";

import {
  calcularScoreObjetivoDesdeMetas,
  calcularResultadoGlobalEmpleado,
} from "./scoringGlobal.js";

const asId = (v) => (v ? String(v) : null);

/**
 * Heavy:
 * Recalcula TODO el año de un empleado:
 *  - metas → resultado anual por meta
 *  - objetivos → score por objetivo (0..100)
 *  - aptitudes → usa actual tal cual
 *  - global → mezcla objetivos / aptitudes (70/30 por defecto)
 *
 * params:
 *  - empleadoId (ObjectId o string)
 *  - year (fiscal, ej: 2025)
 *  - pesoObj / pesoApt (mezcla global, ej: 0.7 / 0.3)
 */
export async function recalcularAnualEmpleado({
  empleadoId,
  year,
  pesoObj = 0.7,
  pesoApt = 0.3,
}) {
  if (!empleadoId) {
    throw new Error("recalcularAnualEmpleado: falta empleadoId");
  }
  const anio = Number(year || new Date().getFullYear());

  // 1) Traemos TODAS las evaluaciones del año para el empleado
  const evals = await Evaluacion.find({
    empleado: new mongoose.Types.ObjectId(String(empleadoId)),
    year: anio,
  })
    .populate("plantillaId", "tipo nombre metas pesoBase")
    .lean();

  // Maps intermedios
  const objetivosMap = new Map(); // key = plantillaId
  const aptitudesList = [];

  for (const ev of evals) {
    const tpl = ev.plantillaId || {};
    const tipo = tpl.tipo || "objetivo";
    const plantillaKey = asId(tpl._id) || asId(ev.plantillaId);

    // === APTITUDES: usamos el actual directo ===
    if (tipo === "aptitud") {
      aptitudesList.push({
        evaluacionId: ev._id,
        plantillaId: plantillaKey,
        nombre: tpl.nombre || ev.nombre || "(sin nombre)",
        pesoBase:
          tpl.pesoBase !== undefined
            ? Number(tpl.pesoBase)
            : Number(ev.pesoBase ?? 0),
        actual: Number(ev.actual ?? ev.escala ?? 0) || 0,
      });
      continue;
    }

    // === OBJETIVOS: vamos a agrupar metas por plantilla + meta ===
    if (!objetivosMap.has(plantillaKey)) {
      objetivosMap.set(plantillaKey, {
        plantillaId: plantillaKey,
        nombre: tpl.nombre || ev.nombre || "(sin nombre)",
        pesoBase: Number(tpl.pesoBase ?? ev.pesoBase ?? 0) || 0,
        metasConfig: Array.isArray(tpl.metas) ? tpl.metas : [],
        metasMap: new Map(), // keyMeta → { metaId, nombre, config, registros[] }
      });
    }

    const grupo = objetivosMap.get(plantillaKey);
    const metasEv = Array.isArray(ev.metasResultados) ? ev.metasResultados : [];

    for (const mr of metasEv) {
      const metaId = asId(mr.metaId);
      const keyMeta = metaId || `${mr.nombre || ""}::${mr.unidad || ""}`;

      // Buscar config original en Plantilla.metas por _id si existe
      let entry = grupo.metasMap.get(keyMeta);
      if (!entry) {
        let metaCfg = grupo.metasConfig.find(
          (mt) => metaId && asId(mt._id) === metaId
        );

        if (!metaCfg) {
          // Fallback: construyo config desde lo que trae metasResultados
          metaCfg = {
            nombre: mr.nombre,
            unidad: mr.unidad,
            esperado: mr.esperado ?? mr.target ?? null,
            operador: mr.operador,
            pesoMeta: mr.pesoMeta,
            reconoceEsfuerzo: mr.reconoceEsfuerzo,
            permiteOver: mr.permiteOver,
            tolerancia: mr.tolerancia,
            modoAcumulacion: mr.modoAcumulacion,
            acumulativa: mr.acumulativa,
            reglaCierre: mr.reglaCierre,
          };
        }

        entry = {
          metaId,
          nombre: mr.nombre,
          config: metaCfg,
          registros: [],
        };
        grupo.metasMap.set(keyMeta, entry);
      }

      entry.registros.push({
        periodo: ev.periodo,
        valor: mr.resultado,
      });
    }
  }

  // 2) Convertimos los objetivosMap en una lista “bonita” con cálculo anual
  const objetivosList = [];

  for (const [, grupo] of objetivosMap.entries()) {
    const metasDetalladas = [];

    for (const [, metaEntry] of grupo.metasMap.entries()) {
      const { config, registros, metaId, nombre } = metaEntry;

      const { scoreMeta, cumpleGlobal, periodos } = calcularResultadoMeta(
        config,
        registros
      );

      metasDetalladas.push({
        metaId,
        nombre,
        ...config,
        registros: periodos,
        scoreMeta,
        cumpleGlobal,
      });
    }

    const scoreObjetivo = calcularScoreObjetivoDesdeMetas(metasDetalladas);

    objetivosList.push({
      plantillaId: grupo.plantillaId,
      nombre: grupo.nombre,
      pesoBase: grupo.pesoBase,
      actual: scoreObjetivo, // este es el 0..100 final del objetivo
      metas: metasDetalladas,
    });
  }

  // 3) Global: mezcla objetivos / aptitudes (70/30 por defecto)
  const resumen = calcularResultadoGlobalEmpleado({
    objetivos: objetivosList,
    aptitudes: aptitudesList,
    pesoObj,
    pesoApt,
  });

  return {
    empleado: empleadoId,
    year: anio,
    objetivos: objetivosList,
    aptitudes: aptitudesList,
    resumen,
    // opcional: podría devolverte también las evaluaciones crudas
    // evals,
  };
}
