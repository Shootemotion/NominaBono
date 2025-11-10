// src/models/EmployeeObjectiveOverride.js
import mongoose from "mongoose";

const employeeObjectiveOverrideSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado", required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: "ObjectiveTemplate", required: true },
  year: { type: Number, required: true },

  excluded: { type: Boolean, default: false },
  pesoOverride: { type: Number, min: 0 }, // null/undefined = sin override
  note: { type: String }
}, { timestamps: true });

employeeObjectiveOverrideSchema.index({ employeeId: 1, templateId: 1, year: 1 }, { unique: true });
export default mongoose.model("EmployeeObjectiveOverride", employeeObjectiveOverrideSchema);
