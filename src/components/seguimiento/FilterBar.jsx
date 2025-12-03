export default function FilterBar({
  anio, setAnio,
  areaFiltro, setAreaFiltro, areasUnicas,
  sectorFiltro, setSectorFiltro, sectoresUnicos,
  empQuery, setEmpQuery,
  empSelectedId, setEmpSelectedId,
  empHints, showEmpHints, setShowEmpHints,
  mainTab, setMainTab
}) {
  return (
    <div className="card p-4 mb-4 space-y-4">
      {/* TABS INTEGRADOS */}
      <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setMainTab("objetivos")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mainTab === "objetivos"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
        >
          🎯 Objetivos y Metas
        </button>
        <button
          onClick={() => setMainTab("feedback")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mainTab === "feedback"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
        >
          💬 Reuniones de Feedback
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">Año</label>
          <input
            type="number"
            className="w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Área</label>
          <select
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/40 outline-none"
          >
            {areasUnicas.map((a) => (
              <option key={a._id} value={a._id}>{a.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Sector</label>
          <select
            value={sectorFiltro}
            onChange={(e) => setSectorFiltro(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/40 outline-none"
          >
            {sectoresUnicos.map((s) => (
              <option key={s._id} value={s._id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="text-xs text-muted-foreground">Empleado (buscador)</label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
            placeholder="Escribí nombre, sector o área…"
            value={empQuery}
            onChange={(e) => {
              setEmpQuery(e.target.value);
              setShowEmpHints(true);
              setEmpSelectedId(null);
            }}
            onFocus={() => setShowEmpHints(true)}
            onBlur={() => setTimeout(() => setShowEmpHints(false), 150)}
          />
          {showEmpHints && empHints.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
              {empHints.map((h) => (
                <button
                  key={h._id}
                  onClick={() => {
                    setEmpSelectedId(h._id);
                    setEmpQuery(h.label);
                    setShowEmpHints(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/70 transition"
                >
                  <div className="font-medium truncate">{h.label}</div>
                  <div className="text-[11px] text-muted-foreground">{h.area} · {h.sector}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
