import React, { useEffect, useRef, useState } from 'react';
import { Timer, X, Globe, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const TIMER_PIN = '4695';

export function InventoryTimer() {
  const dialogRef = useRef(null);
  const { timerDeadline, updateTimerDeadline, resetTimerDeadline, supabaseStatus } = useInventory();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [days, setDays] = useState('7');
  const [isSaving, setIsSaving] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const deadline = Number(timerDeadline) || 0;
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const finished = deadline > 0 && remaining === 0;

  const countdown = [
    ['Hari', Math.floor(remaining / 86400)],
    ['Jam', Math.floor(remaining / 3600) % 24],
    ['Menit', Math.floor(remaining / 60) % 60],
    ['Detik', remaining % 60],
  ];

  useEffect(() => {
    if (!deadline || finished) return;
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [deadline, finished]);

  function unlock(event) {
    event.preventDefault();
    if (pin !== TIMER_PIN) {
      setPinError(true);
      return;
    }
    setPin('');
    setPinError(false);
    setUnlocked(true);
  }

  function lock() {
    setPin('');
    setPinError(false);
    setUnlocked(false);
  }

  async function start(event) {
    event.preventDefault();
    if (!unlocked) return;
    const duration = Number(days);
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) return;
    const startedAt = Date.now();
    const end = startedAt + duration * 86_400_000;
    setIsSaving(true);
    await updateTimerDeadline(end);
    setIsSaving(false);
    setNow(startedAt);
    dialogRef.current?.close();
  }

  async function reset() {
    if (!unlocked) return;
    setIsSaving(true);
    await resetTimerDeadline();
    setIsSaving(false);
    dialogRef.current?.close();
  }

  return (
    <>
      {isMinimized ? (
        <aside
          aria-label="Hitung mundur pendataan"
          className="fixed bottom-4 left-4 z-40 no-print group flex items-center gap-2.5 px-3.5 py-2 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-blue-400 cursor-pointer"
          onClick={() => setIsMinimized(false)}
          title="Klik untuk memperbesar hitung mundur pendataan"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-2xs">
            <Timer className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-black tracking-tight text-slate-800 tabular-nums">
            {String(countdown[0][1]).padStart(2, '0')}h : {String(countdown[1][1]).padStart(2, '0')}j : {String(countdown[2][1]).padStart(2, '0')}m : {String(countdown[3][1]).padStart(2, '0')}d
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
        </aside>
      ) : (
        <aside 
          aria-label="Hitung mundur pendataan" 
          className="fixed bottom-4 left-4 z-40 no-print relative overflow-hidden bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] hover:shadow-[0_18px_50px_-6px_rgba(37,99,235,0.22)] hover:border-blue-300/80 rounded-2xl p-3 sm:p-3.5 transition-all duration-300 max-w-[calc(100vw-2rem)] sm:max-w-md w-auto"
        >
          {/* Subtle ambient gradient accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 opacity-90" />

          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-tight">Hitung Mundur</h2>
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200"
                    title="Tersinkronisasi otomatis real-time"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>Cloud Sync</span>
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 leading-tight">
                  {finished ? '⚠️ Waktu telah berakhir' : deadline ? 'Sisa waktu pengerjaan real-time' : 'Durasi belum diatur'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => dialogRef.current?.showModal()}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                title="Atur durasi timer"
              >
                <Timer className="h-3 w-3 text-blue-600" aria-hidden="true" />
                <span>Atur Timer</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Perkecil ke mode ringkas"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Digital Counter Blocks */}
          <div role="timer" className="flex items-center justify-between gap-1 sm:gap-1.5">
            {countdown.map(([label, value], idx) => (
              <React.Fragment key={label}>
                <div className="flex-1 flex flex-col items-center justify-center min-w-[50px] sm:min-w-[58px] px-2 py-1 sm:py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
                  <div className="text-base sm:text-lg font-black tabular-nums tracking-tight bg-gradient-to-br from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 -mt-0.5">
                    {label}
                  </div>
                </div>
                {idx < countdown.length - 1 && (
                  <span className="text-slate-300 font-black text-xs select-none">:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </aside>
      )}

      <span className="sr-only" role="status">{finished ? 'Waktu pengerjaan data habis.' : ''}</span>
      <dialog
        ref={dialogRef}
        onClose={lock}
        aria-labelledby="inventory-timer-title"
        className="no-print m-auto w-[min(92vw,24rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/45"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="inventory-timer-title" className="text-base font-bold text-slate-900">Timer Pengerjaan Data</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>Global</span>
            </span>
          </div>
          <button type="button" aria-label="Tutup" onClick={() => dialogRef.current?.close()}
            className="rounded-lg p-1 hover:bg-slate-100 transition text-slate-500 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Timer ini tersimpan di cloud &amp; terlihat di semua perangkat tim yang membuka aplikasi.
        </p>

        {!unlocked ? (
          <form onSubmit={unlock} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              PIN Pengaturan
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                placeholder="••••"
                onChange={event => { setPin(event.target.value); setPinError(false); }}
                className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {pinError && <p role="alert" className="text-sm text-red-600 font-medium">PIN salah. Masukkan PIN yang benar.</p>}
            <button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-xs">
              Buka Pengaturan
            </button>
          </form>
        ) : (
          <form onSubmit={start} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              Durasi Pengerjaan (Hari)
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                required
                value={days}
                onChange={event => setDays(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-xs disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>{deadline ? 'Simpan & Mulai Ulang' : 'Mulai Hitung Mundur'}</span>
              </button>
              {deadline > 0 && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={reset}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-60"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
