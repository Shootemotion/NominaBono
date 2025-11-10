// backend/src/controllers/empleados.controller.js
import Empleado from '../models/Empleado.model.js';

export const getEmpleados = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.area) {
      filter.area = req.query.area; // 👈 coincide con el schema
    }
    if (req.query.sector) {
      filter.sector = req.query.sector; // 👈 coincide con el schema
    }

   

    const empleados = await Empleado.find(filter)
      .populate("area", "nombre")
      .populate("sector", "nombre");

    res.json(empleados);
  } catch (err) {
    next(err);
  }
};


export const createEmpleado = async (req, res, next) => {
  try {
    const {
      nombre,
      apellido,
      puesto,
      email,
      dni,
      cuil,
      fechaIngreso,
      area,
      sector,
      antiguedadReconocidaAnios,
      domicilio,
      celular,
      apodo,
      categoria,
    
    } = req.body;

    if (!nombre || !apellido || !dni || !cuil || !fechaIngreso || !puesto || !area || !sector) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    const empleado = await Empleado.create({
      nombre,
      apellido,
      puesto,
      email,
      dni,
      cuil,
      fechaIngreso,
      area,
      sector,
      antiguedadReconocidaAnios,
      domicilio,
         celular,
      apodo,
      categoria,
    });

    res.status(201).json(empleado);
  } catch (err) {
    next(err);
  }
};

export const updateEmpleado = async (req, res, next) => {
  try {
    const { id } = req.params;          // /api/empleados/:id
    const updates = req.body;           // parcial o total

    const empleado = await Empleado.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('area').populate('sector');

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    res.json(empleado);
  } catch (err) {
    next(err);
  }
};

export const deleteEmpleado = async (req, res, next) => {
  try {
    const { id } = req.params;

    const empleado = await Empleado.findByIdAndDelete(id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

export const subirFotoEmpleado = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No se envió ninguna foto.' });

    const abs = String(req.file.path).replaceAll('\\', '/');
    const i = abs.lastIndexOf('/uploads/');
    const relative = i >= 0 ? abs.substring(i) : `/uploads/${req.file.filename}`;

    // 👇 clave: SIN barra inicial
    const publicUrl = String(relative).replace(/^\/+/, ''); // "uploads/empleados/xxx/perfil.jpg"

    const empleado = await Empleado.findByIdAndUpdate(
      id,
      { fotoUrl: publicUrl },
      { new: true }
    ).populate('area','nombre').populate('sector','nombre');

    return res.json(empleado);
  } catch (err) {
    return next(err);
  }
};


export {
  getEmpleados as obtenerEmpleados,
  createEmpleado as crearEmpleado,
  updateEmpleado as actualizarEmpleado,
  deleteEmpleado as eliminarEmpleado,
};
