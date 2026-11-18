import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "medium", hour12: false });

// ---- Textos en lenguaje normal -------------------------------------------------
const ACCIONES = {
  RESERVAR_CITA: "Cita reservada",
  CANCELAR_CITA: "Cita cancelada",
  REPROGRAMAR_CITA: "Cita reprogramada",
  CANCELACION_MASIVA: "Cancelación masiva de citas",
  REGISTRAR_CONSULTA: "Consulta registrada",
  PRESCRIBIR_RECETA: "Receta emitida",
  ENTREGAR_MEDICAMENTO: "Medicamento entregado",
  REPONER_STOCK: "Stock repuesto",
  ALERTA_STOCK_MINIMO: "Alerta: stock bajo el mínimo",
  CREAR_HISTORIA: "Historia clínica creada",
  MODIFICAR_HISTORIA: "Historia clínica modificada",
  ELIMINAR_HISTORIA: "Historia clínica eliminada",
  MARCAR_NO_ASISTIO: "Cita marcada como no asistida",
  CREAR_AGENDA: "Horario creado",
  ELIMINAR_AGENDA: "Horario eliminado",
  GUARDAR_HORARIO_SEMANAL: "Horario semanal guardado",
  CREAR_PERSONAL: "Usuario de personal creado",
  CAMBIAR_ESTADO_USUARIO: "Estado de usuario cambiado",
  RESTABLECER_CLAVE: "Clave restablecida",
  CAMBIAR_CLAVE: "Clave cambiada",
  REGISTRAR_PACIENTE_RECEPCION: "Paciente registrado",
  ACTUALIZAR_CONTACTO: "Datos de contacto actualizados",
  INSERT: "Registro creado",
  UPDATE: "Registro modificado",
  DELETE: "Registro eliminado",
};

const TABLAS = {
  TBL_CITAS_MEDICAS: "Cita",
  TBL_AGENDAS_MEDICOS: "Horario del médico",
  TBL_HISTORIA_CLINICA: "Historia clínica",
  TBL_RECETAS_MEDICAS: "Receta",
  TBL_DETALLE_RECETA: "Medicamento de la receta",
  TBL_STOCK_FARMACIA: "Stock",
  TBL_MEDICAMENTOS: "Medicamento",
  TBL_USUARIOS: "Usuario",
  TBL_PACIENTES: "Paciente",
  TBL_MEDICOS: "Médico",
  TBL_FARMACEUTICOS: "Farmacéutico",
};

const CAMPOS = {
  id_estado: "Estado", estado: "Estado", id_tipo: "Tipo", id_medicamento: "Medicamento", id_farmaceutico: "Farmacéutico",
  id_receta: "Receta", id_historia: "Historia", id_paciente: "Paciente", id_agenda: "Horario", paciente: "Paciente",
  horario: "Horario", "horario liberado": "Horario liberado", cita: "Cita", motivo: "Motivo", cantidad: "Cantidad",
  pendiente: "Pendiente por entregar", stock: "Stock", disponible: "Disponible", minimo: "Mínimo", dosis: "Dosis",
  nombre: "Nombre", descripcion: "Descripción", presentacion: "Presentación", emision: "Emisión", fecha: "Fecha",
  canceladas: "Citas canceladas", "agendas bloqueadas": "Horarios bloqueados", "citas programadas": "Citas programadas",
  citas_reprogramadas: "Citas reprogramadas", citas_canceladas: "Citas canceladas", agendas_creadas: "Horarios creados",
  medico: "Médico", bloques: "Bloques por semana",
  username: "Usuario", rol: "Rol",
};

