import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "medium", hour12: false });

export default function Auditoria() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    api("/admin/auditoria")
      .then((d) => activo && setLogs(d))
      .catch((e) => {
        if (!activo) return;
        setLogs([]);
        setError(e.message);
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <Shell>
      <div className="page-head">
        <h1>Auditoría</h1>
        <p>Últimos 100 movimientos registrados en el sistema.</p>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="table-wrap">
        <table className="table-fixed">
          <thead>
            <tr>
              <th scope="col" className="plain-th">Fecha</th>
              <th scope="col" className="plain-th">Usuario</th>
              <th scope="col" className="plain-th">Acción</th>
              <th scope="col" className="plain-th">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs === null &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {[40, 40, 50, 70].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}
                </tr>
              ))}
            {logs && logs.length === 0 && !error && (
              <tr>
                <td colSpan={4}>
                  <div className="state"><strong>Sin movimientos</strong><span>Aquí aparecerán las reservas y cancelaciones.</span></div>
                </td>
              </tr>
            )}
            {logs && logs.map((l) => (
              <tr key={l.idLog}>
                <td className="cell-sub nowrap">{fmt.format(new Date(l.fecha))}</td>
                <td>{l.usuario ?? `#${l.idRegistro}`}</td>
                <td className="cell-name">{l.accion}</td>
                <td className="cell-sub cell-detail">
                  {l.tabla} #{l.idRegistro}
                  {l.antes && <><br />Antes: {l.antes}</>}
                  {l.despues && <><br />Después: {l.despues}</>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
