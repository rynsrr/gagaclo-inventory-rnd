import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import { getBoxDisplayNumber } from '../utils/boxDisplayUtils';
import { Box as BoxIcon, X } from 'lucide-react';

export const BoxMenuDropdown = ({
  isOpen,
  onClose,
  activePic = 'ALL',
  onSelectPic,
  highlightBoxNumbers = null,
}) => {
  const { boxes, racks, ppicMembers, getItemsInBox, setSelectedBoxNumber } = useInventory();

  const occupancyGroups = useMemo(() => {
    const groups = [
      {
        label: 'Tanpa data',
        badgeClass: 'bg-black/[0.05] text-[#86868b] border border-black/[0.06]',
        boxClass: 'bg-black/[0.03] hover:bg-black/[0.08] text-[#1d1d1f] border-black/[0.06]',
        boxes: []
      },
      {
        label: 'Sedang diisi',
        badgeClass: 'bg-[#ff9500]/15 text-[#c96700] border border-[#ff9500]/25',
        boxClass: 'bg-[#ff9500]/10 hover:bg-[#ff9500]/25 text-[#c96700] border-[#ff9500]/20',
        boxes: []
      },
      {
        label: 'Penuh',
        badgeClass: 'bg-[#34c759]/15 text-[#30d158] border border-[#34c759]/25',
        boxClass: 'bg-[#34c759]/10 hover:bg-[#34c759]/25 text-[#30d158] border-[#34c759]/20',
        boxes: []
      },
    ];

    const searchActive = highlightBoxNumbers !== null;

    for (const box of boxes) {
      if (activePic !== 'ALL' && String(box.picName ?? '').trim().toLowerCase() !== String(activePic).trim().toLowerCase()) {
        continue;
      }
      if (searchActive && !highlightBoxNumbers.has(Number(box.boxNumber))) {
        continue;
      }
      const hasData = getItemsInBox(box.boxNumber).length > 0;
      const group = box.isFull ? 2 : hasData ? 1 : 0;
      groups[group].boxes.push(box);
    }

    return groups;
  }, [boxes, activePic, highlightBoxNumbers, getItemsInBox]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute left-0 mt-2.5 w-[330px] sm:w-[780px] md:w-[860px] lg:w-[940px] max-w-[96vw] max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-2xl text-[#1d1d1f] border border-black/[0.08] rounded-[22px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-150 font-apple whitespace-normal"
      style={{ whiteSpace: 'normal' }}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#0071e3]/10 text-[#0071e3]">
            <BoxIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] leading-none">
              Status &amp; Rekap Pengisian Box
            </h3>
            <p className="text-[11px] text-[#86868b] mt-0.5">
              {boxes.length} Box • {racks.length} Penyimpanan • {ppicMembers.length} PIC PPIC
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05] transition cursor-pointer"
          aria-label="Tutup menu status box"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Bagian 1: Rekap Box Kurang per PIC */}
      <div className="mb-3.5">
        <PpicMissingMentionBar
          activePic={activePic}
          onSelectPic={onSelectPic}
          compact={true}
        />
      </div>

      {/* Bagian 2: Status Pengisian Box (3 Kolom Apple Cards) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#86868b] uppercase tracking-wider px-0.5">
          <span>Status Pengisian Box ({boxes.length} Box)</span>
          {activePic !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectPic?.('ALL')}
              className="text-[#0071e3] hover:underline font-semibold lowercase cursor-pointer"
            >
              difilter: @{activePic} (klik untuk reset)
            </button>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {occupancyGroups.map((group) => (
            <div
              key={group.label}
              className="p-3 bg-black/[0.02] rounded-[16px] border border-black/[0.06] transition-all flex flex-col"
            >
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#1d1d1f]">
                <span>{group.label}</span>
                <span className={`rounded-full px-2 py-0.2 text-[11px] font-semibold tabular-nums ${group.badgeClass}`}>
                  {group.boxes.length} Box
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-0.5 max-h-48 overflow-y-auto pr-1">
                {group.boxes.map((box) => (
                  <button
                    key={box.boxNumber}
                    type="button"
                    aria-label={`Buka Box ${getBoxDisplayNumber(box)}, ${group.label}`}
                    onClick={() => {
                      setSelectedBoxNumber(box.boxNumber);
                      onClose();
                    }}
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-[8px] px-1.5 text-xs font-semibold tabular-nums transition-all border active:scale-95 cursor-pointer ${group.boxClass}`}
                    title={`Klik untuk buka BOX #${getBoxDisplayNumber(box)} (${box.rackName || 'Rak'}, PIC: ${box.picName || '-'})`}
                  >
                    {getBoxDisplayNumber(box)}
                  </button>
                ))}
                {group.boxes.length === 0 && (
                  <span className="text-xs text-[#86868b] italic py-1">Tidak ada box</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3.5 pt-2.5 border-t border-black/[0.05] flex items-center justify-between text-[11px] text-[#86868b]">
        <span>Klik nomor box untuk membuka formulir &amp; isi box</span>
        <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] text-[10px] font-mono text-[#86868b]">ESC</kbd>
      </div>
    </div>
  );
};
