import { CheckCircle, Send, User, TrendingUp, FileEdit } from "lucide-react";

export default function TraceabilityCard({ objetivo, trazabilidad, resultadoGlobal }) {
  // trazabilidad = array de objetos [{estado, fecha, usuario, comentario}]
  const icons = {
    borrador: <FileEdit className="w-4 h-4 text-yellow-500" />,
    enviado: <Send className="w-4 h-4 text-blue-500" />,
    feedback: <User className="w-4 h-4 text-green-500" />,
    rrhh: <TrendingUp className="w-4 h-4 text-purple-500" />,
    cerrado: <CheckCircle className="w-4 h-4 text-emerald-600" />,
  };

  // Color dinámico para el resultado global
  const getColor = (val) => {
    if (val == null) return "text-slate-400";
    if (val >= 80) return "text-emerald-600";
    if (val >= 50) return "text-amber-500";
    return "text-rose-600";
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {objetivo.tipo === "objetivo" ? "🎯" : "💡"} {objetivo.nombre}
        </h3>
        {resultadoGlobal != null && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Resultado global</p>
            <p className={`text-3xl font-bold ${getColor(resultadoGlobal)}`}>
              {resultadoGlobal}%
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200"></div>
        <div className="space-y-4 ml-6">
          {trazabilidad.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="relative z-10">{icons[step.estado]}</div>
              <div>
                <p className="text-sm font-medium capitalize">
                  {step.estado}
                </p>
                <p className="text-xs text-slate-500">
                  {step.fecha ? new Date(step.fecha).toLocaleDateString("es-AR") : ""}
                  {step.usuario && ` · ${step.usuario}`}
                </p>
                {step.comentario && (
                  <p className="text-xs text-slate-600 italic mt-1">
                    "{step.comentario}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
