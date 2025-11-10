// src/components/HistorialEvaluacion.jsx
import { CheckCircle, Send, User, TrendingUp, FileEdit, MessageCircle } from "lucide-react";

export default function HistorialEvaluacion({ trazabilidad = [] }) {
  const icons = {
    borrador: <FileEdit className="w-5 h-5 text-amber-500" />,
    enviado: <Send className="w-5 h-5 text-blue-500" />,
    feedback: <User className="w-5 h-5 text-emerald-500" />,
    rrhh: <TrendingUp className="w-5 h-5 text-purple-500" />,
    cerrado: <CheckCircle className="w-5 h-5 text-green-600" />,
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <h4 className="text-sm font-semibold mb-3">🕓 Historial de este objetivo</h4>

      {trazabilidad.length === 0 ? (
        <p className="text-sm text-slate-500">No hay movimientos aún.</p>
      ) : (
        <div className="relative">
          {/* línea vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"></div>

          <ul className="space-y-5 ml-10">
            {trazabilidad.map((step, idx) => (
              <li key={idx} className="relative">
                {/* icono */}
                <div className="absolute -left-10 top-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 ring-1 ring-slate-200">
                    {icons[step.estado] || <MessageCircle className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* contenido */}
                <div>
                  <p className="text-sm font-medium capitalize">{step.estado}</p>
                  <p className="text-xs text-slate-500">
                    {step.fecha ? new Date(step.fecha).toLocaleString("es-AR") : "—"}
                    
                    {step.usuario && ` · ${step.usuario}`}
                    
                  </p>
                  {step.comentario && (
                    <p className="text-xs text-slate-600 italic mt-1">
                      "{step.comentario}"
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
