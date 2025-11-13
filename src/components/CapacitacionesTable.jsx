import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "react-toastify";

export default function CapacitacionesTable({ empleadoId, canEdit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nombre: "", proveedor: "", horas: "", fecha: "",
    vence: false, fechaVto: "", estado: "COMPLETO", certificado: null
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await api(`/empleados/${empleadoId}/capacitaciones`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las capacitaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empleadoId]);

  const onAdd = async () => {
    try {
      if (!form.nombre || !form.fecha) return toast.error("Nombre y Fecha son obligatorios.");
      const fd = new FormData();
      fd.append("nombre", form.nombre);
      fd.append("proveedor", form.proveedor || "");
      fd.append("horas", String(form.horas || 0));
      fd.append("fecha", new Date(form.fecha).toISOString());
      fd.append("vence", String(!!form.vence));
      if (form.vence && form.fechaVto) fd.append("fechaVto", new Date(form.fechaVto).toISOString());
      fd.append("estado", form.estado || "COMPLETO");
      if (form.certificado) fd.append("certificado", form.certificado);

      const created = await api(`/empleados/${empleadoId}/capacitaciones`, { method: "POST", body: fd });
      setItems((prev)=>[created, ...prev]);
      setForm({ nombre:"", proveedor:"", horas:"", fecha:"", vence:false, fechaVto:"", estado:"COMPLETO", certificado:null });
      toast.success("Capacitación registrada.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo registrar.");
    }
  };

  const onDelete = async (itemId) => {
    if (!window.confirm("¿Eliminar esta capacitación?")) return;
    try {
      await api(`/empleados/${empleadoId}/capacitaciones/${itemId}`, { method: "DELETE" });
      setItems((prev)=>prev.filter(x=>x._id !== itemId));
      toast.success("Capacitación eliminada.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar.");
    }
  };

  return (
    <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Capacitaciones</h3>
      </div>

      {canEdit && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
          <input className="rounded-md border px-2 py-2 text-sm" placeholder="Nombre *"
            value={form.nombre} onChange={(e)=>setForm(f=>({...f, nombre:e.target.value}))} />
          <input className="rounded-md border px-2 py-2 text-sm" placeholder="Proveedor"
            value={form.proveedor} onChange={(e)=>setForm(f=>({...f, proveedor:e.target.value}))} />
          <input type="number" className="rounded-md border px-2 py-2 text-sm" placeholder="Horas"
            value={form.horas} onChange={(e)=>setForm(f=>({...f, horas:e.target.value}))} />
          <input type="date" className="rounded-md border px-2 py-2 text-sm" placeholder="Fecha *"
            value={form.fecha} onChange={(e)=>setForm(f=>({...f, fecha:e.target.value}))} />
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={form.vence} onChange={(e)=>setForm(f=>({...f, vence:e.target.checked}))} />
              Vence
            </label>
            <input type="date" className="rounded-md border px-2 py-2 text-sm"
              disabled={!form.vence}
              value={form.fechaVto}
              onChange={(e)=>setForm(f=>({...f, fechaVto:e.target.value}))}
            />
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".pdf,.doc,.docx"
              onChange={(e)=>setForm(f=>({...f, certificado: e.target.files?.[0] || null}))}
              className="text-sm" />
            <button onClick={onAdd} className="rounded-md px-3 py-2 text-sm bg-indigo-600 text-white">Agregar</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto max-w-full">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full min-w-[900px] text-sm table-fixed">
            <thead>
              <tr className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Proveedor</th>
                <th className="text-left px-3 py-2">Horas</th>
                <th className="text-left px-3 py-2">Vence</th>
                <th className="text-left px-3 py-2">Certificado</th>
                {canEdit && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-3" colSpan={7}>Cargando…</td></tr>
              ) : items.length ? items.map(it=>(
                <tr key={it._id} className="border-t odd:bg-background even:bg-muted/20">
                  <td className="px-3 py-2">{it.fecha ? String(it.fecha).slice(0,10) : "—"}</td>
                  <td className="px-3 py-2">{it.nombre}</td>
                  <td className="px-3 py-2">{it.proveedor || "—"}</td>
                  <td className="px-3 py-2">{it.horas ?? 0}</td>
                  <td className="px-3 py-2">{it.vence ? (it.fechaVto ? String(it.fechaVto).slice(0,10) : "—") : "No"}</td>
                  <td className="px-3 py-2">
                    {it.certificadoUrl ? <a href={`/${it.certificadoUrl}`} target="_blank" rel="noreferrer" className="underline">Ver</a> : "—"}
                  </td>
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
