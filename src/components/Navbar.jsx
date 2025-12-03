// src/components/Navbar.jsx
import { NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const nav = useNavigate();
  const user = localStorage.getItem("authUser") || "guest";

  function logout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authEmail");
    nav("/login", { replace: true });
  }

  const linkBase =
    "px-3 py-1.5 rounded-full text-sm transition hover:bg-white/10 text-slate-300";
  const active =
    "bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-400/30";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="text-lg font-semibold tracking-tight">
          FIET
          <span className="ml-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400 bg-clip-text text-transparent">
            Bookings
          </span>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={({isActive})=>`${linkBase} ${isActive?active:""}`}>Home</NavLink>
          <NavLink to="/book" className={({isActive})=>`${linkBase} ${isActive?active:""}`}>Rooms</NavLink>
          <NavLink to="/dashboard" className={({isActive})=>`${linkBase} ${isActive?active:""}`}>Dashboard</NavLink>
          <NavLink to="/user-guide" className={({isActive})=>`${linkBase} ${isActive?active:""}`}>User Guide</NavLink>
        </div>

        {/* Right: search + profile */}
        <div className="flex items-center gap-2">
          <button
            className="w-10 h-10 grid place-items-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 transition"
            title="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" />
              <path d="M20 20l-4-4" stroke="currentColor" />
            </svg>
          </button>

          {/* Profile + logout */}
          <div className="flex items-center gap-2 h-10 rounded-full border border-white/10 bg-white/10 px-2">
            <img src="/PF.png" alt="avatar" className="w-8 h-8 rounded-full border border-white/20" />
            <span className="hidden sm:inline text-sm text-slate-200 font-medium">{user}</span>
            <button
              onClick={logout}
              className="ml-1 text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/10"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
