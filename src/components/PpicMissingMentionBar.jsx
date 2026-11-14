import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Users } from 'lucide-react';

export const PpicMissingMentionBar = ({ onSelectPic, activePic = 'ALL' }) => {
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
    <div className="inventory-panel p-3 space-y-2.5 border border-slate-200 bg-white rounded-lg">
      {/* Header bar: flattened */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Rekap Box Kurang per PIC
          </h2>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
          totalKurang > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {totalKurang > 0 ? `Total Kurang: ${totalKurang} Box` : 'Semua Box Terisi'}
        </span>
      </div>

      {/* Inline Summary Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none text-xs text-slate-600">
        <span className="text-xs font-semibold text-slate-500 shrink-0">Pilih PIC:</span>
        {picStats.map((pic) => (
          <button
            key={pic.id}
            type="button"
            onClick={() => onSelectPic && onSelectPic(activePic === pic.name ? 'ALL' : pic.name)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition cursor-pointer shrink-0 ${
              activePic === pic.name
                ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title={`Klik untuk sorot box milik @${pic.name}`}
          >
            <span className={`w-4 h-4 rounded text-white font-bold text-xs flex items-center justify-center ${pic.avatarBg}`}>
              {pic.name.charAt(0)}
            </span>
            <span>@{pic.name}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${pic.countKurang > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {pic.countKurang > 0 ? `${pic.countKurang} box` : 'Lengkap'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
