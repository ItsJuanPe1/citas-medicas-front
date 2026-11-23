import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import { GESTION_CITAS, ADMIN_CITAS, AUDITORIA, VER_MEDICOS, AGENDA_MEDICO, HORARIO, FARMACIA, USUARIOS, CANCELACION_MASIVA, REPORTES, inicioDe } from "./auth/roles";

const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const ReservarCita = lazy(() => import("./pages/ReservarCita"));
const Citas = lazy(() => import("./pages/Citas"));
const TodasCitas = lazy(() => import("./pages/TodasCitas"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const Inicio = lazy(() => import("./pages/Inicio"));
const MiAgenda = lazy(() => import("./pages/MiAgenda"));
const Horario = lazy(() => import("./pages/Horario"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Farmacia = lazy(() => import("./pages/Farmacia"));
const CambiarClave = lazy(() => import("./pages/CambiarClave"));
const Registro = lazy(() => import("./pages/Registro"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Stock = lazy(() => import("./pages/Stock"));
const CancelacionMasiva = lazy(() => import("./pages/CancelacionMasiva"));
const Reporte = lazy(() => import("./pages/Reporte"));

// "/" lleva a cada rol a su pantalla principal
function RedirigirInicio() {
  const { user } = useAuth();
  return <Navigate to={inicioDe(user.rol)} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="state" style={{ minHeight: "50vh" }}><span>Cargando…</span></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/admin/usuarios" element={<ProtectedRoute roles={USUARIOS}><Usuarios /></ProtectedRoute>} />
        <Route path="/admin/cancelacion-masiva" element={<ProtectedRoute roles={CANCELACION_MASIVA}><CancelacionMasiva /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><RedirigirInicio /></ProtectedRoute>} />
        <Route path="/inicio" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
        <Route path="/medicos" element={<ProtectedRoute roles={VER_MEDICOS}><Home /></ProtectedRoute>} />
        <Route path="/medico/agenda" element={<ProtectedRoute roles={AGENDA_MEDICO}><MiAgenda /></ProtectedRoute>} />
        <Route path="/medico/horario" element={<ProtectedRoute roles={HORARIO}><Horario /></ProtectedRoute>} />
        <Route path="/farmacia" element={<ProtectedRoute roles={FARMACIA}><Farmacia /></ProtectedRoute>} />
        <Route path="/farmacia/stock" element={<ProtectedRoute roles={FARMACIA}><Stock /></ProtectedRoute>} />
        <Route path="/cambiar-clave" element={<ProtectedRoute><CambiarClave /></ProtectedRoute>} />
        <Route path="/reporte" element={<ProtectedRoute roles={REPORTES}><Reporte /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route
          path="/citas/nueva"
          element={<ProtectedRoute roles={GESTION_CITAS}><ReservarCita /></ProtectedRoute>}
        />
        <Route
          path="/citas"
          element={<ProtectedRoute roles={GESTION_CITAS}><Citas /></ProtectedRoute>}
        />
        <Route
          path="/admin/citas"
          element={<ProtectedRoute roles={ADMIN_CITAS}><TodasCitas /></ProtectedRoute>}
        />
        <Route
          path="/admin/auditoria"
          element={<ProtectedRoute roles={AUDITORIA}><Auditoria /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
