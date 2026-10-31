import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";

function SortTh({ campo, sort, onSort, children }) {
  const activo = sort.key === campo;
  const aria = activo ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={aria}>
      <button type="button" className="th-btn" onClick={() => onSort(campo)}>
        {children}
        <svg className="sort" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 7.5 6 4.5l3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </th>
  );
}

export default function Home() {
  const [medicos, setMedicos] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "apellido", dir: "asc" });

  useEffect(() => {
    let activo = true;
    api("/medicos")
      .then((d) => activo && setMedicos(d))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [intento]);

  function reintentar() {
    setError(null);
    setMedicos(null);
    setIntento((n) => n + 1);
  }

  function ordenarPor(key) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  const filas = useMemo(() => {
    if (!medicos) return [];
    const t = q.trim().toLowerCase();
    const f = t
      ? medicos.filter((m) => `${m.nombre} ${m.apellido} ${m.especialidad}`.toLowerCase().includes(t))
      : medicos;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...f].sort((a, b) => String(a[sort.key]).localeCompare(String(b[sort.key]), "es") * dir);
  }, [medicos, q, sort]);

  return (
    <Shell>
      <div className="page-head">
        <h1>Médicos</h1>
        <p>{medicos ? `${medicos.length} médicos registrados` : "Cargando…"}</p>
      </div>

      <div className="toolbar">
        <label htmlFor="buscar" className="sr-only">
          Buscar médico o especialidad
        </label>
        <input
          id="buscar"
          type="search"
          placeholder="Buscar médico o especialidad"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        {error ? (
          <div className="state" role="alert">
            <strong>No se pudo cargar la lista</strong>
            <span>{error}</span>
            <button type="button" className="btn btn-primary" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <SortTh campo="apellido" sort={sort} onSort={ordenarPor}>Médico</SortTh>
                <SortTh campo="especialidad" sort={sort} onSort={ordenarPor}>Especialidad</SortTh>
              </tr>
            </thead>
            <tbody>
              {!medicos &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    <td><span className="skeleton" style={{ width: "55%" }} /></td>
                    <td><span className="skeleton" style={{ width: "40%" }} /></td>
                  </tr>
                ))}
              {medicos && filas.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <div className="state">
                      <strong>Sin resultados</strong>
                      <span>Prueba con otro nombre o una especialidad distinta.</span>
                    </div>
                  </td>
                </tr>
              )}
              {filas.map((m) => (
                <tr key={m.id}>
                  <td className="cell-name">{m.nombre} {m.apellido}</td>
                  <td className="cell-sub">{m.especialidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
