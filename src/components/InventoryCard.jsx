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
            <td className="w-[30%] py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Track
            </td>
            <td className="py-[2px] px-1.5 font-medium align-middle text-black truncate font-mono text-[8.5px]">
              {track}
            </td>
          </tr>

          {/* Tanggal */}
          <tr className="border-b border-black">
            <td className="py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Tanggal
            </td>
            <td className="py-[2px] px-1.5 font-medium align-middle text-black truncate text-[8.5px]">
              {tanggal}
            </td>
          </tr>

          {/* Kode */}
          <tr className="border-b border-black">
            <td className="py-[1.5px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Kode
            </td>
            <td className="py-[1.5px] px-1.5 font-black align-middle text-black tracking-tight font-mono text-[9px]">
              {kode}
            </td>
          </tr>

          {/* Jenis Sample (ORI / DEVELOP / PPS) */}
          <tr className="border-b border-black">
            <td className="py-[1.5px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Jenis Sample
            </td>
            <td className="py-[1.5px] px-1.5 align-middle text-black">
              <div className="flex items-center gap-1.5 font-mono text-[7.5px]">
                <span className={`px-1.5 py-0 border border-black ${jenisSample === 'ORI' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-500 font-bold'}`}>
                  {jenisSample === 'ORI' ? '✓ ORI' : 'ORI'}
                </span>
                <span className={`px-1.5 py-0 border border-black ${jenisSample === 'DEVELOP' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-500 font-bold'}`}>
                  {jenisSample === 'DEVELOP' ? '✓ DEVELOP' : 'DEVELOP'}
                </span>
                <span className={`px-1.5 py-0 border border-black ${jenisSample === 'PPS' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-500 font-bold'}`}>
                  {jenisSample === 'PPS' ? '✓ PPS' : 'PPS'}
                </span>
              </div>
            </td>
          </tr>

          {/* Deskripsi (Nama/Nomer Style, Sample No., & Size) */}
          <tr className="border-b border-black">
            <td className="py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Deskripsi
            </td>
            <td className="py-[2px] px-1.5 font-medium align-middle text-black leading-tight">
              {item.style ? (
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold truncate text-[8.5px] max-w-[42%]" title={item.style}>
                    {item.style}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="px-1 py-0 border border-black font-mono font-bold uppercase text-[7.5px] bg-slate-50">
                      SMPL: {item.sampleNo || 'NA'}
                    </span>
                    {item.size && (
                      <span className="px-1 py-0 border border-black font-black uppercase text-[7.5px] bg-slate-50">
                        SZ: {item.size}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate block text-[8.5px] max-w-[55%]">{deskripsi}</span>
                  {item.sampleNo && (
                    <span className="px-1 py-0 border border-black font-mono font-bold uppercase text-[7.5px] bg-slate-50 shrink-0">
                      SMPL: {item.sampleNo}
                    </span>
                  )}
                </div>
              )}
            </td>
          </tr>

          {/* Color */}
          <tr className="border-b border-black">
            <td className="py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Color
            </td>
            <td className="py-[2px] px-1.5 font-bold align-middle text-black truncate text-[8.5px]">
              {color}
            </td>
          </tr>

          {/* Jumlah */}
          <tr className="border-b border-black">
            <td className="py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Jumlah
            </td>
            <td className="py-[2px] px-1.5 font-black text-[9.5px] align-middle text-black">
              {jumlah}
            </td>
          </tr>

          {/* Satuan */}
          <tr className="border-b border-black">
            <td className="py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Satuan
            </td>
            <td className="py-[2px] px-1.5 font-bold uppercase align-middle text-black text-[8.5px]">
              {satuan}
            </td>
          </tr>

          {/* Place */}
          <tr>
            <td className="py-[2px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Place
            </td>
            <td className="py-[2px] px-1.5 font-black align-middle text-black uppercase text-[8.5px] truncate">
              {place}
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
};
