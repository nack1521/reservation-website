// src/pages/UserGuide.jsx
import React from "react";
import FietLogo from "../components/FietLogo.jsx";

export default function UserGuide() {
  return (
    <div className="min-h-screen bg-animated bg-glow text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex flex-col items-center text-center">
          <FietLogo size={75} />
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              คู่มือการใช้งาน FIET Bookings
            </span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            เวอร์ชันสำหรับผู้ใช้ — แนวทางใช้งานแบบย่อและชัดเจน
          </p>
        </header>

        {/* Divider */}
        <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Sections */}
        <div className="mt-10 space-y-10">
          <Section
            no="01"
            title="ภาพรวม"
            body={
              <p className="text-slate-300 leading-relaxed">
                FIET Bookings คือระบบจองห้องเรียน/ห้องประชุมแบบ 3 ขั้นตอน
                เน้นความรวดเร็ว ชัดเจน รองรับการเลือก Add-ons และแสดงสถานะความพร้อมของห้องตามช่วงเวลาที่เลือก
              </p>
            }
          />

          <Section
            no="02"
            title="ขั้นตอนการจองห้อง"
            body={
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>
                  <b>ขั้นที่ 1:</b> เลือกวันและช่วงเวลา (คลิกเวลาเริ่ม–สิ้นสุด)
                </li>
                <li>
                  <b>ขั้นที่ 2:</b> เลือกชั้น/สาขาที่ต้องการ
                </li>
                <li>
                  <b>ขั้นที่ 3:</b> เลือกห้อง + Add-ons แล้วกดยืนยันการจอง
                </li>
              </ul>
            }
          />

          <Section
            no="03"
            title="Add-ons เสริม"
            body={
              <>
                <p className="text-slate-300 mb-2">
                  ระบบแนะนำอุปกรณ์ตามประเภทห้องโดยอัตโนมัติ เช่น:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>Lecture — ไมค์ลอย, โต๊ะเสริม, เก้าอี้เสริม</li>
                  <li>Computer Lab — เครื่องคอมพ์เสริม, หูฟังไมค์</li>
                  <li>Seminar — Coffee Break, โปรเจ็กเตอร์</li>
                </ul>
              </>
            }
          />

          <Section
            no="04"
            title="การเข้าสู่ระบบ"
            body={
              <p className="text-slate-300 leading-relaxed">
                ใช้บัญชีทดสอบ <b>ete / 1234</b> เพื่อเข้าสู่ระบบ
                ระบบจะจดจำการเข้าสู่ระบบจนกด Logout ออกจากระบบ
              </p>
            }
          />

          <Section
            no="05"
            title="เคล็ดลับการใช้งาน"
            body={
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>คลิก 2 ครั้งเพื่อเลือกช่วงเวลาเริ่ม–สิ้นสุด</li>
                <li>ปุ่ม “ล้างช่วงเวลา” เพื่อรีเซ็ตเวลาอย่างรวดเร็ว</li>
                <li>ใช้ตัวกรองประเภทและความจุ เพื่อลดรายการห้อง</li>
                <li>สถานะ “ว่าง/ไม่ว่าง” แสดงเป็นแบดจ์สีเขียว/แดง</li>
              </ul>
            }
          />

          <Section
            no="06"
            title="ติดต่อ / ข้อเสนอแนะ"
            body={
              <p className="text-slate-300">
                หากพบปัญหาการใช้งาน ติดต่อทีมได้ที่{" "}
                <span className="text-cyan-300">fiet-support@kmutt.ac.th</span>
              </p>
            }
          />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} Faculty of Industrial Education and Technology (FIET)
        </footer>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */
function Section({ no, title, body }) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <Badge>{no}</Badge>
        <h2 className="text-xl md:text-[22px] font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-3">{body}</div>
      <div className="mt-6 h-px w-full bg-white/10" />
    </section>
  );
}

function Badge({ children }) {
  return (
    <div className="min-w-[42px] h-[28px] px-2 rounded-md grid place-items-center
                    border border-white/20 bg-white/[.06] text-slate-100 text-xs font-semibold
                    tracking-widest">
      {children}
    </div>
  );
}
