import mongoose from 'mongoose';

const sectorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },

  // 👇 Nuevo: herencia de referentes
  heredaReferentes: { type: Boolean, default: true },
  referentes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' }],
}, { timestamps: true });

const Sector = mongoose.model('Sector', sectorSchema);
export default Sector;