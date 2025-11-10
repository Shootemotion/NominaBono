// src/controllers/assignments.controller.js
import Plantilla from "../models/Plantilla.model.js";
import ParticipacionEmpleado from "../models/ParticipacionEmpleado.model.js";
import OverrideObjetivo from "../models/OverrideObjetivo.model.js";
import Sector from "../models/Sector.model.js";

export const getEmployeeAssignments = async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const year = Number(req.query.year);
    if (!empleadoId || Number.isNaN(year)) {
      return res.status(400).json({ success: false, message: "empleadoId y year son requeridos" });
    }

    // 1) participaciones del empleado
    const participaciones = await ParticipacionEmpleado.find({ empleado: empleadoId, year })
      .lean();
    const sectorIds = participaciones.map(p => String(p.sector));
    const mapaSectorPct = Object.fromEntries(participaciones.map(p => [String(p.sector), p.porcentaje]));

    // 2) obtener áreas de esos sectores
    const sectoresDocs = await Sector.find({ _id: { $in: sectorIds } }, { _id: 1, areaId: 1 }).lean();
    const areaPorSector = Object.fromEntries(sectoresDocs.map(s => [String(s._id), String(s.areaId?._id || s.areaId)]));
    // sumar % por área
    const mapaAreaPct = {};
    participaciones.forEach(p => {
      const areaId = areaPorSector[String(p.sector)];
      if (!areaId) return;
      mapaAreaPct[areaId] = (mapaAreaPct[areaId] || 0) + p.porcentaje;
    });

    // 3) plantillas del año
    const plantillas = await Plantilla.find({ year, activo: true }).lean();

    // 4) overrides del empleado
    const overrides = await OverrideObjetivo.find({ empleado: empleadoId, year }).lean();
    const ovByTpl = Object.fromEntries(overrides.map(o => [String(o.template), o]));

    // 5) calcular pesos efectivos
    const items = [];
    for (const tpl of plantillas) {
      const tplId = String(tpl._id);
      let share = 0;

      if (tpl.scopeType === "sector") {
        share = mapaSectorPct[String(tpl.scopeId)] || 0;
      } else if (tpl.scopeType === "area") {
        share = mapaAreaPct[String(tpl.scopeId)] || 0;
      }

      if (share <= 0) continue; // no corresponde por participación

      let weight = +(tpl.pesoBase * (share / 100)).toFixed(2);
      let excluded = false;
      let override = ovByTpl[tplId];
      if (override) {
        if (override.excluido) {
          excluded = true;
        } else if (override.peso != null) {
          weight = +Number(override.peso).toFixed(2);
        }
      }
      if (excluded) continue;

      items.push({
        templateId: tplId,
        tipo: tpl.tipo,
        nombre: tpl.nombre,
        year: tpl.year,
        scopeType: tpl.scopeType,
        scopeId: String(tpl.scopeId),
        pesoBase: tpl.pesoBase,
        share,        // % de tiempo del empleado en ese scope
        weight,       // peso efectivo para el empleado
        override: override
          ? { excluido: !!override.excluido, peso: override.peso ?? null, notas: override.notas ?? null }
          : null,
      });
    }

    const total = +items.reduce((acc, it) => acc + (it.weight || 0), 0).toFixed(2);
    res.json({ year, empleadoId, total, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
