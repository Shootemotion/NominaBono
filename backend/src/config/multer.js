// backend/src/config/multer.js
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}_${name}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
