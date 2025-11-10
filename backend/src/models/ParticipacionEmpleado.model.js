// src/models/ParticipacionEmpleado.model.js
import mongoose from "mongoose";

const participacionSchema = new mongoose.Schema(
  {
    empleado: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado", required: true },
    year: { type: Number, required: true },
    sector: { type: mongoose.Schema.Types.ObjectId, ref: "Sector", required: true },
    porcentaje: { type: Number, min: 0, max: 100, required: true } // 0..100
  },
  { timestamps: true }
);

participacionSchema.index({ empleado: 1, year: 1, sector: 1 }, { unique: true });

const ParticipacionEmpleado = mongoose.model("ParticipacionEmpleado", participacionSchema);
export default ParticipacionEmpleado;
