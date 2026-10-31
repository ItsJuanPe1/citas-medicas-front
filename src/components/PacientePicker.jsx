import { useState } from "react";
import { api } from "../api";

/** Buscador de paciente para la recepcionista. value = paciente elegido o null. */
export default function PacientePicker({ value, onChange }) {
    const [q, setQ] = useState("");
    const [resultados, setResultados] = useState(null);
    const [error, setError] = useState(null);

    async function buscar(e) {
        e.preventDefault();
        if (q.trim().length < 2) return;
        setError(null);
        try {
            setResultados(await api(`/pacientes?q=${encodeURIComponent(q.trim())}`));
        } catch (err) {
            setError(err.message);
        }
    }

    function cambiar() {
        onChange(null);
        setResultados(null);
    }

    if (value) {
        return (
            <p className="chosen">
                <span>
                    <strong>{value.nombre} {value.apellido}</strong>
                    <span className="cell-sub"> · {value.documento}</span>
                </span>
                <button type="button" className="link-btn" onClick={cambiar}>Cambiar</button>
            </p>
        );
    }

    return (
        <>
            <form className="search-row" onSubmit={buscar}>
                <input
                    type="search"
                    aria-label="Buscar paciente por documento o nombre"
                    placeholder="Documento o nombre"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn btn-secondary" disabled={q.trim().length < 2}>Buscar</button>
            </form>
            {error && <p className="alert">{error}</p>}
            {resultados && resultados.length === 0 && <p className="cell-sub">No se encontraron pacientes.</p>}
            {resultados && resultados.length > 0 && (
                <ul className="pick-list">
                    {resultados.map((p) => (
                        <li key={p.id}>
                            <button type="button" onClick={() => onChange(p)}>
                                <strong>{p.nombre} {p.apellido}</strong>
                                <span className="cell-sub">{p.documento}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
