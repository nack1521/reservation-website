import { useEffect, useMemo, useState } from "react";
import { usersAPI } from "../services/users.js";

function readRoles() {
  try {
    const raw = localStorage.getItem("authRoles");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((role) => String(role || "").toLowerCase().trim())
          .filter(Boolean);
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

function getUserId(user) {
  const direct = user?.id || user?._id || user?.userId || "";
  if (typeof direct === "string") return direct.trim();

  if (direct && typeof direct === "object") {
    const nested = direct.$oid || direct.oid || direct.id || direct._id;
    if (typeof nested === "string") return nested.trim();
  }

  return "";
}

function hasRole(user, roleName) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.map((r) => String(r || "").toLowerCase()).includes(roleName);
}

export default function AdminTeacherRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const roles = readRoles();
  const isSuperAdmin = roles.includes("super_admin");

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const list = await usersAPI.teacherRequests();
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || "Cannot load teacher requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function runAction(action, userId, okMessage) {
    if (!userId || busyId) return;
    setBusyId(userId);
    setError("");
    setMessage("");
    try {
      await action(userId);
      setMessage(okMessage);
      await loadRequests();
    } catch (err) {
      setError(err?.message || "Action failed.");
    } finally {
      setBusyId("");
    }
  }

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => {
      const text = [
        getUserId(item),
        item?.name,
        item?.email,
        ...(Array.isArray(item?.roles) ? item.roles : []),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, keyword]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Teacher Role Requests</h1>
            <p className="text-sm text-slate-300/80 mt-1">Approve or reject pending teacher role requests.</p>
          </div>
          <button
            onClick={loadRequests}
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

        <section className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by id, name, email"
              className="w-full max-w-sm rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
            />
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300/80">
              Loading teacher requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300/80">
              No pending teacher requests.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-300/80">
                  <tr className="[&>th]:py-2 [&>th]:px-3 text-left">
                    <th>User</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filtered.map((item) => {
                    const id = getUserId(item);
                    const roleLabels = Array.isArray(item?.roles) ? item.roles : [];
                    const disabled = !id || !!busyId;

                    return (
                      <tr key={id || item?.email || `${item?.name || "user"}-${item?.email || "unknown"}`} className="[&>td]:py-2.5 [&>td]:px-3">
                        <td className="font-medium">{item?.name || id || "-"}</td>
                        <td>{item?.email || "-"}</td>
                        <td>{roleLabels.join(", ") || "-"}</td>
                        <td className="text-right">
                          <div className="inline-flex flex-wrap gap-2 justify-end">
                            <button
                              disabled={disabled}
                              onClick={() => runAction(usersAPI.approveTeacher, id, "Teacher request approved.")}
                              className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"
                            >
                              Approve Teacher
                            </button>
                            <button
                              disabled={disabled}
                              onClick={() => runAction(usersAPI.rejectTeacher, id, "Teacher request rejected.")}
                              className="rounded-lg border border-rose-300/30 bg-rose-400/10 px-2.5 py-1 text-rose-200 hover:bg-rose-400/20 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            {isSuperAdmin && !hasRole(item, "admin") && (
                              <button
                                disabled={disabled}
                                onClick={() => runAction(usersAPI.grantAdmin, id, "Admin role granted.")}
                                className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50"
                              >
                                Grant Admin
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
