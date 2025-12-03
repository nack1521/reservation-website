// src/pages/Success.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Success() {
  const location = useLocation();
  const state = location?.state ?? null;               // <-- ป้องกัน state ไม่มี
  const nav = useNavigate();

  // ถ้าเข้าหน้านี้ตรง ๆ ไม่มี state ให้ย้อนกลับไปจอง
  if (!state) {
    return (
      <div className="min-h-[calc(100vh-64px)] grid place-items-center bg-animated bg-glow text-white">
        <div className="text-center space-y-3">
          <div className="text-2xl font-semibold">ยังไม่มีข้อมูลการจอง</div>
          <Link to="/book" className="rounded-xl px-4 py-2.5 bg-white text-black font-medium hover:opacity-90">
            ไปจองห้อง
          </Link>
        </div>
      </div>
    );
  }

  const {
    roomName, floor, floorLabel, dateISO, timeRangeLabel, type, capacity,
  } = state;

  // ทำให้แน่ใจว่า addons เป็นอาเรย์เสมอ
  const addons = Array.isArray(state.addons) ? state.addons : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-animated bg-glow text-white">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-10 space-y-6">
        {/* หัวข้อ */}
        <div className="no-print flex items-center justify-between">
          <h1 className="text-xl font-semibold">จองสำเร็จ</h1>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-xl px-4 py-2.5 bg-white text-black font-medium hover:opacity-90">
              พิมพ์สลิป
            </button>
            <button onClick={() => nav("/dashboard")} className="rounded-xl px-4 py-2.5 border border-white/10 hover:bg-white/10">
              ไปแดชบอร์ด
            </button>
          </div>
        </div>

        {/* ตั๋ว */}
        <div className="p-[2px] rounded-[26px] bg-gradient-to-r from-emerald-400/30 via-cyan-400/30 to-violet-400/30">
          <div className="relative rounded-[24px] bg-zinc-950/90 border border-white/10 overflow-hidden">
            <div className="grid md:grid-cols-[1.2fr_.8fr]">
              {/* ซ้าย */}
              <div className="p-6 md:p-8">
                <div className="text-emerald-300 text-sm font-medium">จองสำเร็จ</div>
                <h2 className="mt-1 text-2xl font-semibold">
                  {roomName} · ชั้น {floor} ({floorLabel})
                </h2>

                <div className="mt-4 grid gap-2 text-sm">
                  <Row label="วันที่">{thaiDate(dateISO)}</Row>
                  <Row label="ช่วงเวลา">{timeRangeLabel}</Row>
                  <Row label="ประเภทห้อง">{type}</Row>
                  <Row label="ความจุ">{capacity} ที่นั่ง</Row>
                  <Row label="รหัสสลิป">{makeCode(state)}</Row>
                </div>

                {/* แสดง Add-ons ถ้ามี */}
                {addons.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-300 mb-1">Add-ons ที่ขอเพิ่ม</div>
                    <ul className="text-sm space-y-1">
                      {addons.map(a => (
                        <li key={a.id} className="flex items-center justify-between">
                          <span className="text-slate-300">{a.label}</span>
                          <span className="font-medium text-white">{a.qty} {a.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-400">
                  โปรดนำสลิปนี้แสดงในวันใช้งาน หากต้องการยกเลิกหรือแก้ไขเวลา
                  สามารถทำได้ในหน้าแดชบอร์ดก่อนเวลาใช้งานอย่างน้อย 30 นาที
                </p>
              </div>

              {/* ขวา */}
              <aside className="relative p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/10">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  <img src="/kmutt.jpg" alt="FIET" className="w-full h-40 object-cover" />
                </div>
                <div className="mt-4 grid place-items-center">
                  <div className="rounded-lg bg-white p-2">
                    <FakeQR value={makeCode(state)} />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">แสดง QR นี้ที่หน้าเคาน์เตอร์</div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* ปุ่มล่างบนมือถือ */}
        <div className="no-print flex gap-2 justify-center">
          <Link to="/book" className="rounded-xl px-4 py-2.5 border border-white/10 hover:bg-white/10">จองเพิ่ม</Link>
          <button onClick={() => window.print()} className="rounded-xl px-4 py-2.5 bg-white text-black font-medium hover:opacity-90">พิมพ์</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

/* QR ปลอม */
function FakeQR({ value = "" }) {
  const seed = [...value].reduce((a, c) => (a * 33) ^ c.charCodeAt(0), 5381) >>> 0;
  const cells = 21;
  const size = 160;
  const cell = Math.floor(size / cells);
  const bits = Array.from({ length: cells * cells }, (_, i) => ((seed >> (i % 31)) ^ i) & 1);

  return (
    <svg width={size} height={size}>
      <rect width={size} height={size} fill="#fff" />
      {bits.map((b, i) =>
        b ? (
          <rect
            key={i}
            x={(i % cells) * cell}
            y={Math.floor(i / cells) * cell}
            width={cell - 1}
            height={cell - 1}
            fill="#000"
          />
        ) : null
      )}
    </svg>
  );
}

/* utils */
function thaiDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}
function makeCode(obj) {
  const y = new Date(obj.dateISO).getFullYear().toString().slice(-2);
  const base = `${obj.floor}${obj.roomName.replace(/\D/g, "")}${y}`;
  return `BK-${base}-${(Math.abs(hash(JSON.stringify(obj))) % 899 + 100)}`;
}
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
