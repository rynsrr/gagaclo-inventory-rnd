import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Camera, 
  Sparkles, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Printer, 
  Calendar, 
  Clock, 
  ChevronDown, 
  Boxes, 
  Zap, 
  UserCheck,
  Target,
  Award,
  Users,
  Package,
  Layers,
} from 'lucide-react';
import { getItemRecordDate, getLocalTodayIso, formatToDDMMYYYY } from '../utils/dateUtils';
import { CardPrintModal } from './CardPrintModal';
import { TEAM_MEMBERS } from './TargetTeamBanner';

export const MobileQuickEntryView = ({
  onOpenAiScanner,
  onOpen3dView,
  onDirectScanImage,
  onOpenUserProfile,
}) => {
  const {
    items,
    boxes,
    currentUser,
    dailyTarget,
    deleteItem,
    setItemModalConfig,
    setSelectedBoxNumber,
    showNotification,
  } = useInventory();

  // State target box yang sedang aktif diisi (default ke Box #1 atau box terakhir)
  const [activeBoxNumber, setActiveBoxNumber] = useState(() => {
    return Number(localStorage.getItem('gagaclo_mobile_target_box')) || 1;
  });

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'my'
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isBoxPickerOpen, setIsBoxPickerOpen] = useState(false);
  const [boxRackFilter, setBoxRackFilter] = useState('ALL');

  // Simpan activeBoxNumber ke localStorage saat berubah
  const handleSelectBox = (num) => {
    const boxNum = Number(num);
    setActiveBoxNumber(boxNum);
    localStorage.setItem('gagaclo_mobile_target_box', String(boxNum));
    setIsBoxPickerOpen(false);
  };

  // Detail box yang sedang aktif
  const currentBox = useMemo(() => {
    return boxes.find((b) => Number(b.boxNumber) === activeBoxNumber) || boxes[0] || { boxNumber: activeBoxNumber, rackName: 'RAK 1', picName: 'Royan' };
  }, [boxes, activeBoxNumber]);

  // Sampel di dalam box yang sedang aktif
  const currentBoxItems = useMemo(() => {
    return items.filter((it) => Number(it.boxNumber || it.box_number) === activeBoxNumber && it.status !== 'DELETED');
  }, [items, activeBoxNumber]);

  const currentBoxPcs = useMemo(() => {
    return currentBoxItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [currentBoxItems]);

  // Filter sampel yang diinput HARI INI
  const todayIso = getLocalTodayIso();

  const todayItems = useMemo(() => {
    return items
      .filter((it) => {
        if (it.status === 'DELETED') return false;
        const recDate = getItemRecordDate(it);
        return recDate === todayIso;
      })
      .sort((a, b) => {
        // Urutkan dari yang terbaru (newest first)
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [items, todayIso]);

  // Total PCS hari ini oleh semua tim
  const todayTotalPcs = useMemo(() => {
    return todayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [todayItems]);

  // Sampel hari ini khusus user yang sedang login
  const currentUserName = currentUser?.name ? String(currentUser.name).trim().toLowerCase() : '';
  const myTodayItems = useMemo(() => {
    if (!currentUserName) return todayItems;
    return todayItems.filter((it) => {
      const penginput = String(it.penginput || it.picName || it.pic || '').trim().toLowerCase();
      return penginput === currentUserName;
    });
  }, [todayItems, currentUserName]);

  const myTodayPcs = useMemo(() => {
    return myTodayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [myTodayItems]);

  // Items to display in feed based on filter
  const displayedItems = filterMode === 'my' ? myTodayItems : todayItems;
  const displayedPcs = filterMode === 'my' ? myTodayPcs : todayTotalPcs;

  // Persentase target tim hari ini
  const targetPcs = Math.max(1, dailyTarget || 400);
  const targetPercent = Math.min(100, Math.round((todayTotalPcs / targetPcs) * 100));

  // Salin kode ke clipboard
  const handleCopyCode = (code, e) => {
    e?.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showNotification(`Kode ${code} disalin ke clipboard!`, 'info', 2000);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {}
  };

  // Hapus item dengan konfirmasi
  const handleDeleteItem = async (item, e) => {
    e?.stopPropagation();
    const name = item.style || item.sampleNo || item.kode || 'item';
    if (window.confirm(`Yakin ingin menghapus sampel "${name}"?`)) {
      await deleteItem(item.id);
      showNotification('Sampel berhasil dihapus.', 'info');
    }
  };

  // Filter 72 box untuk picker
  const filteredBoxes = useMemo(() => {
    if (boxRackFilter === 'ALL') return boxes;
    return boxes.filter((b) => String(b.rackName || '').toUpperCase() === boxRackFilter);
  }, [boxes, boxRackFilter]);

  // Target personal harian untuk seluruh 8 personil tim (5 PIC + 3 Support)
  const allMemberTargets = useMemo(() => {
    const pcsMap = {};
    (TEAM_MEMBERS || []).forEach((m) => {
      pcsMap[m.name] = 0;
    });

    const boxRackMap = {};
    boxes.forEach((b) => {
      boxRackMap[Number(b.boxNumber)] = b;
    });

    items.forEach((item) => {
      const box = boxRackMap[Number(item.boxNumber)];
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (dateKey !== todayIso) return;

      const pcs = Number(item.jumlah) || 0;
      const boxPic = String(item.picName || (box ? box.picName : 'Lainnya')).trim();

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
          const match = (TEAM_MEMBERS || []).find((m) => m.name.toLowerCase() === sStr);
          if (match) contributor = match.name;
        }
      }

      if (!contributor) {
        const matchPic = (TEAM_MEMBERS || []).find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
        contributor = matchPic ? matchPic.name : (boxPic || 'Royan');
      }

      if (contributor && pcsMap[contributor] !== undefined) {
        pcsMap[contributor] += pcs;
      }
    });

    const supportTargetCalc = Math.max(1, Math.round(targetPcs / 8.5));
    const picTargetCalc = Math.max(1, Math.round((targetPcs / 8.5) * 1.1));

    return (TEAM_MEMBERS || []).map((m) => {
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
  }, [items, boxes, todayIso, targetPcs]);

  // Target akun yang sedang aktif login
  const myTarget = useMemo(() => {
    if (!currentUserName) return allMemberTargets[0];
    return allMemberTargets.find((m) => m.name.toLowerCase() === currentUserName) || allMemberTargets[0];
  }, [allMemberTargets, currentUserName]);

  // Peringkat 1 / Top Contributor hari ini
  const topContributor = useMemo(() => {
    const sorted = [...allMemberTargets].sort((a, b) => b.pcs - a.pcs);
    return sorted[0]?.pcs > 0 ? sorted[0] : null;
  }, [allMemberTargets]);

  const memberAchievers = useMemo(() => {
    return allMemberTargets.filter((m) => m.isAchieved);
  }, [allMemberTargets]);

  // Statistik okupansi 72 box & total sampel gudang
  const occupiedBoxCount = useMemo(() => {
    const boxSet = new Set();
    items.forEach((it) => {
      if (it.status !== 'DELETED') {
        const num = Number(it.boxNumber || it.box_number);
        if (num) boxSet.add(num);
      }
    });
    return boxSet.size;
  }, [items]);

  const totalAllPcs = useMemo(() => {
    return items.reduce((acc, it) => {
      if (it.status === 'DELETED') return acc;
      return acc + (Number(it.jumlah || it.qty || it.pcs) || 1);
    }, 0);
  }, [items]);

  const totalActiveItemsCount = useMemo(() => {
    return items.filter((it) => it.status !== 'DELETED').length;
  }, [items]);

  return (
    <div className="mobile-quick-entry font-apple space-y-3 pb-20 select-none">
      
      {/* 1. DASHBOARD HEADER */}
      <div className="flex items-center justify-between pt-1 pb-0.5">
        <div>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">Dashboard</h1>
          <p className="text-[11px] text-gray-500 font-medium">Monitoring &amp; Input Sample R&amp;D</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-gray-700 border border-black/[0.08] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
          <span>{formatToDDMMYYYY(todayIso)}</span>
        </div>
      </div>

      {/* 2. BENTO GRID: TARGET TEAM, PERSONAL & WAREHOUSE METRICS */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Bento 1: Target Team Harian (Col-Span-2 Hero) */}
        <div className="col-span-2 rounded-2xl bg-[#161618] text-white p-3.5 border border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-[#0071e3]/20 flex items-center justify-center text-[#2997ff]">
                <Target className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Target Tim Harian
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Jasmine • Leader Inv
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums tracking-tight text-white">
                {todayTotalPcs.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {targetPcs.toLocaleString('id-ID')} PCE
              </span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums ${
              targetPercent >= 100
                ? 'bg-[#34c759]/20 text-[#30d158] border-[#34c759]/40'
                : 'bg-white/10 text-white/90 border-white/15'
            }`}>
              {targetPercent}%
            </span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-2 p-0.5 border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                targetPercent >= 100 ? 'bg-[#34c759] shadow-[0_0_8px_#34c759]' : 'bg-[#0071e3]'
              }`}
              style={{ width: `${Math.min(100, targetPercent)}%` }}
            />
          </div>
        </div>

        {/* Bento 2: Target Akun Anda (Col-Span-1) */}
        <div className="col-span-1 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                Target Anda
              </span>
              <span className="text-[9px] font-bold text-[#0071e3] bg-[#0071e3]/10 px-1.5 py-0.2 rounded-full">
                {myTarget?.role || 'PPIC'}
              </span>
            </div>
            <div className="text-xs font-bold text-[#111827] truncate mt-1">
              {myTarget?.name || currentUser?.name || 'Personal'}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black tabular-nums text-[#111827]">
                {myTarget?.pcs || 0}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold">
                / {myTarget?.target || 52} PCE
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-black/[0.04]">
            <div className="w-full bg-black/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  myTarget?.isAchieved ? 'bg-emerald-500' : 'bg-[#0071e3]'
                }`}
                style={{ width: `${Math.min(100, myTarget?.percent || 0)}%` }}
              />
            </div>
            <span className="text-[9px] font-medium text-gray-500 mt-1 block truncate">
              {myTarget?.isAchieved ? '✓ Target tercapai' : `Sisa ${myTarget?.remaining || 0} PCE`}
            </span>
          </div>
        </div>

        {/* Bento 3: Top PIC Hari Ini (Col-Span-1) */}
        <div className="col-span-1 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                Top Input
              </span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xs font-bold text-[#111827] truncate mt-1 flex items-center gap-1">
              <span>👑</span>
              <span className="truncate">{topContributor ? topContributor.name : 'Belum Ada'}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black tabular-nums text-[#111827]">
                {topContributor ? topContributor.pcs : 0}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold">PCE</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-black/[0.04] text-[9px] font-medium text-gray-500 truncate">
            {topContributor && topContributor.pcs > 0 ? `${topContributor.percent}% capaian` : 'Siap jepret hari ini'}
          </div>
        </div>

        {/* Bento 4: Total Sampel Gudang (Col-Span-1) */}
        <div className="col-span-1 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Total Sampel</span>
              <Package className="w-3.5 h-3.5 text-[#0071e3]" />
            </div>
            <div className="text-base font-black tabular-nums text-[#111827] mt-1">
              {totalAllPcs.toLocaleString('id-ID')} <span className="text-[9px] font-semibold text-gray-400">PCE</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-black/[0.04] text-[9px] font-medium text-gray-500 truncate">
            {totalActiveItemsCount.toLocaleString('id-ID')} item terdata
          </div>
        </div>

        {/* Bento 5: Okupansi Box (Col-Span-1) */}
        <div className="col-span-1 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Okupansi Box</span>
              <Boxes className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-black tabular-nums text-[#111827] mt-1">
              {occupiedBoxCount} <span className="text-[9px] font-semibold text-gray-400">/ 72 Box</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-black/[0.04] text-[9px] font-medium text-gray-500 truncate">
            {Math.round((occupiedBoxCount / 72) * 100)}% kapasitas terisi
          </div>
        </div>

        {/* Bento 6: Grid Mini 5 PIC Utama & 3 Support (Col-Span-2) */}
        <div className="col-span-2 rounded-2xl bg-white p-3 border border-black/[0.08] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                Target Personal PIC &amp; Support
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold">
              {memberAchievers.length}/8 Tercapai
            </span>
          </div>

          {/* 4 Kolom Tile PIC */}
          <div className="grid grid-cols-4 gap-1.5">
            {allMemberTargets.map((m) => {
              const isCurrent = currentUser?.name?.toLowerCase() === m.name.toLowerCase();
              return (
                <div
                  key={m.name}
                  className={`p-1.5 rounded-xl border text-center transition ${
                    isCurrent
                      ? 'bg-[#0071e3]/10 border-[#0071e3]/40 text-[#0071e3]'
                      : m.isAchieved
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-black/[0.02] border-black/[0.06] text-[#374151]'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate">{m.name}</div>
                  <div className="text-[10px] tabular-nums font-extrabold mt-0.5">
                    {m.pcs}<span className="text-[8px] font-normal text-gray-400">/{m.target}</span>
                  </div>
                  <div className="w-full bg-black/[0.08] rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.isAchieved ? 'bg-emerald-500' : isCurrent ? 'bg-[#0071e3]' : 'bg-gray-400'}`}
                      style={{ width: `${Math.min(100, m.percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. TARGET BOX SELECTOR (Pilih Box yang Sedang Diisi) */}
      <div className="bg-white rounded-2xl border border-black/[0.08] p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#86868b]">
            Target Box Pengisian
          </span>
          <button
            type="button"
            onClick={() => setIsBoxPickerOpen((p) => !p)}
            className="text-[11px] font-bold text-[#0071e3] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{isBoxPickerOpen ? 'Tutup Pilihan' : 'Ganti Box'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBoxPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Box Card Info */}
        <div className="flex items-center justify-between bg-black/[0.03] border border-black/[0.06] rounded-xl p-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0071e3]/10 text-[#0071e3] font-bold text-sm shrink-0 border border-[#0071e3]/20 shadow-2xs">
              #{activeBoxNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1d1d1f]">
                  BOX #{activeBoxNumber}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-white border border-black/[0.08] text-[#86868b]">
                  {currentBox.rackName || 'RAK 1'}
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] mt-0.5">
                PIC: <strong>@{currentBox.picName || 'Royan'}</strong> &bull; {currentBoxItems.length} item ({currentBoxPcs} PCE)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBoxNumber(activeBoxNumber)}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] text-[11px] font-semibold text-[#1d1d1f] shadow-2xs transition cursor-pointer shrink-0"
          >
            Lihat Box
          </button>
        </div>

        {/* Accordion Box Picker (Jika Dibuka) */}
        {isBoxPickerOpen && (
          <div className="pt-2 border-t border-black/[0.06] space-y-2 animate-in fade-in duration-150">
            {/* Filter Rak */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {['ALL', 'RAK 1', 'RAK 2', 'RAK 3', 'RAK 4', 'RAK 5'].map((rk) => (
                <button
                  key={rk}
                  type="button"
                  onClick={() => setBoxRackFilter(rk)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    boxRackFilter === rk
                      ? 'bg-[#1d1d1f] text-white shadow-2xs'
                      : 'bg-black/[0.04] text-[#86868b] hover:bg-black/[0.08]'
                  }`}
                >
                  {rk === 'ALL' ? 'Semua Rak' : rk}
                </button>
              ))}
            </div>

            {/* Grid 72 Box (Scrollable) */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-black/[0.02] rounded-xl border border-black/[0.04]">
              {filteredBoxes.map((b) => {
                const bNum = Number(b.boxNumber);
                const isSelected = bNum === activeBoxNumber;
                return (
                  <button
                    key={bNum}
                    type="button"
                    onClick={() => handleSelectBox(bNum)}
                    className={`p-1.5 rounded-lg text-center transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs font-bold'
                        : 'bg-white hover:bg-black/[0.04] text-[#1d1d1f] border-black/[0.06]'
                    }`}
                  >
                    <div className="text-[11px] font-mono leading-tight">#{bNum}</div>
                    <div className={`text-[8px] truncate ${isSelected ? 'text-white/80' : 'text-[#86868b]'}`}>
                      {b.picName || 'PIC'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. HERO ACTION CARD: JEPRET TAG SAMPEL (SCAN AI) */}
      <div className="bg-gradient-to-br from-[#12141a] via-[#181a24] to-[#12141a] text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-white/10 space-y-3.5 relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0071e3]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-end relative z-10">
          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
            Target: BOX #{activeBoxNumber}
          </span>
        </div>

        {/* TOMBOL UTAMA BESAR: SCAN AI */}
        <button
          type="button"
          onClick={() => onOpenAiScanner?.(activeBoxNumber)}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#0071e3] via-[#0077ed] to-[#5ac8fa] text-white shadow-xl shadow-blue-900/40 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer relative z-10"
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-left">
            <div className="text-sm sm:text-base font-extrabold tracking-tight leading-tight flex items-center gap-1.5">
              <span>Jepret Tag Sampel (Scan AI)</span>
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            </div>
            <div className="text-[10px] sm:text-[11px] text-white/80 mt-0.5 font-medium">
              Ekstraksi tulisan tangan &amp; label otomatis &lt; 1.5 detik
            </div>
          </div>
        </button>
      </div>

      {/* 5. FEED: DAFTAR SAMPEL BARU DIMASUKKAN HARI INI (Hanya Tampil Jika Ada Item Hari Ini) */}
      {displayedItems.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <span>Sampel Masuk Hari Ini</span>
                <span className="text-[10px] font-bold bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.2 rounded-full tabular-nums">
                  {displayedItems.length} Item &bull; {displayedPcs} PCE
                </span>
              </h3>
              <p className="text-[10px] text-[#86868b] mt-0.5">
                Riwayat pendataan real-time hari ini ({formatToDDMMYYYY(todayIso)})
              </p>
            </div>

            {/* Filter Pill: Semua vs Saya */}
            <div className="flex items-center p-0.5 bg-black/[0.04] rounded-full border border-black/[0.06] shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-[#1d1d1f] shadow-2xs font-bold'
                    : 'text-[#86868b]'
                }`}
              >
                Semua ({todayItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('my')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                  filterMode === 'my'
                    ? 'bg-white text-[#1d1d1f] shadow-2xs font-bold'
                    : 'text-[#86868b]'
                }`}
              >
                Saya ({myTodayItems.length})
              </button>
            </div>
          </div>

          {/* List of Cards */}
          <div className="space-y-2">
            {displayedItems.map((item) => {
              const qty = Number(item.jumlah || item.qty || item.pcs) || 1;
              const isDispatched = item.status === 'Dispatched' || item.status === 'Terkirim';
              const isBorrowed = item.status === 'Borrowed' || item.status === 'Dipinjam';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-black/[0.08] p-3 shadow-xs space-y-2 hover:border-[#0071e3]/30 transition"
                >
                  {/* Row 1: Box Badge, Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Box Number Pill */}
                      <button
                        type="button"
                        onClick={() => setSelectedBoxNumber(Number(item.boxNumber || item.box_number))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-extrabold border border-[#0071e3]/20 hover:bg-[#0071e3] hover:text-white transition cursor-pointer"
                        title="Klik untuk membuka box ini"
                      >
                        <Boxes className="w-3 h-3" />
                        <span>BOX #{item.boxNumber || item.box_number || 1}</span>
                      </button>

                      {/* Unique Code Pill with 1-tap Copy */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(item.kode || item.sku, e)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[10px] font-mono font-bold border border-black/[0.08] transition cursor-pointer"
                        title="Salin kode sampel"
                      >
                        {copiedCode === (item.kode || item.sku) ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#86868b]" />
                        )}
                        <span>{item.kode || item.sku || '-'}</span>
                      </button>

                      {/* Jenis Sample Pill */}
                      {item.jenisSample && item.jenisSample !== 'NA' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          {item.jenisSample}
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                      isDispatched
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : isBorrowed
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {isDispatched ? 'Terkirim' : isBorrowed ? 'Dipinjam' : 'Dalam Box'}
                    </span>
                  </div>

                  {/* Row 2: Style & Sample No */}
                  <div>
                    <h4 className="text-xs font-bold text-[#1d1d1f] leading-snug">
                      {item.style || item.name || 'Sample Garmen Tanpa Nama'}
                    </h4>
                    {item.sampleNo && item.sampleNo !== 'NA' && (
                      <p className="text-[11px] font-medium text-[#86868b] mt-0.5">
                        Artikel: <strong className="text-[#1d1d1f]">{item.sampleNo}</strong>
                      </p>
                    )}
                  </div>

                  {/* Row 3: Detail Chips (Size, Color, Qty, Buyer) */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#86868b] pt-0.5">
                    {item.size && item.size !== 'NA' && (
                      <span className="bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06] font-medium text-[#1d1d1f]">
                        Size: <strong>{item.size}</strong>
                      </span>
                    )}
                    {item.color && item.color !== 'NA' && (
                      <span className="bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06] font-medium text-[#1d1d1f]">
                        Warna: <strong>{item.color}</strong>
                      </span>
                    )}
                    <span className="bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.5 rounded font-bold">
                      {qty} PCE
                    </span>
                    {item.buyerNo && item.buyerNo !== 'NA' && (
                      <span className="text-[#86868b]">
                        &bull; Buyer: {item.buyerNo}
                      </span>
                    )}
                  </div>

                  {/* Row 4: Penginput info & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] text-[10px] text-[#86868b]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#86868b]" />
                      <span>{item.penginput || item.picName || 'Tim'} &bull; Hari ini</span>
                    </div>

                    {/* Action Buttons: Edit, Print, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPrintItem(item)}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.04] transition cursor-pointer"
                        title="Cetak KTP Sampel"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemModalConfig({
                            isOpen: true,
                            item,
                            targetBoxNumber: Number(item.boxNumber || item.box_number || 1),
                          });
                        }}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.04] transition cursor-pointer"
                        title="Edit rincian sampel"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item, e)}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#ff3b30] hover:bg-red-50 transition cursor-pointer"
                        title="Hapus sampel ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Cetak KTP Sampel (Jika Dipilih) */}
      {selectedPrintItem && (
        <CardPrintModal
          itemsToPrint={[selectedPrintItem]}
          onClose={() => setSelectedPrintItem(null)}
        />
      )}

    </div>
  );
};