const bonito = (s) => {
  const t = String(s).replaceAll("_", " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
};

// "a=1; b=2" o "a=1, b=2"  ->  [{k:"a", v:"1"}, ...]   (null si no tiene ese formato)
function pares(texto) {
  if (!texto) return [];
  const re = /(?:^|[;,]\s*)([a-z_ ]{2,30})=/g;
  const marcas = [...texto.matchAll(re)];
  if (marcas.length === 0 || marcas[0].index !== 0) return null;
  return marcas.map((m, i) => {
    const ini = m.index + m[0].length;
    const fin = i + 1 < marcas.length ? marcas[i + 1].index : texto.length;
    return { k: m[1].trim(), v: texto.slice(ini, fin).trim() };
  });
}

function valorLegible(k, v, cat) {
  if (v === "" || v == null) return "—";
  if (k === "id_estado") return bonito(cat.estados?.[v] ?? `#${v}`);
  if (k === "id_tipo") return cat.estados?.[v] ?? `#${v}`;
  if (k === "id_medicamento") return cat.medicamentos?.[v] ?? `Medicamento #${v}`;
  if (k === "id_farmaceutico") return cat.farmaceuticos?.[v] ?? `#${v}`;
  if (k === "id_receta") return `Receta #${v}`;
  if (k === "id_historia") return `Historia #${v}`;
  if (k === "id_paciente") return `Paciente #${v}`;
  if (k === "estado") return bonito(v);
  return v;
}

// Lista de cambios: solo lo que cambió (si es una modificación) o todos los datos (si es nuevo/borrado)
function cambios(l, cat) {
  const antes = pares(l.antes);
  const despues = pares(l.despues);
  if (antes === null || despues === null) return null; // formato libre: se muestra tal cual

  const mapaAntes = new Map(antes.map((p) => [p.k, p.v]));
  const filas = [];
  if (antes.length > 0 && despues.length > 0) {
    for (const p of despues) {
      const a = mapaAntes.get(p.k);
      if (a !== p.v) filas.push({ campo: p.k, antes: a === undefined ? null : valorLegible(p.k, a, cat), despues: valorLegible(p.k, p.v, cat) });
    }
  } else if (despues.length > 0) {
    for (const p of despues) filas.push({ campo: p.k, antes: null, despues: valorLegible(p.k, p.v, cat) });
  } else {
    for (const p of antes) filas.push({ campo: p.k, antes: valorLegible(p.k, p.v, cat), despues: null, borrado: true });
  }
  return filas;
}

function Detalle({ l, cat }) {
  const filas = cambios(l, cat);
  const objeto = `${TABLAS[l.tabla] ?? l.tabla} #${l.idRegistro}`;
  return (
    <>
      <div className="cell-name">{objeto}</div>
      {filas === null ? (
        <>
          {l.antes && <div className="cell-sub">Antes: {l.antes}</div>}
          {l.despues && <div className="cell-sub">Después: {l.despues}</div>}
        </>
      ) : filas.length === 0 ? (
        <div className="cell-sub">Sin cambios en los datos.</div>
      ) : (
        <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "grid", gap: 2 }}>
          {filas.map((f) => (
            <li key={f.campo}>
              <span className="cell-sub">{CAMPOS[f.campo] ?? bonito(f.campo)}: </span>
              {f.antes != null && f.despues != null ? (
                <>
                  <span className="cell-sub">{f.antes}</span> <span aria-label="cambió a">→</span> <strong>{f.despues}</strong>
                </>
              ) : (
                <strong>{f.despues ?? f.antes}</strong>
              )}
            </li>
          ))}
        </ul>
      )}
      <details style={{ marginTop: 6 }}>
        <summary className="cell-sub" style={{ cursor: "pointer", fontSize: "var(--text-sm)" }}>Ver datos originales</summary>
        <div className="cell-sub" style={{ fontSize: "var(--text-sm)" }}>
          <div>Código: {l.accion} · {l.tabla}</div>
          {l.antes && <div>Antes: {l.antes}</div>}
          {l.despues && <div>Después: {l.despues}</div>}
        </div>
      </details>
    </>
  );
}

export default function Auditoria() {
  const [logs, setLogs] = useState(null);
  const [cat, setCat] = useState({});
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
    // Si el catalogo falla, igual se ve la auditoria (con ids en vez de nombres)
    api("/admin/auditoria/catalogos")
      .then((d) => activo && setCat(d))
      .catch(() => { });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <Shell>
      <div className="page-head">
        <h1>Auditoría</h1>
        <p>Últimos 100 movimientos registrados en el sistema. En las modificaciones solo se muestra lo que cambió.</p>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col" className="plain-th">Fecha</th>
              <th scope="col" className="plain-th">Usuario</th>
              <th scope="col" className="plain-th">Qué pasó</th>
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
                  <div className="state"><strong>Sin movimientos</strong><span>Aquí aparecerán los movimientos del sistema.</span></div>
                </td>
              </tr>
            )}
            {logs && logs.map((l) => (
              <tr key={l.idLog}>
                <td className="cell-sub nowrap">{fmt.format(new Date(l.fecha))}</td>
                <td>{l.usuario ?? "—"}</td>
                <td className="cell-name">{ACCIONES[l.accion] ?? bonito(l.accion)}</td>
                <td><Detalle l={l} cat={cat} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
