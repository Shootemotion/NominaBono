// src/lib/scoringGlobal.js

import { mixGlobal } from "./bono.js";

/**
 * Calcula el % de una meta individual a partir de metasResultados
 * YA evaluadas, es decir, cada meta trae scoreMeta (0..100/120).
 *
 * metas: [{ scoreMeta, pesoMeta? }]
 */
export function calcularScoreObjetivoDesdeMetas(metas = []) {
    if (!Array.isArray(metas) || metas.length === 0) return 0;

    const pesos = metas.map((m) => Number(m.pesoMeta ?? 0));
    const tienePesos = pesos.some((p) => p > 0);
    const totalPeso = pesos.reduce((a, b) => a + b, 0) || 0;

    if (tienePesos && totalPeso > 0) {
        const num = metas.reduce(
            (acc, m, i) => acc + (Number(m.scoreMeta ?? 0) * (pesos[i] || 0)),
            0
        );
        return +(num / totalPeso).toFixed(2);
    }

    const num = metas.reduce((acc, m) => acc + Number(m.scoreMeta ?? 0), 0);
    return +(num / metas.length).toFixed(2);
}

/**
 * items: lista de objetivos o aptitudes de la persona.
 * Cada item:
 *  - actual: número 0..100 (resultado final objetivo/aptitud)
 *  - pesoBase u otro peso (ej: override)
 */
export function calcularScoreBloque(items = []) {
    if (!Array.isArray(items) || items.length === 0) return 0;

    const pesos = items.map((it) => Number(it.pesoBase ?? it.peso ?? 0));
    const tienePesos = pesos.some((p) => p > 0);
    const totalPeso = pesos.reduce((a, b) => a + b, 0) || 0;

    if (tienePesos && totalPeso > 0) {
        const num = items.reduce(
            (acc, it, i) => acc + (Number(it.actual ?? 0) * (pesos[i] || 0)),
            0
        );
        return +(num / totalPeso).toFixed(2);
    }

    const num = items.reduce((acc, it) => acc + Number(it.actual ?? 0), 0);
    return +(num / items.length).toFixed(2);
}

/**
 * objetivos: evaluaciones de tipo "objetivo" con actual 0..100
 * aptitudes: evaluaciones de tipo "aptitud" con actual 0..100
 * pesoObj / pesoApt: mezcla global (ej 0.7 / 0.3)
 */
export function calcularResultadoGlobalEmpleado({
    objetivos = [],
    aptitudes = [],
    pesoObj = 0.7,
    pesoApt = 0.3,
}) {
    const scoreObj = calcularScoreBloque(objetivos); // 0..100
    const scoreApt = calcularScoreBloque(aptitudes); // 0..100

    const global = mixGlobal({
        obj: scoreObj,
        apt: scoreApt,
        pesos: { obj: pesoObj, apt: pesoApt },
    });

    return {
        objetivos: scoreObj,
        aptitudes: scoreApt,
        global,
    };
}
