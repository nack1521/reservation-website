// src/layouts/SiteLayout.jsx
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authAPI } from "../services/api.googleAuth.js";
import { reservationsAPI } from "../services/reservations.js";
import { usersAPI } from "../services/users.js";

function normalizeRoleToken(value) {
  const normalized = String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (normalized === "superadmin" || normalized === "super_admin") return "super_admin";
  if (normalized === "administrator") return "admin";
  return normalized;
}

function readRoles() {
  try {
    const raw = localStorage.getItem("authRoles");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const items = parsed
          .map((r) => normalizeRoleToken(r))
          .filter(Boolean);
        if (items.length) return items;
      }
    }
  } catch {
    // ignore malformed authRoles value
  }

  const single = normalizeRoleToken(localStorage.getItem("authRole") || "");
  if (single) return [single];

  const email = String(localStorage.getItem("authEmail") || "").toLowerCase().trim();
  if (email.endsWith("@mail.kmutt.ac.th")) return ["student"];
  return ["user"];
}

export default function SiteLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const roles = readRoles();
  const canAccessAdmin = roles.includes("admin") || roles.includes("super_admin");
  const [hasAdminNotifications, setHasAdminNotifications] = useState(false);

  function clearAuthAndRedirect() {
    localStorage.removeItem("auth");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authAt");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("authPicture");
    localStorage.removeItem("authRole");
    localStorage.removeItem("authRoles");
    nav("/login", { replace: true });
  }

  function isUnauthorizedError(err) {
    const message = String(err?.message || "");
    return /401|unauthorized/i.test(message);
  }

  // ถ้ายังไม่ได้ล็อกอิน และไม่ใช่หน้า /login → ส่งไป /login
  useEffect(() => {
    const authed = localStorage.getItem("auth") === "true";
    if (!authed && loc.pathname !== "/login") {
      nav("/login", { replace: true });
    }

    if (authed && !canAccessAdmin && loc.pathname.startsWith("/admin")) {
      nav("/dashboard", { replace: true });
    }
  }, [canAccessAdmin, loc.pathname, nav]);

  useEffect(() => {
    let stopped = false;

    async function checkSession() {
      if (stopped) return;
      const authed = localStorage.getItem("auth") === "true";
      if (!authed) return;

      try {
        await authAPI.me();
      } catch (err) {
        if (isUnauthorizedError(err)) {
          clearAuthAndRedirect();
        }
      }
    }

    function onAuthExpired() {
      clearAuthAndRedirect();
    }

    function onVisible() {
      if (document.visibilityState === "visible") checkSession();
    }

    window.addEventListener("auth:expired", onAuthExpired);
    document.addEventListener("visibilitychange", onVisible);

    checkSession();
    const id = window.setInterval(checkSession, 60 * 1000);

    return () => {
      stopped = true;
      window.clearInterval(id);
      window.removeEventListener("auth:expired", onAuthExpired);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [nav]);

  useEffect(() => {
    let stopped = false;

    async function loadAdminNotifications() {
      if (!canAccessAdmin || stopped) {
        if (!stopped) setHasAdminNotifications(false);
        return;
      }

      try {
        const [pendingRooms, pendingRoles] = await Promise.all([
          reservationsAPI.pending(),
          usersAPI.teacherRequests(),
        ]);

        if (stopped) return;

        const pendingRoomCount = Array.isArray(pendingRooms) ? pendingRooms.length : 0;
        const pendingRoleCount = Array.isArray(pendingRoles) ? pendingRoles.length : 0;
        setHasAdminNotifications(pendingRoomCount + pendingRoleCount > 0);
      } catch {
        if (!stopped) setHasAdminNotifications(false);
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") loadAdminNotifications();
    }

    loadAdminNotifications();
    const id = window.setInterval(loadAdminNotifications, 60 * 1000);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [canAccessAdmin]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTop = 0;
  }, [loc.pathname, loc.key]);

  return (
    <div className="min-h-screen flex flex-col bg-animated bg-glow text-white overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Brand (ข้อความธรรมดา ไม่มีโลโก้รูปภาพ) */}
          <div className="text-lg font-semibold tracking-tight">
            FIET
            <span className="ml-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400 bg-clip-text text-transparent">
              Bookings
            </span>
          </div>

          {/* Menu */}
          <div className="hidden md:flex items-center gap-1">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/book">Rooms</NavItem>
            <NavItem to="/dashboard">Dashboard</NavItem>
            {canAccessAdmin && <NavItem to="/admin-dashboard" showDot={hasAdminNotifications}>Admin</NavItem>}
            <NavItem to="/user-guide">User Guide</NavItem>
          </div>

          {/* Right: search + profile */}
          <div className="flex items-center gap-2">
            <SearchButton />
            <UserProfile />
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

/* ------------ Sub components ------------ */
function NavItem({ to, children, showDot = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-1.5 rounded-full text-sm transition",
          "hover:bg-white/10 text-slate-300",
          isActive &&
            "bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-400/30",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <span className="relative inline-flex items-center">
        {children}
        {showDot && (
          <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
        )}
      </span>
    </NavLink>
  );
}

function SearchButton() {
  return (
    <button
      className="w-10 h-10 grid place-items-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 transition"
      title="Search"
      aria-label="Search"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="6" stroke="currentColor" />
        <path d="M20 20l-4-4" stroke="currentColor" />
      </svg>
    </button>
  );
}

/* Dropdown โปรไฟล์ + Logout + ไปหน้า Profile */
function UserProfile() {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const nav = useNavigate();
  const loc = useLocation();

  const username = localStorage.getItem("authUser") || "USER";
  const email = localStorage.getItem("authEmail") || "student@kmutt.ac.th";

  useEffect(() => {
    function onDocClick(e) {
      const inTrigger = popRef.current && popRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 224;
      const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      setMenuPos({ top: rect.bottom + 8, left });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  function logout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authAt");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("authRole");
    localStorage.removeItem("authRoles");
    nav("/login", { replace: true });
  }

  function goProfile() {
    setOpen(false);

    if (loc.pathname === "/profile") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 0;
      return;
    }

    nav("/profile");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 0;
    });
  }

  return (
    <div ref={popRef} className="relative z-[70]">
      <button
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 h-10 rounded-full border border-white/10 bg-white/10 hover:bg-white/20 transition px-2"
      >
        <img
          src="/PF.png"
          alt="user avatar"
          className="w-8 h-8 rounded-full border border-white/20"
        />
        <span className="hidden sm:inline text-sm text-slate-200 font-medium">
          {username}
        </span>
        <svg
          className={`w-4 h-4 text-slate-300 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[1200] w-56 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-lg shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white">Welcome, {username}</p>
                <p className="text-xs text-slate-400">{email}</p>
              </div>
              <div className="py-1">
                <DropdownButton onClick={goProfile}>View Profile</DropdownButton>
                <DropdownButton onClick={logout} danger>
                  Logout
                </DropdownButton>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function DropdownButton({ children, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left block px-4 py-2.5 text-sm transition ${
        danger ? "text-rose-400 hover:bg-rose-500/10" : "text-slate-300 hover:bg-white/10"
      }`}
      role="menuitem"
    >
      {children}
    </button>
  );
}
