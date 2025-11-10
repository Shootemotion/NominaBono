// backend/src/controllers/sector.controller.js
import Sector from '../models/Sector.model.js';
import Empleado from '../models/Empleado.model.js';

/** GET /api/sectores */
export const getSectores = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.areaId) filter.areaId = req.query.areaId; // 👈 filtro opcional
    const sectores = await Sector.find(filter)
      .populate('areaId', 'nombre')
      .populate('referentes', 'nombre apellido puesto');
    res.json(sectores);
  } catch (e) {
    next(e);
  }
};

/** POST /api/sectores (crear sector) */
export const createSector = async (req, res, next) => {
  try {
    const { nombre, areaId, referentes = [] } = req.body;
    if (!nombre?.trim() || !areaId) {
      return res.status(400).json({ message: 'Nombre y areaId son obligatorios.' });
    }

    // 1. Crear sector
    const sector = new Sector({ nombre: nombre.trim(), areaId, referentes });
    await sector.save();

    // 2. Popular después de guardar
    await sector.populate('areaId', 'nombre');
    await sector.populate('referentes', 'nombre apellido puesto');

    res.status(201).json(sector);
  } catch (e) {
    next(e);
  }
};

/** PUT /api/sectores/:id */
export const updateSector = async (req, res, next) => {
  try {
    const { id } = req.params; // /api/sectores/:id
    const { nombre, areaId } = req.body;

    const sector = await Sector.findByIdAndUpdate(
      id,
      { ...(nombre ? { nombre } : {}), ...(areaId ? { areaId } : {}) },
      { new: true, runValidators: true }
    )
      .populate('areaId', 'nombre')
      .populate('referentes', 'nombre apellido puesto');

    if (!sector) return res.status(404).json({ message: 'Sector no encontrado' });

    res.json(sector);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/sectores/:id */
export const deleteSector = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Bloquear si hay empleados
    const cantEmpleados = await Empleado.countDocuments({ sector: id });
    if (cantEmpleados > 0) {
      return res.status(409).json({
        message: 'No se puede eliminar el sector: tiene empleados asociados.',
      });
    }

    const sector = await Sector.findByIdAndDelete(id);
    if (!sector) return res.status(404).json({ message: 'Sector no encontrado' });

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/sectores/:id/referentes  (asignar referentes) */
export const setReferentesSector = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { heredaReferentes, referentes } = req.body;
    const update = {};

    if (typeof heredaReferentes === 'boolean') {
      update.heredaReferentes = heredaReferentes;
      if (heredaReferentes) update.referentes = []; // limpia al volver a heredar
    }
    if (Array.isArray(referentes)) {
      update.referentes = [...new Set(referentes)];
      update.heredaReferentes = false; // si mandás lista, pasás a personalizado
    }

    const sector = await Sector.findByIdAndUpdate(id, update, { new: true })
      .populate('areaId', 'nombre')
      .populate('referentes', 'nombre apellido puesto');

    if (!sector) return res.status(404).json({ message: 'Sector no encontrado' });
    res.json(sector);
  } catch (e) {
    next(e);
  }
};

export {
  getSectores as obtenerSectores,
  createSector as crearSector,
  updateSector as actualizarSector,
  deleteSector as eliminarSector,
};
