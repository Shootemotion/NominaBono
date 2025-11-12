import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "react-toastify";

export default function CarreraTable({ empleadoId, canEdit }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ puesto: "", area: "", sector: "", desde: "", hasta: "", motivo: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api(`/empleados/${empleadoId}/carrera`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la carrera.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empleadoId]);

  const onAdd = async () => {
    try {
      if (!form.puesto || !form.desde) return toast.error("Puesto y Desde son obligatorios.");
      const payload = {
        puesto: form.puesto,
        desde: new Date(form.desde),
        hasta: form.hasta ? new Date(form.hasta) : null,
        motivo: form.motivo || "",
        area: form.area || undefined,
        sector: form.sector || undefined,
      };
      const created = await api(`/empleados/${empleadoId}/carrera`, { method: "POST", body: payload });
      setItems((prev) => [created, ...prev]);
      setForm({ puesto: "", area: "", sector: "", desde: "", hasta: "", motivo: "" });
      toast.success("Registro agregado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo agregar.");
    }
  };

  const onDelete = async (itemId) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await api(`/empleados/${empleadoId}/carrera/${itemId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x._id !== itemId));
      toast.success("Registro eliminado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar.");
    }
  };

  return (
    <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Carrera / Historial de puestos</h3>
      </div>

      {canEdit && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
          <input className="rounded-md border px-2 py-2 text-sm" placeholder="Puesto *"
            value={form.puesto} onChange={(e)=>setForm(f=>({...f, puesto:e.target.value}))} />
          <input className="rounded-md border px-2 py-2 text-sm" placeholder="AreaId (opcional)"
            value={form.area} onChange={(e)=>setForm(f=>({...f, area:e.target.value}))} />
          <input className="rounded-md border px-2 py-2 text-sm" placeholder="SectorId (opcional)"
            value={form.sector} onChange={(e)=>setForm(f=>({...f, sector:e.target.value}))} />
          <input type="date" className="rounded-md border px-2 py-2 text-sm" placeholder="Desde *"
            value={form.desde} onChange={(e)=>setForm(f=>({...f, desde:e.target.value}))} />
          <input type="date" className="rounded-md border px-2 py-2 text-sm" placeholder="Hasta"
            value={form.hasta} onChange={(e)=>setForm(f=>({...f, hasta:e.target.value}))} />
          <div className="flex gap-2">
            <input className="flex-1 rounded-md border px-2 py-2 text-sm" placeholder="Motivo"
              value={form.motivo} onChange={(e)=>setForm(f=>({...f, motivo:e.target.value}))} />
            <button onClick={onAdd} className="rounded-md px-3 py-2 text-sm bg-emerald-600 text-white">Agregar</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto max-w-full">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full min-w-[900px] text-sm table-fixed">
            <thead>
              <tr className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <th className="text-left px-3 py-2">Puesto</th>
                <th className="text-left px-3 py-2">Área</th>
                <th className="text-left px-3 py-2">Sector</th>
                <th className="text-left px-3 py-2">Desde</th>
                <th className="text-left px-3 py-2">Hasta</th>
                <th className="text-left px-3 py-2">Motivo</th>
                {canEdit && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-3" colSpan={7}>Cargando…</td></tr>
              ) : items.length ? items.map(it => (
                <tr key={it._id} className="border-t odd:bg-background even:bg-muted/20">
                  <td className="px-3 py-2">{it.puesto}</td>
                  <td className="px-3 py-2">{it?.area?.nombre || it?.area || "—"}</td>
                  <td className="px-3 py-2">{it?.sector?.nombre || it?.sector || "—"}</td>
                  <td className="px-3 py-2">{it.desde ? String(it.desde).slice(0,10) : "—"}</td>
                  <td className="px-3 py-2">{it.hasta ? String(it.hasta).slice(0,10) : "—"}</td>
                  <td className="px-3 py-2">{it.motivo || "—"}</td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <button onClick={()=>onDelete(it._id)} className="text-rose-600 text-xs">Eliminar</button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td className="px-3 py-3 text-muted-foreground" colSpan={7}>Sin registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
