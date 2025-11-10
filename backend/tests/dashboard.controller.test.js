import { jest } from "@jest/globals";

// --- Mock de computeForEmployees ---
// 👇 En ESM usamos await import, no requireActual
jest.unstable_mockModule("../src/controllers/dashboard.controller.js", async () => {
  const original = await import("../src/controllers/dashboard.controller.js");
  return {
    ...original,
    computeForEmployees: jest.fn().mockResolvedValue([{ empleado: { _id: "emp1" } }]),
  };
});

// Ahora importamos los exports ya mockeados
const { dashByArea, dashBySector, dashByEmpleado } = await import("../src/controllers/dashboard.controller.js");

// --- Mocks de modelos ---
jest.mock("../src/models/Empleado.model.js", () => ({
  default: {
    findById: jest.fn().mockResolvedValue({ _id: "emp1", area: "area123", sector: "sect123" }),
    find: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../src/models/Sector.model.js", () => ({
  default: {
    find: jest.fn().mockResolvedValue([]),
  },
}));

// Helpers
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();
const makeReq = (user, params = {}, query = {}) => ({ user, params, query });

// --- Tests ---
describe("Autorización Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Super user accede a cualquier área", async () => {
    const req = makeReq({ isSuper: true }, { areaId: "area123" });
    const res = mockRes();

    await dashByArea(req, res, mockNext);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test("Referente de área puede acceder a su área", async () => {
    const req = makeReq({ referenteAreas: ["area123"] }, { areaId: "area123" });
    const res = mockRes();

    await dashByArea(req, res, mockNext);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test("Referente de área no puede acceder a otra área", async () => {
    const req = makeReq({ referenteAreas: ["area999"] }, { areaId: "area123" });
    const res = mockRes();

    await dashByArea(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("Referente de sector puede acceder a su sector", async () => {
    const req = makeReq({ referenteSectors: ["sect123"] }, { sectorId: "sect123" });
    const res = mockRes();

    await dashBySector(req, res, mockNext);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test("Referente de sector no puede acceder a otro sector", async () => {
    const req = makeReq({ referenteSectors: ["sect999"] }, { sectorId: "sect123" });
    const res = mockRes();

    await dashBySector(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("Referente de área puede acceder a un empleado de su área", async () => {
    const req = makeReq({ referenteAreas: ["area123"] }, { empleadoId: "emp1" });
    const res = mockRes();

    await dashByEmpleado(req, res, mockNext);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test("Referente sin permisos no puede acceder a empleado fuera de su área/sector", async () => {
    const req = makeReq({ referenteAreas: ["area999"], referenteSectors: ["sect999"] }, { empleadoId: "emp1" });
    const res = mockRes();

    await dashByEmpleado(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
