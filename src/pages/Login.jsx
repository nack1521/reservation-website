// src/pages/Login.jsx
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import FietLogo from "../components/FietLogo.jsx";
import { authAPI } from "../services/api.googleAuth.js";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from?.pathname || "/";

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const fetchUserInfo = useCallback(async () => {
    try {
      const data = await authAPI.me();
      localStorage.setItem("auth", "true");
      localStorage.setItem("authUser", data.user.name);
      localStorage.setItem("authEmail", data.user.email);
      localStorage.setItem("authRole", data.user.role || "student");
      if (data.user.picture) {
        localStorage.setItem("authPicture", data.user.picture);
      }
      setStatus("success");
      setTimeout(() => nav(from, { replace: true }), 900);
    } catch {
      setError("Failed to fetch user information");
      setStatus("error");
    }
  }, [nav, from]);

  // Handle OAuth callback
  useEffect(() => {
    // Listen for popup messages on mount
    window.addEventListener("message", handleOAuthCallback);
    
    return () => {
      window.removeEventListener("message", handleOAuthCallback);
    };
  }, []);

  function handleGoogleLogin() {
    setStatus("loading");
    setError(""); // Clear previous errors
    
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/google`,
      "Google Login",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Check if popup was closed without completing login
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        if (status === "loading") {
          setStatus("idle");
          setError("Login cancelled or popup was blocked");
        }
      }
    }, 500);
  }

  function handleOAuthCallback(event) {
    // Verify origin
    const expectedOrigin = import.meta.env.VITE_API_URL || "http://localhost:3000";
    if (event.origin !== expectedOrigin) {
      console.warn('Received message from unexpected origin:', event.origin);
      return;
    }

    const { success, user, error: errorMsg } = event.data;

    if (success && user) {
      localStorage.setItem("auth", "true");
      localStorage.setItem("authUser", user.name);
      localStorage.setItem("authEmail", user.email);
      localStorage.setItem("authRole", user.role || "student");
      if (user.picture) localStorage.setItem("authPicture", user.picture);

      setStatus("success");
      setTimeout(() => nav(from, { replace: true }), 900);
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
