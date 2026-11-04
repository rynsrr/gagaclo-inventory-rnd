import React from 'react';

/**
 * Standard KTP Size (ID-1 / ISO 7810: 85.6mm × 54mm)
 * Compact Sample Card with 8 core fields:
 * - Track
 * - Tanggal
 * - Kode
 * - Deskripsi (Style & Size)
 * - Color
 * - Jumlah
 * - Satuan
 * - Place
 */
export const InventoryCard = ({ item, isPrintMode = false }) => {
  if (!item) return null;

  const track = item.track || '-';
  const tanggal = item.tanggal || item.dateIn || '-';
  const kode = item.kode || item.sku || '-';
  const buyerNo = item.buyerNo || item.buyerNumber || '-';
  const jenisSample = (item.jenisSample || item.sampleType || 'DEVELOP').toUpperCase();
  const deskripsi = item.deskripsi || item.name || item.description || '-';
  const color = item.color || '-';
  const jumlah = item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : (item.qty ?? '-');
  const satuan = item.satuan || item.unit || 'PCS';
  const place = item.place || (item.boxNumber ? `BOX ${item.boxNumber}` : '-');

  return (
    <div 
      className={`bg-white text-black font-sans box-border select-none ${
        isPrintMode 
          ? 'w-[85.6mm] h-[53.98mm] max-h-[53.98mm] p-0 break-inside-avoid print:w-[85.6mm] print:h-[53.98mm] print:break-inside-avoid overflow-hidden flex flex-col justify-between' 
          : 'w-[85.6mm] min-h-[53.98mm] p-0 shadow-md rounded border border-slate-400 overflow-hidden bg-white'
      }`}
      style={{ width: isPrintMode ? '85.6mm' : undefined, minWidth: isPrintMode ? '85.6mm' : undefined }}
    >
      <table className="w-full h-full border-collapse border-[1.5px] border-black text-[9px] leading-[1.15] text-left">
        <tbody>
          {/* Track */}
          <tr className="border-b border-black">
            <td className="w-[28%] py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Track
            </td>
            <td className="py-[1px] px-1.5 font-medium align-middle text-black break-all font-mono text-[8px] leading-tight">
              {track}
            </td>
          </tr>

          {/* Tanggal */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Tanggal
            </td>
            <td className="py-[1px] px-1.5 font-medium align-middle text-black text-[8px] leading-tight">
              {tanggal}
            </td>
          </tr>

          {/* Kode & Buyer No */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Kode
            </td>
            <td className="py-[1px] px-1.5 align-middle text-black">
              <div className="flex items-center justify-between gap-1">
                <span className="font-black tracking-tight font-mono text-[9px] leading-tight">
                  {kode}
                </span>
                <div className="flex items-center gap-1 shrink-0 font-mono text-[8px]">
                  <span className="font-bold text-slate-600">Buyer No:</span>
                  <span className="font-black text-black">
                    {buyerNo}
                  </span>
                </div>
              </div>
            </td>
          </tr>

          {/* Jenis Sample (ORI / DEVELOP / PPS) */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Jenis Sample
            </td>
            <td className="py-[1px] px-1.5 align-middle text-black">
              <div className="flex items-center gap-1.5 font-mono text-[7px] leading-none">
                <span className={`px-1 py-0.2 border border-black ${jenisSample === 'ORI' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-500 font-bold'}`}>
                  {jenisSample === 'ORI' ? '✓ ORI' : 'ORI'}
                </span>
                <span className={`px-1 py-0.2 border border-black ${jenisSample === 'DEVELOP' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-500 font-bold'}`}>
                  {jenisSample === 'DEVELOP' ? '✓ DEVELOP' : 'DEVELOP'}
                </span>
                <span className={`px-1 py-0.2 border border-black ${jenisSample === 'PPS' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-500 font-bold'}`}>
                  {jenisSample === 'PPS' ? '✓ PPS' : 'PPS'}
                </span>
              </div>
            </td>
          </tr>

          {/* Deskripsi (Nama/Nomer Style, Sample No., & Size) - FULL VISIBILITY */}
          <tr className="border-b border-black">
            <td className="py-[1.5px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Deskripsi
            </td>
            <td className="py-[1.5px] px-1.5 font-medium align-middle text-black leading-tight break-words">
              {item.style ? (
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[8.5px] leading-tight break-words text-black">
                    {item.style}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {item.sampleNo && item.sampleNo.trim() && item.sampleNo.trim() !== 'NA' && (
                      <span className="px-1 py-0 border border-black font-mono font-bold uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                        SMPL: {item.sampleNo}
                      </span>
                    )}
                    {item.size && (
                      <span className="px-1 py-0 border border-black font-black uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                        SZ: {item.size}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[8.5px] leading-tight break-words text-black">
                    {deskripsi}
                  </span>
                  {item.sampleNo && item.sampleNo.trim() && item.sampleNo.trim() !== 'NA' && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="px-1 py-0 border border-black font-mono font-bold uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                        SMPL: {item.sampleNo}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </td>
          </tr>

          {/* Color */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Color
            </td>
            <td className="py-[1px] px-1.5 font-bold align-middle text-black break-words text-[8px] leading-tight">
              {color}
            </td>
          </tr>

          {/* Jumlah & Satuan (1 Baris Hemat Tempat) */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Jumlah
            </td>
            <td className="py-[1px] px-1.5 align-middle text-black leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[9px]">{jumlah}</span>
                <span className="font-bold uppercase text-[8px] text-slate-800">{satuan}</span>
              </div>
            </td>
          </tr>

          {/* Place */}
          <tr>
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Place
            </td>
            <td className="py-[1px] px-1.5 font-black align-middle text-black uppercase text-[8px] break-words leading-tight">
              {place}
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
};
