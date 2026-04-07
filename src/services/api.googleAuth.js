import apiFetch from "./client.js";
import { getApiBaseUrl } from "./config.js";

const API_BASE = getApiBaseUrl();

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
  me: () => apiFetch("/auth/me", { withCredentials: true, auth: true }),

  /**
   * Logout user
   */
  logout: () => apiFetch("/auth/logout", { method: "POST", withCredentials: true }),
};