// src/pages/LegajoEmpleado.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import CarreraTable from "@/components/CarreraTable.jsx";
import CapacitacionesTable from "@/components/CapacitacionesTable.jsx";
import { API_ORIGIN } from "@/lib/api";

/* ---------- UI helpers ---------- */
const EstadoTag = ({ estado = "ACTIVO" }) => {
  const map = {
    ACTIVO: "bg-emerald-100 text-emerald-700",
    SUSPENDIDO: "bg-amber-100 text-amber-800",
    DESVINCULADO: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] ${map[estado] || "bg-slate-100 text-slate-700"}`}>
      {estado}
    </span>
  );
};

const Label = ({ children }) => (
  <div className="text-[11px] text-muted-foreground mb-1">{children}</div>
);

const Field = ({ label, value }) => (
  <div>
    <Label>{label}</Label>
    <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-2 text-sm">{value ?? "—"}</div>
  </div>
);

const FieldInput = ({ label, type = "text", value, onChange, disabled }) => (
  <div>
    <Label>{label}</Label>
    <input
      type={type}
      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  </div>
);

const fmtMoney = (n, cur = "ARS") =>
  (n === null || n === undefined || n === "") ? "—"
  : new Intl.NumberFormat("es-AR", { style: "currency", currency: cur, maximumFractionDigits: 2 })
      .format(Number(n));

/* ---------- helpers de imagen (mismos que en EmpleadoCard) ---------- */
const fotoSrc = (empleado) => {
  const url = empleado?.fotoUrl;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (typeof API_ORIGIN === "string" && API_ORIGIN) ? API_ORIGIN : window.location.origin;
  return `${base.replace(/\/+$/, "")}/${String(url).replace(/^\/+/, "")}`;
};

/* ---------- Pestañas ---------- */
const TABS = ["Informacion basica", "Datos laborales", "Capacitaciones", "Documentos"];

/* ---------- fallback de puestos/categorías ---------- */
const DEFAULT_PUESTOS = [
  "Director General",
  "Director Financiero, Administración e Innovación",
  "Director Recursos Humanos",
  "Jefe de Área Administrativa - Contable",
  "Jefe de Atención al Cliente y Sucursales",
  "Jefe de RRHH y Relaciones Institucionales",
  "Auxiliares Maestranza",
  "Auxiliar Logística y Mantenimiento",
  "Analista de Compras",
  "Analista Contabilidad y Control de Gestión",
  "Analistas de Tesorería",
  "Analistas de Facturación",
  "Coordinador de Facturación",
  "Analista de Informática y Sistemas",
  "Supervisor de Atención al Cliente",
  "Coord. de Consultorios",
  "Coord. de Recepción",
  "Recepcionista",
  "Supervisor de Etapa Preanalítica",
  "Extraccionista",
  "Técnico de Laboratorio",
  "Supervisor de Etapa Analítica",
  "Supervisor de Etapa Post-analítica",
  "Bioquímico",
  "Coordinador de Calidad",
  "Analista de Finanzas",
];
const DEFAULT_CATS = ["Staff", "Profesional", "Jefatura", "Gerencia", "Dirección"];

export default function LegajoEmpleado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRRHH = !!(user?.isSuper || user?.isRRHH || user?.caps?.includes?.("nomina:editar"));

  // Catálogos para pick lists
  const [areas, setAreas] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [puestos, setPuestos] = useState(DEFAULT_PUESTOS);
  const [categorias] = useState(DEFAULT_CATS);

  // Tab desde URL (?tab=datos-laborales)
  const initialTab = (() => {
    const q = (searchParams.get("tab") || "").toLowerCase();
    const map = {
      "informacion-basica": TABS[0],
      "datos-laborales": TABS[1],
      "capacitaciones": TABS[2],
      "documentos": TABS[3],
    };
    return map[q] || TABS[0];
  })();
  const [tab, setTab] = useState(initialTab);

  // Formularios
  const [estadoLaboral, setEstadoLaboral] = useState("ACTIVO");
  const [cvFile, setCvFile] = useState(null);
  const [sueldo, setSueldo] = useState({
    monto: "",
    moneda: "ARS",
    vigenteDesde: new Date().toISOString().slice(0, 10),
  });

  // Edición de info básica (CENTRO)
  const [editBasic, setEditBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    celular: "",
    domicilio: "",
    categoria: "",
    puesto: "",
    area: "",
    sector: "",
    fechaIngreso: new Date().toISOString().slice(0,10),
    dni: "",
    cuil: "",
  });

  // Resúmenes (chips)
  const [resumeCarrera, setResumeCarrera] = useState({ ultimoPuesto: null });
  const [resumeCaps, setResumeCaps] = useState({ total: 0, vencen30: 0 });

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const [e, a, s] = await Promise.all([
          api(`/empleados/${id}`),
          api(`/areas`).catch(() => []),
          api(`/sectores`).catch(() => []),
        ]);
        setEmp(e);
        setAreas(a || []);
        setSectores(s || []);
        setEstadoLaboral(e?.estadoLaboral || "ACTIVO");

        setSueldo({
          monto: e?.sueldoBase?.monto ?? "",
          moneda: e?.sueldoBase?.moneda ?? "ARS",
          vigenteDesde: e?.sueldoBase?.vigenteDesde
            ? String(e.sueldoBase.vigenteDesde).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        });

        setBasicForm({
          nombre: e?.nombre ?? "",
          apellido: e?.apellido ?? "",
          email: e?.email ?? "",
          celular: e?.celular ?? "",
          domicilio: e?.domicilio ?? "",
          categoria: e?.categoria ?? "",
          puesto: e?.puesto ?? "",
          area: e?.area?._id || e?.area || "",
          sector: e?.sector?._id || e?.sector || "",
          fechaIngreso: e?.fechaIngreso ? String(e.fechaIngreso).slice(0,10) : new Date().toISOString().slice(0,10),
          dni: e?.dni ?? "",
          cuil: e?.cuil ?? "",
        });
      } catch (err) {
        console.error(err);
        toast.error("No se pudo cargar el legajo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Traer puestos si hay endpoint (no rompe si 404)
  useEffect(() => {
    (async () => {
      try {
        const p = await api(`/puestos`).catch(() => null);
        if (Array.isArray(p) && p.length) {
          const nombres = p.map((x) => x?.nombre).filter(Boolean);
          if (nombres.length) setPuestos(nombres);
        }
      } catch {/* noop */}
    })();
  }, []);

  // Resúmenes opcionales
  useEffect(() => {
    (async () => {
      try {
        const r = await api(`/empleados/${id}/carrera/resumen`).catch(() => null);
        if (r) setResumeCarrera({ ultimoPuesto: r?.ultimoPuesto || null });
      } catch {}
      try {
        const c = await api(`/empleados/${id}/capacitaciones/resumen`).catch(() => null);
        if (c) setResumeCaps({ total: Number(c?.total || 0), vencen30: Number(c?.vencen30 || 0) });
      } catch {}
    })();
  }, [id]);

  // Persistir tab en URL
  useEffect(() => {
    const key =
      tab === TABS[0]
        ? "informacion-basica"
        : tab === TABS[1]
        ? "datos-laborales"
        : tab === TABS[2]
        ? "capacitaciones"
        : "documentos";
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", key);
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const historico = useMemo(() => {
    const h = emp?.sueldoBase?.historico || [];
    return h.slice().sort((a, b) => new Date(b?.desde || 0) - new Date(a?.desde || 0));
  }, [emp]);

  const sectoresFiltrados = useMemo(() => {
    if (!basicForm.area) return sectores;
    return (sectores || []).filter((s) => {
      const idArea = String(s?.areaId?._id || s?.areaId || "");
      return idArea === String(basicForm.area);
    });
  }, [basicForm.area, sectores]);

  /* ---------- Acciones ---------- */
  const onBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/gestion-estructura");
  };

  const onGuardarEstado = async () => {
    try {
      const resp = await api(`/empleados/${id}`, { method: "PATCH", body: { estadoLaboral } });
      const upd = resp?.empleado || resp;
      setEmp(upd);
      toast.success("Estado laboral actualizado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el estado.");
    }
  };

  const onGuardarBasica = async () => {
    try {
      const payload = { ...basicForm };
      if (payload.area && payload.area._id) payload.area = payload.area._id;
      if (payload.sector && payload.sector._id) payload.sector = payload.sector._id;

      const resp = await api(`/empleados/${id}`, { method: "PATCH", body: payload });
      const upd = resp?.empleado || resp;
      setEmp(upd);
      setEditBasic(false);
      toast.success("Información básica actualizada.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la información básica.");
    }
  };

  const onGuardarSueldo = async () => {
    try {
      const payload = {
        monto: Number(sueldo.monto),
        moneda: sueldo.moneda || "ARS",
        vigenteDesde: sueldo.vigenteDesde ? new Date(sueldo.vigenteDesde) : new Date(),
      };
      if (!payload.monto || payload.monto <= 0) return toast.error("Ingresá un monto válido.");
      const resp = await api(`/empleados/${id}/sueldo`, { method: "POST", body: payload });
      const updEmp = resp?.empleado || resp;
      setEmp(updEmp);
      setSueldo({
        monto: updEmp?.sueldoBase?.monto ?? "",
        moneda: updEmp?.sueldoBase?.moneda ?? "ARS",
        vigenteDesde: updEmp?.sueldoBase?.vigenteDesde
          ? String(updEmp.sueldoBase.vigenteDesde).slice(0, 10)
          : sueldo.vigenteDesde,
      });
      toast.success("Sueldo actualizado y registrado en histórico.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el sueldo.");
    }
  };

  const onSubirCV = async () => {
    if (!cvFile) return toast.info("Seleccioná un archivo .pdf/.docx primero.");
    try {
      const fd = new FormData();
      fd.append("cv", cvFile);
      const resp = await api(`/empleados/${id}/cv`, { method: "POST", body: fd });
      const upd = resp?.empleado || resp;
      setEmp(upd);
      setCvFile(null);
      toast.success("CV subido.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo subir el CV.");
    }
  };

  if (loading) return <div className="p-6">Cargando…</div>;
  if (!emp) return <div className="p-6 text-sm text-muted-foreground">Empleado no encontrado.</div>;

  // Chips
  const sueldoVigenteTxt = fmtMoney(emp?.sueldoBase?.monto, emp?.sueldoBase?.moneda);
  const ultimoPuesto = resumeCarrera?.ultimoPuesto || emp?.puesto || "—";
  const capsTotales = resumeCaps?.total ?? 0;
  const capsVencen = resumeCaps?.vencen30 ?? 0;

  const avatar = fotoSrc(emp);

  return (
    <div className="min-h-screen bg-[#f5f9fc]">
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-card/95 backdrop-blur ring-1 ring-border/60 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full ring-1 ring-border/60 overflow-hidden bg-muted/40">
              {avatar ? (
                <img src={avatar} alt="foto" className="h-full w-full object-cover" />
              ) : (
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    `${emp.nombre} ${emp.apellido}`
                  )}`}
                  alt="iniciales"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {emp.apellido?.toUpperCase()}, {emp.nombre?.toUpperCase()}
              </h1>
              <div className="text-xs text-muted-foreground">{emp.puesto || "—"}</div>
              <div className="mt-1">
                <EstadoTag estado={emp?.estadoLaboral || "ACTIVO"} />
              </div>
            </div>
          </div>

          {/* Estado laboral en cabecera */}
          <div className="flex items-center gap-2">
            <select
              disabled={!isRRHH}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              value={estadoLaboral}
              onChange={(e) => setEstadoLaboral(e.target.value)}
              title="Estado laboral"
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="SUSPENDIDO">SUSPENDIDO</option>
              <option value="DESVINCULADO">DESVINCULADO</option>
            </select>
            <button
              disabled={!isRRHH}
              onClick={onGuardarEstado}
              className="rounded-md px-3 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Guardar estado
            </button>
            <button onClick={onBack} className="text-sm px-3 py-2 rounded-md bg-muted hover:bg-muted/70">
              Volver
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar IZQUIERDO: Chips + snapshot + tips */}
          <aside className="lg:col-span-1 space-y-4">
            {/* Chips resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <div className="text-[11px] text-muted-foreground">Sueldo vigente</div>
                <div className="text-base font-semibold">{sueldoVigenteTxt}</div>
                <div className="text-[11px] text-muted-foreground">
                  Desde {emp?.sueldoBase?.vigenteDesde ? String(emp.sueldoBase.vigenteDesde).slice(0,10) : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <div className="text-[11px] text-muted-foreground">Último puesto</div>
                <div className="text-base font-semibold">{ultimoPuesto}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <div className="text-[11px] text-muted-foreground">Capacitaciones</div>
                <div className="text-base font-semibold">{capsTotales}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <div className="text-[11px] text-muted-foreground">Vencen 30 días</div>
                <div className="text-base font-semibold">{capsVencen}</div>
              </div>
            </div>

            {/* Snapshot */}
            <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>DNI: <b className="text-foreground">{emp.dni}</b></div>
                <div>CUIL: <b className="text-foreground">{emp.cuil}</b></div>
                <div>
                  Ingreso:{" "}
                  <b className="text-foreground">
                    {emp.fechaIngreso ? String(emp.fechaIngreso).slice(0, 10) : "—"}
                  </b>
                </div>
                <div>Área: <b className="text-foreground">{emp?.area?.nombre || "—"}</b></div>
                <div className="col-span-2">Sector: <b className="text-foreground">{emp?.sector?.nombre || "—"}</b></div>
              </div>
            </div>

            {/* Tips / accesos */}
            <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
              <div className="text-sm font-semibold mb-2">Accesos rápidos</div>
              <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Cambiar estado laboral desde el header</li>
                <li>Editar datos desde “Información básica”</li>
                <li>Actualizar sueldo en “Datos laborales”</li>
              </ul>
            </div>
          </aside>

          {/* PANEL CENTRAL: Tabs siempre arriba + contenido */}
          <section className="lg:col-span-2 space-y-4">
            {/* Tabs (sticky en el panel central) */}
            <div className="sticky top-4 z-10">
              <div className="rounded-lg bg-card/95 backdrop-blur ring-1 ring-border/60 p-2">
                <div className="flex gap-2 flex-wrap">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1.5 rounded-md text-sm ring-1 ring-border/60 ${
                        tab === t ? "bg-background shadow-sm" : "bg-muted hover:bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contenido por pestaña */}
            {/* Información básica */}
            {tab === "Informacion basica" && (
              <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Información básica</h3>
                  {!editBasic ? (
                    <button
                      onClick={() => setEditBasic(true)}
                      className="text-xs rounded-md px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Editar
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={onGuardarBasica}
                        className="text-xs rounded-md px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditBasic(false);
                          setBasicForm({
                            nombre: emp?.nombre ?? "",
                            apellido: emp?.apellido ?? "",
                            email: emp?.email ?? "",
                            celular: emp?.celular ?? "",
                            domicilio: emp?.domicilio ?? "",
                            categoria: emp?.categoria ?? "",
                            puesto: emp?.puesto ?? "",
                            area: emp?.area?._id || emp?.area || "",
                            sector: emp?.sector?._id || emp?.sector || "",
                            fechaIngreso: emp?.fechaIngreso ? String(emp.fechaIngreso).slice(0,10) : new Date().toISOString().slice(0,10),
                            dni: emp?.dni ?? "",
                            cuil: emp?.cuil ?? "",
                          });
                        }}
                        className="text-xs rounded-md px-3 py-1.5 bg-muted hover:bg-muted/70"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {!editBasic ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Nombre" value={emp.nombre} />
                    <Field label="Apellido" value={emp.apellido} />
                    <Field label="Email" value={emp.email || "—"} />
                    <Field label="Celular" value={emp.celular || "—"} />
                    <Field label="Domicilio" value={emp.domicilio || "—"} />
                    <Field label="Categoría" value={emp.categoria || "—"} />
                    <Field label="Puesto" value={emp.puesto || "—"} />
                    <Field label="Área" value={emp?.area?.nombre || "—"} />
                    <Field label="Sector" value={emp?.sector?.nombre || "—"} />
                    <Field label="Fecha de ingreso" value={emp?.fechaIngreso ? String(emp.fechaIngreso).slice(0,10) : "—"} />
                    <Field label="DNI" value={emp?.dni || "—"} />
                    <Field label="CUIL" value={emp?.cuil || "—"} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldInput label="Nombre" value={basicForm.nombre} onChange={(v) => setBasicForm(s => ({ ...s, nombre: v }))} />
                    <FieldInput label="Apellido" value={basicForm.apellido} onChange={(v) => setBasicForm(s => ({ ...s, apellido: v }))} />
                    <FieldInput label="Email" type="email" value={basicForm.email} onChange={(v) => setBasicForm(s => ({ ...s, email: v }))} />
                    <FieldInput label="Celular" value={basicForm.celular} onChange={(v) => setBasicForm(s => ({ ...s, celular: v }))} />
                    <FieldInput label="Domicilio" value={basicForm.domicilio} onChange={(v) => setBasicForm(s => ({ ...s, domicilio: v }))} />

                    <div>
                      <Label>Puesto</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={basicForm.puesto}
                        onChange={(e) => setBasicForm(s => ({ ...s, puesto: e.target.value }))}
                      >
                        <option value="">{puestos.length ? "Seleccionar puesto" : "Sin opciones"}</option>
                        {puestos.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Categoría</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={basicForm.categoria}
                        onChange={(e) => setBasicForm(s => ({ ...s, categoria: e.target.value }))}
                      >
                        <option value="">Seleccionar categoría</option>
                        {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <Label>Área</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={basicForm.area}
                        onChange={(e) => {
                          const areaId = e.target.value;
                          setBasicForm(s => ({ ...s, area: areaId, sector: "" }));
                        }}
                      >
                        <option value="">{areas.length ? "Seleccione un área" : "No hay áreas"}</option>
                        {areas.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Sector</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={basicForm.sector}
                        onChange={(e) => setBasicForm(s => ({ ...s, sector: e.target.value }))}
                        disabled={!basicForm.area || sectoresFiltrados.length === 0}
                      >
                        <option value="">
                          {!basicForm.area ? "Elegí un área primero" : (sectoresFiltrados.length ? "Seleccione un sector" : "Sin sectores")}
                        </option>
                        {sectoresFiltrados.map(s => <option key={s._id} value={s._id}>{s.nombre}</option>)}
                      </select>
                    </div>

                    <FieldInput label="Fecha de ingreso" type="date" value={basicForm.fechaIngreso} onChange={(v) => setBasicForm(s => ({ ...s, fechaIngreso: v }))} />
                    <FieldInput label="DNI" value={basicForm.dni} onChange={(v) => setBasicForm(s => ({ ...s, dni: v }))} />
                    <FieldInput label="CUIL" value={basicForm.cuil} onChange={(v) => setBasicForm(s => ({ ...s, cuil: v }))} />
                  </div>
                )}
              </div>
            )}

            {/* Datos laborales */}
            {tab === "Datos laborales" && (
              <>
                <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Sueldo base</h3>
                  </div>

                  {/* ACTUAL */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Sueldo actual</div>
                      <div className="text-xl font-semibold">
                        {fmtMoney(emp?.sueldoBase?.monto, emp?.sueldoBase?.moneda)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vigente desde {emp?.sueldoBase?.vigenteDesde ? String(emp.sueldoBase.vigenteDesde).slice(0,10) : "—"}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Vigente</span>
                  </div>

                  {/* FORM ACTUALIZAR */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <FieldInput
                      label="Monto"
                      type="number"
                      value={sueldo.monto}
                      onChange={(v) => setSueldo((s) => ({ ...s, monto: v }))}
                      disabled={!isRRHH}
                    />
                    <div>
                      <Label>Moneda</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={sueldo.moneda}
                        onChange={(e) => setSueldo((s) => ({ ...s, moneda: e.target.value }))}
                        disabled={!isRRHH}
                      >
                        <option>ARS</option>
                        <option>USD</option>
                      </select>
                    </div>
                    <FieldInput
                      label="Vigente desde"
                      type="date"
                      value={sueldo.vigenteDesde}
                      onChange={(v) => setSueldo((s) => ({ ...s, vigenteDesde: v }))}
                      disabled={!isRRHH}
                    />
                    <div className="flex items-end">
                      <button
                        disabled={!isRRHH}
                        onClick={onGuardarSueldo}
                        className="w-full rounded-md px-3 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Actualizar sueldo
                      </button>
                    </div>
                  </div>

                  {/* HISTÓRICO */}
                  <div className="mt-4">
                    <div className="text-[11px] text-muted-foreground mb-1">Histórico (no incluye el vigente)</div>
                    <div className="overflow-x-auto">
                      <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60">
                        <table className="min-w-[560px] w-full text-sm table-auto">
                          <thead className="sticky top-0 bg-muted/40">
                            <tr className="text-[11px] uppercase text-muted-foreground">
                              <th className="text-left px-3 py-2">Desde</th>
                              <th className="text-left px-3 py-2">Hasta</th>
                              <th className="text-left px-3 py-2">Monto</th>
                              <th className="text-left px-3 py-2">Moneda</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historico.length ? (
                              historico.map((h, i) => (
                                <tr key={i} className="border-t border-border/50 odd:bg-background even:bg-muted/20">
                                  <td className="px-3 py-2">{h?.desde ? String(h.desde).slice(0,10) : "—"}</td>
                                  <td className="px-3 py-2">{h?.hasta ? String(h.hasta).slice(0,10) : "—"}</td>
                                  <td className="px-3 py-2">{fmtMoney(h?.monto, h?.moneda)}</td>
                                  <td className="px-3 py-2">{h?.moneda ?? "—"}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-3 py-2 text-sm text-muted-foreground" colSpan={4}>
                                  Sin registros previos.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Carrera / Historial de puestos */}
                <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
                  <h3 className="text-sm font-semibold mb-2">Carrera / Historial de puestos</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-0">
                      <CarreraTable empleadoId={id} canEdit={isRRHH} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Capacitaciones */}
            {tab === "Capacitaciones" && (
              <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
                <h3 className="text-sm font-semibold mb-2">Capacitaciones</h3>
                <div className="overflow-x-auto">
                  <div className="min-w-0">
                    <CapacitacionesTable empleadoId={id} canEdit={isRRHH} />
                  </div>
                </div>
              </div>
            )}

            {/* Documentos */}
            {tab === "Documentos" && (
              <div className="rounded-xl bg-card ring-1 ring-border/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">CV del empleado</h3>
                  {emp?.cvUrl && (
                    <a
                      href={`${/^https?:\/\//i.test(emp.cvUrl) ? emp.cvUrl : `/${emp.cvUrl}`}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline"
                    >
                      Ver CV actual
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    disabled={!isRRHH}
                  />
                  <button
                    disabled={!isRRHH}
                    onClick={onSubirCV}
                    className="rounded-md px-3 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Subir CV
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Formatos: PDF, DOC, DOCX. Máx 5 MB.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
