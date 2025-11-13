import Capacitacion from "../models/Capacitacion.model.js";

export async function listCapacitaciones(req, res, next) {
  try {
    const { id } = req.params; // empleadoId
    const items = await Capacitacion.find({ empleado: id })
      .sort({ fecha: -1 })
      .lean();
    res.json(items);
  } catch (e) { next(e); }
}

export async function createCapacitacion(req, res, next) {
  try {
    const { id } = req.params; // empleadoId
    const { nombre, proveedor, horas, fecha, vence, fechaVto, estado } = req.body;
    if (!nombre || !fecha) return res.status(400).json({ message: "nombre y fecha son requeridos" });

    const base = { empleado: id, nombre, proveedor, horas, fecha, vence, fechaVto, estado };
    if (req.file) {
      // normalizar ruta a /uploads/...
      const abs = String(req.file.path).replaceAll("\\","/");
      const i = abs.lastIndexOf("/uploads/");
      base.certificadoUrl = (i >= 0 ? abs.substring(i) : `/uploads/${req.file.filename}`).replace(/^\/+/, "");
    }

    const item = await Capacitacion.create(base);
    res.status(201).json(item);
  } catch (e) { next(e); }
}

export async function updateCapacitacion(req, res, next) {
  try {
    const { itemId } = req.params;
    const updates = { ...req.body };
    if (req.file) {
      const abs = String(req.file.path).replaceAll("\\","/");
      const i = abs.lastIndexOf("/uploads/");
      updates.certificadoUrl = (i >= 0 ? abs.substring(i) : `/uploads/${req.file.filename}`).replace(/^\/+/, "");
    }
    const updated = await Capacitacion.findByIdAndUpdate(itemId, updates, { new: true });
    if (!updated) return res.status(404).json({ message: "Registro no encontrado" });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function deleteCapacitacion(req, res, next) {
  try {
    const { itemId } = req.params;
    const del = await Capacitacion.findByIdAndDelete(itemId);
    if (!del) return res.status(404).json({ message: "Registro no encontrado" });
    res.sendStatus(204);
  } catch (e) { next(e); }
}
