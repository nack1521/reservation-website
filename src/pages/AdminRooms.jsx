import { useEffect, useMemo, useState } from "react";
import { roomAPI } from "../services/rooms.js";

const emptyForm = {
  name: "",
  description: "",
  floor: "",
  type: "Lecture",
  capacity: "",
  location: "",
};

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoading(true);
    setError("");
    try {
      const data = await roomAPI.list({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" });
      setRooms(data.items || []);
    } catch (err) {
      setError(err?.message || "Cannot load rooms.");
    } finally {
      setLoading(false);
    }
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  function startEdit(room) {
    setEditingId(room.id);
    setForm({
      name: room.name || "",
      description: room.description || "",
      floor: room.floor || "",
      type: room.type || "Lecture",
      capacity: String(room.capacity ?? ""),
      location: room.location || "",
    });
    setMessage("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity || 0),
      };

      if (editingId) {
        await roomAPI.update(editingId, payload);
        setMessage("Room updated successfully.");
      } else {
        await roomAPI.create(payload);
        setMessage("Room created successfully.");
      }

      resetForm();
      await fetchRooms();
    } catch (err) {
      setError(err?.message || "Cannot save room.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(room) {
    const ok = window.confirm(`Delete ${room.name}?`);
    if (!ok) return;

    setError("");
    setMessage("");
    try {
      await roomAPI.remove(room.id);
      if (editingId === room.id) resetForm();
      setMessage("Room deleted successfully.");
      await fetchRooms();
    } catch (err) {
      setError(err?.message || "Cannot delete room.");
    }
  }

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) =>
      [room.name, room.floor, room.type, room.location]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rooms, query]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin Rooms</h1>
            <p className="text-sm text-slate-300/80 mt-1">Create, edit, and delete room records.</p>
          </div>
          <button
            onClick={fetchRooms}
            className="rounded-xl px-4 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 transition"
          >
            Refresh
          </button>
        </header>

        {(error || message) && (
          <div className="space-y-2">
            {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>}
            {message && <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{message}</p>}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4 space-y-3">
            <h2 className="text-base font-medium">{editingId ? "Edit Room" : "Create Room"}</h2>

            <Field label="Name" required>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Floor">
                <input
                  value={form.floor}
                  onChange={(e) => setField("floor", e.target.value)}
                  placeholder="1"
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
                />
              </Field>

              <Field label="Type">
                <input
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                  placeholder="Lecture"
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Capacity">
                <input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={(e) => setField("capacity", e.target.value)}
                  placeholder="60"
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
                />
              </Field>

              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  placeholder="Engineering Building A"
                  className="w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl px-4 py-2 bg-emerald-400 text-black font-medium hover:bg-emerald-300 disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Room" : "Create Room"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-4 py-2 border border-white/20 bg-white/10 hover:bg-white/15"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-medium">Room List</h2>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search room..."
                className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
              />
            </div>

            {loading ? (
              <p className="text-sm text-slate-300/80">Loading rooms...</p>
            ) : filteredRooms.length === 0 ? (
              <p className="text-sm text-slate-300/80">No room found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-300/80">
                    <tr className="[&>th]:py-2 [&>th]:px-3 text-left">
                      <th>Name</th>
                      <th>Floor</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Location</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredRooms.map((room) => (
                      <tr key={room.id} className="[&>td]:py-2.5 [&>td]:px-3">
                        <td className="font-medium">{room.name}</td>
                        <td>{room.floor || "-"}</td>
                        <td>{room.type || "-"}</td>
                        <td>{room.capacity ?? "-"}</td>
                        <td>{room.location || "-"}</td>
                        <td className="text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => startEdit(room)}
                              className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-100 hover:bg-cyan-400/20"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDelete(room)}
                              className="rounded-lg border border-rose-300/30 bg-rose-400/10 px-2.5 py-1 text-rose-100 hover:bg-rose-400/20"
                            >
                              Delete
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
      </div>
    </div>
  );
}

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-300/80 mb-1 block">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
