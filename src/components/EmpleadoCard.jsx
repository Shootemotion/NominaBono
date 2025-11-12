// src/components/EmpleadoCard.jsx
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { API_ORIGIN } from "@/lib/api";

const initials = (e) => {
  const n = `${e?.nombre ?? ""} ${e?.apellido ?? ""}`.trim();
  return n
    ? n.split(" ").slice(0, 2).map((x) => x[0]?.toUpperCase()).join("")
    : "—";
};

const fotoSrc = (empleado) => {
  const url = empleado?.fotoUrl;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url; // absoluta
  const base = (typeof API_ORIGIN === "string" && API_ORIGIN) ? API_ORIGIN : window.location.origin;
  return `${base.replace(/\/+$/, "")}/${String(url).replace(/^\/+/, "")}`;
};

function EmpleadoCard({ empleado, onEditar /* onEliminar ya no se usa aquí */ }) {
  const area = empleado?.area?.nombre ?? empleado?.area?.toString?.() ?? "—";
  const sector = empleado?.sector?.nombre ?? empleado?.sector?.toString?.() ?? null;
  const email = empleado?.email ?? empleado?.correo ?? "";
  const activo = empleado?.activo ?? true;
  const puesto = empleado?.puesto ?? "";
  const celular = empleado?.celular ?? empleado?.telefono ?? empleado?.movil ?? "";
  const img = useMemo(() => fotoSrc(empleado), [empleado?.fotoUrl]);

  return (
    <div className="group rounded-xl bg-card text-card-foreground shadow-md ring-1 ring-border/60 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
      <div className="grid grid-cols-[42%_1fr] h-[128px] md:h-[180px]">
        {/* Foto */}
        <div className="relative bg-muted/40 h-full">
          {img ? (
            <img
              src={img}
              alt={`${empleado?.nombre ?? ""} ${empleado?.apellido ?? ""}`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-12 w-12 rounded-lg grid place-items-center font-semibold text-base bg-muted/60">
                {initials(empleado)}
              </div>
            </div>
          )}
        </div>

        {/* Datos */}
        <div className="relative h-full p-3 md:p-4 flex flex-col min-w-0 pb-12">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold leading-tight truncate"
                title={`${empleado?.apellido}, ${empleado?.nombre}`}
              >
                {empleado?.apellido}, {empleado?.nombre}
              </h3>
              <span
                className={`h-2.5 w-2.5 rounded-full ${activo ? "bg-emerald-500" : "bg-gray-300"}`}
                title={activo ? "Activo" : "Inactivo"}
              />
            </div>

            {puesto && (
              <div className="mt-1.5">
                <span className="inline-flex items-center text-[12px] font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary ring-1 ring-primary/20">
                  {puesto}
                </span>
              </div>
            )}

            <div className="mt-1.5 space-y-0.5">
              {!!email && (
                <p className="text-xs text-muted-foreground truncate" title={email}>
                  {email}
                </p>
              )}
              {!!celular && (
                <p className="text-xs text-muted-foreground truncate" title={celular}>
                  📱 {celular}
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] rounded-full border px-2 py-0.5">Área: {area}</span>
              {sector && <span className="text-[11px] rounded-full border px-2 py-0.5">Sector: {sector}</span>}
            </div>
          </div>

       {/* Barra de acciones inferior */}
<div
  className="
    absolute inset-x-0 bottom-0
    bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80
    ring-1 ring-border/60 border-t border-border/60
    px-3 py-2
    flex items-center justify-center gap-3
    opacity-100 lg:opacity-0 lg:group-hover:opacity-100
    transition-opacity
  "
>
  <button
    onClick={onEditar}
    className="
      text-xs font-medium
      rounded-md px-3 py-1.5
      bg-slate-100 text-slate-700
      hover:bg-slate-200 hover:text-slate-900
      transition-colors
    "
  >
    ✏️ Editar
  </button>

  <a
    href={`/nomina/legajo/${empleado._id}`}
    className="
      text-xs font-medium
      rounded-md px-3 py-1.5
      bg-slate-100 text-slate-700
      hover:bg-slate-200 hover:text-slate-900
      transition-colors
    "
    title="Abrir legajo (CV, sueldo, estado laboral)"
  >
    📄 Legajo
  </a>
</div>
        </div>
      </div>
    </div>
  );
}

export default memo(EmpleadoCard);
