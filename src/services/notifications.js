import apiFetch from "./client.js";

const NOTIF_BASE = "/notifications";

export const notificationsAPI = {
  list: async (limit = 30) => {
    try {
      const response = await apiFetch(`${NOTIF_BASE}/me?limit=${limit}`, {
        withCredentials: true,
        auth: true,
      });
      return Array.isArray(response) ? response : [];
    } catch (err) {
      console.warn("[notificationsAPI] list error:", err);
      return [];
    }
  },

  unreadCount: async () => {
    try {
      const response = await apiFetch(`${NOTIF_BASE}/unread-count`, {
        withCredentials: true,
        auth: true,
      });
      return typeof response?.count === "number" ? response.count : 0;
    } catch (err) {
      console.warn("[notificationsAPI] unreadCount error:", err);
      return 0;
    }
  },

  markRead: async (id) => {
    return apiFetch(`${NOTIF_BASE}/${id}/read`, {
      method: "PATCH",
      withCredentials: true,
      auth: true,
    });
  },

  markAllRead: async () => {
    return apiFetch(`${NOTIF_BASE}/mark-all-read`, {
      method: "PATCH",
      withCredentials: true,
      auth: true,
    });
  },
};
