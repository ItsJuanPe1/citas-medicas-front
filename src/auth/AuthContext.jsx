import { createContext, useContext, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

// El token (JWT) trae su vencimiento; si ya paso, la sesion guardada no sirve.
function tokenVigente() {
  try {
    const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!tokenVigente()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  async function login(username, password) {
    const data = await api("/auth/login", { method: "POST", body: { username, password } });
    const u = { username: data.username, rol: data.rol, idEntidad: data.idEntidad };
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
