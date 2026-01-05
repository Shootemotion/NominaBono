import { jest } from "@jest/globals";

// --- Mocks ---
jest.unstable_mockModule("../../src/models/BonoConfig.model.js", () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule("../../src/models/Feedback.model.js", () => ({ default: { find: jest.fn() } }));
jest.unstable_mockModule("../../src/models/Empleado.model.js", () => ({ default: { find: jest.fn() } }));
jest.unstable_mockModule("../../src/models/BonoAnual.model.js", () => ({ default: { bulkWrite: jest.fn() } }));

jest.unstable_mockModule("../../src/lib/scoringGlobal.js", () => ({
    computeForEmployees: jest.fn()
}));

// --- Imports ---
const { BonoService } = await import("../../src/services/bono.service.js");
const BonoConfig = (await import("../../src/models/BonoConfig.model.js")).default;
const Feedback = (await import("../../src/models/Feedback.model.js")).default;
const Empleado = (await import("../../src/models/Empleado.model.js")).default;
const BonoAnual = (await import("../../src/models/BonoAnual.model.js")).default;
const { computeForEmployees } = await import("../../src/lib/scoringGlobal.js");

describe("BonoService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Debe lanzar error si no hay config", async () => {
        BonoConfig.findOne.mockResolvedValue(null);
        await expect(BonoService.calculateAll(2025)).rejects.toThrow("No hay configuración");
    });

    test("Debe omitir cálculo si no hay empleados con feedback", async () => {
        BonoConfig.findOne.mockResolvedValue({ toObject: () => ({}) });
        Feedback.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }); // 0 feedbacks

        const result = await BonoService.calculateAll(2025);
        expect(result.count).toBe(0);
        expect(BonoAnual.bulkWrite).not.toHaveBeenCalled();
    });

    test("Debe calcular bono Base (Lineal) correctamente", async () => {
        // 1. Config
        const mockConfig = {
            anio: 2025,
            bonoTarget: 1.0, // 1 sueldo
            escala: {
                tipo: "lineal",
                minPct: 0,
                maxPct: 1, // 100%
                umbral: 70 // score < 70 => 0
            },
            overrides: [],
            toObject: function () { return this; }
        };
        BonoConfig.findOne.mockResolvedValue(mockConfig);

        // 2. Feedbacks
        Feedback.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ empleado: "emp1" }])
        });

        // 3. Score Mock (80 puntos)
        computeForEmployees.mockResolvedValue([{
            empleado: { _id: "emp1", sueldoBase: { monto: 1000 }, area: { _id: "area1" } },
            scoreFinal: 80
        }]);

        // Ejecutar
        await BonoService.calculateAll(2025);

        // Verification
        // Score 80, Umbral 70.
        // Calculo lineal (simplificado en test, asumiendo bonoLineal funciona, o testeando el resultado final)
        // La funcion real bonoLineal deberia darnos un pct. 
        // Si min=0, max=100 (1.0), umbral=70.
        // 80 es > 70.
        // Esperamos que bulkWrite sea llamado con un update correcto.

        expect(BonoAnual.bulkWrite).toHaveBeenCalledTimes(1);
        const ops = BonoAnual.bulkWrite.mock.calls[0][0];
        expect(ops).toHaveLength(1);

        const update = ops[0].updateOne.update;
        expect(update.bonoBase).toBe(1000); // 1.0 * 1000

        // El pct exacto depende de la implementacion de bonoLineal en lib, 
        // pero sabemos que > 0.
        expect(update.bonoFinal).toBeGreaterThan(0);
    });

    test("Debe aplicar Override de Empleado", async () => {
        // Config con override para emp1 que duplica el bonoTarget
        const mockConfig = {
            anio: 2025,
            bonoTarget: 1.0,
            escala: { tipo: "lineal", minPct: 0, maxPct: 1, umbral: 0 },
            overrides: [
                { type: "empleado", targetId: "emp1", bonoTarget: 2.0, escala: { tipo: "lineal" } }
            ],
            toObject: function () { return this; }
        };
        BonoConfig.findOne.mockResolvedValue(mockConfig);

        Feedback.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ empleado: "emp1" }]) });

        computeForEmployees.mockResolvedValue([{
            empleado: { _id: "emp1", sueldoBase: { monto: 1000 } },
            scoreFinal: 100
        }]);

        await BonoService.calculateAll(2025);

        const ops = BonoAnual.bulkWrite.mock.calls[0][0];
        const update = ops[0].updateOne.update;

        // BonoBase debe ser 2000 (sueldo 1000 * bonoTarget override 2.0)
        expect(update.bonoBase).toBe(2000);
    });
});
