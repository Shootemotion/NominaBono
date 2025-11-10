// src/models/Plantilla.model.js
import mongoose from "mongoose";

const plantillaSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["objetivo", "aptitud"], required: true },
    year: { type: Number, required: true },

    scopeType: {
      type: String,
      enum: ["area", "sector", "empleado", "employee"],
      required: true,
    },
    scopeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "scopeRef",
    },
    // 🔹 ref del modelo (tolerante para datos viejos; completalo en pre-validate si querés)
    scopeRef: { type: String, enum: ["Area", "Sector", "Empleado"] },

    // Contenido base
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String },
    proceso: { type: String, trim: true },

    // 🔸 Estos 3 eran del esquema viejo de aptitudes — los dejamos NO required
    metodo: { type: String, enum: ["cuantitativo", "cualitativo"] }, // opcional
    target: { type: Number }, // opcional
    unidad: { type: String }, // opcional

    escalas: [
      {
        label: { type: String },
        valor: { type: Number },
      },
    ], // opcional también

    // ✅ Metas solo para OBJETIVOS
    metas: [
      {
        nombre: { type: String, required: true },
        target: { type: String },
        unidad: {
          type: String,
          enum: ["Cumple/No Cumple", "Porcentual", "Numerico"],
          default: "Porcentual",
        },
        operador: {
          type: String,
          enum: [">=", ">", "<=", "<", "==", "!="],
          default: ">=",
        },
      },
    ],

    fechaLimite: { type: Date, required: true },
    frecuencia: {
      type: String,
      enum: ["mensual", "trimestral", "semestral", "anual"],
      required: true,
    },
    pesoBase: { type: Number, min: 0, max: 100, required: true },
    activo: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

plantillaSchema.index({ year: 1, scopeType: 1, scopeId: 1, tipo: 1 });

// (opcional pero útil) Completar scopeRef automáticamente
plantillaSchema.pre("validate", function (next) {
  const map = { area: "Area", sector: "Sector", empleado: "Empleado", employee: "Empleado" };
  if (!this.scopeRef) this.scopeRef = map[this.scopeType] || this.scopeRef;
  next();
});

const Plantilla = mongoose.model("Plantilla", plantillaSchema);
export default Plantilla;
