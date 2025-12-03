import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ===== MOCK DATA (ต่อ API ทีหลังได้) ===== */
const mockBookings = [
  { id:"BK-24001", date:"2025-10-08", start:"09:00", end:"11:00", room:"Room 1", floor:3, dept:"โยธา", type:"Lecture", capacity:60, status:"upcoming" },
  { id:"BK-24002", date:"2025-10-08", start:"13:00", end:"15:00", room:"Room 3", floor:5, dept:"ไฟฟ้า", type:"Seminar", capacity:20, status:"upcoming" },
  { id:"BK-24003", date:"2025-10-07", start:"10:00", end:"12:00", room:"Room 2", floor:4, dept:"เครื่องกล", type:"Computer Lab", capacity:30, status:"done" },
];

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return mockBookings
      .filter(b => {
        const q = query.trim().toLowerCase();
        const okQ = !q || [b.id,b.room,String(b.floor),b.dept,b.type]
          .some(v => String(v).toLowerCase().includes(q));
        const okD = !date || b.date === date;
        const okS = status==="all" || b.status===status;
        return okQ && okD && okS;
      })
      .sort((a,b)=> (a.date+a.start).localeCompare(b.date+b.start));
  }, [query, date, status]);

  // KPIs
  const todayISO = new Date().toISOString().slice(0,10);
  const kpiToday = mockBookings.filter(b=>b.date===todayISO).length;
  const kpiUpcoming = mockBookings.filter(b=>b.status==="upcoming").length;
  const kpiDone = mockBookings.filter(b=>b.status==="done").length;

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
        <div className="grid gap-4 sm:grid-cols-3">
          <KPI label="การจองวันนี้" value={kpiToday} />
          <KPI label="กำลังจะมาถึง" value={kpiUpcoming} />
          <KPI label="เสร็จสิ้นล่าสุด" value={kpiDone} />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              placeholder="ค้นหา (รหัส/ห้อง/ชั้น/สาขา/ประเภท)"
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
              <option value="done">เสร็จสิ้น</option>
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
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-300/80">
                  <tr className="[&>th]:py-2 [&>th]:px-3 text-left">
                    <th>รหัส</th>
                    <th>วันเวลา</th>
                    <th>ห้อง / ชั้น</th>
                    <th>สาขา</th>
                    <th>ประเภท</th>
                    <th>ความจุ</th>
                    <th>สถานะ</th>
                    <th className="text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filtered.map(b=>(
                    <tr key={b.id} className="[&>td]:py-2.5 [&>td]:px-3">
                      <td className="font-medium">{b.id}</td>
                      <td>{thaiDate(b.date)} · {b.start}-{b.end}</td>
                      <td>{b.room} · ชั้น {b.floor}</td>
                      <td>{b.dept}</td>
                      <td>{b.type}</td>
                      <td>{b.capacity}</td>
                      <td><StatusChip status={b.status} /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <ActionBtn label="พิมพ์สลิป" />
                          <ActionBtn label="แก้ไข" variant="secondary" />
                          <ActionBtn label="ยกเลิก" variant="danger" />
                        </div>
                      </td>
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
    done:     { text: "เสร็จสิ้น",      cls: "text-emerald-200 border-emerald-300/30 bg-emerald-400/10" },
    canceled: { text: "ยกเลิก",        cls: "text-rose-200 border-rose-300/30 bg-rose-400/10" },
  };
  const m = map[status] || { text: status, cls: "text-slate-200 border-white/20 bg-white/5" };
  return <span className={`text-[11px] rounded-full px-2.5 py-1 border ${m.cls}`}>{m.text}</span>;
}

function ActionBtn({ label, variant="primary" }) {
  const cls = {
    primary:   "border-white/20 bg-white/10 hover:bg-white/15",
    secondary: "border-white/10 hover:bg-white/10",
    danger:    "border-rose-300/30 text-rose-200 bg-rose-400/10 hover:bg-rose-400/15",
  }[variant];
  return (
    <button className={`rounded-xl px-3 py-1.5 text-xs border transition ${cls}`}>
      {label}
    </button>
  );
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

/* ===== utils ===== */
function thaiDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day:"2-digit", month:"short", year:"numeric" });
}

