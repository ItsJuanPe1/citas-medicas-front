import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toast";

export default function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const contador = useRef(0);

    const quitar = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);

    const mostrar = useCallback(
        (tipo, texto) => {
            const id = ++contador.current;
            setItems((l) => [...l, { id, tipo, texto }]);
            setTimeout(() => quitar(id), tipo === "error" ? 8000 : 5000);
        },
        [quitar]
    );

    const api = useMemo(() => ({ ok: (t) => mostrar("ok", t), error: (t) => mostrar("error", t) }), [mostrar]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toasts">
                {items.map((t) => (
                    <div key={t.id} className={`toast toast-${t.tipo}`} role={t.tipo === "error" ? "alert" : "status"}>
                        <span>{t.texto}</span>
                        <button type="button" className="toast-close" onClick={() => quitar(t.id)} aria-label="Cerrar aviso">
                            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                                <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
