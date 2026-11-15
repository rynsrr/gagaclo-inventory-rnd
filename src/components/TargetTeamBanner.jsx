import React, { useState, useEffect, useMemo } from 'react';
import { Target, Edit2, Check, X, User, ShieldCheck } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { getItemRecordDate, getLocalTodayIso } from '../utils/dateUtils';
import { getDailyTargetForDate, saveDailyTargetForDate } from '../utils/targetUtils';
import { isManager, isSuperuser } from '../utils/authUtils';

// 8 Anggota Tim Resmi: 5 PIC Asli (PPIC) & 3 Support (Helper)
const TEAM_MEMBERS = [
  { name: 'Royan', role: 'PPIC #1', isPicAsli: true },
  { name: 'Cynara', role: 'PPIC #2', isPicAsli: true },
  { name: 'Ami', role: 'PPIC #3', isPicAsli: true },
  { name: 'Ryan', role: 'PPIC #4', isPicAsli: true },
  { name: 'Hanami', role: 'PPIC #5', isPicAsli: true },
  { name: 'Sheva', role: 'Support #1', isPicAsli: false },
  { name: 'Ade', role: 'Support #2', isPicAsli: false },
  { name: 'Tri', role: 'Support #3', isPicAsli: false },
];

export function TargetTeamBanner({ onOpenUserProfile }) {
  const {
    items = [],
    boxes = [],
    currentUser,
    showNotification,
  } = useInventory();
  const isMgr = isManager(currentUser) || isSuperuser(currentUser);
  const isJasmineActive = currentUser && String(currentUser.name).trim().toLowerCase() === 'jasmine';

  const todayIso = getLocalTodayIso();

  // Target Harian Tim (mengikuti aturan: berubah per hari, jika tidak diubah maka sama dengan hari sebelumnya)
  const [dailyTarget, setDailyTarget] = useState(() => getDailyTargetForDate(todayIso));
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(dailyTarget.toString());

  // Dengarkan perubahan target dari komponen lain atau saat tanggal berganti
  useEffect(() => {
    const handleStorageChange = () => {
      setDailyTarget(getDailyTargetForDate(todayIso));
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gagaclo_target_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gagaclo_target_updated', handleStorageChange);
    };
  }, [todayIso]);

  const handleSaveTarget = (e) => {
    e?.preventDefault?.();
    const num = Math.max(1, parseInt(tempTarget, 10) || 150);
    saveDailyTargetForDate(todayIso, num);
    setDailyTarget(num);
    setIsEditingTarget(false);
    if (showNotification) {
      showNotification(`Target team hari ini (${todayIso}) berhasil disetel ke ${num} PCE oleh ${currentUser?.name || 'Manager'}.`, 'success', 3000);
    }
  };
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

      // Deteksi penginput riil (PPIC Utama maupun Support)
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
      const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));

      const rawInputtedBy =
        item.inputtedBy ||
        item.createdBy ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        item.supportName ||
        item.helperName ||
        (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null);

      let contributor = null;
      if (rawInputtedBy) {
        const sStr = String(rawInputtedBy).trim().toLowerCase();
        if (/helper\s*1/i.test(sStr)) contributor = 'Sheva';
        else if (/helper\s*2/i.test(sStr)) contributor = 'Ade';
        else if (/helper\s*3/i.test(sStr)) contributor = 'Tri';
        else {
          const match = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === sStr);
          if (match) contributor = match.name;
        }
      }

      if (!contributor) {
        const matchPic = TEAM_MEMBERS.find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
        contributor = matchPic ? matchPic.name : (boxPic || 'Royan');
      }

      if (contributor && pcsMap[contributor] !== undefined) {
        pcsMap[contributor] += pcs;
      }
    });

    // Hitung pembagian target harian dari Daily Team Target ke 8 orang:
    // 5 PIC Asli (PPIC #1-#5) mendapatkan 10% lebih banyak daripada 3 Support (Helper)
    // Rumus: 5 * (1.10 * S) + 3 * S = 8.5 * S = dailyTarget
    // S (Support) = dailyTarget / 8.5
    // P (PIC Asli) = S * 1.10
    const supportTargetCalc = Math.max(1, Math.round(dailyTarget / 8.5));
    const picTargetCalc = Math.max(1, Math.round((dailyTarget / 8.5) * 1.1));

    return TEAM_MEMBERS.map((m) => {
      const isPicAsli = m.isPicAsli ?? !m.role?.toLowerCase()?.includes('support');
      const target = isPicAsli ? picTargetCalc : supportTargetCalc;
      const currentPcs = pcsMap[m.name] || 0;
      const isAchieved = currentPcs >= target;
      return {
        name: m.name,
        role: m.role,
        isPicAsli,
        pcs: currentPcs,
        target,
        isAchieved,
        surplus: isAchieved ? currentPcs - target : 0,
        remaining: Math.max(0, target - currentPcs),
        percent: Math.round((currentPcs / target) * 100),
      };
    });
  }, [items, boxRackMap, todayIso, dailyTarget]);

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
            `Target tercapai: ${achiever.name} (${achiever.role}) berhasil menyelesaikan input harian ${achiever.pcs}/${achiever.target} PCE.`,
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
                body: `${achiever.name} (${achiever.role}) telah menyelesaikan target input harian ${achiever.pcs}/${achiever.target} PCE.`,
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
      className="w-full bg-[#161618] text-[#f5f5f7] border-b border-white/[0.08] px-3 sm:px-5 lg:px-6 py-2 shadow-xs no-print transition-all font-apple"
    >
      <div className="w-full mx-auto flex items-center gap-3 sm:gap-4 lg:gap-5">

        {/* AKUN KHUSUS JASMINE DI BAGIAN KIRI DENGAN ICON BESAR & MIDDLE ALIGN DENGAN KEDUA BARIS */}
        <div className="shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => {
              if (onOpenUserProfile) {
                onOpenUserProfile('Jasmine');
              }
            }}
            className={`group relative p-2 sm:px-3 sm:py-2 rounded-2xl flex items-center gap-2.5 transition-all shadow-md cursor-pointer select-none active:scale-95 border ${
              isJasmineActive
                ? 'bg-gradient-to-br from-emerald-500/25 to-emerald-950/60 border-emerald-400 text-white ring-2 ring-emerald-500/40 shadow-emerald-500/20'
                : 'bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-emerald-950/40 hover:from-emerald-900/70 hover:to-emerald-950/80 border-emerald-500/50 hover:border-emerald-400 text-emerald-200'
            }`}
            title="Akun Jasmine (Inventory Leader) • Klik untuk kelola profil & target"
          >
            {/* ICON BESAR */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 stroke-[2.5]" />
              </div>
              {/* Titik hanya muncul jika akun Jasmine sedang aktif login */}
              {isJasmineActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#161618] bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              )}
            </div>

            {/* Teks Nama Jasmine */}
            <div className="flex items-center text-left">
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight leading-none">
                Jasmine
              </span>
            </div>
          </button>
        </div>

        {/* Garis Pemisah Vertikal */}
        <div className="hidden sm:block w-[1px] self-stretch bg-white/[0.1] shrink-0" />

        {/* SISI KANAN: BARIS TEAM TARGET (ROW 1) & BARIS PERSON TARGET (ROW 2) */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* BARIS ATAS (Row 1): TARGET TEAM */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 w-full">
            {/* Keterangan Target Team & Angka Real-Time */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071e3]/15 border border-[#0071e3]/30 text-[#2997ff] shadow-xs shrink-0">
                <Target className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2997ff]">
                  DAILY TEAM TARGET
                </span>
              </div>

              {/* Edit Form (untuk Manager) vs Tampilan Angka */}
              {isEditingTarget ? (
                <form onSubmit={handleSaveTarget} className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/[0.15]">
                  <span className="text-xs font-medium text-slate-400">Target:</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    autoFocus
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                    className="w-20 px-2 py-0.5 bg-white/[0.08] border border-white/[0.2] text-white font-mono font-bold text-xs rounded-full focus:outline-hidden focus:ring-1 focus:ring-[#2997ff]"
                  />
                  <span className="text-xs font-semibold text-slate-400">PCE</span>
                  <button
                    type="submit"
                    className="p-1 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold cursor-pointer transition"
                    title="Simpan Target Team"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTarget(false)}
                    className="p-1 rounded-full bg-white/[0.1] hover:bg-white/[0.15] text-slate-300 text-xs cursor-pointer transition"
                    title="Batal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
                      {todayStats.pcs.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-400 tabular-nums">
                      / {dailyTarget.toLocaleString('id-ID')} PCE
                    </span>
                  </div>

                  {isMgr && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempTarget(dailyTarget.toString());
                        setIsEditingTarget(true);
                      }}
                      className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] transition cursor-pointer"
                      title="Ubah Target Team Harian"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400" />
                      <span>Ubah</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar Target Team (Apple Fitness Style) */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
              <div className="flex-1 bg-white/[0.08] rounded-full h-3 overflow-hidden border border-white/[0.08] p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAchieved ? 'bg-[#34c759] shadow-[0_0_12px_rgba(52,199,89,0.5)]' : 'bg-[#0071e3] shadow-[0_0_10px_rgba(0,113,227,0.35)]'
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border tabular-nums shrink-0 whitespace-nowrap transition-colors ${
                  isAchieved
                    ? 'bg-[#34c759]/20 text-[#30d158] border-[#34c759]/40'
                    : 'bg-white/[0.08] text-white/90 border-white/[0.1]'
                }`}
              >
                {percent}%
              </span>
              {isAchieved && (
                <div className="text-xs font-semibold text-slate-300 shrink-0 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-[#30d158] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
                    Target Team Tercapai
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BARIS BAWAH (Row 2): DAILY PERSON TARGET & Semua 8 Nama Personel (FULL WIDTH FIT - TANPA SCROLLBAR) */}
          <div className="flex items-center gap-1 sm:gap-2 pt-1.5 border-t border-white/[0.08] w-full">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.1] shadow-xs shrink-0 whitespace-nowrap">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300">
                DAILY PERSON TARGET
              </span>
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-8 gap-1 sm:gap-1.5">
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
                    className={`w-full min-w-0 px-1 sm:px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer select-none active:scale-95 border truncate ${
                      isCurrentActive
                        ? 'bg-[#0071e3]/20 border-[#2997ff]/60 text-white ring-2 ring-[#0071e3]/40'
                        : m.isAchieved
                        ? 'bg-[#34c759]/15 hover:bg-[#34c759]/25 border-[#34c759]/35 hover:border-[#34c759]/60 text-[#30d158]'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] hover:border-white/[0.15] text-slate-300'
                    }`}
                    title={`${m.name} (${m.role} • ${m.isPicAsli ? 'PIC Asli +10%' : 'Support'}): Target ${m.target} PCE, Capaian ${m.pcs} PCE (${m.percent}%)${isCurrentActive ? ' • Akun Aktif Anda (Klik untuk kelola)' : ' • Klik untuk masuk akun ' + m.name}`}
                  >
                    <span className={`rounded-full shrink-0 ${isCurrentActive ? 'w-2 h-2 bg-[#2997ff] shadow-[0_0_8px_#2997ff] animate-pulse ring-2 ring-[#2997ff]/50' : m.isAchieved ? 'w-1.5 h-1.5 bg-[#34c759]' : 'w-1.5 h-1.5 bg-white/30'}`}></span>
                    <span className="font-semibold text-white truncate">{m.name}</span>
                    <span className={`tabular-nums font-normal shrink-0 text-[10px] sm:text-[11px] ${isCurrentActive ? 'text-[#2997ff]' : m.isAchieved ? 'text-[#30d158]' : 'text-slate-400'}`}>
                      · {m.pcs}/{m.target}
                    </span>
                    <span className="text-[9px] text-slate-400 shrink-0 hidden 2xl:inline">PCE</span>
                    {m.isAchieved && (
                      <span className="text-[10px] text-[#30d158] font-bold shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
