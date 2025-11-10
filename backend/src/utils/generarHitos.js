// backend/src/utils/generarHitos.js

/**
 * Genera los hitos de seguimiento en base a la frecuencia y fecha límite.
 *
 * @param {Object} plantilla - Documento de plantilla
 * @param {String} plantilla.frecuencia - "mensual" | "trimestral" | "semestral" | "anual"
 * @param {Date|String} plantilla.fechaLimite - Fecha de inicio / primera entrega
 * @returns {Array<{ fecha: String, periodo: String }>}
 */
export function generarHitos(plantilla) {
  if (!plantilla?.fechaLimite || !plantilla?.frecuencia) return [];

  const start = new Date(plantilla.fechaLimite);
  const hitos = [];

  const pushHito = (fecha, idx) => {
    const yearReal = fecha.getFullYear();
    let periodo;

    switch (plantilla.frecuencia) {
      case "mensual":
        periodo = `${yearReal}M${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "trimestral":
        periodo = `${yearReal}Q${idx}`;
        break;
      case "semestral":
        periodo = `${yearReal}S${idx}`;
        break;
      case "anual":
        periodo = `${yearReal}A${idx}`; // 🔹 así no se confunde con "year"
        break;
      default:
        periodo = `${yearReal}`;
    }

    hitos.push({
      fecha: fecha.toISOString().slice(0, 10), // YYYY-MM-DD
      periodo,
    });
  };

  if (plantilla.frecuencia === "anual") {
    pushHito(start, 1);
  } else if (plantilla.frecuencia === "semestral") {
    for (let i = 0; i < 2; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i * 6);
      pushHito(d, i + 1);
    }
  } else if (plantilla.frecuencia === "trimestral") {
    for (let i = 0; i < 4; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i * 3);
      pushHito(d, i + 1);
    }
  } else if (plantilla.frecuencia === "mensual") {
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      pushHito(d, i + 1);
    }
  }

  return hitos;
}
