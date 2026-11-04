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
    const printWindow = window.open('', '', 'width=600,height=600');
    if (!printWindow) return;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="inventory-dialog-heading px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold">Label & QR Code Box</h3>
            <span className="text-xs bg-blue-600 px-2 py-0.5 rounded font-black">
              #{qrModalBox.boxNumber}
            </span>
          </div>
          <button
            onClick={() => setQrModalBox(null)}
            className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
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

            <p className="text-[11px] font-semibold text-slate-700">
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
                <span className="text-slate-500 font-bold uppercase text-[10px]">PENANGGUNG JAWAB PPIC:</span>
                <p className="font-black text-sm text-black">#{qrModalBox.ppicNumber} {qrModalBox.picName}</p>
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                GAGACLO - Storage - 20261102 • INVENTORY MANAGEMENT RND
              </div>
            </div>

          </div>

          {/* Quick Info Box Items */}
          <div className="w-full mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between font-bold text-slate-800 mb-1">
              <span>Isi Saat Ini:</span>
              <span>{items.length} jenis item</span>
            </div>
            {items.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                {items.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="truncate">{item.name} ({item.qty} {item.unit})</li>
                ))}
                {items.length > 3 && (
                  <li className="text-slate-400 font-italic">+{items.length - 3} item lainnya</li>
                )}
              </ul>
            ) : (
              <p className="text-slate-400 italic text-[11px]">Belum ada item tercatat di dalam box ini.</p>
            )}
          </div>

          {/* Actions */}
          <div className="w-full mt-5 flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Stiker Label Box</span>
            </button>
            <button
              onClick={() => setQrModalBox(null)}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
            >
              Tutup
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
