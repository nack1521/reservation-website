// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { reservationsAPI } from "../services/reservations.js";

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-animated bg-glow overflow-hidden text-white">
      <BgGlow />

      {/* ===== HERO ===== */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* LEFT: copy */}
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[.2em] text-slate-400 font-semibold">
              FIET BOOKINGS
            </p>
            <h1 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Try our{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400">
                booking system
              </span>
            </h1>

            <p className="mt-5 text-slate-200 font-medium leading-relaxed">
              ระบบจองห้องประชุม / ห้องเรียน / ห้องปฏิบัติการ พร้อม Add-ons
              เสริมและยืนยันทันที
            </p>

            <div className="mt-8 flex items-center gap-3">
              {/* CTA 1: เริ่มจอง → เข้า booking เต็มระบบ */}
              <Link
                to="/book"
                className="rounded-xl px-4 py-2.5 bg-white text-black font-semibold shadow-[0_10px_40px_-10px_rgba(255,255,255,.5)] hover:opacity-90 transition"
              >
                เริ่มต้นจองห้อง
              </Link>

              {/* CTA 2: เลื่อนลงไปยัง quick search */}
              <a
                href="#quick-search"
                className="rounded-xl px-4 py-2.5 border border-white/10 text-slate-100 font-medium hover:bg-white/10 transition"
              >
                ค้นหาห้องว่าง
              </a>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-300 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Fast · Secure · Minimal
            </div>
          </div>

          {/* RIGHT: hero image */}
          <div className="lg:justify-self-end w-full max-w-lg">
            <div className="p-[1.5px] rounded-3xl bg-gradient-to-r from-emerald-400/30 via-cyan-400/30 to-violet-400/30 shadow-[0_30px_120px_-50px_rgba(59,130,246,.6)]">
              <div className="relative rounded-[22px] overflow-hidden bg-zinc-900/70 border border-white/10 backdrop-blur">
                <div className="aspect-[16/10]">
                  <img
                    src="/kmutt.jpg"
                    alt="KMUTT Campus"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_-80px_120px_-80px_rgba(0,0,0,.6)]" />
              </div>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <div className="mt-14 flex items-center gap-2 text-xs text-slate-400">
          เลื่อนลงเพื่อค้นหาห้องว่าง
        </div>
      </section>

      {/* ===== SHORTCUTS ===== */}
      <ShortcutsGrid />

      {/* ===== ANNOUNCEMENTS + NEXT RESERVATION ===== */}
      <section id="quick-search" className="border-t border-white/10 bg-white/5/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
          <h2 className="text-lg font-medium text-white">Announcements + Maintenance</h2>
          <p className="mt-1 text-sm text-slate-400">
            ตรวจสอบประกาศล่าสุดและดูการจองถัดไปของคุณได้ในที่เดียว
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <AnnouncementsPanel />
            <MyNextReservationCard />
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16" id="features">
        <h2 className="text-lg font-medium text-white">ทำไมต้อง FIET Bookings</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            title="จองไว 3 ขั้นตอน"
            desc="เลือกวัน/เวลา → เลือกชั้น/ประเภท → เลือกห้องและยืนยัน"
          />
          <Feature
            title="Add-ons พร้อม"
            desc="เก้าอี้/โต๊ะ/ไวท์บอร์ด/ไมค์/เบรกกาแฟ ฯลฯ เลือกจำนวนได้"
          />
          <Feature title="ปลอดภัย" desc="สิทธิ์ผู้ใช้ · บันทึกประวัติ · ตรวจสอบย้อนหลังได้" />
          <Feature title="แดชบอร์ดครบ" desc="ดู/แก้ไข/ยกเลิกการจอง และดาวน์โหลดสลิปได้ทันที" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-xs text-slate-500 border-t border-white/10">
        © {new Date().getFullYear()} FIET Bookings
      </footer>
    </div>
  );
}

