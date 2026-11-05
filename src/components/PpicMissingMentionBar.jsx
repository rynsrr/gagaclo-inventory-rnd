import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Users, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  Box as BoxIcon,
  Filter
} from 'lucide-react';

export const PpicMissingMentionBar = ({ onSelectPic, activePic = 'ALL', compact = false }) => {
  const { ppicMembers, boxes, getItemsInBox, setSelectedBoxNumber } = useInventory();
  const [copied, setCopied] = useState(false);
  const [showAllBoxes, setShowAllBoxes] = useState(false);

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

  // Generate formatted mention text for WhatsApp/Team Chat
  const handleCopyMentionText = () => {
    const today = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const lines = [
      `📢 *REKAP KEKURANGAN BOX SAMPLE R&D GAGACLO*`,
      `📅 *${today}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      '',
    ];

    picStats.forEach((pic) => {
      if (pic.countKurang > 0) {
        const boxList = pic.emptyBoxes.map((b) => `#${b.boxNumber}`).join(', ');
        lines.push(`@${pic.name} : *Kurang ${pic.countKurang} Box* (Belum ada data: ${boxList})`);
      } else {
        lines.push(`@${pic.name} : *Lengkap* (Semua ${pic.totalAssigned} box terisi) ✅`);
      }
    });

    lines.push('');
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚠️ *Total: ${totalKurang} box* masih kosong/belum ada data.`);
    lines.push(`Mohon rekan PIC segera melengkapi input data box masing-masing.`);
    lines.push(`🔗 Akses: https://gagaclo-inventory-rnd.vercel.app/`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="inventory-panel p-4 sm:p-5 space-y-3.5 border border-slate-200/80 shadow-2xs bg-white/95 backdrop-blur-md rounded-2xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                Rekap Kurang &amp; Mention PIC
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
                totalKurang > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {totalKurang > 0 ? `Total Kurang: ${totalKurang} Box` : 'Semua Box Terisi! 🎉'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Pantau progres pengisian box masing-masing PIC dan salin teks rekap otomatis untuk grup chat.
            </p>
          </div>
        </div>

        {/* Copy Mention Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleCopyMentionText}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 hover:shadow-xs hover:-translate-y-0.5 active:scale-95'
            }`}
            title="Salin pesan mention teks untuk WhatsApp/Telegram grup PPIC"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Teks Mention Chat</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of PIC Mention Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {picStats.map((pic) => {
          const isSelected = activePic !== 'ALL' && activePic.toLowerCase() === pic.name.toLowerCase();
          const hasKurang = pic.countKurang > 0;

          return (
            <div
              key={pic.id}
              className={`flex flex-col justify-between p-3 rounded-xl border transition-all text-xs ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200' 
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-white'
              }`}
            >
              {/* Top row: Avatar + Mention Name + Badge */}
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-6 h-6 rounded-lg text-white font-black text-[11px] flex items-center justify-center shrink-0 ${pic.avatarBg}`}>
                      {pic.name.charAt(0)}
                    </span>
                    <span 
                      className="font-mono font-bold text-slate-800 truncate text-xs hover:text-blue-600 cursor-pointer"
                      title={`Filter box milik @${pic.name}`}
                      onClick={() => onSelectPic && onSelectPic(isSelected ? 'ALL' : pic.name)}
                    >
                      @{pic.name}
                    </span>
                  </div>

                  {hasKurang ? (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                      Kurang {pic.countKurang}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Lengkap ✓
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Terisi: {pic.filledCount}/{pic.totalAssigned} box</span>
                    <span>{Math.round((pic.filledCount / (pic.totalAssigned || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        hasKurang ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(pic.filledCount / (pic.totalAssigned || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Missing boxes chips */}
                {hasKurang ? (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Box belum diisi:
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                      {pic.emptyBoxes.map((b) => (
                        <button
                          key={b.boxNumber}
                          type="button"
                          onClick={() => setSelectedBoxNumber(b.boxNumber)}
                          className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold font-mono transition"
                          title={`Buka & isi Box #${b.boxNumber}`}
                        >
                          #{b.boxNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Semua box aman</span>
                  </div>
                )}
              </div>

              {/* Filter action button */}
              {onSelectPic && (
                <button
                  type="button"
                  onClick={() => onSelectPic(isSelected ? 'ALL' : pic.name)}
                  className={`mt-2.5 w-full py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span>{isSelected ? 'Tampilkan Semua' : `Sorot Box @${pic.name}`}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
