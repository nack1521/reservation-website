import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { reservationsAPI } from "../services/reservations.js";
import { roomAPI } from "../services/rooms.js";

const EDITABLE_STATUS_OPTIONS = [
  "pending",
  "upcoming",
  "approved",
  "rejected",
  "canceled",
  "cancelled",
  "done",
];

function pickId(item = {}) {
  const candidates = [item.id, item._id, item.reservationId];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested = value.$oid || value.oid || value.id || value._id;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return "";
}

function normalizeTransaction(item = {}) {
  const id = pickId(item);
  const startRaw = item.start || item.startTime || item.startsAt || "";
  const endRaw = item.end || item.endTime || item.endsAt || "";
  const rawStatus = String(item.status || "pending").toLowerCase();
  const status =
    rawStatus === "pending_approval" || rawStatus === "waiting_approval"
      ? "pending"
      : rawStatus === "confirmed" || rawStatus === "booked"
      ? "upcoming"
      : rawStatus;

  return {
    id,
    user: String(item.user?.name || item.user?.email || item.userName || "-"),
    room: String(item.room?.name || item.roomName || item.room?.id || "-"),
    roomId: String(item.room?._id || item.room?.id || item.roomId || ""),
    status,
    note: String(item.note || ""),
    start: startRaw,
    end: endRaw,
  };
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function toISO(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function isEditableStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "pending_approval" || normalized === "waiting_approval") return true;
  if (normalized === "confirmed" || normalized === "booked") return true;
  return normalized === "upcoming" || normalized === "pending";
}

function isEditableTransaction(item = {}) {
  return isEditableStatus(item.status);
}

