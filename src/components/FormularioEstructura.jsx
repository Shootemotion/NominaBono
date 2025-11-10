import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function FormularioEstructura({
  modo,                   // "area" | "sector"
  onGuardar,
  onCancelar,
  areas = [],
  datosIniciales = null,
}) {
  const [nombre, setNombre] = useState("");
  const [areaId, setAreaId] = useState("");

  useEffect(() => {
    if (datosIniciales) {
      setNombre(datosIniciales.nombre || "");
      if (modo === "sector")
        setAreaId(datosIniciales?.areaId?._id || datosIniciales?.areaId || "");
    } else {
      setNombre("");
      if (modo === "sector" && areas.length) setAreaId(areas[0]._id);
    }
  }, [datosIniciales, modo, areas]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(modo === "area" ? { nombre } : { nombre, areaId });
  };

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {modo === "sector" && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-muted-foreground">Área</label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            required
            className={inputCls}
          >
            {areas.map((a) => (
              <option key={a._id} value={a._id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-muted-foreground">
          {modo === "area" ? "Nombre del Área" : "Nombre del Sector"}
        </label>
        <input
          className={inputCls}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit">{datosIniciales ? "Guardar Cambios" : "Guardar"}</Button>
      </div>
    </form>
  );
}
