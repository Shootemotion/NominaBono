function getColumns(anio, zoom = "mes") {
  const cols = [];
  if (zoom === "mes") {
    for (let i = 0; i < 12; i++) {
      const mes = (i + 8) % 12;              // fiscal: Ago..Jul
      const y = mes < 8 ? anio + 1 : anio;
      const start = new Date(y, mes, 1);
      const end = new Date(y, mes + 1, 0, 23, 59, 59, 999);
      cols.push({
        key: `m-${y}-${mes}`,
        label: new Date(y, mes).toLocaleString("es-AR", { month: "short", year: "2-digit" }),
        start, end,
      });
    }
  } else {
    // Trimestres fiscales: T1(Ago-Oct), T2(Nov-Ene), T3(Feb-Abr), T4(May-Jul)
    const groups = [
      [7,8,9],      // Ago, Sep, Oct (año anio)
      [10,11,0],    // Nov, Dic, Ene (Ene es anio+1)
      [1,2,3],      // Feb, Mar, Abr (anio+1)
      [4,5,6],      // May, Jun, Jul (anio+1)
    ];
    groups.forEach((g, idx) => {
      const months = g.map(m => ({ m, y: m <= 6 ? anio + 1 : anio }));
      const start = new Date(months[0].y, months[0].m, 1);
      const end = new Date(months[2].y, months[2].m + 1, 0, 23, 59, 59, 999);
      cols.push({
        key: `t-${idx + 1}`,
        label: `T${idx + 1} ${String(end.getFullYear()).slice(-2)}`,
        start, end,
      });
    });
  }
  return cols;
}

export default function GanttView({ filtered, tipoFiltro, anio, zoom = "mes", openHitoModal }) {
  // Agrupar por objetivo/aptitud (_id), acumulando empleados visibles por filtros
  const grouped = new Map();
  filtered.forEach((r) => {
  const rawItems = [
  ...(tipoFiltro !== "aptitud"
    ? r.objetivos.items.map((i) => ({ ...i, _tipo: "objetivo" }))
    : []),
  ...(tipoFiltro !== "objetivo"
    ? r.aptitudes.items.map((i) => ({ ...i, _tipo: "aptitud" }))
    : []),
];
    rawItems.forEach((item) => {
      if (!grouped.has(item._id)) {
        grouped.set(item._id, { ...item, empleados: [r.empleado] });
      } else {
        grouped.get(item._id).empleados.push(r.empleado);
      }
    });
  });
  const items = Array.from(grouped.values());

  const cols = getColumns(anio, zoom);

  const cellBase = "min-w-[7.5rem] w-32 px-2 py-2 text-center align-middle border-l border-slate-200"; // 120px
  const headerCell = "sticky top-0 z-10 bg-slate-50/70 backdrop-blur border-l border-slate-200 text-xs font-medium";

  return (
  <div className="overflow-x-auto">
  <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-y border-slate-200">
            <th className="sticky left-0 z-20 bg-slate-50/70 backdrop-blur text-left px-3 py-2 w-1/3 min-w-[320px] font-semibold">
              Objetivo / Aptitud
            </th>
            {cols.map((c) => (
              <th key={c.key} className={`${cellBase} ${headerCell}`}>{c.label}</th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={item._id} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
  <td className="sticky left-0 z-10 bg-inherit px-3 py-2 max-w-[520px] truncate">
  <span
    className={`inline-flex items-center gap-1 font-medium ${
      item._tipo === "objetivo" ? "text-indigo-700" : "text-amber-700"
    }`}
  >
    {item._tipo === "objetivo" ? "🎯" : "💡"} {item.nombre}
  </span>
</td>

              {cols.map((c) => {
                // Hitos que caen dentro de la columna (mes o trimestre)
                const hitos = (item.hitos || []).filter((h) => {
                  const f = new Date(h.fecha);
                  return f >= c.start && f <= c.end;
                });

                return (
                  <td key={`${item._id}-${c.key}`} className={`${cellBase}`}>
                    {hitos.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {hitos.map((h, j) => {
                          const f = new Date(h.fecha);
                          const diff = (f - new Date()) / (1000 * 60 * 60 * 24);
                          let chip = "bg-emerald-500";
                          if (diff < 0) chip = "bg-rose-500";
                          else if (diff <= 7) chip = "bg-amber-500";

                          return (
                            <button
                              key={`${item._id}-${c.key}-${j}`}
                              onClick={() => openHitoModal(item, item.empleados, h)}
                              className={`px-2 py-0.5 rounded-full text-[11px] leading-5 text-white ${chip} hover:opacity-90`}
                              title={`${h.periodo} • ${item.empleados?.length || 0} empleados • ${f.toLocaleDateString("es-AR")}`}
                            >
                              {h.periodo}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
