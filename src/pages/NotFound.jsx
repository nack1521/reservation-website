export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center bg-animated bg-glow text-white">
      <div className="text-center space-y-2">
        <div className="text-6xl font-bold">404</div>
        <p className="text-slate-300">ไม่พบหน้าที่คุณต้องการ</p>
        <a
          href="/"
          className="inline-block mt-3 rounded-xl px-4 py-2.5 bg-white text-black font-medium hover:opacity-90"
        >
          กลับหน้าแรก
        </a>
      </div>
    </div>
  );
}
