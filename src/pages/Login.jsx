// src/pages/Login.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FietLogo from "../components/FietLogo.jsx";
import { authAPI } from "../services/api.googleAuth.js";
import { getApiBaseUrl, getApiOrigin } from "../services/config.js";

function normalizeRoleToken(value) {
  const normalized = String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (normalized === "superadmin" || normalized === "super_admin") return "super_admin";
  if (normalized === "administrator") return "admin";
  return normalized;
}

function readRoleValue(input) {
  if (typeof input === "string") return normalizeRoleToken(input);
  if (!input || typeof input !== "object") return "";

  const picked = input.role || input.name || input.value || input.key || "";
  return normalizeRoleToken(picked);
}

function isAdminRole(role) {
  const normalized = normalizeRoleToken(role);
  return normalized === "admin" || normalized === "super_admin";
}

function extractRoles(user = {}) {
  const list = Array.isArray(user.roles) ? user.roles : [];
  const normalized = list
    .map((r) => readRoleValue(r))
    .filter(Boolean);

  if (normalized.length > 0) return normalized;

  if (typeof user.roles === "string" && user.roles.trim()) {
    return user.roles
      .split(",")
      .map((r) => normalizeRoleToken(r))
      .filter(Boolean);
  }

  const single = readRoleValue(user.role);
  return single ? [single] : ["student"];
}

function resolveUserFromAuthPayload(data) {
  if (!data || typeof data !== "object") return {};

  if (data.user && typeof data.user === "object") return data.user;
  if (data.data?.user && typeof data.data.user === "object") return data.data.user;
  if (data.data && typeof data.data === "object") return data.data;
  if (data.profile && typeof data.profile === "object") return data.profile;

  return data;
}

function pickPrimaryRole(roles) {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("pending")) return "pending";
  if (roles.includes("student")) return "student";
  if (roles.includes("user")) return "user";
  return roles[0] || "student";
}

function mergeRoles(primaryRoles = [], fallbackRoles = []) {
  const combined = [...primaryRoles, ...fallbackRoles]
    .map((r) => normalizeRoleToken(r))
    .filter(Boolean);

  if (!combined.length) return [];

  const unique = Array.from(new Set(combined));
  const ordered = ["super_admin", "admin", "teacher", "pending", "student", "user"];

  return [
    ...ordered.filter((role) => unique.includes(role)),
    ...unique.filter((role) => !ordered.includes(role)),
  ];
}

function shouldEnrichRoles(roles = []) {
  const list = Array.isArray(roles) ? roles : [];
  if (!list.length) return true;
  if (list.includes("admin") || list.includes("super_admin")) return false;
  return list.length === 1 && list[0] === "user";
}

function inferDefaultRoleByEmail(email) {
  const normalized = String(email || "").toLowerCase().trim();
  if (normalized.endsWith("@mail.kmutt.ac.th")) return "student";
  return "user";
}

