import { Router } from 'express';
import {
  obtenerEmpleados,
  crearEmpleado,
  actualizarEmpleado,  // asegúrate de tenerlo en el controller
  eliminarEmpleado,
  subirFotoEmpleado,
} from '../controllers/empleados.controller.js';
import { requireCap } from '../auth/auth.middleware.js';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Empleado from '../models/Empleado.model.js'; // 👈 para precargar el empleado



const router = Router();

// ---- helpers ----
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_.]/g, '')
    .trim()
    .replace(/\s/g, '-')
    .toLowerCase();
}

// ---- middleware: precargar empleado por :id ----
async function preloadEmpleado(req, res, next) {
  try {
    const emp = await Empleado.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Empleado no encontrado' });
    req.empleado = emp;
    next();
  } catch (err) {
    next(err);
  }
}

// ---- multer con destino por empleado ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const emp = req.empleado; // ← lo cargó preloadEmpleado
    const legible = `${slugify(emp.apellido)}-${slugify(emp.nombre)}-${emp._id}`;
    const dir = path.join(process.cwd(), 'uploads', 'empleados', legible);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg').toLowerCase();
    cb(null, `perfil-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('Solo imágenes'));
    cb(null, true);
  }
});

router.get('/',      requireCap('nomina:ver'),      obtenerEmpleados);
router.post('/',     requireCap('nomina:crear'),    crearEmpleado);
router.put('/:id',   requireCap('nomina:editar'),   actualizarEmpleado);
router.delete('/:id',requireCap('nomina:eliminar'), eliminarEmpleado);
// Subida de foto → carpeta por empleado
router.post(
  '/:id/foto',
  requireCap('nomina:editar'),
  preloadEmpleado,            // 1) trae el empleado
  upload.single('foto'),      // 2) guarda en /uploads/empleados/<apellido-nombre-id>/
  subirFotoEmpleado           // 3) persiste fotoUrl y responde
);
export default router;
