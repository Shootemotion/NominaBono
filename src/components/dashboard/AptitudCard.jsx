import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const pick = (o, ...keys) => {
  for (const k of keys) {
    if (o && typeof o[k] !== "undefined" && o[k] !== null) return o[k]
  }
  return undefined
}

export function AptitudCard({ a }) {
  const nombre = pick(a, "nombre", "titulo") || "Aptitud"
  const descripcion = pick(a, "descripcion", "desc") || ""
  const tipo = pick(a, "tipo") || null
  const peso = pick(a, "peso", "pesoBase") ?? "—"
  const puntuacion = pick(a, "puntuacion", "calificacion", "score", "valor") ?? null

  return (
    <Card className="rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition border p-3">
      <CardHeader className="p-0 mb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          💡 {nombre}
          <Badge className="bg-violet-100 text-violet-700 border-0 text-[11px]">
            {typeof peso === "number" ? `${peso}%` : peso}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground line-clamp-2">{descripcion}</p>
      </CardHeader>

      <CardContent className="flex items-center justify-between p-0 mt-2">
        <div className="text-[11px] text-muted-foreground">
          {tipo && <>Tipo: <span className="font-medium">{tipo}</span></>}
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">Calificación</div>
          <div className="text-lg font-bold text-violet-700">
            {puntuacion !== null ? puntuacion : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
