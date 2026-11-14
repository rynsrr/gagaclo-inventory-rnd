import React, { useEffect, useRef, useState } from 'react';
import { Trophy, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { PRAISE_QUOTES } from '../data/motivationalQuotes';

export function CelebrationFlareOverlay({ achiever, onClose }) {
  const canvasRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(6);

  // Ambil kutipan pujian dinamis
  const praiseQuote = React.useMemo(() => {
    if (!achiever?.name) return 'Luar biasa, target hari ini tembus!';
    const seed = (achiever.name.charCodeAt(0) + (achiever.pcs || 0)) % PRAISE_QUOTES.length;
    return PRAISE_QUOTES[seed];
  }, [achiever]);

  // Efek Partikel Confetti & Flare Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Palet warna perayaan: Emerald, Amber/Gold, Cyan, White, Purple
    const colors = ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#06b6d4', '#38bdf8', '#ffffff', '#a855f7'];

    // 120 partikel letupan dari tengah ke segala arah
    const particles = [];
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < 130; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 60,
        y: centerY + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        opacity: 1,
        decay: Math.random() * 0.007 + 0.005,
      });
    }

    let isAlive = true;
    const render = () => {
      if (!isAlive) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // Gravitasi
        p.vx *= 0.985; // Hambatan udara
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - p.decay);

        if (p.opacity > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isAlive = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Timer hitung mundur auto-close (6 detik)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!achiever) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Perayaan Target Harian Tercapai"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Canvas Confetti Burst Se-Layar Penuh */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Efek Ambient Flare Radial Se-Halaman Penuh */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.35)_0%,rgba(99,102,241,0.25)_35%,rgba(15,23,42,0.95)_75%)] animate-pulse" />

      {/* Kartu Hero Flare di Tengah */}
      <div
        className="relative z-20 max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/20 text-center space-y-4 text-white ring-1 ring-white/20 transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup X di Sudut */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          title="Tutup (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Halo Glow di Belakang Ikon */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-400 blur-xl opacity-60 animate-ping" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 ring-4 ring-white/30 transform hover:rotate-6 transition">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950" />
          </div>
        </div>

        {/* Judul & Badge Milestone */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>TARGET HARIAN TERCAPAI!</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {achiever.name}
          </h2>
          <p className="text-xs font-bold text-slate-300">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-indigo-300">
              {achiever.role}
            </span>
          </p>
        </div>

        {/* Skor Angka Capaian (PCS) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-1 shadow-inner">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Capaian Input Hari Ini:
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight tabular-nums">
            {achiever.pcs} <span className="text-base text-slate-300 font-bold">/ {achiever.target} PCS</span>
          </div>
          <div className="text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {achiever.surplus > 0
                ? `Melampaui target (+${achiever.surplus} PCS Surplus)`
                : 'Target harian 100% terpenuhi'}
            </span>
          </div>
        </div>

        {/* Kutipan Pujian Dinamis */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-indigo-950/60 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-bold shadow-xs">
          "{praiseQuote}"
        </div>

        {/* Tombol Aksi & Bar Durasi Auto-Close */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 cursor-pointer transition transform active:scale-95"
          >
            Luar Biasa, Lanjutkan!
          </button>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Klik di mana saja atau tekan Esc</span>
            <span>Tutup otomatis ({timeLeft}s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
