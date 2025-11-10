// src/lib/evaluarCumple.js

/**
 * Evalúa el % de cumplimiento de una meta puntual.
 * @param {number|boolean|null} resultado - Valor obtenido.
 * @param {number|null} esperado - Valor objetivo.
 * @param {string} operador - Operador (">=", ">", "<=", "<", "==", "!=").
 * @param {string} unidad - "Cumple/No Cumple" | "Porcentual" | "Numerico".
 * @returns {number} - Porcentaje de cumplimiento (0–100).
 */
export function calcularPorcentajeMeta(resultado, esperado, operador = ">=", unidad = "Numerico") {
  if (unidad === "Cumple/No Cumple") {
    return resultado ? 100 : 0;
  }
  if (resultado == null || esperado == null) return 0;

  const r = Number(resultado);
  const e = Number(esperado);

  switch (operador) {
    case ">=": return r >= e ? 100 : Math.min((r / e) * 100, 100);
    case ">":  return r >  e ? 100 : Math.min((r / e) * 100, 100);
    case "<=": return r <= e ? 100 : Math.min((e / (r || 1)) * 100, 100);
    case "<":  return r <  e ? 100 : Math.min((e / (r || 1)) * 100, 100);
    case "==": return r === e ? 100 : 0;
    case "!=": return r !== e ? 100 : 0;
    default:   return 0;
  }
}

export function evaluarCumple(resultado, esperado, operador = ">=", unidad = "Numerico") {
  return calcularPorcentajeMeta(resultado, esperado, operador, unidad) === 100;
}

export function calcularResultadoGlobal(metas) {
  if (!metas || metas.length === 0) return 0;

  let totalPeso = 0;
  let totalValor = 0;

  for (const m of metas) {
    const peso = m.peso ?? 1;
    if (m.resultado != null) {
      const porcentaje = calcularPorcentajeMeta(
        m.resultado,
        m.esperado,
        m.operador,
        m.unidad
      );
      console.debug("[calcularResultadoGlobal] meta:", m.nombre, {
        resultado: m.resultado,
        esperado: m.esperado,
        operador: m.operador,
        unidad: m.unidad,
        porcentaje,
        peso,
      });
      totalValor += porcentaje * peso;
      totalPeso += peso;
    }
  }

  if (totalPeso === 0) return 0;

  const final = Math.round((totalValor / totalPeso) * 10) / 10;
  console.debug("[calcularResultadoGlobal] totalValor:", totalValor, "totalPeso:", totalPeso, "final:", final);
  return final;
}
