import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { notificationsAPI } from "../services/notifications.js";
import useAuth from "../auth/useAuth.js";

export default function SiteLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canAccessAdmin = roles.includes("admin") || roles.includes("super_admin");

  useEffect(() => {
    if (!canAccessAdmin && loc.pathname.startsWith("/admin")) {
      nav("/dashboard", { replace: true });
    }
  }, [canAccessAdmin, loc.pathname, nav]);

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
          {/* Brand Logo Clickable to Home */}
          <NavLink
            to="/"
            className="text-lg font-semibold tracking-tight hover:opacity-90 transition flex items-center"
          >
            FIET
            <span className="ml-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400 bg-clip-text text-transparent">
              Bookings
            </span>
          </NavLink>

          {/* Menu */}
          <div className="hidden md:flex items-center gap-1">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/book">Rooms</NavItem>
            <NavItem to="/dashboard">Dashboard</NavItem>
            {canAccessAdmin && <NavItem to="/admin-dashboard">Admin</NavItem>}
            <NavItem to="/user-guide">User Guide</NavItem>
          </div>

          {/* Right: notification bell + profile */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserProfile user={user} onLogout={logout} />
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
function NavItem({ to, children }) {
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
      </span>
    </NavLink>
  );
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 360 });
  const navigate = useNavigate();

  const loadUnread = useCallback(async () => {
    try {
      const notifCount = await notificationsAPI.unreadCount();
      setUnreadCount(notifCount);
    } catch {
      // ignore
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationsAPI.list(30);
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = Math.min(384, window.innerWidth - 16);
      const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      setMenuPos({ top: rect.bottom + 8, left, width: menuWidth });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    loadUnread();
    const timer = window.setInterval(loadUnread, 15_000);
    function onVis() {
      if (document.visibilityState === "visible") loadUnread();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadUnread]);

  useEffect(() => {
    if (open) {
      loadList();
      loadUnread();
    }
  }, [open, loadList, loadUnread]);

  useEffect(() => {
    function onDocClick(e) {
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) {
        setOpen(false);
      }
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

  async function handleMarkAllRead() {
    await notificationsAPI.markAllRead().catch(() => {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleItemClick(item) {
    if (!item.isRead && !String(item._id).startsWith("pending-")) {
      await notificationsAPI.markRead(item._id || item.id).catch(() => {});
    }
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) =>
      prev.map((n) =>
        (n._id || n.id) === (item._id || item.id) ? { ...n, isRead: true } : n
      )
    );
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="relative w-10 h-10 grid place-items-center rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/15 transition text-slate-300 hover:text-white"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse border-2 border-zinc-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Notifications"
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[1300] rounded-2xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl space-y-3"
            style={{
              top: menuPos.top || 64,
              left: menuPos.left || 16,
              width: menuPos.width || 360,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-xs text-rose-300 font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <p className="p-4 text-center text-xs text-slate-400">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <p className="text-base">🔔</p>
                  <p>No new notifications</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isPending =
                    item.type === "pending" ||
                    item.type === "pending_reservation" ||
                    item.type === "teacher_request";
                  const isRejected = item.type === "rejected";
                  const isApproved =
                    item.type === "approved" ||
                    item.type === "upcoming" ||
                    item.type === "teacher_approved";

                  return (
                    <div
                      key={item._id || item.id}
                      onClick={() => handleItemClick(item)}
                      className={`group relative rounded-xl p-3 text-xs transition cursor-pointer border ${
                        isRejected
                          ? "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                          : isPending
                          ? "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                          : isApproved
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                          : item.isRead
                          ? "border-transparent bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                          : "border-cyan-400/20 bg-cyan-500/10 text-slate-200 hover:bg-cyan-500/15"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-white group-hover:text-cyan-300 transition">
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                        )}
                      </div>
                      <p className="mt-1 text-slate-300/90 leading-relaxed">{item.message}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return "เมื่อสักครู่";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

/* Dropdown โปรไฟล์ + Logout + ไปหน้า Profile */
function UserProfile({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const nav = useNavigate();
  const loc = useLocation();

  const username = user?.name || "USER";
  const email = user?.email || "";

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

  async function logout() {
    try {
      await onLogout();
    } finally {
      nav("/login", { replace: true });
    }
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
