// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { Target, BarChart3, Calculator, Users, TrendingUp, CalendarDays, Shield } from "lucide-react";
import { getUser } from "@/lib/api";

function quarterLabel(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q}-${d.getFullYear()}`; // ej: Q3-2025
}

function initials(fullname = "") {
  return fullname
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join("") || "US";
}

const rolePretty = {
  superadmin: "Superadmin",
  rrhh: "RR.HH.",
  jefe_area: "Directivo",
  jefe_sector: "Jefe de Sector",
  empleado: "Colaborador",
};

export default function Home() {
  const user = getUser() || { nombre: "Usuario", rol: "jefe_area" };
  const periodo = quarterLabel();

  // reglas de acceso por tarjeta (ajustá a tu gusto)
  const can = (roles) => roles.includes(user?.rol);

  const CARDS = [
    {
      title: "Definir Objetivos",
      desc: "Crear y asignar objetivos por área, sector o individualmente",
      icon: Target,
      to: "/gestion-objetivos",
      allow: can(["superadmin", "rrhh", "jefe_area", "jefe_sector"]),
      color: "bg-teal-900/90",
      badge: "Acceso completo",
    },
        {
      title: "Seguimineto Ejecutivo",
      desc: "Crear y asignar objetivos por área, sector o individualmente",
      icon: Target,
      to: "/gestion-objetivos",
      allow: can(["superadmin", "rrhh", "jefe_area", "jefe_sector"]),
      color: "bg-teal-900/90",
      badge: "Acceso completo",
    },
    {
      title: "Seguimiento Ejecutivo",
      desc: "Vista global de rendimiento organizacional",
      icon: BarChart3,
      to: "/seguimiento-ejecutivo",
      allow: can(["superadmin", "rrhh", "jefe_area"]),
      color: "bg-sky-900/90",
      badge: can(["superadmin", "rrhh", "jefe_area"]) ? "Acceso completo" : "Sin acceso",
    },
    {
      title: "Cálculo de Bonos",
      desc: "Gestión y exportación de bonificaciones anuales",
      icon: Calculator,
      // si no tenés ruta aún, podés dejar "#" o reutilizar /seguimiento
      to: "/seguimiento",
      allow: can(["superadmin", "rrhh"]),
      color: "bg-emerald-900/90",
      badge: can(["superadmin", "rrhh"]) ? "Acceso completo" : "Sin acceso",
    },

    
    {
      title: "Gestión de Equipo",
      desc: "Administrar empleados, áreas y sectores",
      icon: Users,
      to: "/gestion-estructura",
      allow: can(["superadmin", "rrhh", "jefe_area"]),
      color: "bg-cyan-900/90",
      badge: can(["superadmin", "rrhh", "jefe_area"]) ? "Acceso completo" : "Sin acceso",
    },
    {
      title: "Seguimiento",
      desc: "Monitorear progreso de objetivos y aptitudes",
      icon: TrendingUp,
      to: "/mi-desempeno",
      allow: can(["superadmin", "rrhh", "jefe_area", "jefe_sector", "empleado"]),
      color: "bg-indigo-900/90",
      badge: "Acceso completo",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header grande */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-border">
        <div className="bg-[#075C66] text-white px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/10 grid place-items-center text-2xl font-semibold">
              {initials(user?.nombre)}
            </div>
            <div>
              <h1 className="text-3xl font-bold leading-tight">Bienvenido, {user?.nombre?.split(" ")[0] || "Usuario"}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                  <Shield className="h-4 w-4" />
                  {rolePretty[user?.rol] || "Usuario"}
                </span>
                <span className="opacity-80">·</span>
                <span className="opacity-90">Portal de Desempeño</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <CalendarDays className="h-5 w-5" />
            <div className="text-sm">
              <div className="opacity-80">Período Actual</div>
              <div className="font-semibold">{periodo}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Título navegación */}
      <h2 className="text-xl font-semibold">Navegación del Sistema</h2>

      {/* Grid de tarjetas */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(({ title, desc, icon: Icon, to, allow, color, badge }) => {
          const body = (
            <div
              className={[
                "group rounded-xl border border-border bg-card hover:shadow-md transition overflow-hidden",
                !allow ? "opacity-55 pointer-events-none" : "",
              ].join(" ")}
            >
              <div className={`h-16 ${color} text-white flex items-center justify-between px-4`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-semibold">{title}</div>
                </div>
                <span className="text-[11px] tracking-wide rounded-full bg-white/10 px-2 py-0.5">
                  {badge}
                </span>
              </div>
              <div className="p-4 text-sm text-muted-foreground">
                {desc}
              </div>
            </div>
          );

          return allow ? (
            <Link to={to} key={title} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
              {body}
            </Link>
          ) : (
            <div key={title}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
