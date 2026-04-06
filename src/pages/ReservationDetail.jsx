import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { reservationsAPI } from "../services/reservations.js";

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReservation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const payload = await reservationsAPI.meDashboard();
      const rows = [
        ...(Array.isArray(payload.upcoming) ? payload.upcoming : []),
        ...(Array.isArray(payload.pending) ? payload.pending : []),
        ...(Array.isArray(payload.history) ? payload.history : []),
      ];
      const found = rows
        .map((row) => normalizeReservation(row))
        .find((row) => row.id === id);

      if (!found) {
        setError("ไม่พบรายการจองนี้ หรือรายการถูกยกเลิกไปแล้ว");
        setBooking(null);
      } else {
        setBooking(found);
      }
    } catch (err) {
      setError(err?.message || "ไม่สามารถโหลดรายละเอียดการจองได้");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!booking) {
      loadReservation();
      return;
    }

    if (booking.id !== id) {
      loadReservation();
    }
  }, [booking, id, loadReservation]);

  const canCancel = useMemo(() => {
    if (!booking) return false;
    return booking.status === "upcoming" && !!booking.id;
  }, [booking]);

  async function handleCancel() {
    if (!canCancel || !booking) return;

    const confirmed = window.confirm("ยืนยันการยกเลิกการจองนี้?");
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setCanceling(true);

    try {
      const response = await reservationsAPI.cancel(booking.id);
      setSuccess(response?.message || "Reservation cancelled");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      setError(err?.message || "ไม่สามารถยกเลิกการจองได้");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white grid place-items-center">
        <p className="text-slate-300/90">กำลังโหลดรายละเอียดการจอง...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
        <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
          <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
            ← กลับไปแดชบอร์ด
          </Link>
          <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-rose-100">
            {error || "ไม่พบข้อมูลการจอง"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
            ← กลับไปแดชบอร์ด
          </Link>
          <span className="text-xs text-slate-400">Reservation ID: {booking.id || "-"}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-5 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">รายละเอียดการจอง</h1>
            <p className="text-sm text-slate-300/80 mt-1">ตรวจสอบรายละเอียดและยกเลิกได้เฉพาะรายการที่กำลังจะมาถึง</p>
          </div>

          {success && (
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="วันเวลา" value={`${thaiDate(booking.date)} · ${booking.start}-${booking.end}`} />
            <Info label="สถานะ" value={<StatusChip status={booking.status} />} />
            <Info label="ห้อง" value={booking.room} />
            <Info label="ชั้น" value={booking.floor} />
            <Info label="สาขา" value={booking.dept} />
            <Info label="ประเภท" value={booking.type} />
            <Info label="ความจุ" value={String(booking.capacity)} />
            <Info label="หมายเหตุ" value={booking.note || "-"} />
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-end">
            {canCancel ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={canceling}
                className="rounded-xl px-4 py-2.5 text-sm border border-rose-300/30 text-rose-200 bg-rose-400/10 hover:bg-rose-400/15 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {canceling ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
              </button>
            ) : (
              <span className="text-sm text-slate-400">รายการนี้ไม่สามารถยกเลิกได้</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeReservation(raw = {}) {
  const id = pickReservationId(raw);
  const startISO = raw.start ?? raw.startTime ?? raw.startsAt ?? "";
  const endISO = raw.end ?? raw.endTime ?? raw.endsAt ?? "";

  const startDate = startISO ? new Date(startISO) : null;
  const endDate = endISO ? new Date(endISO) : null;
  const date = isValidDate(startDate) ? startISO.slice(0, 10) : "";
  const start = isValidDate(startDate) ? formatTime(startDate) : "-";
  const end = isValidDate(endDate) ? formatTime(endDate) : "-";

  const status = mapStatus(raw.status, startDate, endDate);

  return {
    id,
    date,
    start,
    end,
    room: String(raw.room?.name ?? raw.roomName ?? "-"),
    floor: String(raw.room?.floor ?? raw.floor ?? "-"),
    dept: String(raw.department ?? raw.dept ?? raw.room?.department ?? "-"),
    type: String(raw.room?.type ?? raw.type ?? raw.bookingType ?? "-"),
    capacity: Number(raw.room?.capacity ?? raw.capacity ?? 0) || 0,
    note: String(raw.note ?? ""),
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

function mapStatus(statusRaw, startDate, endDate) {
  const status = String(statusRaw || "").toLowerCase();
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (["cancelled", "canceled"].includes(status)) return "canceled";

  if (isValidDate(startDate)) {
    return startDate.getTime() > Date.now() ? "upcoming" : "done";
  }

  if (isValidDate(endDate)) {
    return endDate.getTime() < Date.now() ? "done" : "upcoming";
  }

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

function thaiDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-sm text-slate-100">{value}</div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    upcoming: { text: "กำลังจะมาถึง", cls: "text-amber-200 border-amber-300/30 bg-amber-400/10" },
    pending: { text: "รออนุมัติ", cls: "text-sky-200 border-sky-300/30 bg-sky-400/10" },
    done: { text: "เสร็จสิ้น", cls: "text-emerald-200 border-emerald-300/30 bg-emerald-400/10" },
    rejected: { text: "ไม่อนุมัติ", cls: "text-rose-200 border-rose-300/30 bg-rose-500/15" },
    canceled: { text: "ยกเลิก", cls: "text-rose-200 border-rose-300/30 bg-rose-400/10" },
  };
  const m = map[status] || { text: status, cls: "text-slate-200 border-white/20 bg-white/5" };
  return <span className={`inline-block text-[11px] rounded-full px-2.5 py-1 border ${m.cls}`}>{m.text}</span>;
}
