import apiFetch from "./client.js";

const RES_BASE = import.meta.env.VITE_RESERVATIONS_BASE || "/reservations";

function pickList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.reservations)) return payload.reservations;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export const reservationsAPI = {
  availability: (roomId, date) =>
    apiFetch(`${RES_BASE}/availability${buildQuery({ room: roomId, date })}`, {
      withCredentials: true,
    }),

  create: (payload) =>
    apiFetch(RES_BASE, {
      method: "POST",
      withCredentials: true,
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    apiFetch(`${RES_BASE}/${id}`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify(payload),
    }),

  remove: (id) =>
    apiFetch(`${RES_BASE}/${id}`, {
      method: "DELETE",
      withCredentials: true,
    }),

  list: async (params = {}) => {
    const response = await apiFetch(`${RES_BASE}${buildQuery(params)}`, {
      withCredentials: true,
    });
    return pickList(response);
  },

  pending: async () => {
    const response = await apiFetch(`${RES_BASE}/pending`, {
      withCredentials: true,
    });
    return pickList(response);
  },

  approve: (id, note = "approved") =>
    apiFetch(`${RES_BASE}/${id}/approve`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify({ note }),
    }),

  reject: (id, note = "rejected") =>
    apiFetch(`${RES_BASE}/${id}/reject`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify({ note }),
    }),
};
