import React from 'react';
import { getBoxDisplayNumber } from '../utils/boxDisplayUtils';

/**
 * Standard KTP Size (ID-1 / ISO 7810: 85.6mm × 54mm)
 * Compact Sample Card with 8 core fields — font sizes carefully calibrated
 * so ALL 8 rows (including Place & bottom border) NEVER clip even with long descriptions.
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
  const place = naOr(item.place || (item.boxNumber ? `BOX ${getBoxDisplayNumber(item.boxNumber)}` : null));
  const styleDisplay = naOr(item.style);
  const sampleNoDisplay = naOr(item.sampleNo);
  const sizeDisplay = naOr(item.size);

  const mainDescText = item.style ? styleDisplay : deskripsi;
  const descLen = String(mainDescText || '').length;
  const descFontClass =
    descLen > 85
      ? 'text-[6.8px] leading-[1.08]'
      : descLen > 50
      ? 'text-[7.5px] leading-[1.1]'
      : 'text-[8.5px] leading-[1.12]';

  return (
    <div
      className={`bg-white text-black font-sans box-border select-none ${
        isPrintMode
          ? 'w-[85.6mm] h-[53.98mm] max-h-[53.98mm] p-0 break-inside-avoid print:w-[85.6mm] print:h-[53.98mm] print:break-inside-avoid overflow-hidden flex flex-col justify-between'
          : 'w-[85.6mm] min-h-[53.98mm] p-0 shadow-md rounded border border-slate-400 overflow-hidden bg-white'
      }`}
      style={{ width: isPrintMode ? '85.6mm' : undefined, minWidth: isPrintMode ? '85.6mm' : undefined }}
    >
      <table className="w-full h-full border-collapse border-[1.5px] border-black text-[8.5px] leading-[1.1] text-left table-fixed">
        <tbody>
          {/* Track */}
          <tr className="border-b border-black">
            <td className="w-[26%] py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Track
            </td>
            <td className="py-[1px] px-1.5 font-medium align-middle text-black font-mono text-[8px] leading-[1.1] truncate">
              {track}
            </td>
          </tr>

          {/* Tanggal Sample */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Tanggal Sample
            </td>
            <td className="py-[1px] px-1.5 font-medium align-middle text-black text-[8.5px] leading-[1.1] truncate">
              {tanggal}
            </td>
          </tr>

          {/* Kode & Buyer No */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Kode
            </td>
            <td className="p-0 align-middle text-black">
              <div className="grid grid-cols-2 gap-0 items-center w-full h-full">
                <div className="py-[1px] px-1.5 border-r border-black font-black tracking-tight font-mono text-[8.5px] leading-[1.1] truncate">
                  {kode}
                </div>
                <div className="py-[1px] px-1.5 flex items-center justify-between font-mono text-[8.5px] leading-[1.1] truncate">
                  <span className="font-bold text-slate-600">Buyer:</span>
                  <span className="font-black text-black ml-1 truncate">
                    {buyerNo}
                  </span>
                </div>
              </div>
            </td>
          </tr>

          {/* Jenis Sample (ORI / DEVELOP / PPS / BULK SAMPLE / ARCHIVE) */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 leading-none">
              <div className="text-[8.5px]">Jenis Sample</div>
              <div className="text-[5.5px] font-normal text-slate-700 leading-none mt-[1px]">*(Centang salah satu)</div>
            </td>
            <td className="py-[1px] px-1 align-middle text-black">
              <div className="flex items-center gap-[3px] font-mono text-[6px] leading-none flex-wrap">
                <span className={`px-[3px] py-[1.5px] border border-black flex items-center gap-0.5 ${jenisSample === 'ORI' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'ORI' ? '✓' : ''}</span>
                  <span>ORI</span>
                </span>
                <span className={`px-[3px] py-[1.5px] border border-black flex items-center gap-0.5 ${jenisSample === 'DEVELOP' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'DEVELOP' ? '✓' : ''}</span>
                  <span>DEVELOP</span>
                </span>
                <span className={`px-[3px] py-[1.5px] border border-black flex items-center gap-0.5 ${jenisSample === 'PPS' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'PPS' ? '✓' : ''}</span>
                  <span>PPS</span>
                </span>
                <span className={`px-[3px] py-[1.5px] border border-black flex items-center gap-0.5 ${jenisSample === 'BULK SAMPLE' || jenisSample === 'BULK' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'BULK SAMPLE' || jenisSample === 'BULK' ? '✓' : ''}</span>
                  <span>BULK SAMPLE</span>
                </span>
                <span className={`px-[3px] py-[1.5px] border border-black flex items-center gap-0.5 ${jenisSample === 'ARCHIVE' || jenisSample === 'ARSIP' ? 'bg-black text-white font-black' : 'bg-transparent text-slate-700 font-bold'}`}>
                  <span>{jenisSample === 'ARCHIVE' || jenisSample === 'ARSIP' ? '✓' : ''}</span>
                  <span>ARCHIVE</span>
                </span>
              </div>
            </td>
          </tr>

          {/* Deskripsi (Nama/Nomer Style, Sample No., & Size) - AUTO-SCALED FOR FULL VISIBILITY */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Deskripsi
            </td>
            <td className="py-[1.5px] px-1.5 font-medium align-middle text-black break-words">
              <div className="flex flex-col gap-[2px]">
                <span className={`font-bold break-words text-black ${descFontClass}`}>
                  {mainDescText}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1 py-[0.5px] border border-black font-mono font-bold uppercase text-[7.2px] leading-tight bg-slate-50 whitespace-nowrap">
                    SAMPLE NO: {sampleNoDisplay}
                  </span>
                  <span className="px-1 py-[0.5px] border border-black font-black uppercase text-[7.2px] leading-tight bg-slate-50 whitespace-nowrap">
                    SIZE: {sizeDisplay}
                  </span>
                </div>
              </div>
            </td>
          </tr>

          {/* Color */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Color
            </td>
            <td className="py-[1px] px-1.5 font-bold align-middle text-black text-[8.5px] leading-[1.1] truncate">
              {color}
            </td>
          </tr>

          {/* Jumlah & Satuan (1 Baris Hemat Tempat) */}
          <tr className="border-b border-black">
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Jumlah
            </td>
            <td className="py-[1px] px-1.5 align-middle text-black leading-[1.1]">
              <div className="flex items-center gap-1">
                <span className="font-black text-[8.5px]">{jumlah}</span>
                <span className="font-bold uppercase text-[8px] text-slate-800">{satuan}</span>
              </div>
            </td>
          </tr>

          {/* Place */}
          <tr>
            <td className="py-[1px] px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/50 text-[8.5px]">
              Place
            </td>
            <td className="py-[1px] px-1.5 font-black align-middle text-black uppercase text-[8.2px] leading-[1.1] truncate">
              {place}
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
};
