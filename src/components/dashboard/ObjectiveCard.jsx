import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const fmtDate = (d) => {
  if (!d) return "—"
  const date = new Date(d)
  if (isNaN(date)) return String(d).slice(0, 10)
  return date.toLocaleDateString("es-AR")
}

const pick = (o, ...keys) => {
  for (const k of keys) {
    if (o && typeof o[k] !== "undefined" && o[k] !== null) return o[k]
  }
  return undefined
}

export function ObjectiveCard({ obj }) {
  const nombre = pick(obj, "nombre", "titulo", "title") || "Objetivo"
  const descripcion = pick(obj, "descripcion", "desc", "description") || ""
  const kpi = pick(obj, "kpi", "indicador") || null
  const target = pick(obj, "target", "meta") || null
  const metodo = pick(obj, "metodo", "proceso") || null
  const fechaLimite = pick(obj, "fechaLimite", "dueDate") || null
  const peso = pick(obj, "peso", "pesoBase") ?? "—"
  const progreso = pick(obj, "progreso", "progress") ?? null

  return (
    <Card className="rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition border p-3">
      <CardHeader className="p-0 mb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          🎯 {nombre}
          <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px]">
            {typeof peso === "number" ? `${peso}%` : peso}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground line-clamp-2">{descripcion}</p>
      </CardHeader>

      <CardContent className="space-y-2 p-0 mt-2">
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div><b>KPI:</b> {kpi ?? "—"}</div>
          <div><b>Meta:</b> {target ?? "—"}</div>
          <div><b>Método:</b> {metodo ?? "—"}</div>
          <div><b>Fecha:</b> {fechaLimite ? fmtDate(fechaLimite) : "—"}</div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Progreso</span>
            <span className="text-sm font-bold text-blue-700">
              {progreso !== null ? `${Math.round(progreso)}%` : "—"}
            </span>
          </div>
          <Progress value={progreso ?? 0} className="mt-1 h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
