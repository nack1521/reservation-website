// src/pages/Profile.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [dark, setDark] = useState(true);

  // mock stats & bookings
  const stats = useMemo(
    () => ({ total: 18, upcoming: 2, cancelled: 3, hours: 46 }),
    []
  );
  const bookings = [
    { id: "BK-0921", room: "Room 5", type: "Lecture", when: "2025-10-14 14:00–15:00", status: "Upcoming" },
    { id: "BK-0917", room: "Room 2", type: "Computer Lab", when: "2025-10-10 09:00–10:00", status: "Completed" },
    { id: "BK-0910", room: "Room 1", type: "Seminar", when: "2025-10-06 13:00–14:00", status: "Cancelled" },
  ];

  function saveProfile(e) {
    e.preventDefault();
    localStorage.setItem("authUser", name.trim() || "USER");
    localStorage.setItem("authEmail", email.trim() || "student@kmutt.ac.th");
    alert("Profile updated");
  }

  function logout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authEmail");
    nav("/login", { replace: true });
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
              <Stat label="Total Bookings" value={stats.total} />
              <Stat label="Upcoming" value={stats.upcoming} />
              <Stat label="Cancelled" value={stats.cancelled} />
              <Stat label="Hours Booked" value={stats.hours} />
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
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950/70 border border-white/10 px-3 py-2.5 text-slate-200 focus:ring-2 focus:ring-emerald-400/30"
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

            <SectionCard title="ความปลอดภัย">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
                  <div className="text-sm text-white font-medium">Change Password</div>
                  <p className="text-xs text-slate-400 mt-1">อัปเดตรหัสผ่านบัญชีของคุณ</p>
                  <button
                    onClick={() => alert("Demo: change password")}
                    className="mt-3 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                  >
                    Update password
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
                  <div className="text-sm text-white font-medium">Two-Factor</div>
                  <p className="text-xs text-slate-400 mt-1">เพิ่มความปลอดภัยด้วย 2FA</p>
                  <button
                    onClick={() => alert("Demo: enable 2FA")}
                    className="mt-3 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                  >
                    Enable 2FA
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right: preferences + recent bookings */}
          <div className="space-y-6">
            <SectionCard title="การตั้งค่า (Preferences)">
              <div className="space-y-3">
                <Toggle
                  label="อีเมลแจ้งเตือนการจอง/เปลี่ยนแปลง"
                  checked={notifEmail}
                  onChange={setNotifEmail}
                />
                <Toggle
                  label="การแจ้งเตือนแบบ Push"
                  checked={notifPush}
                  onChange={setNotifPush}
                />
                <Toggle label="ใช้ธีมเข้ม (Dark)" checked={dark} onChange={setDark} />
              </div>
            </SectionCard>

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
                      <th className="text-left px-3 py-2.5">Booking</th>
                      <th className="text-left px-3 py-2.5">Room</th>
                      <th className="text-left px-3 py-2.5">When</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-t border-white/10">
                        <td className="px-3 py-2.5 text-slate-200">{b.id}</td>
                        <td className="px-3 py-2.5 text-slate-300">{b.room} • {b.type}</td>
                        <td className="px-3 py-2.5 text-slate-400">{b.when}</td>
                        <td className="px-3 py-2.5">
                          <StatusPill status={b.status} />
                        </td>
                      </tr>
                    ))}
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

/** Small UI parts */
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full border transition relative ${
          checked
            ? "bg-emerald-500/40 border-emerald-400/40"
            : "bg-white/5 border-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 ${
            checked ? "left-5" : "left-0.5"
          } w-5 h-5 rounded-full bg-white transition`}
        />
      </button>
    </label>
  );
}
function StatusPill({ status }) {
  const map = {
    Upcoming: "text-emerald-200 border-emerald-400/30 bg-emerald-400/10",
    Completed: "text-slate-200 border-white/20 bg-white/5",
    Cancelled: "text-rose-200 border-rose-400/30 bg-rose-400/10",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${map[status] || ""}`}>
      {status}
    </span>
  );
}
