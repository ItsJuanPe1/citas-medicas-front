import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import { GESTION_CITAS, ADMIN_CITAS, AUDITORIA, VER_MEDICOS, AGENDA_MEDICO, inicioDe } from "./auth/roles";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ReservarCita from "./pages/ReservarCita";
import Citas from "./pages/Citas";
import TodasCitas from "./pages/TodasCitas";
import Auditoria from "./pages/Auditoria";
import Inicio from "./pages/Inicio";
import MiAgenda from "./pages/MiAgenda";

// "/" lleva a cada rol a su pantalla principal
function RedirigirInicio() {
  const { user } = useAuth();
  return <Navigate to={inicioDe(user.rol)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><RedirigirInicio /></ProtectedRoute>} />
      <Route path="/inicio" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
      <Route path="/medicos" element={<ProtectedRoute roles={VER_MEDICOS}><Home /></ProtectedRoute>} />
      <Route path="/medico/agenda" element={<ProtectedRoute roles={AGENDA_MEDICO}><MiAgenda /></ProtectedRoute>} />
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
  );
}
