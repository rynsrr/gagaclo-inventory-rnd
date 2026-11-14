import { X, Printer, FileText, Building2, User } from 'lucide-react';
import { decodeDispatchData } from '../utils/dispatchUtils';

export function DispatchManifestModal({ isOpen, onClose, items = [] }) {
  if (!isOpen || !items || items.length === 0) return null;

  const firstItem = items[0];
  const firstDispatch = decodeDispatchData(firstItem);
  const destinationName = firstDispatch?.destinationLabel || 'Tujuan Luar';
  const dispatchDate = firstDispatch?.date || '-';
  const picName = firstDispatch?.pic || 'Royan';
  const recipientName = firstDispatch?.recipient || '-';
  const docNo = `SJ-RND-${String(dispatchDate).replace(/-/g, '')}-${items.length}`;

  const totalPcs = items.reduce((acc, it) => acc + (Number(it.jumlah ?? it.qty ?? 1)), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header - Screen only */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Surat Jalan / Tanda Terima Pengiriman Sampel R&D
              </h3>
              <p className="text-[11px] text-slate-300">
                Format resmi cetak bukti serah terima sampel keluar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print Surat Jalan</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 printable-area space-y-6">
          {/* Header Surat */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  GAGACLO <span className="text-blue-600">R&amp;D</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  Sample &amp; Material Studio
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1">
                SURAT JALAN &amp; TANDA TERIMA PENGIRIMAN SAMPEL
              </p>
              <p className="text-[11px] text-slate-500">
                Divisi Research &amp; Development (R&amp;D) — PT. Gagaclo Internasional
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-1">
              <div>
                <span className="text-slate-500">No. Surat: </span>
                <strong className="text-slate-900">{docNo}</strong>
              </div>
              <div>
                <span className="text-slate-500">Tanggal: </span>
                <strong>{dispatchDate}</strong>
              </div>
            </div>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tujuan Pengiriman:</div>
              <div className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{destinationName}</span>
              </div>
              <div className="text-slate-600 pt-0.5">
                Penerima / Referensi: <strong>{recipientName}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PIC Pengirim (R&amp;D):</div>
              <div className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{picName}</span>
              </div>
              <div className="text-slate-600 pt-0.5">
                Total Muatan: <strong>{items.length} Item ({totalPcs} PCS)</strong>
              </div>
            </div>
          </div>

          {/* Table List of Items */}
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3">Kode Sample</th>
                  <th className="py-2.5 px-3">Style / Deskripsi</th>
                  <th className="py-2.5 px-2 text-center">No. Sample</th>
                  <th className="py-2.5 px-2 text-center">Size</th>
                  <th className="py-2.5 px-2 text-center">Color</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-center">Sifat</th>
                  <th className="py-2.5 px-3">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((it, idx) => {
                  const itDispatch = decodeDispatchData(it);
                  const isPermanent = itDispatch?.type === 'PERMANENT';
                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{it.kode || it.sku || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {it.style || it.name || it.deskripsi || '-'}
                        {itDispatch?.originBox && (
                          <span className="block text-[10px] font-normal text-slate-500">
                            Asal: Box #{itDispatch.originBox}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">{it.sampleNo || '-'}</td>
                      <td className="py-2.5 px-2 text-center font-bold">{it.size || '-'}</td>
                      <td className="py-2.5 px-2 text-center">{it.color || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                        {it.jumlah ?? it.qty ?? 1} {it.satuan || 'PCS'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                          isPermanent ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {isPermanent ? 'Permanen' : 'Review'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {itDispatch?.notes || it.description || it.deskripsi || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-bold border-t border-slate-300 text-slate-900">
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider">
                    Total Keseluruhan Sampel:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-blue-800">
                    {totalPcs} PCS
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-[11px] text-slate-600">
                    ({items.length} item)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Catatan Sifat Pengiriman */}
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
            <strong>Catatan Operasional R&amp;D:</strong>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-blue-800">
              <li>Item bertanda <strong>Permanen</strong> diserahkan ke Buyer/Anzo (stok R&amp;D dikurangi permanen).</li>
              <li>Item bertanda <strong>Review</strong> dipinjamkan sementara untuk evaluasi dan wajib dikembalikan ke R&amp;D setelah review selesai.</li>
            </ul>
          </div>

          {/* Kolom Tanda Tangan */}
          <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
            <div className="flex flex-col justify-between h-32 border border-slate-200 rounded-xl p-3 bg-white">
              <span className="font-bold text-slate-700 text-[11px]">Yang Menyerahkan (R&amp;D)</span>
              <div>
                <div className="font-bold text-slate-900 border-b border-slate-400 mx-4 pb-1">
                  ( {picName} )
                </div>
                <div className="text-[10px] text-slate-500 mt-1">PIC Sample Studio</div>
              </div>
            </div>

            <div className="flex flex-col justify-between h-32 border border-slate-200 rounded-xl p-3 bg-white">
              <span className="font-bold text-slate-700 text-[11px]">Yang Membawa (Driver/Kurir)</span>
              <div>
                <div className="font-bold text-slate-900 border-b border-slate-400 mx-4 pb-1">
                  ( ..................................... )
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Ekspedisi / Internal</div>
              </div>
            </div>

            <div className="flex flex-col justify-between h-32 border border-slate-200 rounded-xl p-3 bg-white">
              <span className="font-bold text-slate-700 text-[11px]">Yang Menerima ({destinationName})</span>
              <div>
                <div className="font-bold text-slate-900 border-b border-slate-400 mx-4 pb-1">
                  ( {recipientName !== '-' ? recipientName : '.....................................'} )
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Nama Jelas &amp; Cap</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchManifestModal;
