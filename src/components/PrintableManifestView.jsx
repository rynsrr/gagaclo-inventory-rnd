import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Printer, Download, Eye, QrCode, FileText, Check } from 'lucide-react';
import { BoxLabel } from './BoxLabel';
import QRCode from 'qrcode';

export const PrintableManifestView = () => {
  const { racks, boxes, ppicMembers, items } = useInventory();
  const [selectedRackId, setSelectedRackId] = useState(1);
  const [viewMode, setViewMode] = useState('sheets'); // 'sheets' or 'stickers'
  const [qrCodes, setQrCodes] = useState({});

  // Generate QR codes for all boxes on demand
  React.useEffect(() => {
    const generateQRs = async () => {
      const qrs = {};
      for (const box of boxes) {
        try {
          const qrData = JSON.stringify({
            app: 'GAGACLO-RND',
            box: box.boxNumber,
            rack: box.rackName,
            pic: box.picName,
            cat: box.category,
          });
          const url = await QRCode.toDataURL(qrData, { margin: 1, width: 140 });
          qrs[box.boxNumber] = url;
        } catch (e) {
          console.error(e);
        }
      }
      setQrCodes(qrs);
    };
    generateQRs();
  }, [boxes]);

  // Exact data from the 5 pages of the prompt:
  const MANIFEST_PAGES = [
    {
      page: 1,
      category: 'SAMPLE',
      rackName: 'RACK 1',
      description: 'Blue rack, sample warehouse',
      boxRange: 'BOX 1 - 16',
      total: 16,
      rows: [
        { ppic: 1, name: 'Royan', box: '1-3, 16', qty: 4 },
        { ppic: 2, name: 'Cynara', box: '4-6', qty: 3 },
        { ppic: 3, name: 'Ami', box: '7-9', qty: 3 },
        { ppic: 4, name: 'Ryan', box: '10-12', qty: 3 },
        { ppic: 5, name: 'Hanami', box: '13-15', qty: 3 },
      ],
    },
    {
      page: 2,
      category: 'SAMPLE',
      rackName: 'RACK 2',
      description: 'White rack, sample warehouse, way to the new building',
      boxRange: 'BOX 17 - 36',
      total: 20,
      rows: [
        { ppic: 1, name: 'Royan', box: '17-20', qty: 4 },
        { ppic: 2, name: 'Cynara', box: '21-24', qty: 4 },
        { ppic: 3, name: 'Ami', box: '25-28', qty: 4 },
        { ppic: 4, name: 'Ryan', box: '29-32', qty: 4 },
        { ppic: 5, name: 'Hanami', box: '33-36', qty: 4 },
      ],
    },
    {
      page: 3,
      category: 'MATERIAL',
      rackName: 'RACK 3',
      description: 'White rack, new building',
      boxRange: 'BOX 37 - 48',
      total: 12,
      rows: [
        { ppic: 1, name: 'Royan', box: '37-38, 47', qty: 3 },
        { ppic: 2, name: 'Cynara', box: '39-40, 48', qty: 3 },
        { ppic: 3, name: 'Ami', box: '41-42', qty: 2 },
        { ppic: 4, name: 'Ryan', box: '43-44', qty: 2 },
        { ppic: 5, name: 'Hanami', box: '45-46', qty: 2 },
      ],
    },
    {
      page: 4,
      category: 'MATERIAL',
      rackName: 'RACK 4',
      description: 'White rack, new building',
      boxRange: 'BOX 49 - 60',
      total: 12,
      rows: [
        { ppic: 1, name: 'Royan', box: '49-50', qty: 2 },
        { ppic: 2, name: 'Cynara', box: '51-52', qty: 2 },
        { ppic: 3, name: 'Ami', box: '53-54, 59', qty: 3 },
        { ppic: 4, name: 'Ryan', box: '55-56, 60', qty: 3 },
        { ppic: 5, name: 'Hanami', box: '57-58', qty: 2 },
      ],
    },
    {
      page: 5,
      category: 'MATERIAL',
      rackName: 'RACK 5',
      description: 'White rack, new building',
      boxRange: 'BOX 61 - 72',
      total: 12,
      rows: [
        { ppic: 1, name: 'Royan', box: '61-62, 72', qty: 3 },
        { ppic: 2, name: 'Cynara', box: '63-64', qty: 2 },
        { ppic: 3, name: 'Ami', box: '65-66', qty: 2 },
        { ppic: 4, name: 'Ryan', box: '67-68', qty: 2 },
        { ppic: 5, name: 'Hanami', box: '69-70, 71', qty: 3 },
      ],
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const activePage = MANIFEST_PAGES.find(p => p.page === selectedRackId) || MANIFEST_PAGES[0];

  return (
    <div className="space-y-6">
      
      {/* Control bar */}
      <div className="no-print inventory-panel p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Toggle Mode */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('sheets')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'sheets'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lembar Dokumen Rak (1 - 5)</span>
          </button>

          <button
            onClick={() => setViewMode('stickers')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'stickers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Label Stiker QR Box (1 - 72)</span>
          </button>
        </div>

        {/* Rack Selector (if sheet mode) */}
        {viewMode === 'sheets' && (
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
            <span className="text-xs text-slate-500 font-semibold mr-1">Pilih Rak:</span>
            {MANIFEST_PAGES.map((page) => (
              <button
                key={page.page}
                onClick={() => setSelectedRackId(page.page)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md border transition ${
                  selectedRackId === page.page
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Hal {page.page}: {page.rackName}
              </button>
            ))}
          </div>
        )}

        {/* Print Button */}
        <div>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

      </div>

      {/* MODE 1: SHEET VIEW (EXACT REPLICA OF PROMPT PAGES) */}
      {viewMode === 'sheets' && (
        <div className="flex justify-center">
          <div className="w-full max-w-[620px] bg-white border-4 border-black p-8 sm:p-12 shadow-xl print:border-4 print:shadow-none print:w-full print:max-w-none text-center">
            
            {/* Top Category Header Banner */}
            <div className="bg-black text-white text-center py-2.5 px-6 font-black tracking-widest text-2xl uppercase font-sans mb-6">
              {activePage.category}
            </div>

            {/* Giant Rack Name */}
            <h1 className="text-6xl sm:text-7xl font-black text-black tracking-tight my-4 uppercase font-sans">
              {activePage.rackName}
            </h1>

            {/* Description Subtitle */}
            <p className="text-base sm:text-lg font-medium text-black mt-2 mb-6">
              {activePage.description}
            </p>

            {/* Box Range */}
            <div className="text-2xl sm:text-3xl font-black text-black tracking-wider uppercase mb-8">
              {activePage.boxRange}
            </div>

            {/* Table */}
            <div className="border-4 border-black mb-8 overflow-hidden">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-black text-white text-base font-black">
                    <th className="py-2.5 px-3 text-center border-r-2 border-white w-20">PPIC</th>
                    <th className="py-2.5 px-4 border-r-2 border-white">NAME</th>
                    <th className="py-2.5 px-4 border-r-2 border-white">BOX</th>
                    <th className="py-2.5 px-3 text-center w-20">QTY</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-base font-bold text-black">
                  {activePage.rows.map((row) => (
                    <tr key={row.ppic} className="divide-x-2 divide-black">
                      <td className="py-3 px-3 text-center text-xl font-black">{row.ppic}</td>
                      <td className="py-3 px-4 bg-blue-50/70 text-slate-900 font-semibold text-lg">{row.name}</td>
                      <td className="py-3 px-4 font-black text-lg">{row.box}</td>
                      <td className="py-3 px-3 text-center text-xl font-black">{row.qty}</td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="border-t-4 border-black divide-x-2 divide-black bg-white">
                    <td colSpan={3} className="py-3.5 px-4 font-black text-xl tracking-wider uppercase">
                      TOTAL
                    </td>
                    <td className="py-3.5 px-3 text-center text-2xl font-black">
                      {activePage.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-4 text-center">
              <div className="text-xs font-semibold tracking-wider text-black uppercase">
                GAGACLO - Storage - 20261102
              </div>
              <div className="text-sm font-black tracking-widest text-black uppercase mt-0.5">
                INVENTORY MANAGEMENT RND
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODE 2: STICKER VIEW (PRINTABLE OFFICIAL BOX LABELS FOR 72 BOXES) */}
      {viewMode === 'stickers' && (
        <div className="space-y-4">
          <div className="no-print bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-xl text-xs flex items-center justify-between">
            <div>
              <strong>Format Label Box Fisik:</strong> Tampilan ini siap cetak di kertas stiker label atau kertas HVS A4. Desain persis dengan standar GAGACLO (SAMPLE BOX / MATERIAL BOX, nomor raksasa, bar nama PIC, dan lokasi rak).
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              Cetak Semua Label
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center print:grid-cols-2 print:gap-4 print:p-2">
            {boxes.map((box) => (
              <div 
                key={box.boxNumber}
                className="print:break-inside-avoid print:page-break-inside-avoid"
              >
                <BoxLabel box={box} isPrintMode={true} />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
