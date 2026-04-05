import apiFetch from "./client.js";

const ROOM_LIST_ENDPOINT = import.meta.env.VITE_ROOM_LIST_ENDPOINT || "/room/all";
const ROOM_CREATE_ENDPOINT = import.meta.env.VITE_ROOM_CREATE_ENDPOINT || "/room/create";
const ROOM_DETAIL_BASE = import.meta.env.VITE_ROOM_DETAIL_BASE || "/room";
const ROOM_ADDONS_ENDPOINT = import.meta.env.VITE_ROOM_ADDONS_ENDPOINT || "/room/addons";

function pickRoomList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.rooms)) return payload.rooms;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isMongoObjectId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function normalizeRoom(raw) {
  const id = raw._id ?? raw.id ?? raw.roomId ?? raw.code;
  const name = raw.name ?? raw.roomName ?? raw.title ?? (id ? `Room ${id}` : "Unknown Room");
  const type = raw.type ?? raw.roomType ?? raw.category ?? "Lecture";
  const capacity = toNumber(raw.capacity ?? raw.seats ?? raw.maxCapacity, 0);
  const floor = String(raw.floor ?? raw.level ?? raw.floorNo ?? "");
  const description = raw.description ?? "";
  const location = raw.location ?? "";
  const addOnsByType = Array.isArray(raw.addOnsByType) ? raw.addOnsByType : [];
  const reservationRoomId =
    (isMongoObjectId(String(raw._id ?? "")) && String(raw._id)) ||
    (isMongoObjectId(String(raw.id ?? "")) && String(raw.id)) ||
    "";

  return {
    id: String(id ?? name),
    reservationRoomId,
    name: String(name),
    description: String(description),
    type: String(type),
    capacity,
    floor,
    location: String(location),
    addOnsByType,
  };
}

function toCreatePayload(room = {}) {
  return {
    name: room.name,
    description: room.description || "",
    floor: room.floor || "",
    type: room.type || "",
    capacity: toNumber(room.capacity, 0),
    location: room.location || "",
    addOnsByType: Array.isArray(room.addOnsByType) ? room.addOnsByType : [],
  };
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

function normalizePaged(payload) {
  const items = pickRoomList(payload).map(normalizeRoom);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || 20,
      totalPages: 1,
    };
  }

  return {
    items,
    total: Number(payload.total ?? items.length),
    page: Number(payload.page ?? 1),
    limit: Number(payload.limit ?? (items.length || 20)),
    totalPages: Number(payload.totalPages ?? 1),
  };
}

function pickItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function normalizeAddon(raw) {
  return {
    id: String(raw.addOnId ?? raw.id ?? raw._id ?? ""),
    addOnId: String(raw.addOnId ?? raw.id ?? raw._id ?? ""),
    label: String(raw.label ?? raw.name ?? raw.addOnId ?? "Add-on"),
    unit: String(raw.unit ?? "item"),
    max: Number(raw.max ?? raw.maxQty ?? 99),
    roomType: String(raw.roomType ?? raw.type ?? ""),
  };
}

export const roomAPI = {
  list: async (params = {}) => {
    const response = await apiFetch(`${ROOM_LIST_ENDPOINT}${buildQuery(params)}`, {
      withCredentials: true,
    });
    return normalizePaged(response);
  },

  getById: async (id) => {
    const response = await apiFetch(`${ROOM_DETAIL_BASE}/${id}`, { withCredentials: true });
    return normalizeRoom(response?.data || response?.room || response);
  },

  create: async (roomInput) => {
    const response = await apiFetch(ROOM_CREATE_ENDPOINT, {
      method: "POST",
      withCredentials: true,
      body: JSON.stringify(toCreatePayload(roomInput)),
    });

    const raw = response?.data || response?.room || response;
    return normalizeRoom(raw);
  },

  update: async (id, roomInput) => {
    const response = await apiFetch(`${ROOM_DETAIL_BASE}/${id}`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify(toCreatePayload(roomInput)),
    });

    const raw = response?.data || response?.room || response;
    return normalizeRoom(raw);
  },

  remove: async (id) => {
    return apiFetch(`${ROOM_DETAIL_BASE}/${id}`, { method: "DELETE", withCredentials: true });
  },

  listAddons: async (type) => {
    const response = await apiFetch(
      `${ROOM_ADDONS_ENDPOINT}${buildQuery({ type })}`,
      { withCredentials: true }
    );
    return pickItems(response).map(normalizeAddon).filter((a) => !!a.addOnId);
  },

  seedAddons: async () =>
    apiFetch(`${ROOM_ADDONS_ENDPOINT}/seed`, {
      method: "POST",
      withCredentials: true,
    }),
};
