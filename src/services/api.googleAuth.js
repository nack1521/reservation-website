import apiFetch from "./client.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const authAPI = {
  /**
   * Initiate Google OAuth login
   * Opens Google login in popup or redirects
   */
  googleLogin: () => {
    window.location.href = `${API_BASE}/auth/google`;
  },

  /**
   * Get current user info
   */
  me: () => apiFetch("/auth/me", { withCredentials: true }),

  /**
   * Logout user
   */
  logout: () => apiFetch("/auth/logout", { method: "POST", withCredentials: true }),
};