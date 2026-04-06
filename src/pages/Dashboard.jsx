import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { reservationsAPI } from "../services/reservations.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({ upcoming: 0, pending: 0, history: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await reservationsAPI.meDashboard();
      const rows = normalizeDashboardRows(payload);
      setBookings(rows);
      setSummary(
        payload.summary || {
          upcoming: payload.upcoming?.length || 0,
          pending: payload.pending?.length || 0,
          history: payload.history?.length || 0,
          total: rows.length,
        }
      );
    } catch (err) {
      setBookings([]);
      setSummary({ upcoming: 0, pending: 0, history: 0, total: 0 });
      setError(err?.message || "ไม่สามารถโหลดข้อมูลการจองจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  function openReservationDetail(booking) {
    if (!booking?.id) {
      setError("Reservation id is missing, cannot open detail page.");
      return;
    }
    navigate(`/dashboard/reservation/${booking.id}`, { state: { booking } });
  }

  const filtered = useMemo(() => {
    return bookings
      .filter(b => {
        const q = query.trim().toLowerCase();
        const okQ = !q || [b.room,String(b.floor),b.dept,b.type]
          .some(v => String(v).toLowerCase().includes(q));
        const okD = !date || b.date === date;
        const okS = status==="all" || b.status===status;
        return okQ && okD && okS;
      })
      .sort((a,b)=> (a.date+a.start).localeCompare(b.date+b.start));
  }, [bookings, query, date, status]);

  // KPIs
  const todayISO = new Date().toISOString().slice(0,10);
  const kpiToday = bookings.filter(b=>b.date===todayISO).length;
  const kpiUpcoming = summary.upcoming;
  const kpiPending = summary.pending;
  const kpiHistory = summary.history;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-8">
        {/* Header + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">แดชบอร์ด</h1>
            <p className="text-slate-300/80 text-sm">ภาพรวมการจองและการจัดการห้อง</p>
          </div>
          <Link to="/book" className="rounded-xl px-4 py-2.5 bg-white text-black font-medium hover:opacity-90">
            + สร้างการจองใหม่
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label="การจองวันนี้" value={kpiToday} />
          <KPI label="กำลังจะมาถึง" value={kpiUpcoming} />
          <KPI label="รออนุมัติ" value={kpiPending} />
          <KPI label="ประวัติ" value={kpiHistory} />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              placeholder="ค้นหา (ห้อง/ชั้น/สาขา/ประเภท)"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <input
              type="date"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
              className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <select
              value={status}
              onChange={(e)=>setStatus(e.target.value)}
              className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="upcoming">กำลังจะมาถึง</option>
              <option value="pending">รออนุมัติ</option>
              <option value="done">เสร็จสิ้น</option>
              <option value="rejected">ไม่อนุมัติ</option>
              <option value="canceled">ยกเลิก</option>
            </select>
            <button
              onClick={()=>{ setQuery(""); setDate(""); setStatus("all"); }}
              className="rounded-xl border border-white/10 px-3 py-2.5 hover:bg-white/10"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          )}

          {filtered.length === 0 ? (
            loading ? (
              <LoadingState />
            ) : (
              <EmptyState />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-300/80">
                  <tr className="[&>th]:py-2 [&>th]:px-3 text-left">
                    <th>วันเวลา</th>
                    <th>ห้อง / ชั้น</th>
                    <th>สาขา</th>
                    <th>ประเภท</th>
                    <th>ความจุ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filtered.map((b, index)=>(
                    <tr
                      key={b.id || `${b.date}-${b.start}-${b.room}-${index}`}
                      className="[&>td]:py-2.5 [&>td]:px-3 cursor-pointer hover:bg-white/5"
                      onClick={() => openReservationDetail(b)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openReservationDetail(b);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <td>{thaiDate(b.date)} · {b.start}-{b.end}</td>
                      <td>{b.room} · ชั้น {b.floor}</td>
                      <td>{b.dept}</td>
                      <td>{b.type}</td>
                      <td>{b.capacity}</td>
                      <td><StatusChip status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <footer className="py-8 text-center text-xs text-slate-500 border-t border-white/10">
        © {new Date().getFullYear()} FIET Bookings
      </footer>
    </div>
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
  const date = isValidDate(startDate) ? startISO.slice(0, 10) : "";
  const start = isValidDate(startDate) ? formatTime(startDate) : "-";
  const end = isValidDate(endDate) ? formatTime(endDate) : "-";

  const room = raw.room?.name ?? raw.roomName ?? raw.room?.id ?? "-";
  const floor = String(raw.room?.floor ?? raw.floor ?? raw.roomFloor ?? "-");
  const dept = raw.department ?? raw.dept ?? raw.room?.department ?? "-";
  const type = raw.room?.type ?? raw.type ?? raw.bookingType ?? "-";
  const capacity = Number(raw.room?.capacity ?? raw.capacity ?? 0) || 0;
  const status = mapStatus(raw.status, startDate, endDate, bucket);

  return {
    id,
    date,
    start,
    end,
    room: String(room),
    floor,
    dept: String(dept),
    type: String(type),
    capacity,
    status,
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

function mapStatus(statusRaw, startDate, endDate, bucket) {
  if (bucket === "upcoming") return "upcoming";
  if (bucket === "pending") return "pending";
  if (bucket === "history") {
    const statusInHistory = String(statusRaw || "").toLowerCase();
    if (["rejected"].includes(statusInHistory)) return "rejected";
    if (["cancelled", "canceled"].includes(statusInHistory)) return "canceled";
    return "done";
  }

  const status = String(statusRaw || "").toLowerCase();
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (["cancelled", "canceled"].includes(status)) return "canceled";

  if (isValidDate(startDate)) {
    return startDate.getTime() > Date.now() ? "upcoming" : "done";
  }

  if (isValidDate(endDate)) return endDate.getTime() < Date.now() ? "done" : "upcoming";
  return "upcoming";
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* ===== Sub Components ===== */
function KPI({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
      <div className="text-slate-300/80 text-xs">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    upcoming: { text: "กำลังจะมาถึง", cls: "text-amber-200 border-amber-300/30 bg-amber-400/10" },
    pending:  { text: "รออนุมัติ",      cls: "text-sky-200 border-sky-300/30 bg-sky-400/10" },
    done:     { text: "เสร็จสิ้น",      cls: "text-emerald-200 border-emerald-300/30 bg-emerald-400/10" },
    rejected: { text: "ไม่อนุมัติ",      cls: "text-rose-200 border-rose-300/30 bg-rose-500/15" },
    canceled: { text: "ยกเลิก",        cls: "text-rose-200 border-rose-300/30 bg-rose-400/10" },
  };
  const m = map[status] || { text: status, cls: "text-slate-200 border-white/20 bg-white/5" };
  return <span className={`text-[11px] rounded-full px-2.5 py-1 border ${m.cls}`}>{m.text}</span>;
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-300/80">
      <div className="text-3xl mb-2">🗓️</div>
      <div className="font-medium">ยังไม่มีรายการที่ตรงเงื่อนไข</div>
      <p className="text-sm">ลองปรับตัวกรอง หรือสร้างการจองใหม่</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-16 text-slate-300/80">
      <div className="font-medium">กำลังโหลดข้อมูลการจอง...</div>
      <p className="text-sm">กรุณารอสักครู่</p>
    </div>
  );
}

/* ===== utils ===== */
function thaiDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { day:"2-digit", month:"short", year:"numeric" });
}

