import React from 'react';

/**
 * Exact replica of the inventory bin card / sample tag uploaded by the user:
 * 
 * | Track           | DHL : 5475890895                     |
 * | Tanggal         | 17-Jul-2026                          |
 * | Kode            | RF08-84                              |
 * | Deskripsi       | metal buckle 50mm metal buckle-female|
 * | Color           | -                                    |
 * | Jumlah          | 15                                   |
 * | Satuan          | PCS                                  |
 * | Place           | SOFI 1                               |
 * | Qty Dipakai     | [dotted line]                        |
 * | Tanggal Dipakai | [dotted line]                        |
 */
export const InventoryCard = ({ item, isPrintMode = false }) => {
  if (!item) return null;

  return (
    <div 
      className={`bg-white text-black font-sans box-border ${
        isPrintMode 
          ? 'w-[360px] p-2 break-inside-avoid print:w-[350px] print:p-1' 
          : 'w-full max-w-[380px] p-3 shadow-md rounded-lg border border-slate-300'
      }`}
    >
      <table className="w-full border-collapse border-2 border-black text-xs text-left">
        <tbody>
          {/* Track */}
          <tr className="border-b border-black">
            <td className="w-[32%] py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Track
            </td>
            <td className="py-1.5 px-2.5 font-medium align-middle text-black break-words">
              {item.track || '-'}
            </td>
          </tr>

          {/* Tanggal */}
          <tr className="border-b border-black">
            <td className="py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Tanggal
            </td>
            <td className="py-1.5 px-2.5 font-medium align-middle text-black">
              {item.tanggal || '-'}
            </td>
          </tr>

          {/* Kode */}
          <tr className="border-b border-black">
            <td className="py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Kode
            </td>
            <td className="py-1.5 px-2.5 font-black text-sm align-middle text-black tracking-tight font-mono">
              {item.kode || '-'}
            </td>
          </tr>

          {/* Deskripsi */}
          <tr className="border-b border-black">
            <td className="py-2.5 px-2.5 font-bold border-r border-black align-top text-black whitespace-nowrap">
              Deskripsi
            </td>
            <td className="py-2.5 px-2.5 font-medium align-top text-black leading-snug min-h-[44px]">
              {item.deskripsi || '-'}
            </td>
          </tr>

          {/* Color */}
          <tr className="border-b border-black">
            <td className="py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Color
            </td>
            <td className="py-1.5 px-2.5 font-medium align-middle text-black">
              {item.color || '-'}
            </td>
          </tr>

          {/* Jumlah */}
          <tr className="border-b border-black">
            <td className="py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Jumlah
            </td>
            <td className="py-1.5 px-2.5 font-bold text-sm align-middle text-black">
              {item.jumlah ?? '-'}
            </td>
          </tr>

          {/* Satuan */}
          <tr className="border-b border-black">
            <td className="py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Satuan
            </td>
            <td className="py-1.5 px-2.5 font-bold uppercase align-middle text-black">
              {item.satuan || 'PCS'}
            </td>
          </tr>

          {/* Place */}
          <tr className="border-b border-black">
            <td className="py-1.5 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap">
              Place
            </td>
            <td className="py-1.5 px-2.5 font-black align-middle text-black uppercase">
              {item.place || '-'}
            </td>
          </tr>

          {/* Qty Dipakai (italic label, dotted line bottom) */}
          <tr className="border-b-2 border-dotted border-black">
            <td className="py-2 px-2.5 font-bold italic border-r border-black align-middle text-black whitespace-nowrap">
              Qty Dipakai
            </td>
            <td className="py-2 px-2.5 font-semibold align-middle text-black">
              {item.qtyDipakai || ''}
            </td>
          </tr>

          {/* Tanggal Dipakai (italic label, dotted line bottom) */}
          <tr className="border-b-2 border-dotted border-black">
            <td className="py-2 px-2.5 font-bold italic border-r border-black align-middle text-black whitespace-nowrap">
              Tanggal Dipakai
            </td>
            <td className="py-2 px-2.5 font-semibold align-middle text-black">
              {item.tanggalDipakai || ''}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
