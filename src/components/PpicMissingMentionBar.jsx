import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Users } from 'lucide-react';

export const PpicMissingMentionBar = ({ onSelectPic, activePic = 'ALL', compact = false }) => {
  const { ppicMembers, boxes, getItemsInBox } = useInventory();

  // Calculate missing (kurang) boxes for each PIC
  const picStats = useMemo(() => {
    return ppicMembers.map((pic) => {
      // Find all boxes assigned to this PIC
      const assignedBoxes = boxes.filter(
        (b) => String(b.picName ?? '').trim().toLowerCase() === String(pic.name ?? '').trim().toLowerCase()
      );

      // Boxes with 0 items (tanpa data / belum terisi = KURANG)
      const emptyBoxes = assignedBoxes.filter((b) => {
        const items = getItemsInBox(b.boxNumber);
        return (!items || items.length === 0) && !b.isFull;
      });

      // Boxes currently being filled (has data but not full)
      const inProgressBoxes = assignedBoxes.filter((b) => {
        const items = getItemsInBox(b.boxNumber);
        return items && items.length > 0 && !b.isFull;
      });

      // Full boxes
      const fullBoxes = assignedBoxes.filter((b) => b.isFull);

      return {
        ...pic,
        totalAssigned: assignedBoxes.length,
        emptyBoxes: emptyBoxes.sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber)),
        countKurang: emptyBoxes.length,
        inProgressCount: inProgressBoxes.length,
        fullCount: fullBoxes.length,
        filledCount: assignedBoxes.length - emptyBoxes.length,
      };
    });
  }, [ppicMembers, boxes, getItemsInBox]);

  const totalKurang = useMemo(() => {
    return picStats.reduce((acc, p) => acc + p.countKurang, 0);
  }, [picStats]);

  return (
    <div className={compact 
      ? "p-3 space-y-2 border border-black/[0.06] bg-black/[0.02] rounded-[16px] font-apple"
      : "inventory-panel p-3.5 sm:p-4 space-y-3 border border-black/[0.08] bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] font-apple"
    }>
      {/* Header bar: flattened & apple-styled */}
      <div className={`flex items-center justify-between gap-2 flex-wrap ${compact ? 'pb-2 border-b border-black/[0.05]' : 'pb-2.5 border-b border-black/[0.06]'}`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center rounded-[8px] bg-[#0071e3]/10 text-[#0071e3] shrink-0 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}>
            <Users className={compact ? "w-3.5 h-3.5 stroke-[2.2]" : "w-4 h-4 stroke-[2.2]"} />
          </div>
          <h2 className={`font-bold text-[#1d1d1f] tracking-tight ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
            Rekap Box Kurang per PIC
          </h2>
        </div>
        <span className={`font-semibold rounded-full tabular-nums border ${
          compact ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'
        } ${
          totalKurang > 0
            ? 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/25'
            : 'bg-[#34c759]/15 text-[#30d158] border-[#34c759]/30'
        }`}>
          {totalKurang > 0 ? `Total Kurang: ${totalKurang} Box` : 'Semua Box Terisi'}
        </span>
      </div>

      {/* Inline Summary Chips (Apple Capsule Style) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs">
        <span className="text-xs font-semibold text-[#86868b] shrink-0">Pilih PIC:</span>
        {picStats.map((pic) => (
          <button
            key={pic.id}
            type="button"
            onClick={() => onSelectPic && onSelectPic(activePic === pic.name ? 'ALL' : pic.name)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer shrink-0 select-none ${
              activePic === pic.name
                ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                : 'bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.06] text-[#1d1d1f]'
            }`}
            title={`Klik untuk sorot box milik @${pic.name}`}
          >
            <span className={`w-4 h-4 rounded-full text-white font-bold text-[10px] flex items-center justify-center ${
              activePic === pic.name ? 'bg-white/20 text-white' : pic.avatarBg
            }`}>
              {pic.name.charAt(0)}
            </span>
            <span className="font-semibold">@{pic.name}</span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded-full tabular-nums ${
              activePic === pic.name
                ? 'bg-white/20 text-white'
                : pic.countKurang > 0
                ? 'bg-[#ff3b30]/15 text-[#ff3b30]'
                : 'bg-[#34c759]/15 text-[#30d158]'
            }`}>
              {pic.countKurang > 0 ? `${pic.countKurang} box` : 'Lengkap'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
