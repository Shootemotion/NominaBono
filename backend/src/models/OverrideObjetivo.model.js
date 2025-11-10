// src/models/OverrideObjetivo.model.js
import mongoose from "mongoose";

const overrideSchema = new mongoose.Schema(
  {
    empleado: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado", required: true },
    year: { type: Number, required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: "Plantilla", required: true },

    // si true, excluye el template para este empleado
    excluido: { type: Boolean, default: false },

    // si se provee, reemplaza el peso calculado por este valor absoluto (0..100)
    peso: { type: Number, min: 0, max: 100, default: null },
    meta: { type: Number, default: null },  

    notas: { type: String }
  },
  { timestamps: true }
);

overrideSchema.index({ empleado: 1, year: 1, template: 1 }, { unique: true });

const OverrideObjetivo = mongoose.model("OverrideObjetivo", overrideSchema);
export default OverrideObjetivo;
