// src/models/Evaluacion.model.js
import mongoose from "mongoose";

const evaluacionSchema = new mongoose.Schema(
  {
    empleado: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado", required: true },
    plantillaId: { type: mongoose.Schema.Types.ObjectId, ref: "Plantilla", required: true },
  year: { type: Number, default: null }, // ej: 2024
    periodo: { type: String, required: true }, // ej: "2024Q1", "2024M03", "2024S1"

    // Resultado global
    actual: { type: Number, default: null }, // % calculado a partir de metas
    escala: { type: Number, min: 0, max: 100, default: null },
    comentario: { type: String, trim: true },

    
    // Flujo
  estado: {
    type: String,
    enum: ["MANAGER_DRAFT", "PENDING_EMPLOYEE", "PENDING_HR", "CLOSED"],
    default: "MANAGER_DRAFT",
    index: true,
  },

  
  // Trazabilidad de actores
  manager:   { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // jefe que evalúa
  hrReviewer:{ type: mongoose.Schema.Types.ObjectId, ref: "User" }, // quien cierra (si aplica)

  // Comentarios con autoría separada
  comentarioManager:  { type: String, trim: true },
  comentarioEmpleado: { type: String, trim: true },
  comentarioRRHH:     { type: String, trim: true },

  // Acks / firmas
  empleadoAck: {
    estado: { type: String, enum: ["ACK", "CONTEST", null], default: null },
    fecha: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },

  // Fechas clave (para auditoría)
  submittedToEmployeeAt: Date,
  submittedToHRAt: Date,
  closedAt: Date,

  // Historial de eventos/acciones (auditoría)
  timeline: [
    {
      at: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: String, // e.g. "MANAGER_SUBMIT", "EMPLOYEE_ACK", "EMPLOYEE_CONTEST", "HR_CLOSE", "REOPEN"
      note: String,
      snapshot: mongoose.Schema.Types.Mixed, // opcional: guardar valores clave en el momento
    },
  ],
    // 📌 Nuevo: resultados detallados por meta
    metasResultados: [
      {
        nombre: { type: String, required: true },
        esperado: { type: String }, // target definido en la Plantilla
        unidad: { type: String },
        operador: { type: String, default: ">=" },
        resultado: { type: Number, default: null }, // valor ingresado en la evaluación
        cumple: { type: Boolean, default: false }, // true si alcanzó la meta
      },
    ],

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Restricción: no puede haber duplicados en el mismo periodo
evaluacionSchema.index(
  { empleado: 1, plantillaId: 1, periodo: 1 },
  { unique: true }
);



const Evaluacion = mongoose.model("Evaluacion", evaluacionSchema);
export default Evaluacion;
