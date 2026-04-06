// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usersAPI } from "../services/users.js";
import { authAPI } from "../services/api.googleAuth.js";
import { reservationsAPI } from "../services/reservations.js";

/** Mini helpers */
const Label = ({ children }) => (
  <div className="text-xs text-slate-400 mb-1">{children}</div>
);
const SectionCard = ({ title, right, children }) => (
  <section className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm text-slate-300">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);
const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
    <div className="text-xs text-slate-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
  </div>
);

export default function Profile() {
  const nav = useNavigate();

  // read current user
  const initUser = localStorage.getItem("authUser") || "ete";
  const initMail = localStorage.getItem("authEmail") || "student@kmutt.ac.th";

  const [name, setName] = useState(initUser);
  const [email, setEmail] = useState(initMail);
  const [dept, setDept] = useState("FIET");
  const [phone, setPhone] = useState("");

  const [teacherReqState, setTeacherReqState] = useState({ loading: false, message: "", error: "" });
  const [roles, setRoles] = useState(() => readRolesFromStorage());
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });
  const [bookingRows, setBookingRows] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const [bookingSummary, setBookingSummary] = useState({ total: 0, upcoming: 0, cancelled: 0 });
  const hasElevatedRole = roles.some((role) => ["teacher", "admin", "super_admin"].includes(role));
  const hasPendingRole = roles.includes("pending");
  const canRequestTeacher = !hasElevatedRole && !hasPendingRole;

  const recentBookings = useMemo(() => {
    return [...bookingRows]
      .sort((a, b) => (b.startISO || "").localeCompare(a.startISO || ""))
      .slice(0, 3);
  }, [bookingRows]);

  async function saveProfile(e) {
    e.preventDefault();

    setSaveState({ saving: true, message: "", error: "" });
    try {
      const payload = {
        name: name.trim(),
        department: dept.trim(),
        phone: phone.trim(),
      };
      const response = await usersAPI.updateMe(payload);
      const user = response?.user && typeof response.user === "object" ? response.user : response;

      if (user && typeof user === "object") {
        const nextRoles = syncAuthUserToLocalStorage(user);
        setRoles(nextRoles);
        setName(user?.name || payload.name || name);
        setEmail(user?.email || email);
        setDept(user?.department || user?.dept || payload.department || dept);
        setPhone(user?.phone || payload.phone || phone);
      } else {
        localStorage.setItem("authUser", payload.name || "User");
      }

      setSaveState({
        saving: false,
        message: response?.message || "Profile synced to backend successfully.",
        error: "",
      });
    } catch (err) {
      const msg = String(err?.message || "");
      const endpointMissing = /404|not found/i.test(msg);
      setSaveState({
        saving: false,
        message: "",
        error: endpointMissing
          ? "Backend profile update API is missing (expected PATCH /users/me or /user/me)."
          : msg || "Cannot sync profile to backend.",
      });
    }
  }

  function logout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authEmail");
    nav("/login", { replace: true });
  }

  useEffect(() => {
    let ignore = false;

    async function refreshRolesFromBackend() {
      try {
        const payload = await authAPI.me();
        const user = payload?.user && typeof payload.user === "object" ? payload.user : payload;
        if (!user || ignore) return;
        const nextRoles = syncAuthUserToLocalStorage(user);
        if (!ignore) {
          setRoles(nextRoles);
          if (user?.name) setName(user.name);
          if (user?.email) setEmail(user.email);
        }
      } catch {
        if (!ignore) setRoles(readRolesFromStorage());
      }
    }

    refreshRolesFromBackend();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadBookingData() {
      setBookingLoading(true);
      setBookingError("");

      try {
        const payload = await reservationsAPI.meDashboard();
        const rows = normalizeDashboardRows(payload);
        const cancelledCount = rows.filter((row) => row.status === "canceled").length;
        if (!ignore) {
          setBookingRows(rows);
          setBookingSummary({
            total: Number(payload?.summary?.total ?? rows.length),
            upcoming: Number(payload?.summary?.upcoming ?? rows.filter((r) => r.status === "upcoming").length),
            cancelled: cancelledCount,
          });
        }
      } catch (err) {
        if (!ignore) {
          setBookingRows([]);
          setBookingSummary({ total: 0, upcoming: 0, cancelled: 0 });
          setBookingError(err?.message || "Cannot load recent bookings from backend.");
        }
      } finally {
        if (!ignore) setBookingLoading(false);
      }
    }

    loadBookingData();
    return () => {
      ignore = true;
    };
  }, []);

  async function requestTeacherRole() {
    if (!canRequestTeacher || teacherReqState.loading) return;
    setTeacherReqState({ loading: true, message: "", error: "" });

    try {
      const response = await usersAPI.requestTeacherRole();
      const user = response?.user || (await authAPI.me())?.user || null;
      if (user) {
        const nextRoles = syncAuthUserToLocalStorage(user);
        setRoles(nextRoles);
      }
      setTeacherReqState({
        loading: false,
        message: response?.message || "Teacher role request sent. Waiting for admin approval.",
        error: "",
      });
    } catch (err) {
      setTeacherReqState({
        loading: false,
        message: "",
        error: err?.message || "Cannot submit teacher role request.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-animated bg-glow text-white">
      {/* Container */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header card (กระชับ + สมดุล) */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 md:p-7 shadow-[0_30px_120px_-60px_rgba(255,255,255,.25)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Avatar + text */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/PF.png"
                  alt="avatar"
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white/15 object-cover shadow"
                />
                <label className="absolute -bottom-1 -right-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() => alert("Uploaded (demo)")}
                  />
                  <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 backdrop-blur">
                    Change
                  </span>
                </label>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Profile</h1>
                <p className="text-slate-400 text-sm">
                  Signed in as <span className="text-slate-200 font-medium">{name}</span> · {email}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto">
              <Stat label="Total Bookings" value={bookingSummary.total} />
              <Stat label="Upcoming" value={bookingSummary.upcoming} />
              <Stat label="Cancelled" value={bookingSummary.cancelled} />
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {/* Left: profile form + security */}
          <div className="space-y-6">
            <SectionCard
              title="ข้อมูลผู้ใช้"
              right={
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90"
                >
                  Save Changes
                </button>
              }
            >
              <form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Display name</Label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950/70 border border-white/10 px-3 py-2.5 text-slate-200 focus:ring-2 focus:ring-emerald-400/30"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full rounded-xl bg-zinc-950/50 border border-white/10 px-3 py-2.5 text-slate-300 cursor-not-allowed"
                    placeholder="email@kmutt.ac.th"
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <input
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950/70 border border-white/10 px-3 py-2.5 text-slate-200"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950/70 border border-white/10 px-3 py-2.5 text-slate-200"
                  />
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Role & Permissions">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <span
                      key={role}
                      className="text-xs px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-slate-200"
                    >
                      {role}
                    </span>
                  ))}
                </div>

                {canRequestTeacher && (
                  <button
                    type="button"
                    disabled={teacherReqState.loading}
                    onClick={requestTeacherRole}
                    className="px-4 py-2 rounded-xl bg-emerald-400 text-black font-medium hover:bg-emerald-300 disabled:opacity-60"
                  >
                    {teacherReqState.loading ? "Submitting..." : "Request Teacher Role"}
                  </button>
                )}

                {hasPendingRole && (
                  <p className="text-sm text-amber-200">
                    Teacher role request is pending admin approval.
                  </p>
                )}

                {hasElevatedRole && (
                  <p className="text-sm text-emerald-200">
                    Your account already has elevated privileges.
                  </p>
                )}

                {teacherReqState.error && (
                  <p className="text-sm text-rose-200">{teacherReqState.error}</p>
                )}
                {teacherReqState.message && (
                  <p className="text-sm text-emerald-200">{teacherReqState.message}</p>
                )}
              </div>
            </SectionCard>

            {(saveState.error || saveState.message) && (
              <SectionCard title="Profile Sync Status">
                <div className="space-y-2">
                  {saveState.error && <p className="text-sm text-rose-200">{saveState.error}</p>}
                  {saveState.message && <p className="text-sm text-emerald-200">{saveState.message}</p>}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Right: preferences + recent bookings */}
          <div className="space-y-6">
            <SectionCard
              title="การจองล่าสุด"
              right={
                <button
                  onClick={() => nav("/dashboard")}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                >
                  เปิดแดชบอร์ด
                </button>
              }
            >
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-slate-300">
                    <tr>
                      <th className="text-left px-3 py-2.5">Room</th>
                      <th className="text-left px-3 py-2.5">Time</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingLoading ? (
                      <tr className="border-t border-white/10">
                        <td className="px-3 py-3 text-slate-300" colSpan={3}>Loading recent bookings...</td>
                      </tr>
                    ) : bookingError ? (
                      <tr className="border-t border-white/10">
                        <td className="px-3 py-3 text-rose-200" colSpan={3}>{bookingError}</td>
                      </tr>
                    ) : recentBookings.length === 0 ? (
                      <tr className="border-t border-white/10">
                        <td className="px-3 py-3 text-slate-400" colSpan={3}>No recent bookings found.</td>
                      </tr>
                    ) : (
                      recentBookings.map((b) => (
                        <tr key={b.id || `${b.startISO}-${b.room}`} className="border-t border-white/10">
                          <td className="px-3 py-2.5 text-slate-300">{b.room} • {b.type}</td>
                          <td className="px-3 py-2.5 text-slate-400">{b.when}</td>
                          <td className="px-3 py-2.5">
                            <StatusPill status={b.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="ออกจากระบบ">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">
                  ออกจากระบบและต้องลงชื่อเข้าใช้อีกครั้ง
                </p>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-400/30 hover:bg-rose-500/30 text-rose-100 font-medium"
                >
                  Logout
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function readRolesFromStorage() {
  try {
    const raw = localStorage.getItem("authRoles");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const roles = parsed
          .map((role) => String(role || "").toLowerCase().trim())
          .filter(Boolean);
        if (roles.length) return roles;
      }
    }
  } catch {
    // ignore malformed authRoles
  }

  const single = String(localStorage.getItem("authRole") || "").toLowerCase().trim();
  if (single) return [single];

  const email = String(localStorage.getItem("authEmail") || "").toLowerCase().trim();
  if (email.endsWith("@mail.kmutt.ac.th")) return ["student"];
  return ["user"];
}

function syncAuthUserToLocalStorage(user) {
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role || "").toLowerCase().trim()).filter(Boolean)
    : [];
  const explicitRole = String(user?.role || "").toLowerCase().trim();
  const email = String(user?.email || localStorage.getItem("authEmail") || "").toLowerCase().trim();
  const inferredRole = email.endsWith("@mail.kmutt.ac.th") ? "student" : "user";
  const orderedPrimary =
    roles.find((r) => ["super_admin", "admin", "teacher", "pending", "student", "user"].includes(r)) || "";
  const primaryRole = orderedPrimary || explicitRole || inferredRole;

  localStorage.setItem("auth", "true");
  localStorage.setItem("authUser", user?.name || localStorage.getItem("authUser") || "User");
  localStorage.setItem("authEmail", user?.email || localStorage.getItem("authEmail") || "");
  localStorage.setItem("authRole", primaryRole);
  const storedRoles = roles.length ? roles : [primaryRole];
  localStorage.setItem("authRoles", JSON.stringify(storedRoles));
  return storedRoles;
}

/** Small UI parts */
function StatusPill({ status }) {
  const map = {
    upcoming: "text-emerald-200 border-emerald-400/30 bg-emerald-400/10",
    pending: "text-sky-200 border-sky-300/30 bg-sky-400/10",
    done: "text-slate-200 border-white/20 bg-white/5",
    rejected: "text-rose-200 border-rose-400/30 bg-rose-500/15",
    canceled: "text-rose-200 border-rose-400/30 bg-rose-400/10",
  };
  const labelMap = {
    upcoming: "Upcoming",
    pending: "Pending",
    done: "Completed",
    rejected: "Rejected",
    canceled: "Cancelled",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${map[status] || "text-slate-200 border-white/20 bg-white/5"}`}>
      {labelMap[status] || status}
    </span>
  );
}

function normalizeDashboardRows(payload = {}) {
  const rows = [];

  const upcoming = Array.isArray(payload.upcoming) ? payload.upcoming : [];
  const pending = Array.isArray(payload.pending) ? payload.pending : [];
  const history = Array.isArray(payload.history) ? payload.history : [];

  rows.push(...upcoming.map((item) => normalizeReservation(item, "upcoming")));
  rows.push(...pending.map((item) => normalizeReservation(item, "pending")));
  rows.push(...history.map((item) => normalizeReservation(item, "history")));

  return rows;
}

function normalizeReservation(raw = {}, bucket = "") {
  const id = pickReservationId(raw);
  const startISO = raw.start ?? raw.startTime ?? raw.startsAt ?? "";
  const endISO = raw.end ?? raw.endTime ?? raw.endsAt ?? "";

  const startDate = startISO ? new Date(startISO) : null;
  const endDate = endISO ? new Date(endISO) : null;

  const room = raw.room?.name ?? raw.roomName ?? raw.room?.id ?? "-";
  const type = raw.room?.type ?? raw.type ?? raw.bookingType ?? "-";
  const status = mapReservationStatus(raw.status, startDate, endDate, bucket);

  return {
    id,
    room: String(room),
    type: String(type),
    status,
    startISO,
    when: formatDateTimeRange(startDate, endDate),
  };
}

function pickReservationId(raw = {}) {
  const candidates = [raw.id, raw._id, raw.reservationId];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") {
      const oid = value.$oid ?? value.oid ?? value.id;
      if (typeof oid === "string" && oid.trim()) return oid;
    }
  }
  return "";
}

function mapReservationStatus(statusRaw, startDate, endDate, bucket) {
  if (bucket === "upcoming") return "upcoming";
  if (bucket === "pending") return "pending";
  if (bucket === "history") {
    const statusInHistory = String(statusRaw || "").toLowerCase();
    if (statusInHistory === "rejected") return "rejected";
    if (["cancelled", "canceled"].includes(statusInHistory)) return "canceled";
    return "done";
  }

  const status = String(statusRaw || "").toLowerCase();
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (["cancelled", "canceled"].includes(status)) return "canceled";
  if (startDate instanceof Date && !Number.isNaN(startDate.getTime())) {
    return startDate.getTime() > Date.now() ? "upcoming" : "done";
  }
  if (endDate instanceof Date && !Number.isNaN(endDate.getTime())) {
    return endDate.getTime() < Date.now() ? "done" : "upcoming";
  }
  return "upcoming";
}

function formatDateTimeRange(startDate, endDate) {
  const s = startDate instanceof Date && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const e = endDate instanceof Date && !Number.isNaN(endDate.getTime()) ? endDate : null;
  if (!s || !e) return "-";

  const st = s.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const et = e.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${st}-${et}`;
}
