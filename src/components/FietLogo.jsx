// src/components/FietLogo.jsx
export default function FietLogo({ size = 48, label = "" }) {
  // ใช้ size คุมทั้ง svg
  const s = typeof size === "number" ? `${size}px` : size;

  return (
    <div className="inline-flex flex-col items-center select-none">
      <svg
        width={s}
        height={(parseInt(s, 10) * 0.36) || s}
        viewBox="0 0 260 96"
        role="img"
        aria-label={label || "FIET Logo"}
        className="drop-shadow-[0_0_18px_rgba(99,102,241,.25)]"
      >
        {/* ---------- defs: gradients & filters ---------- */}
        <defs>
          {/* เส้นตัวอักษร: ไล่สี cyan → emerald → violet */}
          <linearGradient id="g-stroke" x1="0" y1="0" x2="260" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>

          {/* เปลวไฟ: เหลืองส้มอุ่น แต่ลดความอิ่มให้สุภาพ */}
          <radialGradient id="g-flame" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(255,240,180,1)" />
            <stop offset="55%" stopColor="rgba(255,184,108,0.95)" />
            <stop offset="100%" stopColor="rgba(255,120,64,0.85)" />
          </radialGradient>

          {/* โกลว์รอบเปลวไฟ (อุ่น) */}
          <radialGradient id="g-flame-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,180,120,.35)" />
            <stop offset="100%" stopColor="rgba(255,180,120,0)" />
          </radialGradient>

          {/* เงาเส้นแบบนุ่มมาก */}
          <filter id="f-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(255,255,255,.18)" />
          </filter>
        </defs>

        {/* ---------- styles (keyframes ในตัว svg) ---------- */}
        <style>{`
          @keyframes flame-flicker {
            0%   { transform: translateY(0px) rotate(-1deg) scale(1); opacity: .96; }
            50%  { transform: translateY(-0.8px) rotate(1.2deg)  scale(1.03); opacity: 1; }
            100% { transform: translateY(0px) rotate(-0.5deg) scale(1); opacity: .96; }
          }
          @keyframes flame-glow {
            0%   { opacity: .28; transform: scale(1);   }
            50%  { opacity: .42; transform: scale(1.06); }
            100% { opacity: .28; transform: scale(1);   }
          }
        `}</style>

        {/* ---------- FIET strokes (มินิมอลคม ๆ) ---------- */}
        <g fill="none" stroke="url(#g-stroke)" strokeWidth="10" strokeLinecap="round" filter="url(#f-soft)">
          {/* F */}
          <path d="M20 28 L20 78" />
          <path d="M20 28 L78 28" />
          <path d="M20 52 L64 52" />

          {/* I (ลำตัวแท่งเทียน) */}
          <path d="M112 30 L112 78" />

          {/* E */}
          <path d="M144 28 L144 78" />
          <path d="M144 28 L204 28" />
          <path d="M144 52 L196 52" />
          <path d="M144 78 L204 78" />

          {/* T */}
          <path d="M220 28 L256 28" />
          <path d="M238 28 L238 78" />
        </g>

        {/* ---------- เปลวเทียนเหนือ I ---------- */}
        {/* glow อุ่นรอบ ๆ เปลว */}
        <g transform="translate(112,20)">
          <circle
            cx="0"
            cy="0"
            r="20"
            fill="url(#g-flame-glow)"
            style={{ animation: "flame-glow 2.2s ease-in-out infinite" }}
          />
        </g>

        {/* เปลวไฟ (เหนือ I ประมาณ y=18) */}
        <g transform="translate(112,5)">
          {/* ก้านไส้เทียนเล็ก ๆ */}
          <rect x="-1" y="8" width="2" height="6" rx="1" fill="rgba(255,255,255,.6)" />
          {/* ตัวเปลว */}
          <path
            d="M0 -2 C 7 6, 6 12, 0 16 C -6 12, -7 6, 0 -2 Z"
            fill="url(#g-flame)"
            style={{ transformOrigin: "0px 8px", animation: "flame-flicker 1.8s ease-in-out infinite" }}
          />
          {/* ไฮไลต์กลางเปลว */}
          <circle cx="0" cy="8" r="3.2" fill="rgba(255,240,210,.75)" />
        </g>
      </svg>

      {/* label (ถ้าต้องการ) */}
      {label ? (
        <span className="mt-1 text-[11px] tracking-wide text-slate-300/80">{label}</span>
      ) : null}
    </div>
  );
}
