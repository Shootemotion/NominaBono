import Evaluacion from "../models/Evaluacion.model.js";
import {
    normalizarConfigMeta,
    calcularScorePeriodoMeta,
} from "../lib/calculoMetas.js";
import { calcularScoreObjetivoDesdeMetas } from "../lib/scoringGlobal.js";

export const EvaluacionService = {
    /**
     * Agrega un evento al timeline de la evaluación
     */
    pushTimeline(ev, { by, action, note, snapshot }) {
        ev.timeline = ev.timeline || [];
        ev.timeline.push({ at: new Date(), by, action, note, snapshot });
    },

    /**
     * Prepara las metas para un periodo, calculando scores y cumplimiento.
     */
    prepararMetasPeriodo(metasResultados = [], acumulados = {}) {
        if (!Array.isArray(metasResultados) || metasResultados.length === 0) {
            return { metasProcesadas: [], scoreObjetivo: null };
        }

        const metasConScore = metasResultados.map((m) => {
            // une params del frontend con defaults de la meta de plantilla
            const cfg = normalizarConfigMeta(m);

            // Lógica de acumulación
            let valorParaCalculo = Number(m.resultado) || 0;
            if (cfg.modoAcumulacion === "acumulativo") {
                const prev = acumulados[m.metaId] || 0;
                valorParaCalculo += prev;
            }

            // calcula scoreMeta (0..100/120) + cumple usando reconoceEsfuerzo, etc.
            const { score, cumple } = calcularScorePeriodoMeta(cfg, valorParaCalculo);

            return {
                metaId: m.metaId ?? null,
                nombre: m.nombre,
                unidad: m.unidad,
                operador: m.operador || ">=",
                esperado: m.esperado ?? m.target ?? null,

                pesoMeta: m.pesoMeta ?? null,
                reconoceEsfuerzo: cfg.reconoceEsfuerzo,
                permiteOver: cfg.permiteOver,
                tolerancia: cfg.tolerancia,
                modoAcumulacion: cfg.modoAcumulacion,
                acumulativa: m.acumulativa ?? false,
                reglaCierre: cfg.reglaCierre,

                resultado: m.resultado,
                cumple,
                // 👇 sólo para cálculo en memoria
                scoreMeta: score,
            };
        });

        const scoreObjetivo = calcularScoreObjetivoDesdeMetas(metasConScore);

        // sacamos scoreMeta antes de guardar
        const metasProcesadas = metasConScore.map(({ scoreMeta, ...rest }) => rest);

        return { metasProcesadas, scoreObjetivo };
    },

    /**
     * Busca evaluaciones anteriores para calcular acumulados
     */
    async getAcumuladosAnteriores(plantillaId, periodo, empleadoId) {
        const anio = Number(String(periodo).slice(0, 4));
        const siblings = await Evaluacion.find({
            plantillaId,
            year: anio,
            empleado: empleadoId,
            periodo: { $lt: periodo } // Períodos anteriores
        }).lean();

        const acumulados = {};
        siblings.forEach(ev => {
            ev.metasResultados?.forEach(m => {
                if (m.metaId) {
                    if (!acumulados[m.metaId]) acumulados[m.metaId] = 0;
                    acumulados[m.metaId] += Number(m.resultado) || 0;
                }
            });
        });
        return acumulados;
    }
};
