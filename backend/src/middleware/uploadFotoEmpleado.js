import multer from "multer";
import path from "path";
import fs from "fs";

function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_.]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const emp = req.empleado; // cargado por preloadEmpleado
    const legible = `${slugify(emp.apellido)}-${slugify(emp.nombre)}-${emp._id}`;
    const dir = path.join(process.cwd(), "uploads", "empleados", legible);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg").toLowerCase();
    cb(null, `perfil-${Date.now()}${ext}`);
  }
});

export const uploadFotoEmpleado = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Solo imágenes"));
    cb(null, true);
  }
}).single("foto"); // <— el campo del FormData se llama 'foto'
