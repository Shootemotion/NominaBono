// src/services/assignments.js
import ObjectiveTemplate from "../models/ObjectiveTemplate.js";
import EmployeeSector from "../models/EmployeeSector.js";
import EmployeeObjectiveOverride from "../models/EmployeeObjectiveOverride.js";
import Empleado from "../models/Empleado.js";

export async function computeEmployeeAssignments({ employeeId, year }) {
  const empleado = await Empleado.findById(employeeId)
    .populate("area")
    .populate("sector")
    .lean();

  if (!empleado) throw new Error("Empleado no encontrado");

  // 1) Participaciones por sector (si no hay, asumir 100% en su sector principal)
  let participaciones = await EmployeeSector.find({ empleadoId: employeeId, year }).lean();
  if (!participaciones.length && empleado.sector?._id) {
    participaciones = [{ sectorId: empleado.sector._id, year, participation: 100 }];
  }

  const sectorIds = participaciones.map(p => p.sectorId);
  const areaId = empleado.area?._id || null;

  // 2) Traer plantillas del año (de sus sectores + del área)
  const templates = await ObjectiveTemplate.find({
    year,
    activo: true,
    $or: [
      { scopeType: "sector", scopeId: { $in: sectorIds } },
      ...(areaId ? [{ scopeType: "area", scopeId: areaId }] : [])
    ]
  }).lean();

  // 3) Overrides del empleado
  const overrides = await EmployeeObjectiveOverride.find({ employeeId, year }).lean();
  const overrideMap = new Map(overrides.map(o => [String(o.templateId), o]));

  // 4) Calcular peso efectivo
  // Regla inicial:
  // - Templates de SECTOR: pesoBase * (participación del sector / 100)
  // - Templates de ÁREA: pesoBase (sin escalar)  [v1 simple]
  const rows = templates.map(tpl => {
    let base = tpl.pesoBase;

    if (tpl.scopeType === "sector") {
      const part = participaciones.find(p => String(p.sectorId) === String(tpl.scopeId));
      base = part ? base * (part.participation / 100) : 0;
    }

    // aplicar override si existe
    const ov = overrideMap.get(String(tpl._id));
    const excluded = !!ov?.excluded;
    const peso = excluded ? 0 : (ov?.pesoOverride ?? base);

    return {
      templateId: tpl._id,
      tipo: tpl.tipo,                // "objetivo" | "aptitud"
      nombre: tpl.nombre,
      scopeType: tpl.scopeType,      // "area" | "sector"
      scopeId: tpl.scopeId,
      metodo: tpl.metodo,
      pesoBaseTemplate: tpl.pesoBase,
      participation: tpl.scopeType === "sector"
        ? participaciones.find(p => String(p.sectorId) === String(tpl.scopeId))?.participation ?? 0
        : null,
      pesoEfectivo: Number(peso),
      overridden: !!ov,
      excluded
    };
  });

  const total = rows.reduce((acc, r) => acc + r.pesoEfectivo, 0);

  return {
    empleado: {
      _id: empleado._id,
      nombre: `${empleado.apellido}, ${empleado.nombre}`,
      area: empleado.area?.nombre || null,
      sector: empleado.sector?.nombre || null
    },
    year,
    items: rows.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    total
  };
}
