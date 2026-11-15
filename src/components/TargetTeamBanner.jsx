import React, { useState, useEffect, useMemo } from 'react';
import { Target, Edit2, Check, X, User } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { getItemRecordDate, getLocalTodayIso } from '../utils/dateUtils';
import { isManager, isSuperuser } from '../utils/authUtils';

// 8 Anggota Tim Resmi
const TEAM_MEMBERS = [
  { name: 'Royan', role: 'PPIC #1' },
  { name: 'Cynara', role: 'PPIC #2' },
  { name: 'Ami', role: 'PPIC #3' },
  { name: 'Ryan', role: 'PPIC #4' },
  { name: 'Hanami', role: 'PPIC #5' },
  { name: 'Sheva', role: 'Support #1' },
  { name: 'Ade', role: 'Support #2' },
  { name: 'Tri', role: 'Support #3' },
];

export function TargetTeamBanner({ onOpenUserProfile }) {
  const {
    items = [],
    boxes = [],
    currentUser,
    showNotification,
  } = useInventory();
  const isMgr = isManager(currentUser) || isSuperuser(currentUser);

  // Target Harian Tim (disimpan di localStorage agar persisten)
  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_daily_target_pcs');
      return saved ? Math.max(1, Number(saved)) : 150;
    } catch {
      return 150;
    }
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(dailyTarget.toString());

  // Dengarkan perubahan target dari komponen lain
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('gagaclo_daily_target_pcs');
        if (saved) setDailyTarget(Math.max(1, Number(saved)));
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gagaclo_target_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gagaclo_target_updated', handleStorageChange);
    };
  }, []);

  const handleSaveTarget = (e) => {
    e?.preventDefault?.();
    const num = Math.max(1, parseInt(tempTarget, 10) || 150);
    setDailyTarget(num);
    try {
      localStorage.setItem('gagaclo_daily_target_pcs', num.toString());
      window.dispatchEvent(new Event('gagaclo_target_updated'));
    } catch {}
    setIsEditingTarget(false);
    if (showNotification) {
      showNotification(`Target team berhasil disetel ke ${num} PCS oleh ${currentUser?.name || 'Manager'}.`, 'success', 3000);
    }
  };

  // Hitung total PCS dan jumlah sampel yang di-input hari ini
  const todayIso = getLocalTodayIso();
  const todayStats = useMemo(() => {
    let sum = 0;
    let sampleCount = 0;
    items.forEach((item) => {
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (dateKey === todayIso) {
        sum += Number(item.jumlah) || 0;
        sampleCount += 1;
      }
    });
    return { pcs: sum, samples: sampleCount };
  }, [items, todayIso]);

  const isAchieved = todayStats.pcs >= dailyTarget;
  const percent = Math.round((todayStats.pcs / dailyTarget) * 100);

  // Map box ke PIC untuk deteksi penginput
  const boxRackMap = useMemo(() => {
    const map = {};
    boxes.forEach((b) => {
      map[b.boxNumber] = b;
    });
    return map;
  }, [boxes]);

  // Hitung target harian individu untuk seluruh 8 personil tim R&D
  const allMemberTargets = useMemo(() => {
    let savedTargets = {};
    try {
      const saved = localStorage.getItem('gagaclo_individual_targets');
      if (saved) savedTargets = JSON.parse(saved);
    } catch {}

    const pcsMap = {};
    TEAM_MEMBERS.forEach((m) => {
      pcsMap[m.name] = 0;
    });

    items.forEach((item) => {
      const box = boxRackMap[Number(item.boxNumber)];
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (dateKey !== todayIso) return;

      const pcs = Number(item.jumlah) || 0;
      const boxPic = String(item.picName || (box ? box.picName : 'Lainnya')).trim();

      // Deteksi penginput riil (Support vs PPIC)
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));
      const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
      const rawSupport =
        item.supportName ||
        item.helperName ||
        (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null) ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        (item.inputtedBy && ['sheva', 'ade', 'tri', 'helper 1', 'helper 2', 'helper 3'].some((n) => String(item.inputtedBy).toLowerCase().includes(n))
          ? item.inputtedBy
          : null) ||
        (item.createdBy && ['sheva', 'ade', 'tri', 'helper 1', 'helper 2', 'helper 3'].some((n) => String(item.createdBy).toLowerCase().includes(n))
          ? item.createdBy
          : null);

      let resolvedSupport = null;
      if (rawSupport) {
        const sStr = String(rawSupport).trim();
        if (/helper\s*1/i.test(sStr)) resolvedSupport = 'Sheva';
        else if (/helper\s*2/i.test(sStr)) resolvedSupport = 'Ade';
        else if (/helper\s*3/i.test(sStr)) resolvedSupport = 'Tri';
        else {
          const match = ['Sheva', 'Ade', 'Tri'].find((s) => s.toLowerCase() === sStr.toLowerCase());
          if (match) resolvedSupport = match;
        }
      }

      let contributor = null;
      if (resolvedSupport) {
        contributor = resolvedSupport;
      } else {
        const inputByStr = String(item.inputtedBy || item.createdBy || '').trim().toLowerCase();
        const foundMember = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === inputByStr);
        if (foundMember) {
          contributor = foundMember.name;
        } else {
          const matchPic = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
          if (matchPic) contributor = matchPic.name;
        }
      }

      if (contributor && pcsMap[contributor] !== undefined) {
        pcsMap[contributor] += pcs;
      }
    });

    return TEAM_MEMBERS.map((m) => {
      const target = Number(savedTargets[m.name]) > 0 ? Number(savedTargets[m.name]) : 20;
      const currentPcs = pcsMap[m.name] || 0;
      const isAchieved = currentPcs >= target;
      return {
        name: m.name,
        role: m.role,
        pcs: currentPcs,
        target,
        isAchieved,
        surplus: isAchieved ? currentPcs - target : 0,
        remaining: Math.max(0, target - currentPcs),
        percent: Math.round((currentPcs / target) * 100),
      };
    });
  }, [items, boxRackMap, todayIso]);

  const memberAchievers = useMemo(() => {
    return allMemberTargets.filter((m) => m.isAchieved);
  }, [allMemberTargets]);

  // Web Notification & In-App Notification saat ada orang yang capai target
  useEffect(() => {
    if (memberAchievers.length === 0) return;

    const storageKey = `gagaclo_notified_target_${todayIso}`;
    let notifiedList = [];
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) notifiedList = JSON.parse(stored);
    } catch {}

    const newAchievers = memberAchievers.filter((a) => !notifiedList.includes(a.name));

    if (newAchievers.length > 0) {
      const updatedList = [...notifiedList, ...newAchievers.map((a) => a.name)];
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updatedList));
      } catch {}

      newAchievers.forEach((achiever) => {
        // 1. In-App Floating Toast Notification
        if (showNotification) {
          showNotification(
            `Target tercapai: ${achiever.name} (${achiever.role}) berhasil menyelesaikan input harian ${achiever.pcs}/${achiever.target} PCS.`,
            'target',
            5000
          );
        }

        // 2. Full-Page Flare Perayaan Layar Penuh
        try {
          window.dispatchEvent(
            new CustomEvent('gagaclo_trigger_celebration_flare', { detail: achiever })
          );
        } catch {}

        // 3. Browser Desktop Notification (jika diizinkan)
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`Target Tercapai: ${achiever.name}`, {
                body: `${achiever.name} (${achiever.role}) telah menyelesaikan target input harian ${achiever.pcs}/${achiever.target} PCS.`,
                icon: '/favicon.ico',
              });
            } else if (Notification.permission === 'default') {
              Notification.requestPermission();
            }
          }
        } catch {}
      });
    }
  }, [memberAchievers, todayIso, showNotification]);

  return (
    <section
      aria-label="Target Team Inventory R&D"
      className="w-full bg-slate-900 text-slate-100 border-b border-slate-800 px-3 sm:px-5 lg:px-6 py-2.5 shadow-xs no-print transition-all"
    >
      <div className="max-w-[1560px] mx-auto space-y-2.5">
        {/* BARIS ATAS (Row 1): TARGET TEAM (Center Aligned, Rapi & Seimbang) */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6">
          {/* Keterangan Target Team & Angka Real-Time */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/90 border border-blue-600/70 text-blue-300 shadow-2xs shrink-0">
              <Target className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-blue-200">
                TEAM TARGET
              </span>
            </div>

            {/* Edit Form (untuk Manager) vs Tampilan Angka */}
            {isEditingTarget ? (
              <form onSubmit={handleSaveTarget} className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
                <span className="text-xs font-bold text-slate-400">Target:</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  autoFocus
                  value={tempTarget}
                  onChange={(e) => setTempTarget(e.target.value)}
                  className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-600 text-white font-mono font-bold text-xs rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-xs font-bold text-slate-400">PCS</span>
                <button
                  type="submit"
                  className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition"
                  title="Simpan Target Team"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(false)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition"
                  title="Batal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums tracking-tight">
                    {todayStats.pcs.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-300 font-mono">
                    / {dailyTarget.toLocaleString('id-ID')} PCS
                  </span>
                </div>

                {isMgr && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempTarget(dailyTarget.toString());
                      setIsEditingTarget(true);
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                    title="Ubah Target Team Harian"
                  >
                    <Edit2 className="w-3 h-3 text-slate-400" />
                    <span>Ubah</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar Target Team (Tengah, Terpadu & Luas) */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-md sm:max-w-lg">
            <div className="flex-1 bg-slate-950/90 rounded-full h-2.5 sm:h-3 overflow-hidden border border-slate-700/80 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAchieved ? 'bg-emerald-400 shadow-xs shadow-emerald-500/50' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md border font-mono shrink-0 whitespace-nowrap ${
                isAchieved
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              {percent}%
            </span>
            {isAchieved && (
              <div className="text-xs font-medium text-slate-300 shrink-0 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Target Team Tercapai
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BARIS BAWAH (Row 2): PERSON TARGET & Semua 8 Nama Personel (Center Aligned) */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 shadow-2xs shrink-0">
            <User className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              PERSON TARGET
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {allMemberTargets.map((m) => {
              const isCurrentActive = currentUser && String(currentUser.name).trim().toLowerCase() === String(m.name).trim().toLowerCase();

              return (
                <button
                  type="button"
                  key={m.name}
                  onClick={() => {
                    if (m.isAchieved) {
                      try {
                        window.dispatchEvent(
                          new CustomEvent('gagaclo_trigger_celebration_flare', { detail: m })
                        );
                      } catch {}
                    }
                    if (onOpenUserProfile) {
                      onOpenUserProfile(m.name);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 hover:scale-[1.02] border ${
                    isCurrentActive
                      ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900 border-blue-400 bg-blue-950/70 text-blue-200'
                      : m.isAchieved
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/60 hover:border-emerald-400 text-emerald-200'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300'
                  }`}
                  title={`${m.name} (${m.role}) — Target: ${m.target} PCS, Capaian: ${m.pcs} PCS (${m.percent}%)${isCurrentActive ? ' • Akun Aktif Anda (Klik untuk kelola)' : ' • Klik untuk masuk akun ' + m.name}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCurrentActive ? 'bg-blue-400 animate-pulse' : m.isAchieved ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                  <span className="text-white font-extrabold">{m.name}</span>
                  <span className={`font-mono font-bold ${isCurrentActive ? 'text-blue-300' : m.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}>
                    · {m.pcs}/{m.target} PCS
                  </span>
                  {m.isAchieved && (
                    <span className="text-[10px] text-emerald-400 font-extrabold">✓</span>
                  )}
                  {isCurrentActive && (
                    <span className="text-[9px] uppercase tracking-wider font-black px-1 rounded bg-blue-500/30 text-blue-300 border border-blue-400/50">
                      Anda
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
