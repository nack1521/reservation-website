import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { reservationsAPI } from "../services/reservations.js";

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReservation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const payload = await reservationsAPI.detail(id);
      setBooking(normalizeReservation(payload));
    } catch (err) {
      setError(err?.message || "ไม่สามารถโหลดรายละเอียดการจองได้");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const canCancel = useMemo(() => {
    if (!booking) return false;
    return ["upcoming", "pending"].includes(booking.status) && !!booking.id;
  }, [booking]);

  const canCheckIn = useMemo(() => {
    if (!booking || booking.status !== "upcoming" || booking.checkInAt) return false;
    const start = new Date(booking.startISO).getTime();
    return Number.isFinite(start) && now >= start && now <= start + 15 * 60 * 1000;
  }, [booking, now]);

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

  async function handleCheckIn() {
    if (!canCheckIn || !booking) return;
    setCheckingIn(true);
    setError("");
    setSuccess("");
    try {
      const response = await reservationsAPI.checkIn(booking.id);
      setSuccess(response?.message || "Checked in successfully");
      await loadReservation();
    } catch (err) {
      setError(err?.message || "ไม่สามารถเช็กอินได้");
    } finally {
      setCheckingIn(false);
    }
  }

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("08:30");
  const [editEndTime, setEditEndTime] = useState("09:30");
  const [savingEdit, setSavingEdit] = useState(false);

  const canEdit = useMemo(() => {
    if (!booking) return false;
    return ["upcoming", "pending"].includes(booking.status) && !!booking.id;
  }, [booking]);

  function openEditModal() {
    if (!booking) return;
    setEditDate(booking.date || new Date().toISOString().slice(0, 10));
    setEditStartTime(booking.start || "08:30");
    setEditEndTime(booking.end || "09:30");
    setError("");
    setSuccess("");
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setIsEditOpen(false);
  }

  async function handleSaveSchedule(e) {
    e?.preventDefault();
    if (!booking || !editDate || !editStartTime || !editEndTime) return;
    setSavingEdit(true);
    setError("");
    setSuccess("");

    const startISO = `${editDate}T${editStartTime}:00+07:00`;
    const endISO = `${editDate}T${editEndTime}:00+07:00`;

    try {
      await reservationsAPI.update(booking.id, {
        start: new Date(startISO).toISOString(),
        end: new Date(endISO).toISOString(),
      });
      setSuccess("แก้ไขวันเวลาเรียบร้อยแล้ว รายการเปลี่ยนสถานะเป็น 'รออนุมัติ' (Pending)");
      closeEditModal();
      await loadReservation();
    } catch (err) {
      setError(err?.message || "ไม่สามารถแก้ไขวันเวลาได้");
    } finally {
      setSavingEdit(false);
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
      <div className="min-h-[calc(100vh-64px)] w-full min-w-0 bg-animated bg-glow text-white">
        <div className="mx-auto w-full min-w-0 max-w-3xl px-4 sm:px-6 py-6 sm:py-10 space-y-4">
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
    <div className="min-h-[calc(100vh-64px)] w-full min-w-0 bg-animated bg-glow text-white">
      <div className="mx-auto w-full min-w-0 max-w-3xl px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
            ← กลับไปแดชบอร์ด
          </Link>
          <span className="text-xs text-slate-400 break-all">Reservation ID: {booking.id || "-"}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-5 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">รายละเอียดการจอง</h1>
            <p className="text-sm text-slate-300/80 mt-1">ตรวจสอบรายละเอียด แก้ไขวันเวลา หรือยกเลิกรายการจอง</p>
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

          {booking.status === "rejected" && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-4 text-rose-100 space-y-1">
              <div className="flex items-center gap-2 font-medium text-rose-300">
                <span>⚠️ เหตุผลที่ถูกปฏิเสธ (Rejection Reason)</span>
              </div>
              <p className="text-sm text-slate-200 pl-6">
                {booking.reviewNote || "ไม่มีการระบุเหตุผล"}
              </p>
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

          <div className="pt-2 border-t border-white/10 flex flex-wrap justify-end gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={openEditModal}
                className="rounded-xl px-4 py-2.5 text-sm border border-cyan-300/30 text-cyan-200 bg-cyan-400/10 hover:bg-cyan-400/20 transition"
              >
                แก้ไขวันเวลา
              </button>
            )}
            {canCheckIn && (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="rounded-xl px-4 py-2.5 text-sm border border-emerald-300/30 text-emerald-100 bg-emerald-400/10 hover:bg-emerald-400/15 disabled:opacity-60 transition"
              >
                {checkingIn ? "กำลังเช็กอิน..." : "เช็กอิน"}
              </button>
            )}
            {canCancel ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={canceling}
                className="rounded-xl px-4 py-2.5 text-sm border border-rose-300/30 text-rose-200 bg-rose-400/10 hover:bg-rose-400/15 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {canceling ? "กำลังยกเลิก..." : booking.status === "pending" ? "ยกเลิกคำขอ" : "ยกเลิกการจอง"}
              </button>
            ) : (
              <span className="text-sm text-slate-400 self-center">รายการนี้ไม่สามารถยกเลิกได้</span>
            )}
          </div>
        </div>

        {isEditOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeEditModal();
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-4 text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">แก้ไขวันเวลาการจอง</h3>
                <button
                  onClick={closeEditModal}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-amber-200/90 rounded-lg bg-amber-500/10 border border-amber-400/30 p-2.5">
                หมายเหตุ: การเปลี่ยนวันเวลาจะทำให้รายการเปลี่ยนสถานะเป็น "รออนุมัติ" (Pending) เพื่อให้ผู้ดูแลตรวจสอบอีกครั้ง
              </p>

              <form onSubmit={handleSaveSchedule} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    วันที่ (Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      เวลาเริ่ม (Start)
                    </label>
                    <select
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {TIME_OPTIONS.slice(0, -1).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      เวลาสิ้นสุด (End)
                    </label>
                    <select
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {TIME_OPTIONS.slice(1).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/15"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {savingEdit ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TIME_OPTIONS = [
  "07:30",
  "08:30",
  "09:30",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
  "18:30",
  "19:30",
  "20:30",
];

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
    reviewNote: String(raw.reviewNote ?? ""),
    status,
    startISO,
    endISO,
    checkInAt: raw.checkInAt || null,
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
  if (status === "upcoming" || status === "done") return status;
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
