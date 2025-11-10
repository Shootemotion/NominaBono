// scripts/materializeAllTemplates.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plantilla from '../src/models/Plantilla.model.js';
import { materializeTemplate } from'../src/lib/materializeTemplates.js'; // ajustá ruta si lo guardaste en otro lugar

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Falta MONGO_URI en .env');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  const year = Number(process.argv[2] || new Date().getFullYear());
  const tplList = await Plantilla.find({ year, activo: true }).lean();
  console.log(`Found ${tplList.length} plantillas para ${year}`);

  for (const tpl of tplList) {
    try {
      const res = await materializeTemplate(tpl._id);
      console.log(`Tpl ${tpl._id} (${tpl.nombre}):`, res);
    } catch (err) {
      console.error('Error materializing', tpl._id?.toString(), err.message);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
