import Feedback from "../models/Feedback.model.js";

export const getFeedbacksByEmpleado = async (req, res) => {
    try {
        const { empleadoId } = req.params;
        const { year } = req.query;

        const query = { empleado: empleadoId };
        if (year) query.year = Number(year);

        const feedbacks = await Feedback.find(query)
            .populate("creadoPor", "nombre apellido")
            .sort({ periodo: 1 });
        res.json(feedbacks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener feedbacks" });
    }
};

export const saveFeedback = async (req, res) => {
    try {
        const {
            empleado, year, periodo,
            comentario, estado, fechaRealizacion,
            comentarioEmpleado, empleadoAck
        } = req.body;

        if (!empleado || !year || !periodo) {
            return res.status(400).json({ message: "Faltan datos obligatorios" });
        }

        // Check existing
        let existing = await Feedback.findOne({ empleado, year, periodo });
        let correctionCount = existing?.correctionCount || 0;

        const isEmployee = req.user?._id && String(req.user._id) === String(empleado);

        const data = {
            empleado,
            year,
            periodo,
            comentario,
            estado,
            fechaRealizacion: fechaRealizacion || new Date(),
            comentarioEmpleado,
            empleadoAck,
        };

        if (!isEmployee) {
            // Manager logic
            data.creadoPor = req.user?._id;

            // Logic for correction limit (Manager sending feedback)
            if (existing && ["SENT", "ACKNOWLEDGED", "CLOSED"].includes(existing.estado)) {
                // If trying to update an already sent feedback
                if (correctionCount >= 1) {
                    return res.status(400).json({ message: "Solo se permite una corrección después de enviar el feedback." });
                }
                correctionCount += 1;
            }
            data.correctionCount = correctionCount;
        }

        // Si cambia a SENT, setear fecha envio si no existe
        if (estado === "SENT" && (!existing || !existing.submittedToEmployeeAt)) {
            data.submittedToEmployeeAt = new Date();
        }
        // Si cambia a CLOSED, setear fecha cierre
        if (estado === "CLOSED") {
            data.closedAt = new Date();
        }

        const updated = await Feedback.findOneAndUpdate(
            { empleado, year, periodo },
            data,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al guardar feedback" });
    }
};
