import { Router } from 'express';
import {
  obtenerEmpleados,
  crearEmpleado,
  actualizarEmpleado,  // asegúrate de tenerlo en el controller
  eliminarEmpleado,
  subirFotoEmpleado,
   subirCVEmpleado,
  actualizarSueldoEmpleado,
} from '../controllers/empleados.controller.js';
import { requireCap } from '../auth/auth.middleware.js';
import { listCarrera, createCarrera, updateCarrera, deleteCarrera } from "../controllers/carrera.controller.js";
import { listCapacitaciones, createCapacitacion, updateCapacitacion, deleteCapacitacion } from "../controllers/capacitacion.controller.js";
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

 // ObjectId simple check (evita cast errors de Mongoose)
 import mongoose from 'mongoose';
 function assertObjectId(req, res, next) {
   const { id } = req.params;
   if (!mongoose.isValidObjectId(id)) {
     return res.status(400).json({ message: 'ID inválido' });
   }
   next();
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

 // 📋 Listado + alta
 router.get('/',      requireCap('nomina:ver'),      obtenerEmpleados);
 router.post('/',     requireCap('nomina:crear'),    crearEmpleado);

 // 📄 Obtener un empleado por ID (útil para legajo)
 router.get('/:id',
   requireCap('nomina:ver'),
   assertObjectId,
   preloadEmpleado,
   (req, res) => res.json(req.empleado)
 );

 // ✏️ Actualizar datos del legajo
 router.patch('/:id',
   requireCap('nomina:editar'),
   assertObjectId,
   actualizarEmpleado
 );

 // 🗑️ Eliminar empleado
 router.delete('/:id',
   requireCap('nomina:eliminar'),
   assertObjectId,
   eliminarEmpleado
 );

 // 🖼️ Subir foto al legajo → carpeta por empleado
 router.post(
   '/:id/foto',
   requireCap('nomina:editar'),
   assertObjectId,
   preloadEmpleado,            // 1) trae el empleado
   upload.single('foto'),      // 2) guarda en /uploads/empleados/<apellido-nombre-id>/
   subirFotoEmpleado           // 3) persiste fotoUrl y responde
 );

 

 // 💰 Actualizar sueldo base con histórico
 router.post(
   '/:id/sueldo',
   requireCap('nomina:editar'),
   assertObjectId,
   actualizarSueldoEmpleado
 );

// ---- multer para CV con destino por empleado ----
const storageCV = multer.diskStorage({
  destination: (req, file, cb) => {
    const emp = req.empleado; // ← lo cargó preloadEmpleado
    const legible = `${slugify(emp.apellido)}-${slugify(emp.nombre)}-${emp._id}`;
    const dir = path.join(process.cwd(), 'uploads', 'empleados', legible);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.pdf').toLowerCase();
    cb(null, `cv-${Date.now()}${ext}`);
  }
});

const uploadCV = multer({
  storage: storageCV,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|doc|docx)$/i.test(file.originalname || '');
    if (!ok) return cb(new Error('Solo se aceptan archivos PDF, DOC o DOCX'));
    cb(null, true);
  },
});

 router.post(
  '/:id/cv',
  requireCap('nomina:editar'),
  preloadEmpleado,
  uploadCV.single('cv'),     // 👈 nombre del campo de formulario
  subirCVEmpleado            // 👈 guarda cvUrl en el empleado
);

router.post(
  '/:id/foto',
  requireCap('nomina:editar'),
  preloadEmpleado,
  upload.single('foto'),
  subirFotoEmpleado
);





/* ========== uploads certificados (capacitaciones) ========== */
const storageCert = multer.diskStorage({
  destination: (req, file, cb) => {
    const emp = req.empleado;
    const legible = `${slugify(emp.apellido)}-${slugify(emp.nombre)}-${emp._id}`;
    const dir = path.join(process.cwd(), "uploads", "empleados", legible, "certificados");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".pdf").toLowerCase();
    cb(null, `cert-${Date.now()}${ext}`);
  }
});
const uploadCert = multer({
  storage: storageCert,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /pdf|doc|docx/i.test(file.mimetype) || /\.(pdf|doc|docx)$/i.test(file.originalname || "");
    if (!ok) return cb(new Error("Formato no permitido (PDF/DOC/DOCX)"));
    cb(null, true);
  }
});

/* ========== CARRERA (historial de puestos) ========== */
router.get("/:id/carrera",
  requireCap("nomina:ver"), assertObjectId, preloadEmpleado, listCarrera);

router.post("/:id/carrera",
  requireCap("nomina:editar"), assertObjectId, preloadEmpleado, createCarrera);

router.put("/:id/carrera/:itemId",
  requireCap("nomina:editar"), assertObjectId, updateCarrera);

router.delete("/:id/carrera/:itemId",
  requireCap("nomina:editar"), assertObjectId, deleteCarrera);

/* ========== CAPACITACIONES ========== */
router.get("/:id/capacitaciones",
  requireCap("nomina:ver"), assertObjectId, preloadEmpleado, listCapacitaciones);

router.post("/:id/capacitaciones",
  requireCap("nomina:editar"), assertObjectId, preloadEmpleado, uploadCert.single("certificado"), createCapacitacion);

router.put("/:id/capacitaciones/:itemId",
  requireCap("nomina:editar"), assertObjectId, uploadCert.single("certificado"), updateCapacitacion);

router.delete("/:id/capacitaciones/:itemId",
  requireCap("nomina:editar"), assertObjectId, deleteCapacitacion);
export default router;
