import { useState } from "react";
import { Button } from "@/components/ui/button";
import FormularioAptitud from "./FormularioAptitudes";

function VistaAptitudes({
  aptitudes = [],          // [{id, nombre, tipo, peso, descripcion}]
  onGuardarAptitud,        // fn(newData) -> guarda/edita
  onBorrarAptitud,         // fn(id)
  scopeType,
  areaNombre,
  sectorNombre,
  empleadoNombre,
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [aptitudEdit, setAptitudEdit] = useState(null);

  // separar por tipo
  const corporativas = aptitudes.filter(a => a.tipo === "corporativa");
  const especiales = aptitudes.filter(a => a.tipo === "especial");

  // totales
  const totalCorp = corporativas.reduce((acc, a) => acc + Number(a.peso || 0), 0);
  const totalEsp = especiales.reduce((acc, a) => acc + Number(a.peso || 0), 0);

  const handleGuardar = (data) => {
    onGuardarAptitud(aptitudEdit?.id, data);
    setMostrarForm(false);
    setAptitudEdit(null);
  };

  const abrirNuevo = (tipo) => {
    setAptitudEdit({ tipo }); // forzar tipo inicial
    setMostrarForm(true);
  };

  return (
    <div className="space-y-8">
      {/* === Corporativas === */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aptitudes Corporativas</h2>
          <Button onClick={() => abrirNuevo("corporativa")}>+ Nueva</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Total: <b>{totalCorp}%</b> / 50%
        </p>
        <ul className="mt-3 space-y-2">
          {corporativas.map((a) => (
            <li key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="font-medium">{a.nombre} <span className="text-xs text-muted-foreground">({a.peso}%)</span></p>
                {a.descripcion && <p className="text-xs text-muted-foreground">{a.descripcion}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {setAptitudEdit(a); setMostrarForm(true);}}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => onBorrarAptitud(a.id)}>Borrar</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* === Especiales === */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aptitudes Especiales</h2>
          <Button onClick={() => abrirNuevo("especial")}>+ Nueva</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Total: <b>{totalEsp}%</b> / 50%
        </p>
        <ul className="mt-3 space-y-2">
          {especiales.map((a) => (
            <li key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="font-medium">{a.nombre} <span className="text-xs text-muted-foreground">({a.peso}%)</span></p>
                {a.descripcion && <p className="text-xs text-muted-foreground">{a.descripcion}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {setAptitudEdit(a); setMostrarForm(true);}}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => onBorrarAptitud(a.id)}>Borrar</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* === Modal Form === */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-lg">
            <FormularioAptitud
              onGuardar={handleGuardar}
              onCancelar={() => { setMostrarForm(false); setAptitudEdit(null); }}
              datosIniciales={aptitudEdit?.id ? aptitudEdit : null}
              totalPesoActual={aptitudEdit?.tipo === "corporativa" ? totalCorp : totalEsp}
              scopeType={scopeType}
              areaNombre={areaNombre}
              sectorNombre={sectorNombre}
              empleadoNombre={empleadoNombre}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VistaAptitudes;
