// Grupos de roles por modulo. Cada HU agrega el suyo aqui y lo usa en App.jsx y Shell.jsx.
export const GESTION_CITAS = ["PACIENTE", "RECEPCIONISTA", "SUPERADMIN"];
export const ADMIN_CITAS = ["SUPERADMIN", "GERENTE"];
export const AUDITORIA = ["SUPERADMIN"];
export const VER_MEDICOS = ["SUPERADMIN", "GERENTE", "RECEPCIONISTA"];
export const AGENDA_MEDICO = ["MEDICO"];
// export const MEDICAMENTOS = ["MEDICO", "FARMACEUTICO", "SUPERADMIN"]; // HU05, HU06

// Pantalla a la que llega cada rol al iniciar sesion. Cada HU nueva ajusta la de su rol.
const INICIO = {
    PACIENTE: "/citas",
    RECEPCIONISTA: "/citas",
    SUPERADMIN: "/admin/citas",
    GERENTE: "/admin/citas",
    MEDICO: "/medico/agenda",
    FARMACEUTICO: "/inicio", // pendiente: HU05
};
export const inicioDe = (rol) => INICIO[rol] ?? "/inicio";

// El paciente actua sobre si mismo; los demas roles eligen al paciente.
export const eligePaciente = (rol) => rol !== "PACIENTE";
