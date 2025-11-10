// backend/src/controllers/areas.controller.js
import Area from '../models/Area.model.js';
import Sector from '../models/Sector.model.js';
import Empleado from '../models/Empleado.model.js';

/** GET /api/areas */
export const getAreas = async (req, res, next) => {
  try {
    const areas = await Area.find().populate('referentes', 'nombre apellido puesto');
    res.json(areas);
  } catch (e) { next(e); }
};

/** POST /api/areas  (crear área) */
export const createArea = async (req, res, next) => {
  try {
    const { nombre, referentes = [] } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    const area = await Area.create({ nombre: nombre.trim(), referentes });
    const populated = await area.populate('referentes', 'nombre apellido puesto');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
};

/** PUT /api/areas/:id  (renombrar área) */
export const updateArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    const area = await Area.findByIdAndUpdate(
      id,
      { ...(nombre ? { nombre } : {}) },
      { new: true, runValidators: true }
    ).populate('referentes', 'nombre apellido puesto');

    if (!area) return res.status(404).json({ message: 'Área no encontrada' });
    res.json(area);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/areas/:id */
export const deleteArea = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1) Bloquear si hay sectores
    const cantSectores = await Sector.countDocuments({ areaId: id });
    if (cantSectores > 0) {
      return res.status(409).json({
        message: 'No se puede eliminar el área: tiene sectores asociados.',
      });
    }

    // 2) Bloquear si hay empleados
    const cantEmpleados = await Empleado.countDocuments({ area: id });
    if (cantEmpleados > 0) {
      return res.status(409).json({
        message: 'No se puede eliminar el área: tiene empleados asociados.',
      });
    }

    const area = await Area.findByIdAndDelete(id);
    if (!area) return res.status(404).json({ message: 'Área no encontrada' });

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/areas/:id/referentes  (asignar referentes) */

export const setReferentesArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { referentes } = req.body; // array de empleadoIds
    referentes = Array.isArray(referentes) ? [...new Set(referentes)] : [];

    const updated = await Area.findByIdAndUpdate(
      id,
      { referentes },
      { new: true }
    ).populate('referentes', 'nombre apellido puesto');

    if (!updated) return res.status(404).json({ message: 'Área no encontrada' });
    // ⚠️ No forzamos a escribir en los sectores. La herencia se resuelve en lectura:
    // sector.heredaReferentes ? area.referentes : sector.referentes
    res.json(updated);
  } catch (e) { next(e); }
};

export {
  getAreas as obtenerAreas,
  createArea as crearArea,
  updateArea as actualizarArea,
  deleteArea as eliminarArea,
  
};
