import React, { useEffect, useRef, useState } from 'react';
import { Timer, X, Globe, RefreshCw } from 'lucide-react';
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
      <section aria-label="Hitung mundur pendataan" className="inventory-panel flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Hitung Mundur Pendataan</h2>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
              title="Tersinkronisasi otomatis di semua browser & perangkat tim"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sinkron Tim</span>
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {finished ? 'Waktu habis' : deadline ? 'Sisa waktu pengerjaan (tersinkronisasi)' : 'Atur durasi untuk memulai'}
          </p>
        </div>
        <div role="timer" className="flex gap-3 text-center sm:gap-6">
          {countdown.map(([label, value]) => (
            <div key={label} className="min-w-10">
              <div className="text-2xl leading-none font-bold tabular-nums text-blue-700 sm:text-4xl">{String(value).padStart(2, '0')}</div>
              <div className="mt-1 text-xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => dialogRef.current?.showModal()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 transition shadow-xs"
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          <span>Atur Timer</span>
        </button>
      </section>
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
