import { jest } from "@jest/globals";

// --- Mock Models ---
jest.unstable_mockModule("../../src/models/Evaluacion.model.js", () => ({
    default: {
        find: jest.fn(),
    },
}));

// --- Import Service (Dynamic import for ESM) ---
const { EvaluacionService } = await import("../../src/services/evaluacion.service.js");
const Evaluacion = (await import("../../src/models/Evaluacion.model.js")).default;

describe("EvaluacionService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("pushTimeline", () => {
        test("Debe iniciar el array si no existe y agregar un evento", () => {
            const ev = {};
            const msg = { by: "user1", action: "TEST", note: "hola" };

            EvaluacionService.pushTimeline(ev, msg);

            expect(ev.timeline).toHaveLength(1);
            expect(ev.timeline[0].action).toBe("TEST");
            expect(ev.timeline[0].by).toBe("user1");
            expect(ev.timeline[0].at).toBeInstanceOf(Date);
        });
    });

    describe("prepararMetasPeriodo", () => {
        test("Debe retornar estructura vacía si no hay metas", () => {
            const result = EvaluacionService.prepararMetasPeriodo([], {});
            expect(result).toEqual({ metasProcesadas: [], scoreObjetivo: null });
        });

        test("Debe procesar metas simples (modo periodo)", () => {
            const metasInput = [
                {
                    metaId: "meta1",
                    nombre: "Ventas",
                    resultado: 100,
                    operador: ">=",
                    esperado: 100,
                    pesoMeta: 100
                }
            ];

            // Caso ideal: 100/100 >= 100% -> scoreMeta debería ser 100
            const { metasProcesadas, scoreObjetivo } = EvaluacionService.prepararMetasPeriodo(metasInput, {});

            expect(metasProcesadas).toHaveLength(1);
            expect(metasProcesadas[0].resultado).toBe(100);
            expect(metasProcesadas[0].cumple).toBe(true);
            // El scoreObjetivo depende de calculateScoreObjetivoDesdeMetas, asumimos que devuelve un número
            // dado que el pesoMeta es 100 y se cumplió.
            expect(typeof scoreObjetivo).toBe("number");
        });

        test("Debe sumar acumulados si modoAcumulacion es 'acumulativo'", () => {
            const metasInput = [
                {
                    metaId: "metaAcum",
                    nombre: " Acumulada",
                    resultado: 10,
                    modoAcumulacion: "acumulativo",
                    operador: ">=",
                    esperado: 50,
                    pesoMeta: 100
                }
            ];
            // Supongamos que ya traemos 30 de antes
            const acumulados = { "metaAcum": 30 };

            // Total = 10 (actual) + 30 (previo) = 40. Esperado 50. 
            // 40 < 50 => No cumple (si tolerancia es 0)

            const { metasProcesadas } = EvaluacionService.prepararMetasPeriodo(metasInput, acumulados);

            expect(metasProcesadas[0].cumple).toBe(false); // 40 vs 50
            // Nota: El objeto metasProcesadas NO guarda el valor acumulado en 'resultado', 
            // guarda el del periodo (10), pero el 'score' interno se calculó con 40.
        });
    });

    describe("getAcumuladosAnteriores", () => {
        test("Debe sumar resultados de evaluaciones anteriores", async () => {
            // Mock de Evaluacion.find
            // Supongamos 2 evaluaciones previas con la misma meta
            Evaluacion.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    {
                        metasResultados: [{ metaId: "m1", resultado: 10 }, { metaId: "m2", resultado: 5 }]
                    },
                    {
                        metasResultados: [{ metaId: "m1", resultado: 20 }]
                    }
                ])
            });

            const acumulados = await EvaluacionService.getAcumuladosAnteriores("plantilla1", "2025Q3", "emp1");

            expect(Evaluacion.find).toHaveBeenCalledWith(expect.objectContaining({
                plantillaId: "plantilla1",
                empleado: "emp1",
                periodo: { $lt: "2025Q3" }
            }));

            // m1: 10 + 20 = 30
            // m2: 5
            expect(acumulados).toEqual({
                "m1": 30,
                "m2": 5
            });
        });
    });
});
