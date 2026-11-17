import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  // Clave temporal: hasta que la cambie, solo puede estar en la pantalla de cambio de clave
  if (user.debeCambiarClave && pathname !== "/cambiar-clave") return <Navigate to="/cambiar-clave" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return children;
}
