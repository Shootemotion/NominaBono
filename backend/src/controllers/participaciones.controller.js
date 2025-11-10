// src/controllers/participaciones.controller.js
import ParticipacionEmpleado from "../models/ParticipacionEmpleado.model.js";

export const upsertParticipacion = async (req, res) => {
  try {
    const { empleado, year, sector, porcentaje } = req.body;
    const doc = await ParticipacionEmpleado.findOneAndUpdate(
      { empleado, year, sector },
      { $set: { porcentaje } },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const listParticipaciones = async (req, res) => {
  try {
    const { empleado, year } = req.query;
    const q = {};
    if (empleado) q.empleado = empleado;
    if (year) q.year = Number(year);
    const data = await ParticipacionEmpleado.find(q).populate("sector").lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteParticipacion = async (req, res) => {
  try {
    await ParticipacionEmpleado.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
