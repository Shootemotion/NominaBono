import mongoose from 'mongoose';    

const AreaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },

  // 🔹 múltiples referentes (empleados)
  referentes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empleado',
    default: [],
  }],
}, { timestamps: true });

export default mongoose.model('Area', AreaSchema);
