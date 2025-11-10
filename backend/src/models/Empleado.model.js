import mongoose from 'mongoose';

const empleadoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  dni: { type: String, required: true, unique: true },
  cuil: { type: String, required: true, unique: true },
  apodo: { type: String, required: false },
  domicilio: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  antiguedadReconocidaAnios: { type: String, required: false , default: 0},
  fechaIngreso: { type: Date, required: true },
  puesto: { type: String, required: true },
  celular: { type: String, required: false },
  categoria: { type: String, required: false },
  
  // Guardamos una referencia al ID del Área
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area', // Se relaciona con el modelo "Area"
    required: true
  },
  
  // Guardamos una referencia al ID del Sector
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector', // Se relaciona con el modelo "Sector"
    required: true
  },
  
 fotoUrl: { type: String, default: null },

}, {
  // timestamps: true añade automáticamente los campos createdAt y updatedAt
  timestamps: true 
});

const Empleado = mongoose.model('Empleado', empleadoSchema);
export default Empleado;




































































