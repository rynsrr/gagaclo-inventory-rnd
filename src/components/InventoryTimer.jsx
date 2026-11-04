import React, { useEffect, useRef, useState } from 'react';
import { Timer, X } from 'lucide-react';

const STORAGE_KEY = 'gagaclo_inventory_timer_deadline';

export function InventoryTimer() {
  const dialogRef = useRef(null);
  const [minutes, setMinutes] = useState('25');
  const [deadline, setDeadline] = useState(() => Number(localStorage.getItem(STORAGE_KEY)) || 0);
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const finished = deadline > 0 && remaining === 0;
  const display = [Math.floor(remaining / 60), remaining % 60]
    .map(value => String(value).padStart(2, '0')).join(':');

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

  function start(event) {
    event.preventDefault();
    const duration = Number(minutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) return;
    const startedAt = Date.now();
    const end = startedAt + duration * 60_000;
    localStorage.setItem(STORAGE_KEY, String(end));
    setNow(startedAt);
    setDeadline(end);
    dialogRef.current.close();
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setDeadline(0);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current.showModal()}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold tabular-nums ${finished
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-slate-200 hover:bg-slate-100'}`}
      >
        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
        {finished ? 'Waktu habis' : deadline ? display : 'Timer'}
      </button>
      <span className="sr-only" role="status">{finished ? 'Waktu pengerjaan data habis.' : ''}</span>
      <dialog
        ref={dialogRef}
        aria-labelledby="inventory-timer-title"
        className="no-print m-auto w-[min(92vw,24rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/45"
      >
        <div className="flex items-center justify-between">
          <h2 id="inventory-timer-title" className="text-base font-bold">Timer pengerjaan data</h2>
          <button type="button" aria-label="Tutup" onClick={() => dialogRef.current.close()}
            className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {deadline > 0 && (
          <p className="mt-3 text-sm font-semibold tabular-nums">
            {finished ? 'Waktu habis' : `Sisa waktu ${display}`}
          </p>
        )}
        <form onSubmit={start} className="mt-4 space-y-4">
          <label className="block text-sm font-semibold">
            Durasi (menit)
            <input type="number" min="1" max="180" step="1" required value={minutes}
              onChange={event => setMinutes(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 p-2" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
              {deadline ? 'Mulai ulang' : 'Mulai'}
            </button>
            {deadline > 0 && (
              <button type="button" onClick={reset}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
                Reset
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
