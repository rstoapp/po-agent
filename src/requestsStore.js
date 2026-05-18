// ─── Requests persistence (localStorage) ─────────────────────────────────────
// Each request stores the full pipeline state so it can be resumed or reviewed.

const STORAGE_KEY = "rsto_requests_v1";

export function getRequests() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function saveRequest(request) {
  try {
    const all = getRequests();
    const idx = all.findIndex(r => r.id === request.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...request, updatedAt: now };
    } else {
      all.unshift({ ...request, createdAt: now, updatedAt: now });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("rsto-po: localStorage save failed", e);
  }
}

export function deleteRequest(id) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getRequests().filter(r => r.id !== id)));
  } catch {}
}

export function getRequest(id) {
  return getRequests().find(r => r.id === id) || null;
}