function isAdminApp() {
  if (typeof window !== "undefined" && window.location?.port) {
    return window.location.port === "5715";
  }
  return (import.meta.env.VITE_APP_MODE || "user") === "admin";
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const apiBaseUrl = getApiBaseUrl();
  const apiOrigin = getApiOrigin();
  const bootstrapInFlightRef = useRef(false);
  const oauthHandledRef = useRef(false);
  const callbackRolesRef = useRef([]);

  const applyUserToSession = useCallback((rawUser, preferredRoles = []) => {
    const user = resolveUserFromAuthPayload(rawUser);
    const extractedRoles = extractRoles(user);
    const mergedRoles = mergeRoles(preferredRoles, extractedRoles);
    const roles = mergedRoles.length ? mergedRoles : [inferDefaultRoleByEmail(user?.email)];
    const role = pickPrimaryRole(roles);

    if (isAdminApp() && !isAdminRole(role)) {
      localStorage.removeItem("auth");
      localStorage.removeItem("authUser");
      localStorage.removeItem("authEmail");
      localStorage.removeItem("authRole");
      localStorage.removeItem("authRoles");
      localStorage.removeItem("authPicture");
      setStatus("error");
      setError("Admin portal (5715) allows admin/super_admin login only.");
      return false;
    }

    localStorage.setItem("auth", "true");
    localStorage.setItem("authUser", user.name || "User");
    localStorage.setItem("authEmail", user.email || "");
    localStorage.setItem("authRole", role);
    localStorage.setItem("authRoles", JSON.stringify(roles));
    if (user.picture) {
      localStorage.setItem("authPicture", user.picture);
    }

    setStatus("success");
    setTimeout(() => nav(from, { replace: true }), 900);
    return true;
  }, [from, nav]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const data = await authAPI.me();
      const meUser = resolveUserFromAuthPayload(data);
      const meRoles = extractRoles(meUser);

      if (shouldEnrichRoles(meRoles)) {
        try {
          const profileData = await authAPI.profile();
          const profileUser = resolveUserFromAuthPayload(profileData);
          const mergedPreferred = mergeRoles(callbackRolesRef.current, meRoles);
          applyUserToSession(profileUser, mergedPreferred);
          return;
        } catch {
          // Fallback to /auth/me payload if /auth/profile is unavailable.
        }
      }

      applyUserToSession(meUser, callbackRolesRef.current);
    } catch (err) {
      localStorage.removeItem("auth");
      localStorage.removeItem("authUser");
      localStorage.removeItem("authEmail");
      localStorage.removeItem("authRole");
      localStorage.removeItem("authRoles");
      localStorage.removeItem("authPicture");
      setStatus("error");
      setError(`Login succeeded but failed to establish frontend session (${err?.message || "unknown error"})`);
      throw new Error("SESSION_NOT_READY");
    }
  }, [applyUserToSession]);

  const tryFetchUserInfo = useCallback(async () => {
    try {
      await fetchUserInfo();
      return;
    } catch {
      // OAuth session/cookie can arrive slightly later; retry briefly.
    }

    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        await fetchUserInfo();
        return;
      } catch {
        // Continue retry loop.
      }
    }
  }, [fetchUserInfo]);

  const runSessionBootstrap = useCallback(async () => {
    if (bootstrapInFlightRef.current) return;
    bootstrapInFlightRef.current = true;
    try {
      await tryFetchUserInfo();
    } finally {
      bootstrapInFlightRef.current = false;
    }
  }, [tryFetchUserInfo]);

  // Handle OAuth callback
  useEffect(() => {
    // Listen for popup messages on mount
    window.addEventListener("message", handleOAuthCallback);
    
    return () => {
      window.removeEventListener("message", handleOAuthCallback);
    };
  }, []);

  function handleGoogleLogin() {
    oauthHandledRef.current = false;
    setStatus("loading");
    setError(""); // Clear previous errors
    
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      `${apiBaseUrl}/auth/google`,
      "Google Login",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      setStatus("error");
      setError("Popup was blocked. Please allow popups and try again.");
      return;
    }

    // Check if popup was closed without completing login
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        runSessionBootstrap().catch(() => {
          setStatus("idle");
          setError("Login cancelled or popup was blocked");
        });
      }
    }, 500);
  }

  function handleOAuthCallback(event) {
    // Verify origin
    const expectedOrigin = apiOrigin;
    if (event.origin !== expectedOrigin) {
      console.warn('Received message from unexpected origin:', event.origin);
      return;
    }

    const payload = event.data && typeof event.data === "object" ? event.data : {};
    const { success, error: errorMsg } = payload;

    if (success) {
      if (oauthHandledRef.current) return;
      oauthHandledRef.current = true;

      if (payload.user && typeof payload.user === "object") {
        callbackRolesRef.current = extractRoles(payload.user);
        applyUserToSession(payload.user, callbackRolesRef.current);
      }

      runSessionBootstrap();
    } else {
      setError(errorMsg || "Login failed");
      setStatus("error");
    }
  }

  useEffect(() => {
    const id = "login-local-animations";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes dash {to {stroke-dashoffset: 0;}}
      .draw-check{stroke-dasharray:48;stroke-dashoffset:48;animation:dash .6s ease forwards;}

      .fade-up-in{animation:fadeUp .35s ease both;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
      
      @keyframes spin { to { transform: rotate(360deg); } }
      .animate-spin-slow { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const isSuccess = status === "success";
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen grid place-items-center bg-animated bg-glow text-white px-4">
      <div className="w-full max-w-md p-[2px] rounded-2xl bg-gradient-to-r from-emerald-400/30 via-cyan-400/30 to-violet-400/30">
        <div className="relative rounded-2xl bg-zinc-950/90 border border-white/10 p-6 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.6)]">

          {/* ✅ SUCCESS ICON (top-right) */}
          {isSuccess && (
            <div className="pointer-events-none absolute top-3 right-3">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-emerald-400/20 blur-md" />
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 52 52"
                  fill="none"
                  className="relative drop-shadow-[0_0_8px_rgba(16,185,129,.35)]"
                >
                  <circle
                    cx="26"
                    cy="26"
                    r="22"
                    stroke="rgba(16,185,129,.9)"
                    strokeWidth="3"
                    fill="rgba(16,185,129,.1)"
                  />
                  <path
                    d="M16 26.5l7 7 13-15"
                    stroke="rgb(16,185,129)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="draw-check"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* LOGO */}
          <div className="flex justify-center mb-5">
            <FietLogo size={250} label="" />
          </div>
          <h1 className="text-xl font-semibold text-center">Sign in</h1>
          <p className="mt-1 text-slate-400 text-sm text-center">
            Sign in with your Google account to continue
          </p>

          <div className="mt-6 space-y-4">
            {/* ERROR */}
            {error && (
              <div className="fade-up-in">
                <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-xl px-3 py-2">
                  {error}
                </div>
              </div>
            )}

            {/* GOOGLE SIGN IN BUTTON */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSuccess || isLoading}
                className={`w-full rounded-xl px-4 py-3 font-medium transition flex items-center justify-center gap-3 ${
                  isSuccess
                    ? "bg-emerald-500/80 text-black"
                    : isLoading
                    ? "bg-white/90 text-black cursor-wait"
                    : "bg-white text-black hover:bg-white/90 hover:shadow-lg"
                }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin-slow"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeOpacity="0.25"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>Redirecting...</span>
                  </>
                ) : isSuccess ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Privacy note */}
          <p className="mt-4 text-xs text-slate-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
