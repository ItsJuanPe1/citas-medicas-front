import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { GESTION_CITAS, ADMIN_CITAS, AUDITORIA, VER_MEDICOS, AGENDA_MEDICO, inicioDe } from "../auth/roles";

const ROLES = {
  SUPERADMIN: "Superadmin",
  GERENTE: "Gerente",
  RECEPCIONISTA: "Recepcionista",
  MEDICO: "Médico",
  PACIENTE: "Paciente",
  FARMACEUTICO: "Farmacéutico",
};

// Enlaces del menu: si no hay "roles", lo ve cualquier usuario autenticado.
const ENLACES = [
  { to: "/inicio", label: "Inicio", roles: ["FARMACEUTICO"] },
  { to: "/medico/agenda", label: "Mi agenda", roles: AGENDA_MEDICO },
  { to: "/medicos", label: "Médicos", roles: VER_MEDICOS },
  { to: "/citas/nueva", label: "Reservar cita", roles: GESTION_CITAS },
  { to: "/citas", label: "Citas", roles: GESTION_CITAS },
  { to: "/admin/citas", label: "Todas las citas", roles: ADMIN_CITAS },
  { to: "/admin/auditoria", label: "Auditoría", roles: AUDITORIA },
];

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const visibles = ENLACES.filter((l) => !l.roles || l.roles.includes(user.rol));

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <Link to={inicioDe(user.rol)} className="brand">Citas médicas</Link>
          <nav className="nav" aria-label="Principal">
            {visibles.map((l) => (
              <NavLink key={l.to} to={l.to} end className="nav-link">
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="session">
          <span className="who">
            <strong>{user.username}</strong>
            <span className="role">{ROLES[user.rol] ?? user.rol}</span>
          </span>
          <button type="button" className="btn btn-quiet" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="main">{children}</main>
    </>
  );
}
