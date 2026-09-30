import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { reservationsAPI } from "../services/reservations.js";
import { roomAPI } from "../services/rooms.js";
import { usersAPI } from "../services/users.js";

export default function AdminDashboard() {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("pending");
  const [dashboardMetrics, setDashboardMetrics] = useState({
    bookingsToday: 0,
    totalRoom: 0,
    pendingRoleApprovals: 0,
  });

  useEffect(() => {
    loadPending();
    loadAdminInsights();
  }, []);

  async function loadPending() {
    setLoadingPending(true);
    setAdminError("");
    try {
      const rows = await reservationsAPI.pending();
      setPendingApprovals(rows);
    } catch (err) {
      setPendingApprovals([]);
      setAdminError(err?.message || "Cannot load pending reservations.");
    } finally {
      setLoadingPending(false);
    }
  }

  async function loadAdminInsights() {
    try {
      const [allReservations, roomPaged, teacherRequests] = await Promise.all([
        reservationsAPI.adminAll({ page: 1, limit: 200 }),
        roomAPI.list({ page: 1, limit: 200 }),
        usersAPI.teacherRequests(),
      ]);

      const reservations = Array.isArray(allReservations?.items) ? allReservations.items : [];
      const rooms = Array.isArray(roomPaged?.items) ? roomPaged.items : [];
      const roleRequests = Array.isArray(teacherRequests) ? teacherRequests : [];

      const todayISO = new Date().toISOString().slice(0, 10);
      const bookingsToday = reservations.filter((item) => {
        const start = String(item?.start || item?.startTime || item?.startsAt || "");
        return start.slice(0, 10) === todayISO;
      }).length;

      setDashboardMetrics({
        bookingsToday,
        totalRoom: rooms.length,
        pendingRoleApprovals: roleRequests.length,
      });
    } catch (err) {
      setAdminError(err?.message || "Failed to load dashboard insights from backend.");
      setDashboardMetrics({ bookingsToday: 0, totalRoom: 0, pendingRoleApprovals: 0 });
    }
  }

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function handleApprove(id) {
    setAdminError("");
    setAdminMessage("");
    try {
      await reservationsAPI.approve(id, "approved");
      setAdminMessage("Reservation approved.");
      await loadPending();
      await loadAdminInsights();
    } catch (err) {
      setAdminError(err?.message || "Cannot approve reservation.");
    }
  }

  function openRejectModal(item) {
    setRejectTarget(item);
    setRejectReason("");
    setAdminError("");
  }

  function closeRejectModal() {
    setRejectTarget(null);
    setRejectReason("");
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setAdminError("Please provide a rejection reason.");
      return;
    }

    setRejecting(true);
    setAdminError("");
    setAdminMessage("");
    const targetId = rejectTarget.id || rejectTarget._id;
    try {
      await reservationsAPI.reject(targetId, rejectReason.trim());
      setAdminMessage("Reservation rejected.");
      closeRejectModal();
      await loadPending();
      await loadAdminInsights();
    } catch (err) {
      setAdminError(err?.message || "Cannot reject reservation.");
    } finally {
      setRejecting(false);
    }
  }

  const filteredApprovals = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const base = pendingApprovals.filter((item) => {
      if (!q) return true;
      return [
        item.id || item._id,
        item.user?.name,
        item.room?.name,
        item.roomName,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    if (status === "all") return base;
    return base.filter((item) => String(item.status || "pending").toLowerCase() === status);
  }, [pendingApprovals, keyword, status]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-slate-300/80 mt-1">
              Monitor booking operations, approvals, and room utilization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin-teacher-requests"
              className="relative rounded-xl px-4 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 transition"
            >
              Teacher Requests
              {dashboardMetrics.pendingRoleApprovals > 0 && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
              )}
            </Link>
            <Link
              to="/admin-rooms"
              className="rounded-xl px-4 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 transition"
            >
              Manage Rooms
            </Link>
            <Link
              to="/admin-transactions/1"
              className="rounded-xl px-4 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 transition"
            >
              Manage Transactions
            </Link>
            <button className="rounded-xl px-4 py-2.5 bg-white text-black font-medium hover:opacity-90 transition">
              Export Report
            </button>
          </div>
        </header>

        {(adminError || adminMessage) && (
          <div className="space-y-2">
            {adminError && (
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {adminError}
              </p>
            )}
            {adminMessage && (
              <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {adminMessage}
              </p>
            )}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Bookings Today" value={String(dashboardMetrics.bookingsToday)} delta="From backend data" />
          <MetricCard label="Pending Room Approvals" value={String(pendingApprovals.length)} delta="Needs review" />
          <MetricCard label="Pending Role Approvals" value={String(dashboardMetrics.pendingRoleApprovals)} delta="Teacher role requests" />
          <MetricCard label="Total Room" value={String(dashboardMetrics.totalRoom)} delta="From room service" />
        </section>

        <section>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-medium">Approval Queue</h2>
              <div className="flex flex-wrap gap-2">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search request, user, or room"
                  className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={() => {
                    loadPending();
                    loadAdminInsights();
                  }}
                  className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingPending ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300/80">
                Loading pending reservations...
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300/80">
                No requests found for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-300/80">
                    <tr className="[&>th]:py-2 [&>th]:px-3 text-left">
                      <th>Requester</th>
                      <th>Room</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredApprovals.map((item) => (
                      <tr key={item.id || item._id} className="[&>td]:py-2.5 [&>td]:px-3">
                        <td>{item.user?.name || item.user?.email || "-"}</td>
                        <td>{item.room?.name || item.roomName || "-"}</td>
                        <td>
                          {formatDateTimeRange(item.start, item.end)}
                        </td>
                        <td>{item.status || "pending"}</td>
                        <td className="text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleApprove(item.id || item._id)}
                              className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-200 hover:bg-emerald-400/20"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(item)}
                              className="rounded-lg border border-rose-300/30 bg-rose-400/10 px-2.5 py-1 text-rose-200 hover:bg-rose-400/20"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {rejectTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeRejectModal();
            }}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-4 text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-rose-300">
                  Reject Reservation Request
                </h3>
                <button
                  onClick={closeRejectModal}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3 text-xs space-y-1 text-slate-300">
                <p>
                  <span className="text-slate-400">Requester:</span>{" "}
                  {rejectTarget.user?.name || rejectTarget.user?.email || "-"}
                </p>
                <p>
                  <span className="text-slate-400">Room:</span>{" "}
                  {rejectTarget.room?.name || rejectTarget.roomName || "-"}
                </p>
                <p>
                  <span className="text-slate-400">Schedule:</span>{" "}
                  {formatDateTimeRange(rejectTarget.start, rejectTarget.end)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">
                  Reason for Rejection <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please specify why this reservation is rejected (e.g. Room reserved for faculty meeting)..."
                  className="w-full rounded-xl border border-white/15 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-400/80 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/15 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejecting || !rejectReason.trim()}
                  onClick={handleConfirmReject}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                >
                  {rejecting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, delta }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
      <p className="text-xs text-slate-300/80">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{delta}</p>
    </div>
  );
}

function formatDateTimeRange(startISO, endISO) {
  if (!startISO || !endISO) return "-";
  const s = new Date(startISO);
  const e = new Date(endISO);
  const date = s.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const st = s.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const et = e.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${st}-${et}`;
}
