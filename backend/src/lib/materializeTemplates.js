
// src/lib/materializeTemplate.js
import Plantilla from '../models/Plantilla.model.js';
import Empleado from '../models/Empleado.model.js';
import Objetivo from '../models/Objetivo.model.js';
import Aptitud from '../models/Aptitud.model.js';
import mongoose from 'mongoose';

const asObjectId = (v) => new mongoose.Types.ObjectId(String(v));

export async function materializeTemplate(tplId, options = {}) {
  const tpl = await Plantilla.findById(tplId).lean();
  if (!tpl) throw new Error('Plantilla no encontrada');

  let empleados = [];
  if (tpl.scopeType === 'area') {
    empleados = await Empleado.find({ area: asObjectId(tpl.scopeId) }).lean();
  } else if (tpl.scopeType === 'sector') {
    empleados = await Empleado.find({ sector: asObjectId(tpl.scopeId) }).lean();
  }

  const anio = Number(tpl.year || new Date().getFullYear());

  const targets = empleados.map(emp => {
    const base = {
      empleadoId: emp._id,
      anio,
      templateId: tpl._id,
      nombre: tpl.nombre,
      descripcion: tpl.descripcion || '',
      metodo: tpl.metodo || null,
      proceso: tpl.proceso || '',
      activo: true,
      progreso: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    if (tpl.tipo === 'objetivo') {
      return { model: 'objetivo', doc: { ...base, peso: Number(tpl.pesoBase || 0) } };
    } else {
      return { model: 'aptitud', doc: { ...base, peso: Number(tpl.pesoBase || 0) } };
    }
  });

  if (options.dryRun) {
    return { count: targets.length, samples: targets.slice(0,5) };
  }

  const created = { objetivos: 0, aptitudes: 0 };
  for (const t of targets) {
    if (t.model === 'objetivo') {
      const exists = await Objetivo.findOne({ empleadoId: t.doc.empleadoId, anio, templateId: tpl._id }).lean();
      if (!exists) {
        await Objetivo.create(t.doc);
        created.objetivos++;
      }
    } else {
      const exists = await Aptitud.findOne({ empleadoId: t.doc.empleadoId, anio, templateId: tpl._id }).lean();
      if (!exists) {
        await Aptitud.create(t.doc);
        created.aptitudes++;
      }
    }
  }

  return { created, totalTargets: targets.length };
}