/* ===================== Sub Components ===================== */
function ShortcutsGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Shortcut to="/book" title="จองทันที" desc="เลือกวัน เวลา ชั้น และ Add-ons" />
        <Shortcut to="/book?preview=1" title="ค้นหาห้องว่าง" desc="ดูห้องที่ว่างแบบรวดเร็ว" />
        <Shortcut to="/dashboard" title="การจองของฉัน" desc="แก้ไข/ยกเลิก/พิมพ์สลิป" />
        <Shortcut to="/user-guide" title="คู่มือผู้ใช้" desc="วิธีใช้งานระบบจอง" />

      </div>
    </section>
  );
}
function Shortcut({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4 hover:bg-white/[.06] transition flex flex-col"
    >
      <div className="text-white font-semibold">{title}</div>
      <div className="text-sm text-slate-300/90">{desc}</div>
    </Link>
  );
}

function AnnouncementsPanel() {
  const items = [
    {
      title: "Room 3 projector maintenance",
      detail: "Projector service window: 09 Apr 2026, 09:00-12:00",
      tone: "amber",
    },
    {
      title: "Computer Lab network upgrade",
      detail: "Temporary unstable internet expected after 18:00 this week",
      tone: "cyan",
    },
    {
      title: "New role workflow is live",
      detail: "You can now request Teacher role directly from your profile",
      tone: "emerald",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm text-slate-200 font-medium">Announcements</h3>
        <span className="text-[11px] text-slate-400">Updated today</span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  item.tone === "amber"
                    ? "bg-amber-400"
                    : item.tone === "cyan"
                    ? "bg-cyan-400"
                    : "bg-emerald-400"
                }`}
              />
              <h4 className="text-sm font-medium text-white">{item.title}</h4>
            </div>
            <p className="mt-1 text-xs text-slate-300/90">{item.detail}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        Maintenance windows may affect room availability.
      </p>
    </div>
  );
}

function MyNextReservationCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextBooking, setNextBooking] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadNextReservation() {
      setLoading(true);
      setError("");
      try {
        const payload = await reservationsAPI.meDashboard();
        const upcoming = Array.isArray(payload?.upcoming) ? payload.upcoming : [];

        const normalized = upcoming
          .map((item) => {
            const startISO = item?.start || item?.startTime || item?.startsAt || "";
            const endISO = item?.end || item?.endTime || item?.endsAt || "";
            const start = new Date(startISO);
            const end = new Date(endISO);
            const roomName = item?.room?.name || item?.roomName || "-";
            return {
              id: item?.id || item?._id || "",
              room: roomName,
              start,
              end,
              startISO,
              endISO,
            };
          })
          .filter((row) => !Number.isNaN(row.start.getTime()))
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        if (!ignore) setNextBooking(normalized[0] || null);
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Cannot load next reservation right now.");
          setNextBooking(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadNextReservation();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-slate-200 font-medium">My Next Reservation</h3>
        <Link to="/dashboard" className="text-xs text-cyan-300 hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300/80">
          Loading next reservation...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : !nextBooking ? (
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300/80">
          No upcoming reservation.
          <div className="mt-3">
            <Link
              to="/book"
              className="inline-flex rounded-lg px-3 py-1.5 bg-white text-black text-xs font-medium hover:opacity-90"
            >
              Book now
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-200/90">Upcoming</p>
          <p className="text-base font-semibold text-white mt-1">{nextBooking.room}</p>
          <p className="text-sm text-slate-200 mt-1">
            {formatDate(nextBooking.start)} · {formatTime(nextBooking.start)}-{formatTime(nextBooking.end)}
          </p>
          <div className="mt-3">
            <Link
              to="/dashboard"
              className="inline-flex rounded-lg px-3 py-1.5 border border-white/20 bg-white/10 text-xs font-medium hover:bg-white/15"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur-md p-5 shadow-[0_20px_80px_-60px_rgba(255,255,255,.4)]">
      <div className="text-white font-semibold">{title}</div>
      <p className="text-slate-300/90 text-sm mt-1">{desc}</p>
    </div>
  );
}
/* ---------- Floating Glow Background ---------- */
function BgGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute -top-40 -left-32 w-[50rem] h-[50rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(600px at 20% 30%, rgba(34,197,94,.6), transparent 60%)",
        }}
      />
      <div
        className="absolute top-10 right-[-10%] w-[46rem] h-[46rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(600px at 80% 20%, rgba(14,165,233,.55), transparent 60%)",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[70rem] h-[40rem] rounded-[999px] blur-3xl"
        style={{
          background:
            "radial-gradient(800px at 50% 80%, rgba(168,85,247,.5), transparent 60%)",
        }}
      />
    </div>
  );
}
