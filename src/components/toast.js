import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

/** const toast = useToast();  toast.ok("Guardado");  toast.error("No se pudo guardar"); */
export const useToast = () => useContext(ToastContext);
