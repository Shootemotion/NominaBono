// src/controllers/overrides.controller.js
import OverrideObjetivo from "../models/OverrideObjetivo.model.js";

export const upsertOverride = async (req, res) => {
  try {
    const { empleado, year, template, excluido, peso, meta, notas } = req.body;
    const doc = await OverrideObjetivo.findOneAndUpdate(
      { empleado, year, template },
      { $set: { excluido: !!excluido, peso: peso ?? null, meta: meta ?? null, notas } },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const listOverrides = async (req, res) => {
  try {
    const { empleado, year } = req.query;
    const q = {};
    if (empleado) q.empleado = empleado;
    if (year) q.year = Number(year);
    const data = await OverrideObjetivo.find(q).lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOverride = async (req, res) => {
  try {
    await OverrideObjetivo.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
