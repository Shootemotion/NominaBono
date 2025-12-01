import { calcularResultadoMeta } from "../lib/calculoMetas.js";
import { calcularScoreObjetivoDesdeMetas, calcularResultadoGlobalEmpleado } from "../lib/scoringGlobal.js";

export const simular = async (req, res) => {
    try {
        const { objetivos = [], aptitudes = [], pesoObj = 0.7, pesoApt = 0.3 } = req.body;

        // 1. Calcular Objetivos
        const objetivosCalculados = objetivos.map(obj => {
            const metasCalculadas = (obj.metas || []).map(meta => {
                // meta.registros debe ser [{ periodo: 'Q1', valor: 10 }, ...]
                const resultado = calcularResultadoMeta(meta, meta.registros || []);
                return {
                    ...meta,
                    ...resultado // scoreMeta, cumpleGlobal, periodos
                };
            });

            const scoreObjetivo = calcularScoreObjetivoDesdeMetas(metasCalculadas);

            return {
                ...obj,
                metas: metasCalculadas,
                actual: scoreObjetivo
            };
        });

        // 2. Calcular Aptitudes (si las hubiera)
        const aptitudesCalculadas = aptitudes.map(apt => ({
            ...apt,
            actual: Number(apt.valor) || 0
        }));

        // 3. Resultado Global
        const resumen = calcularResultadoGlobalEmpleado({
            objetivos: objetivosCalculados,
            aptitudes: aptitudesCalculadas,
            pesoObj,
            pesoApt
        });

        res.json({
            objetivos: objetivosCalculados,
            aptitudes: aptitudesCalculadas,
            resumen
        });

    } catch (error) {
        console.error("Error en simulación:", error);
        res.status(500).json({ message: "Error al realizar la simulación" });
    }
};
