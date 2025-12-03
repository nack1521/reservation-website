// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FietLogo from "../components/FietLogo.jsx";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [shakeToken, setShakeToken] = useState(0);

  function submit(e) {
    e.preventDefault();
    if (user === "ete" && pass === "1234") {
      setError("");
      setStatus("success");
      localStorage.setItem("auth", "true");
      localStorage.setItem("authUser", user);
      localStorage.setItem("authEmail", `${user}@kmutt.ac.th`);
      setTimeout(() => nav(from, { replace: true }), 900);
    } else {
      setError("Invalid username or password");
      setStatus("error");
      setShakeToken((t) => t + 1);
    }
  }

  useEffect(() => {
    const id = "login-local-animations";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes login-shake {
        0%,100%{transform:translateX(0)}
        15%{transform:translateX(-10px)}
        30%{transform:translateX(8px)}
        45%{transform:translateX(-6px)}
        60%{transform:translateX(4px)}
        75%{transform:translateX(-2px)}
      }
      .animate-login-shake{animation:login-shake .45s ease}

      @keyframes dash {to {stroke-dashoffset: 0;}}
      .draw-check{stroke-dasharray:48;stroke-dashoffset:48;animation:dash .6s ease forwards;}

      .fade-up-in{animation:fadeUp .35s ease both;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    `;
    document.head.appendChild(style);
  }, []);

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="min-h-screen grid place-items-center bg-animated bg-glow text-white px-4">
      <div
        key={shakeToken}
        className={`w-full max-w-md p-[2px] rounded-2xl bg-gradient-to-r from-emerald-400/30 via-cyan-400/30 to-violet-400/30 ${
          isError ? "animate-login-shake" : ""
        }`}
      >
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
            Test account: <b>ete</b> / <b>1234</b>
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {/* USERNAME */}
            <div className="fade-up-in">
              <label className="text-xs text-slate-400">Username</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" />
                    <path d="M4 20c2-3.5 5.333-5.25 10-5.25S20 16.5 20 20" stroke="currentColor" />
                  </svg>
                </span>
                <input
                  autoFocus
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="Enter username"
                  className={`w-full rounded-xl bg-zinc-900/80 border pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 ${
                    isError
                      ? "border-rose-400/40 focus:ring-rose-400/30"
                      : "border-white/10 focus:ring-emerald-400/30"
                  }`}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="fade-up-in" style={{ animationDelay: ".05s" }}>
              <label className="text-xs text-slate-400">Password</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" />
                    <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" />
                  </svg>
                </span>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Enter password"
                  className={`w-full rounded-xl bg-zinc-900/80 border pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 ${
                    isError
                      ? "border-rose-400/40 focus:ring-rose-400/30"
                      : "border-white/10 focus:ring-emerald-400/30"
                  }`}
                />
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="fade-up-in" style={{ animationDelay: ".1s" }}>
                <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-xl px-3 py-2">
                  {error}
                </div>
              </div>
            )}

            {/* BUTTON */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSuccess}
                className={`w-full rounded-xl px-4 py-2.5 font-medium transition ${
                  isSuccess
                    ? "bg-emerald-500/80 text-black"
                    : "bg-white text-black hover:opacity-90"
                }`}
              >
                {isSuccess ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