export default function AdminTransactions() {
  const navigate = useNavigate();
  const params = useParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [rooms, setRooms] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const initialPage = Math.max(1, Number(params.page) || 1);
  const [page, setPage] = useState(initialPage);
  const [pageMeta, setPageMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [selectedId, setSelectedId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFloor, setEditFloor] = useState("all");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roomId: "",
    status: "pending",
    note: "",
    start: "",
    end: "",
  });

  async function loadTransactions() {
    setLoading(true);
    setError("");

    try {
      const paged = await reservationsAPI.adminAll({
        page,
        limit: pageSize,
        status: statusFilter || "all",
        room: roomFilter || undefined,
        user: userFilter || undefined,
        date: dateFilter || undefined,
      });

      const sourceItems = Array.isArray(paged?.items) ? paged.items : [];
      const normalized = sourceItems.map(normalizeTransaction).filter((item) => !!item.id);
      setRows(normalized);
      setPageMeta(
        paged?.meta || {
          page,
          limit: pageSize,
          total: normalized.length,
          totalPages: 1,
          hasPrevPage: false,
          hasNextPage: false,
        }
      );

      if (!normalized.length) {
        setError("No transactions found for this filter.");
      }
    } catch (err) {
      setRows([]);
      const msg = String(err?.message || "");
      if (/401/.test(msg)) {
        setError("401 Unauthorized: please login again.");
      } else if (/403/.test(msg)) {
        setError("403 Forbidden: admin or super_admin role is required.");
      } else {
        setError(msg || "Cannot load transactions.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadRooms() {
    try {
      const result = await roomAPI.list({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" });
      const items = Array.isArray(result?.items) ? result.items : [];
      setRooms(items);
    } catch {
      setRooms([]);
    }
  }

  const floorOptions = useMemo(() => {
    const set = new Set(
      rooms
        .map((room) => String(room.floor || "").trim())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rooms]);

  const roomOptions = useMemo(() => {
    return rooms
      .filter((room) => {
        if (!floorFilter || floorFilter === "all") return true;
        return String(room.floor || "").trim() === floorFilter;
      })
      .map((room) => ({
        value: String(room.reservationRoomId || room.id || ""),
        label: `${room.name}${room.floor ? ` (Floor ${room.floor})` : ""}`,
      }))
      .filter((room) => room.value);
  }, [rooms, floorFilter]);

  const editRoomOptions = useMemo(() => {
    return rooms
      .filter((room) => {
        if (!editFloor || editFloor === "all") return true;
        return String(room.floor || "").trim() === editFloor;
      })
      .map((room) => ({
        value: String(room.reservationRoomId || room.id || ""),
        label: `${room.name}${room.floor ? ` (Floor ${room.floor})` : ""}`,
      }))
      .filter((room) => room.value);
  }, [rooms, editFloor]);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    const routePage = Math.max(1, Number(params.page) || 1);
    if (routePage !== page) {
      setPage(routePage);
    }
  }, [params.page]);

  useEffect(() => {
    loadTransactions();
  }, [page, pageSize, statusFilter, dateFilter, roomFilter, userFilter]);

  useEffect(() => {
    if (page !== 1) {
      navigate(`/admin-transactions/1`, { replace: true });
    }
  }, [statusFilter, dateFilter, floorFilter, roomFilter, userFilter, pageSize]);

  useEffect(() => {
    setRoomFilter("");
  }, [floorFilter]);

  const canGoPrev = pageMeta.hasPrevPage || page > 1;
  const canGoNext =
    pageMeta.hasNextPage ||
    (pageMeta.totalPages > page) ||
    (rows.length > 0 && rows.length === pageMeta.limit);

  function goToPage(nextPage) {
    const safePage = Math.max(1, Number(nextPage) || 1);
    navigate(`/admin-transactions/${safePage}`);
  }

  function startEdit(item) {
    if (!isEditableTransaction(item)) {
      setError("Only upcoming and pending transactions can be edited.");
      setMessage("");
      return;
    }

    setSelectedId(item.id);
    setSelectedStatus(item.status);
    setForm({
      roomId: item.roomId || "",
      status: item.status || "pending",
      note: item.note || "",
      start: toDateTimeLocal(item.start),
      end: toDateTimeLocal(item.end),
    });

    const currentRoom = rooms.find((room) => {
      const value = String(room.reservationRoomId || room.id || "");
      return value && value === String(item.roomId || "");
    });
    setEditFloor(currentRoom?.floor ? String(currentRoom.floor) : "all");

    setIsEditOpen(true);
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setIsEditOpen(false);
    setSelectedId("");
    setSelectedStatus("");
    setEditFloor("all");
    setForm({ roomId: "", status: "pending", note: "", start: "", end: "" });
  }

  useEffect(() => {
    if (!isEditOpen) return;
    if (!form.roomId) return;

    const currentExists = editRoomOptions.some((room) => room.value === String(form.roomId));
    if (!currentExists) {
      setForm((prev) => ({ ...prev, roomId: "" }));
    }
  }, [editFloor, editRoomOptions, form.roomId, isEditOpen]);

  async function saveEdit() {
    if (saving) return;

    if (!selectedId) {
      setError("Cannot edit this transaction: missing transaction id.");
      setMessage("");
      return;
    }

    if (!isEditableStatus(selectedStatus)) {
      setError("Only upcoming and pending transactions can be edited.");
      setMessage("");
      return;
    }

    const payload = {
      status: form.status,
      note: form.note,
      start: toISO(form.start),
      end: toISO(form.end),
    };

    if (form.roomId.trim()) {
      payload.roomId = form.roomId.trim();
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await reservationsAPI.update(selectedId, payload);
      setMessage("Transaction updated successfully.");
      cancelEdit();
      await loadTransactions();
    } catch (err) {
      setError(err?.message || "Cannot update transaction.");
    } finally {
      setSaving(false);
    }
  }

  const editModal = isEditOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelEdit();
            }
          }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950/95 p-4 space-y-4 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-medium">Edit Transaction</h2>
              <button
                onClick={cancelEdit}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Floor">
                <select
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-slate-100"
                >
                  <option value="all">All floors</option>
                  {floorOptions.map((floor) => (
                    <option key={floor} value={floor}>
                      Floor {floor}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Room">
                <select
                  value={form.roomId}
                  onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-slate-100"
                >
                  <option value="">Select room</option>
                  {editRoomOptions.map((room) => (
                    <option key={room.value} value={room.value}>
                      {room.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-slate-100"
                >
                  {!EDITABLE_STATUS_OPTIONS.includes(String(form.status || "")) && form.status ? (
                    <option value={form.status}>{form.status}</option>
                  ) : null}
                  {EDITABLE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Start">
                <input
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-slate-100"
                />
              </Field>

              <Field label="End">
                <input
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-slate-100"
                />
              </Field>
            </div>

            <Field label="Note">
              <textarea
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                rows={3}
                className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-slate-100"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-xl px-4 py-2 bg-emerald-400 text-black font-medium hover:bg-emerald-300 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-xl px-4 py-2 border border-white/20 bg-white/10 hover:bg-white/15"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Manage Transactions</h1>
            <p className="text-sm text-slate-300/80 mt-1">Edit reservation transaction details from backend data.</p>
          </div>
          <button
            onClick={loadTransactions}
            className="rounded-xl px-4 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 transition"
          >
            Refresh
          </button>
        </header>

        {(error || message) && (
          <div className="space-y-2">
            {error && (
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {message}
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid w-full gap-2 md:grid-cols-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                <option value="upcoming">upcoming</option>
                <option value="pending">pending</option>
                <option value="done">done</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="canceled">canceled</option>
                <option value="cancelled">cancelled</option>
              </select>
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="userId"
                className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
              />

              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
              >
                <option value="all">All floors</option>
                {floorOptions.map((floor) => (
                  <option key={floor} value={floor}>
                    Floor {floor}
                  </option>
                ))}
              </select>

              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
              >
                <option value="">All rooms</option>
                {roomOptions.map((room) => (
                  <option key={room.value} value={room.value}>
                    {room.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setDateFilter("");
                  setFloorFilter("all");
                  setRoomFilter("");
                  setUserFilter("");
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300/80">
              Loading transactions...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300/80">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-300/80">
                  <tr className="[&>th]:py-2 [&>th]:px-3 text-left">
                    <th>User</th>
                    <th>Room</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rows.map((item) => (
                    <tr key={item.id} className="[&>td]:py-2.5 [&>td]:px-3 align-top">
                      <td>{item.user}</td>
                      <td>{item.room}</td>
                      <td>{item.start ? formatDateTime(item.start) : "-"}</td>
                      <td>{item.end ? formatDateTime(item.end) : "-"}</td>
                      <td>{item.status}</td>
                      <td className="text-right">
                        <button
                          onClick={() => startEdit(item)}
                          className={`rounded-lg px-2.5 py-1 ${
                            isEditableTransaction(item)
                              ? "border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                              : "border border-white/10 bg-zinc-900/60 text-slate-300 hover:bg-zinc-800/70"
                          }`}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm text-slate-300/90">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg bg-zinc-900/70 border border-white/10 px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Showing {(pageMeta.page - 1) * pageMeta.limit + 1}-{Math.min(pageMeta.page * pageMeta.limit, pageMeta.total)} of {pageMeta.total}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={!canGoPrev}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-200">
                  {pageMeta.page} / {pageMeta.totalPages}
                </span>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={!canGoNext}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {editModal}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
