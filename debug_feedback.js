import mongoose from "mongoose";
import Feedback from "./backend/src/models/Feedback.model.js";
import Usuario from "./backend/src/models/Usuario.model.js"; // Needed for population

// Connect to MongoDB
mongoose.connect("mongodb+srv://Shootemotion:wn6n4nTmbCK476v5@clusterdiagnos.is3afvn.mongodb.net/?retryWrites=true&w=majority&appName=ClusterDiagnos")
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Could not connect to MongoDB", err));

async function checkFeedbacks() {
    try {
        // Find a feedback that has been sent (SENT, PENDING_HR, etc)
        const feedbacks = await Feedback.find({ estado: { $in: ["SENT", "PENDING_HR", "CLOSED"] } })
            .populate("creadoPor", "nombre apellido")
            .limit(5);

        console.log("Found feedbacks:", feedbacks.length);
        feedbacks.forEach(f => {
            console.log(`ID: ${f._id}, Periodo: ${f.periodo}, Estado: ${f.estado}`);
            console.log(`CreadoPor:`, f.creadoPor);
            console.log("-------------------");
        });

    } catch (error) {
        console.error("Error checking feedbacks:", error);
    } finally {
        mongoose.disconnect();
    }
}

checkFeedbacks();
