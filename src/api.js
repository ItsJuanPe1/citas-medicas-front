const API = import.meta.env.VITE_API_URL;
const cache = new Map();

export function invalidarCache(prefijo) {
  if (!prefijo) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefijo)) cache.delete(key);
  }
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${path}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    cache.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.mensaje || `Error ${res.status}`);
  }
  return res.json();
}

/** GET con cache en memoria de corta duracion para catalogos casi estaticos. */
export async function apiCached(path, { ttlMs = 120_000, signal } = {}) {
  const ahora = Date.now();
  const hit = cache.get(path);
  if (hit && ahora < hit.expiraEn) {
    return hit.data;
  }
  const data = await api(path, { signal });
  cache.set(path, { data, expiraEn: ahora + ttlMs });
  return data;
}
