// src/models/Evaluacion.model.js
import mongoose from "mongoose";

const evaluacionSchema = new mongoose.Schema(
  {
    // Identificación
    empleado: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado", required: true },
    plantillaId: { type: mongoose.Schema.Types.ObjectId, ref: "Plantilla", required: true },

    // Periodización
    year: { type: Number, default: null },             // ej: 2025
    periodo: { type: String, required: true, index: true }, // ej: "2025Q1", "2025M03", "2025S1"

    // Resultado global (0-100)
    actual: { type: Number, default: null },
    escala: { type: Number, min: 0, max: 100, default: null },

    // Comentarios “generales” (vista empleado)
    comentario: { type: String, trim: true },

    // Flujo / estado
    estado: {
      type: String,
      enum: ["MANAGER_DRAFT", "PENDING_EMPLOYEE", "PENDING_HR", "CLOSED"],
      default: "MANAGER_DRAFT",
      index: true,
    },

    // Trazabilidad de actores
    manager:    { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }, // jefe que evalúa
    hrReviewer: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }, // quien cierra

    // Comentarios con autoría separada
    comentarioManager:  { type: String, trim: true },
    comentarioEmpleado: { type: String, trim: true },
    comentarioRRHH:     { type: String, trim: true },

    // ✅ Aprobación / disconformidad del empleado (tu “check”)
    //    ACK = de acuerdo | CONTEST = en desacuerdo
    empleadoAck: {
      estado: { type: String, enum: ["ACK", "CONTEST", null], default: null },
      fecha:  { type: Date },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    },

    // Fechas clave
    submittedToEmployeeAt: Date,
    submittedToHRAt: Date,
    closedAt: Date,

    // Historial/auditoría
    timeline: [
      {
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
        action: String, // "MANAGER_SUBMIT" | "EMPLOYEE_ACK" | "EMPLOYEE_CONTEST" | "HR_CLOSE" | "REOPEN" ...
        note: String,
        snapshot: mongoose.Schema.Types.Mixed,
      },
    ],

    // 📌 Resultados por meta (lo que ya venías usando)
    metasResultados: [
      {
        nombre:          { type: String, required: true },
        unidad:          { type: String }, // "Numérico", "Cumple/No Cumple", etc.
        operador:        { type: String, default: ">=" },

        // 👉 target de la meta (lo que viene de la plantilla)
        esperado:        { type: Number, default: null },

        // 👉 cómo se evalúa en el tiempo
        modoAcumulacion: {
          type: String,
          enum: ["acumulativo", "periodo"],
          default: "periodo",
        },
        acumulativa:     { type: Boolean, default: false },

        // 👉 valor que carga el jefe / sistema (puede ser número o boolean)
        resultado:       { type: mongoose.Schema.Types.Mixed, default: null },

        // 👉 flag ya evaluado (lo calcula tu lógica de negocio)
        cumple:          { type: Boolean, default: false },
      },
    ],


    // Autoría de creación
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

// Única evaluación por (empleado, plantilla, periodo)
evaluacionSchema.index({ empleado: 1, plantillaId: 1, periodo: 1 }, { unique: true });

const Evaluacion = mongoose.model("Evaluacion", evaluacionSchema);
export default Evaluacion;
