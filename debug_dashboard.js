
import mongoose from 'mongoose';
import { computeForEmployees } from './backend/src/controllers/dashboard.controller.js';
import Empleado from './backend/src/models/Empleado.model.js';
import './backend/src/models/Plantilla.model.js';
import './backend/src/models/OverrideObjetivo.model.js';
import './backend/src/models/Sector.model.js';
import './backend/src/models/Evaluacion.model.js';
import './backend/src/models/Feedback.model.js';

async function debugDashboard() {
    try {
        const mongoUri = "mongodb+srv://Shootemotion:wn6n4nTmbCK476v5@clusterdiagnos.is3afvn.mongodb.net/?retryWrites=true&w=majority&appName=ClusterDiagnos";
        // Add timeout options
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
        console.log("Connected to DB");

        // Bruno Cleri
        const emp = await Empleado.findOne({ nombre: "Bruno", apellido: "Cleri" });

        if (!emp) {
            console.log("Employee 'Bruno Cleri' not found. Trying generic...");
            const anyEmp = await Empleado.findOne();
            if (anyEmp) console.log(`Found generic: ${anyEmp.nombre}`);
            else { console.log("No employees found."); return; }
        } else {
            console.log(`Found: ${emp.nombre} ${emp.apellido} (${emp._id})`);
            const YEAR = 2023;

            const result = await computeForEmployees([emp._id], YEAR);
            const data = result[0];

            console.log("---------------------------------------------------");
            console.log(`YEAR ${YEAR} RESULT for Bruno Cleri:`);
            console.log("Objetivos Count:", data.objetivos.count);
            console.log("Aptitudes Count:", data.aptitudes.count);
            console.log("Feedbacks Length:", data.feedbacks.length);
            console.log("---------------------------------------------------");

            if (data.objetivos.count && data.objetivos.count > 0) {
                console.log("Sample Obj[0]:", data.objetivos.items[0].nombre);
                console.log("Sample Obj[0] Tipo:", data.objetivos.items[0].tipo);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

debugDashboard();
