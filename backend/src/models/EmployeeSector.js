import mongoose from "mongoose";

const employeeSectorSchema = new mongoose.Schema({
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado", required: true },
  sectorId:   { type: mongoose.Schema.Types.ObjectId, ref: "Sector", required: true },
  year:       { type: Number, required: true },
  participation: { type: Number, required: true, min: 0, max: 100 } // ej. 60
}, { timestamps: true });

employeeSectorSchema.index({ empleadoId: 1, sectorId: 1, year: 1 }, { unique: true });
export default mongoose.model("EmployeeSector", employeeSectorSchema);