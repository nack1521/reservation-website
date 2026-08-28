import { useCallback, useEffect, useMemo, useState } from "react";
import { authAPI } from "../services/api.googleAuth.js";
import AuthContext from "./auth-context.js";
import { clearSessionCache, writeSafeSessionCache } from "./session-cache.js";

function unwrapUser(payload) {
  if (payload?.user && typeof payload.user === "object") return payload.user;
  return payload && typeof payload === "object" ? payload : null;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const establishSession = useCallback((nextUser) => {
    const normalized = unwrapUser(nextUser);
    if (!normalized?.email) return null;
    setUser(normalized);
    writeSafeSessionCache(normalized);
    return normalized;
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    clearSessionCache();
  }, []);

  const refresh = useCallback(async () => {
    const payload = await authAPI.me();
    const nextUser = establishSession(payload);
    if (!nextUser) throw new Error("Invalid session response");
    return nextUser;
  }, [establishSession]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    refresh()
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clearSession, refresh]);

  useEffect(() => {
    function handleExpired() {
      clearSession();
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, loading, establishSession, refresh, logout }),
    [user, loading, establishSession, refresh, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
