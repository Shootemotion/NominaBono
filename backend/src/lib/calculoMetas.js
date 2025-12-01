// src/lib/calculoMetas.js

// Normaliza 0..100 y opcionalmente permite over hasta max
export const clamp = (v, max = 100) =>
  Math.max(0, Math.min(max, Number(v) || 0));

/**
 * Normaliza la config de una meta desde Plantilla o metasResultados.
 *
 * metaConfig:
 *  - unidad: "Cumple/No Cumple" | "Porcentual" | "Numerico"
 *  - esperado / target
 *  - reconoceEsfuerzo
 *  - permiteOver
 *  - tolerancia
 *  - modoAcumulacion: "periodo" | "acumulativo"
 *  - reglaCierre: "promedio" | "umbral_periodos" | "cierre_unico"
 *  - umbralPeriodos (opcional)
 *  - maxOver (opcional)
 */
export function normalizarConfigMeta(metaConfig = {}) {
  const rawUnidad = metaConfig.unidad || "Porcentual";
  const u = String(rawUnidad).toLowerCase();

  let tipoUnidad = "numerico"; // default
  if (u.includes("cumple")) tipoUnidad = "binario";
  else if (u.startsWith("porc")) tipoUnidad = "porcentual";

  const esperado =
    metaConfig.esperado !== undefined
      ? Number(metaConfig.esperado)
      : metaConfig.target !== undefined
      ? Number(metaConfig.target)
      : 0;

  const reconoceEsfuerzo = !!metaConfig.reconoceEsfuerzo;
  const permiteOver = !!metaConfig.permiteOver;
  const tolerancia = Number(metaConfig.tolerancia ?? 0) || 0;

  const modoAcumulacion = metaConfig.modoAcumulacion || "periodo";
  const reglaCierre = metaConfig.reglaCierre || "promedio";

  const umbralPeriodos =
    Number(metaConfig.umbralPeriodos ?? metaConfig.umbralDePeriodos ?? 0) || 0;

  const maxOver = permiteOver
    ? Number(metaConfig.maxOver ?? 120) || 120
    : 100;

  return {
    rawUnidad,
    tipoUnidad, // "porcentual" | "numerico" | "binario"
    esperado: esperado > 0 ? esperado : 0,
    reconoceEsfuerzo,
    permiteOver,
    tolerancia,
    modoAcumulacion, // "periodo" | "acumulativo"
    reglaCierre, // "promedio" | "umbral_periodos" | "cierre_unico"
    umbralPeriodos,
    maxOver,
  };
}

/**
 * Calcula score + cumple para UN solo valor de la meta (un período).
 *
 * cfg: resultado de normalizarConfigMeta
 * valorEvaluado: lo que cargó el jefe en este hito
 *
 * Devuelve:
 *  { score: number (0..100/120), cumple: boolean }
 */
export function calcularScorePeriodoMeta(cfg, valorEvaluado) {
  // 1) Binario (Cumple/No Cumple)
  if (cfg.tipoUnidad === "binario") {
    const valBool = !!valorEvaluado;
    return {
      score: valBool ? 100 : 0,
      cumple: valBool,
    };
  }

  const esperado = cfg.esperado > 0 ? cfg.esperado : 0;
  const valNum = Number(valorEvaluado) || 0;
  const tol = cfg.tolerancia || 0;

  // 2) Sin reconocimiento de esfuerzo → todo o nada
  //    Ej: meta 80, valor 75, tol 2 → 75+2 < 80 → 0%
  if (!cfg.reconoceEsfuerzo) {
    const cumple = valNum + tol >= esperado;
    const score = cumple ? 100 : 0;
    return { score, cumple };
  }

  // 3) Con reconocimiento de esfuerzo → proporcional vs esperado
  //    Ej: esperado 80, valor 75 → (75/80)*100 = 93.75
  let score = 0;
  if (esperado > 0) {
    score = (valNum / esperado) * 100;
  }
  score = clamp(score, cfg.maxOver);

  const cumple = valNum + tol >= esperado;

  return { score, cumple };
}

/**
 * Versión “anual” opcional: calcula resultado global de una meta
 * a lo largo de varios períodos.
 *
 * metaConfig: config de la meta
 * registros: [{ periodo, valor }]
 */
export function calcularResultadoMeta(metaConfig = {}, registros = []) {
  const cfg = normalizarConfigMeta(metaConfig);

  if (!Array.isArray(registros) || registros.length === 0) {
    return {
      scoreMeta: 0,
      cumpleGlobal: false,
      periodos: [],
    };
  }

  const sorted = [...registros].sort((a, b) =>
    String(a.periodo).localeCompare(String(b.periodo))
  );

  let acumuladoValor = 0;

  const periodosCalc = sorted.map((reg) => {
    const valorCrudo = reg.valor;
    let valorEvaluado;

    if (cfg.modoAcumulacion === "acumulativo") {
      if (cfg.tipoUnidad === "binario") {
        acumuladoValor += valorCrudo ? 1 : 0;
      } else {
        acumuladoValor += Number(valorCrudo) || 0;
      }
      valorEvaluado = acumuladoValor;
    } else {
      // "periodo"
      if (cfg.tipoUnidad === "binario") {
        valorEvaluado = !!valorCrudo;
      } else {
        valorEvaluado = Number(valorCrudo) || 0;
      }
    }

    const { score, cumple } = calcularScorePeriodoMeta(cfg, valorEvaluado);

    return {
      periodo: reg.periodo,
      valor: valorCrudo,
      valorEvaluado,
      score,
      cumple,
    };
  });

  // Regla de cierre
  let scoreMeta = 0;
  let cumpleGlobal = false;

  if (cfg.reglaCierre === "cierre_unico") {
    const last = periodosCalc[periodosCalc.length - 1];
    scoreMeta = last?.score ?? 0;
    cumpleGlobal = !!last?.cumple;
  } else if (cfg.reglaCierre === "umbral_periodos") {
    const total = periodosCalc.length;
    const cumplidos = periodosCalc.filter((p) => p.cumple).length;
    const umbralNecesario = cfg.umbralPeriodos || 0;

    cumpleGlobal = cumplidos >= umbralNecesario;
    scoreMeta = total > 0 ? (cumplidos / total) * 100 : 0;
  } else {
    // "promedio"
    const totalScore = periodosCalc.reduce((acc, p) => acc + p.score, 0);
    scoreMeta = periodosCalc.length
      ? totalScore / periodosCalc.length
      : 0;

    cumpleGlobal = scoreMeta >= 100 || periodosCalc.some((p) => p.cumple);
  }

  return {
    scoreMeta: +scoreMeta.toFixed(2),
    cumpleGlobal,
    periodos: periodosCalc,
  };
}
