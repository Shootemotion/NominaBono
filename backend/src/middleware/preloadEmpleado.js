import Empleado from "../models/Empleado.model.js";

export async function preloadEmpleado(req, res, next) {
  try {
    const emp = await Empleado.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: "Empleado no encontrado" });
    req.empleado = emp;
    next();
  } catch (err) {
    next(err);
  }
}
