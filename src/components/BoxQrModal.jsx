import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Printer, Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

export const BoxQrModal = () => {
  const { qrModalBox, setQrModalBox, getItemsInBox } = useInventory();
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (qrModalBox) {
      const payload = JSON.stringify({
        app: 'GAGACLO-INVENTORY-RND',
        box: qrModalBox.boxNumber,
        rack: qrModalBox.rackName,
        category: qrModalBox.category,
        pic: qrModalBox.picName,
        code: qrModalBox.code,
      });

      QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(url => setQrDataUrl(url)).catch(console.error);
    }
  }, [qrModalBox]);

  if (!qrModalBox) return null;

  const items = getItemsInBox(qrModalBox.boxNumber);

  const handlePrint = () => {
    if (!qrDataUrl) {
      alert('QR Code masih dibuat, coba lagi dalam 1 detik.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      alert('Popup diblokir browser. Mohon izinkan popup untuk situs ini agar bisa mencetak label QR.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Label Box #${qrModalBox.boxNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .label-card { width: 340px; border: 3px solid black; padding: 20px; text-align: center; }
            .header-tag { background: black; color: white; padding: 4px 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 8px; }
            .box-title { font-size: 38px; font-weight: 900; margin: 8px 0; }
            .qr-img { width: 180px; height: 180px; margin: 10px auto; display: block; }
            .meta { font-size: 14px; font-weight: 600; margin-top: 6px; }
            .footer { font-size: 10px; margin-top: 14px; border-top: 1px solid #ccc; padding-top: 6px; color: #555; }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header-tag">${qrModalBox.category} • ${qrModalBox.rackName}</div>
            <div class="box-title">BOX #${qrModalBox.boxNumber}</div>
            <img src="${qrDataUrl}" class="qr-img" />
            <div class="meta">PIC: <strong>#${qrModalBox.ppicNumber} ${qrModalBox.picName}</strong></div>
            <div class="meta" style="font-size:12px; color:#444;">${qrModalBox.rackDescription}</div>
            <div class="footer">GAGACLO STORAGE RND • 20261102</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto print:block">
      <div className="bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-md overflow-hidden print:max-w-none print:shadow-none print:border-none print:rounded-none print:block">
        
        {/* Apple Style Header */}
        <div className="no-print bg-[#fbfbfd] px-6 py-4 flex items-center justify-between border-b border-black/[0.06]">
          <div className="flex items-center space-x-2">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Label &amp; QR Code Box</h3>
            <span className="text-[11px] bg-[#0071e3] text-white px-2.5 py-0.5 rounded-full font-medium">
              #{qrModalBox.boxNumber}
            </span>
          </div>
          <button
            onClick={() => setQrModalBox(null)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Printable Label Card Preview */}
        <div className="p-6 flex flex-col items-center">
          
          <div className="w-full border-4 border-black p-5 rounded-xl bg-white text-center shadow-md">
            
            <div className="bg-black text-white text-xs font-black tracking-widest uppercase py-1 px-3 mb-2 rounded-xs">
              {qrModalBox.category} STORAGE • {qrModalBox.rackName}
            </div>

            <h2 className="text-4xl font-black text-black tracking-tight my-1">
              BOX #{qrModalBox.boxNumber}
            </h2>

            <p className="text-xs font-semibold text-slate-700">
              {qrModalBox.rackDescription}
            </p>

            {/* QR Code */}
            <div className="my-3 flex justify-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR Box ${qrModalBox.boxNumber}`}
                  className="w-48 h-48 border-2 border-black rounded-lg p-1 bg-white"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center font-mono text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="border-t-2 border-black pt-2 space-y-0.5 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase text-xs">PENANGGUNG JAWAB PPIC:</span>
                <p className="font-black text-sm text-black">#{qrModalBox.ppicNumber} {qrModalBox.picName}</p>
              </div>
              <div className="text-xs text-slate-500 pt-1">
                GAGACLO - Storage - 20261102 • INVENTORY MANAGEMENT RND
              </div>
            </div>

          </div>

          {/* Quick Info Box Items */}
          <div className="no-print w-full mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between font-bold text-slate-800 mb-1">
              <span>Isi Saat Ini:</span>
              <span>{items.length} jenis item</span>
            </div>
            {items.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                {items.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="truncate">{item.name} ({item.qty} {item.unit})</li>
                ))}
                {items.length > 3 && (
                  <li className="text-slate-400 font-italic">+{items.length - 3} item lainnya</li>
                )}
              </ul>
            ) : (
              <p className="text-slate-400 italic text-xs">Belum ada item tercatat di dalam box ini.</p>
            )}
          </div>

          {/* Apple Style Actions */}
          <div className="no-print w-full mt-5 flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Stiker Label Box</span>
            </button>
            <button
              onClick={() => setQrModalBox(null)}
              className="py-2.5 px-4 rounded-xl bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] font-medium text-xs border border-black/[0.06] transition cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
