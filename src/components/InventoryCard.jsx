import React from 'react';

/**
 * Standard KTP Size (ID-1 / ISO 7810: 85.6mm × 54mm)
 * Compact Sample Card with 8 core fields:
 * - Track
 * - Tanggal Sample
 * - Kode
 * - Deskripsi (Style & Size)
 * - Color
 * - Jumlah
 * - Satuan
 * - Place
 */
export const InventoryCard = ({ item, isPrintMode = false }) => {
  if (!item) return null;

  // When printing, every blank or "-" field shows "NA" so the card never
  // has an empty row. On-screen preview keeps "-" for readability.
  const naOr = (value) => {
    const text = String(value ?? '').trim();
    if (text === '' || text === '-') return isPrintMode ? 'NA' : '-';
    return text;
  };

  const track = naOr(item.track);
  const tanggal = naOr(item.tanggal || item.dateIn);
  const kode = naOr(item.kode || item.sku);
  const buyerNo = naOr(item.buyerNo || item.buyerNumber);
  const jenisSample = (item.jenisSample || item.sampleType || 'DEVELOP').toUpperCase();
  const deskripsi = naOr(item.deskripsi || item.name || item.description);
  const color = naOr(item.color);
  const jumlahRaw = item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : item.qty;
  const jumlah = (jumlahRaw === undefined || jumlahRaw === null || jumlahRaw === '' || jumlahRaw === '-')
    ? (isPrintMode ? 'NA' : '-')
    : jumlahRaw;
  const satuan = naOr(item.satuan || item.unit);
  const place = naOr(item.place || (item.boxNumber ? `BOX ${item.boxNumber}` : null));
  const styleDisplay = naOr(item.style);
  const sampleNoDisplay = naOr(item.sampleNo);
  const sizeDisplay = naOr(item.size);

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

          {/* Tanggal Sample */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Tanggal Sample
            </td>
            <td className="py-[1px] px-1.5 font-medium align-middle text-black text-[8px] leading-tight">
              {tanggal}
            </td>
          </tr>

          {/* Kode & Buyer No */}
          <tr className="border-b border-black">
            <td className="w-[28%] py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50">
              Kode
            </td>
            <td className="p-0 align-middle text-black">
              <div className="grid grid-cols-2 gap-0 items-center w-full h-full">
                <div className="py-[1px] px-1.5 border-r border-black font-black tracking-tight font-mono text-[9px] leading-tight truncate">
                  {kode}
                </div>
                <div className="py-[1px] px-1.5 flex items-center justify-between font-mono text-[8px] leading-tight truncate">
                  <span className="font-bold text-slate-600">Buyer:</span>
                  <span className="font-black text-black ml-1 truncate">
                    {buyerNo}
                  </span>
                </div>
              </div>
            </td>
          </tr>

          {/* Jenis Sample (ORI / DEVELOP / PPS) */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 leading-tight">
              <div>Jenis Sample</div>
              <div className="text-[6.5px] font-normal text-slate-700 leading-none mt-0.5">*(Centang salah satu)</div>
            </td>
            <td className="py-[1px] px-1.5 align-middle text-black">
              <div className="flex items-center gap-1.5 font-mono text-[7px] leading-none">
                <span className={`px-1 py-0.5 border border-black flex items-center gap-0.5 ${jenisSample === 'ORI' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'ORI' ? '✓' : ''}</span>
                  <span>ORI</span>
                </span>
                <span className={`px-1 py-0.5 border border-black flex items-center gap-0.5 ${jenisSample === 'DEVELOP' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'DEVELOP' ? '✓' : ''}</span>
                  <span>DEVELOP</span>
                </span>
                <span className={`px-1 py-0.5 border border-black flex items-center gap-0.5 ${jenisSample === 'PPS' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'PPS' ? '✓' : ''}</span>
                  <span>PPS</span>
                </span>
                <span className={`px-1 py-0.5 border border-black flex items-center gap-0.5 ${jenisSample === 'BULK SAMPLE' || jenisSample === 'BULK' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'BULK SAMPLE' || jenisSample === 'BULK' ? '✓' : ''}</span>
                  <span>BULK SAMPLE</span>
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
                    {styleDisplay}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    <span className="px-1 py-0 border border-black font-mono font-bold uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                      SAMPLE NO: {sampleNoDisplay}
                    </span>
                    <span className="px-1 py-0 border border-black font-black uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                      SIZE: {sizeDisplay}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[8.5px] leading-tight break-words text-black">
                    {deskripsi}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-1 py-0 border border-black font-mono font-bold uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                      SAMPLE NO: {sampleNoDisplay}
                    </span>
                    <span className="px-1 py-0 border border-black font-black uppercase text-[7px] bg-slate-50 whitespace-nowrap">
                      SIZE: {sizeDisplay}
                    </span>
                  </div>
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
