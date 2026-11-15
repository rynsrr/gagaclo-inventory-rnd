import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  Send,
  Building2,
  User,
  FileText,
  AlertCircle,
  Printer,
  Sparkles,
  Check,
} from 'lucide-react';
import { DISPATCH_DESTINATIONS } from '../utils/dispatchUtils';

export function DispatchModal({ isOpen, onClose, item, preselectedItems = [] }) {
  const { dispatchItem, currentUser, suggestions, items: allItems, clearDispatchCart } = useInventory();

  // If single item or multiple items from cart
  const itemsToDispatch = useMemo(() => {
    return item ? [item] : preselectedItems;
  }, [item, preselectedItems]);

  const singleItem = itemsToDispatch[0] || null;

  // Unified list of Buyer No from suggestions store and inventory items
  const buyerList = useMemo(() => {
    const set = new Set();
    ['FLINK PRODUCTION GMBH', 'RG04', 'ADIDAS', 'AMERICAN EAGLE', 'AN01', 'AN05', 'AN05XX', 'AN05XXXX', 'AN13', 'AN15', 'BERSHKA', 'CALVIN KLEIN', 'CRW-JY', 'G2403', 'GAP', 'GU', 'H&M'].forEach((b) => set.add(b));
    (suggestions?.buyerNo || []).forEach((b) => {
      const s = String(b || '').trim().toUpperCase();
      if (s && s !== 'NA' && s !== '-') set.add(s);
    });
    (allItems || []).forEach((it) => {
      const b = String(it.buyerNo || it.buyerNumber || '').trim().toUpperCase();
      if (b && b !== 'NA' && b !== '-') set.add(b);
    });
    return Array.from(set).sort();
  }, [suggestions, allItems]);

  // Destination channel: BUYER, ANZO_QC, ANZO_TW, ANZO_QC_CHINA, RDTW, RDC, LAINNYA
  const [destinationId, setDestinationId] = useState('BUYER');
  const [dispatchType, setDispatchType] = useState('PERMANENT'); // 'PERMANENT' | 'REVIEW'

  // Document Info States
  const [consigneeName, setConsigneeName] = useState(() => {
    if (singleItem?.buyerNo && singleItem.buyerNo !== 'NA' && singleItem.buyerNo !== '-') {
      return String(singleItem.buyerNo).trim().toUpperCase();
    }
    return 'FLINK PRODUCTION GMBH';
  });

  const [consigneeAddress, setConsigneeAddress] = useState(
    'OBERALPSTRASSE 16, CH-7000 CHUR, SWITZERLAND'
  );
  const [attn, setAttn] = useState('WAN LIN');
  const [tel, setTel] = useState('+41 81 511 23 20');
  const [midCode] = useState('IDGAGTAMBSEM');
  const [invoiceNo, setInvoiceNo] = useState(() => {
    const dStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `INV-RND-${dStr}-${itemsToDispatch.length || 1}`;
  });

  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shippingDate, setShippingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromLocation] = useState('Semarang,Indonesia');
  const [paymentBy, setPaymentBy] = useState('SAMPLES OF NO COMMERCIAL VALUE');
  const [shipmentBy, setShipmentBy] = useState('COURIER / AIR FREIGHT');
  const [invoiceValue, setInvoiceValue] = useState('SAMPLES OF NO COMMERCIAL VALUE');

  // Interactive Item Rows in the 12-Column Table
  const [itemRows, setItemRows] = useState(() => {
    return itemsToDispatch.map((it) => {
      const initialQty = Math.max(1, Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1));
      const maxAvailable = Math.max(1, Number(it.jumlah ?? it.qty ?? 1));
      return {
        id: it.id,
        originalItem: it,
        hsCode: it.hsCode || '',
        kode: it.kode || it.sku || '-',
        orderName: it.sampleNo && it.sampleNo !== 'NA' ? it.sampleNo : (it.buyerNo || 'RSD-260022-1'),
        detail: it.category || it.tipe || it.namaBarang || 'SWATCHES MATERIAL',
        style: it.style || it.deskripsi || it.name || '-',
        color: it.color || it.warna || 'Multi Color',
        size: it.size || it.ukuran || 'ONE SIZE',
        qty: Math.min(initialQty, maxAvailable),
        maxQty: maxAvailable,
        unit: it.satuan || 'PCS',
        unitPrice: 1.0,
      };
    });
  });

  // Re-sync item rows if itemsToDispatch changes
  useEffect(() => {
    setItemRows(
      itemsToDispatch.map((it) => {
        const initialQty = Math.max(1, Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1));
        const maxAvailable = Math.max(1, Number(it.jumlah ?? it.qty ?? 1));
        return {
          id: it.id,
          originalItem: it,
          hsCode: it.hsCode || '',
          kode: it.kode || it.sku || '-',
          orderName: it.sampleNo && it.sampleNo !== 'NA' ? it.sampleNo : (it.buyerNo || 'RSD-260022-1'),
          detail: it.category || it.tipe || it.namaBarang || 'SWATCHES MATERIAL',
          style: it.style || it.deskripsi || it.name || '-',
          color: it.color || it.warna || 'Multi Color',
          size: it.size || it.ukuran || 'ONE SIZE',
          qty: Math.min(initialQty, maxAvailable),
          maxQty: maxAvailable,
          unit: it.satuan || 'PCS',
          unitPrice: 1.0,
        };
      })
    );
  }, [itemsToDispatch]);

  // Totals
  const totalPcs = useMemo(() => {
    return itemRows.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
  }, [itemRows]);

  const totalPrice = useMemo(() => {
    const sum = itemRows.reduce((acc, r) => acc + (Number(r.qty) || 0) * (Number(r.unitPrice) || 1), 0);
    return sum.toFixed(2).replace('.', ',');
  }, [itemRows]);

  // Package Specifications
  const [grossWeight, setGrossWeight] = useState('0,54');
  const [netWeight, setNetWeight] = useState('0,34');
  const [packageType, setPackageType] = useState('CARTON'); // 'CARTON' | 'BAG'
  const [cartonSize, setCartonSize] = useState('35 x 25 x 8 cm');

  // Synchronize weight estimations whenever totalPcs changes
  useEffect(() => {
    const count = Math.max(1, totalPcs);
    setGrossWeight((count * 0.27).toFixed(2).replace('.', ','));
    setNetWeight((count * 0.17).toFixed(2).replace('.', ','));
  }, [totalPcs]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Helper row updating
  const handleRowQtyChange = (idx, value) => {
    setItemRows((prev) => {
      const next = [...prev];
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        next[idx] = { ...next[idx], qty: 1 };
      } else {
        const capped = Math.max(1, Math.min(parsed, next[idx].maxQty));
        next[idx] = { ...next[idx], qty: capped };
      }
      return next;
    });
  };

  const handleRowFieldChange = (idx, field, value) => {
    setItemRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // Preset buyer selector helper
  const handleSelectBuyer = (name) => {
    setDestinationId('BUYER');
    setConsigneeName(name);
    if (name.toUpperCase().includes('FLINK')) {
      setConsigneeAddress('OBERALPSTRASSE 16, CH-7000 CHUR, SWITZERLAND');
      setAttn('WAN LIN');
      setTel('+41 81 511 23 20');
    } else {
      setConsigneeAddress(`Industrial Park Zone, Destination ${name}`);
      if (attn === 'WAN LIN') setAttn('Receiving Dept / Sample Review');
      if (tel === '+41 81 511 23 20') setTel('-');
    }
  };

  const handleSelectChannel = (channel) => {
    setDestinationId(channel.id);
    if (channel.id !== 'BUYER') {
      setConsigneeName(channel.label);
      setConsigneeAddress(`Divisi ${channel.label}, Head Office / QC Center`);
      setAttn(`PIC ${channel.label}`);
    }
  };

  // Submit dispatch action
  const handleSubmit = async (e, shouldPrintAfter = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (!consigneeName.trim()) {
      setError('Wajib mengisi Nama Buyer / Consignee tujuan pengiriman pada invoice.');
      return;
    }

    if (totalPcs <= 0) {
      setError('Jumlah sampel yang dikirim minimal 1 PCS.');
      return;
    }

    setIsSubmitting(true);
    try {
      let destLabel = consigneeName.trim();
      if (destinationId === 'BUYER') {
        destLabel = `Buyer (${consigneeName.trim()})`;
      }

      for (const row of itemRows) {
        await dispatchItem(row.originalItem, {
          destinationId,
          destinationLabel: destLabel,
          buyerName: consigneeName.trim(),
          type: dispatchType,
          date: shippingDate,
          qty: row.qty,
          recipient: attn.trim(),
          notes: `Invoice: ${invoiceNo} | Style: ${row.style} | Detail: ${row.detail} | ${packageType}: ${cartonSize}`,
        });
      }

      clearDispatchCart();

      if (shouldPrintAfter) {
        window.print();
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      setError(err?.message || 'Gagal memproses pengiriman sampel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    }
    return dStr;
  };

  if (!isOpen || itemsToDispatch.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in font-apple">
      {/* Explicit A4 Landscape Print Directives */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 6mm 8mm !important;
        }
        @media print {
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .dispatch-invoice-sheet {
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="relative w-[98vw] max-w-[1280px] bg-white rounded-[26px] shadow-2xl border border-black/[0.08] overflow-hidden flex flex-col max-h-[96vh]">
        {/* ================================================================= */}
        {/* MODAL HEADER (Screen Only)                                        */}
        {/* ================================================================= */}
        <div className="px-6 py-3.5 bg-[#161618] text-white flex items-center justify-between no-print shrink-0 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0071e3]/20 text-[#2997ff] border border-[#0071e3]/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Form Pengiriman: Invoice &amp; Packing List PT Gagaclo
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Input Dokumen Langsung</span>
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Data yang diinput langsung menjadi invoice &amp; packing list resmi siap cetak PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sifat Pengiriman Segmented Pill */}
            <div className="bg-white/10 p-1 rounded-full flex items-center gap-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setDispatchType('PERMANENT')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  dispatchType === 'PERMANENT'
                    ? 'bg-[#0071e3] text-white shadow-xs font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span>Keluar Permanen</span>
                {dispatchType === 'PERMANENT' && <Check className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => setDispatchType('REVIEW')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  dispatchType === 'REVIEW'
                    ? 'bg-amber-500 text-slate-900 shadow-xs font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span>Review Sementara</span>
                {dispatchType === 'REVIEW' && <Check className="w-3 h-3" />}
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* QUICK HELPER: SALURAN & PILIHAN CEPAT BUYER (Screen Only)         */}
        {/* ================================================================= */}
        <div className="px-6 py-2.5 bg-[#f5f5f7] border-b border-black/[0.06] text-xs no-print shrink-0 space-y-2">
          {/* Channel Destination Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Tujuan:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {DISPATCH_DESTINATIONS.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => handleSelectChannel(dest)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                    destinationId === dest.id
                      ? 'bg-[#1d1d1f] text-white shadow-2xs'
                      : 'bg-white text-[#1d1d1f] border border-black/[0.08] hover:bg-black/[0.04]'
                  }`}
                >
                  {dest.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Buyer Chips (Available when BUYER is active) */}
          {destinationId === 'BUYER' && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                Pilihan Cepat Buyer:
              </span>
              <div className="flex items-center gap-1 flex-wrap max-h-16 overflow-y-auto">
                {buyerList.map((bName) => (
                  <button
                    key={bName}
                    type="button"
                    onClick={() => handleSelectBuyer(bName)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${
                      consigneeName.toUpperCase() === bName.toUpperCase()
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    {bName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert Bar */}
        {error && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 no-print shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* DOCUMENT VIEW: WYSIWYG EDITABLE INVOICE & PACKING LIST (A4 LANDSCAPE) */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6 printable-area flex justify-center">
          <div className="dispatch-invoice-sheet w-[280mm] max-w-full min-h-[195mm] bg-white text-black p-5 sm:p-7 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0 font-sans text-xs">
            {/* The Black Outer Box */}
            <div className="border border-black">
              {/* Header 1: Company Info */}
              <div className="text-center py-2 px-4 border-b border-black">
                <h1 className="text-sm font-bold tracking-wide uppercase">PT GAGACLO</h1>
                <p className="text-[11px] italic mt-0.5 leading-tight">
                  Jl. Tambak Aji Timur No 1 Ngaliyan Semarang Tel: 0062-24-8661188 Email : zuniarto@gagaclo.com
                </p>
                <h2 className="text-xs font-bold uppercase tracking-wider mt-1">INVOICE &amp; PACKING LIST</h2>
                <h3 className="text-xs font-bold uppercase tracking-wider mt-0.5">SENDING INFO REFERENCE</h3>
              </div>

              {/* Header 2: Consignee / Buyer Live Inputs */}
              <div className="text-center py-2 px-4 border-b border-black space-y-1 bg-amber-50/20 print:bg-white">
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={consigneeName}
                    onChange={(e) => setConsigneeName(e.target.value.toUpperCase())}
                    placeholder="NAMA BUYER / CONSIGNEE..."
                    className="font-bold uppercase text-xs text-center w-full max-w-md border-b border-dashed border-black/30 hover:border-black focus:border-black focus:outline-none focus:bg-amber-100/60 py-0.5 transition"
                    title="Ketik atau pilih Nama Buyer dari baris tombol di atas"
                  />
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px]">
                  <span className="font-semibold text-slate-600 print:text-black">Address:</span>
                  <input
                    type="text"
                    value={consigneeAddress}
                    onChange={(e) => setConsigneeAddress(e.target.value)}
                    placeholder="Alamat lengkap tujuan..."
                    className="text-[11px] text-center w-full max-w-lg border-b border-dashed border-black/30 hover:border-black focus:border-black focus:outline-none focus:bg-amber-100/60 py-0.5 transition"
                  />
                </div>
                <div className="flex items-center justify-center gap-4 text-[11px] flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-600 print:text-black">ATTN:</span>
                    <input
                      type="text"
                      value={attn}
                      onChange={(e) => setAttn(e.target.value)}
                      placeholder="Nama Penerima (WAN LIN)..."
                      className="text-[11px] font-semibold text-center w-40 border-b border-dashed border-black/30 hover:border-black focus:border-black focus:outline-none focus:bg-amber-100/60 py-0.5 transition"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-600 print:text-black">TEL:</span>
                    <input
                      type="text"
                      value={tel}
                      onChange={(e) => setTel(e.target.value)}
                      placeholder="Nomor Telepon..."
                      className="text-[11px] text-center w-36 border-b border-dashed border-black/30 hover:border-black focus:border-black focus:outline-none focus:bg-amber-100/60 py-0.5 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Metadata Key-Value Table */}
              <div className="border-b border-black text-[11px]">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="w-[32%] py-1 px-3 font-bold border-r border-black uppercase">MID CODE :</td>
                      <td className="py-1 px-3 font-semibold uppercase">{midCode}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Invoice No :</td>
                      <td className="py-0.5 px-3">
                        <input
                          type="text"
                          value={invoiceNo}
                          onChange={(e) => setInvoiceNo(e.target.value)}
                          className="w-full font-mono text-[11px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Date :</td>
                      <td className="py-0.5 px-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={docDate}
                            onChange={(e) => setDocDate(e.target.value)}
                            className="text-[11px] bg-transparent focus:outline-none no-print"
                          />
                          <span className="font-medium print:inline hidden">{formatDateDisplay(docDate)}</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">SHIP TO (Company Name. Adress):</td>
                      <td className="py-1 px-3 font-medium">{consigneeName}. {consigneeAddress}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">ATTN :</td>
                      <td className="py-1 px-3 font-medium">{attn}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Order no. :</td>
                      <td className="py-1 px-3 font-mono">
                        {itemRows.map((r) => r.orderName).filter((n) => n && n !== '-').join(', ') || '-'}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Payment by :</td>
                      <td className="py-0.5 px-3">
                        <input
                          type="text"
                          value={paymentBy}
                          onChange={(e) => setPaymentBy(e.target.value)}
                          className="w-full text-[11px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5 uppercase"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Shipment by :</td>
                      <td className="py-0.5 px-3">
                        <input
                          type="text"
                          value={shipmentBy}
                          onChange={(e) => setShipmentBy(e.target.value)}
                          className="w-full text-[11px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5 uppercase"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Invoice value :</td>
                      <td className="py-0.5 px-3">
                        <input
                          type="text"
                          value={invoiceValue}
                          onChange={(e) => setInvoiceValue(e.target.value)}
                          className="w-full text-[11px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5 uppercase font-medium"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black">Shipping Date :</td>
                      <td className="py-0.5 px-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={shippingDate}
                            onChange={(e) => setShippingDate(e.target.value)}
                            className="text-[11px] bg-transparent focus:outline-none no-print"
                          />
                          <span className="font-medium print:inline hidden">{formatDateDisplay(shippingDate)}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3 font-bold border-r border-black">From :</td>
                      <td className="py-1 px-3">{fromLocation}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table: 12 Columns Items List (Direct Interactive Input Grid) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="border-b border-black font-bold text-center bg-slate-50 print:bg-white">
                      <th className="py-1.5 px-1.5 border-r border-black w-8">No</th>
                      <th className="py-1.5 px-1.5 border-r border-black w-20">HS CODE</th>
                      <th className="py-1.5 px-2 border-r border-black">ITEM NO.</th>
                      <th className="py-1.5 px-2 border-r border-black">ORDER NAME</th>
                      <th className="py-1.5 px-2 border-r border-black">DETAIL</th>
                      <th className="py-1.5 px-2 border-r border-black">STYLE</th>
                      <th className="py-1.5 px-2 border-r border-black">COLOR</th>
                      <th className="py-1.5 px-2 border-r border-black">SIZE</th>
                      <th className="py-1.5 px-2 border-r border-black w-20">AMOUNT</th>
                      <th className="py-1.5 px-1.5 border-r border-black w-12">UNIT</th>
                      <th className="py-1.5 px-1.5 border-r border-black w-16">UNIT PRICE</th>
                      <th className="py-1.5 px-2 w-16">TOTAL PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((row, idx) => {
                      const itemTotalPrice = (row.qty * Number(row.unitPrice || 1)).toFixed(2).replace('.', ',');

                      return (
                        <tr key={row.id || idx} className="border-b border-black hover:bg-blue-50/20 print:bg-white">
                          {/* 1. No */}
                          <td className="py-1 px-1.5 border-r border-black text-center font-bold text-slate-600 print:text-black">
                            {idx + 1}
                          </td>

                          {/* 2. HS CODE */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.hsCode}
                              onChange={(e) => handleRowFieldChange(idx, 'hsCode', e.target.value)}
                              placeholder="-"
                              className="w-full text-center font-mono text-[10px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                            />
                          </td>

                          {/* 3. ITEM NO. */}
                          <td className="py-1 px-2 border-r border-black font-mono font-bold text-center text-[#0071e3] print:text-black">
                            {row.kode}
                          </td>

                          {/* 4. ORDER NAME */}
                          <td className="py-0.5 px-1.5 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.orderName}
                              onChange={(e) => handleRowFieldChange(idx, 'orderName', e.target.value)}
                              className="w-full text-center font-mono text-[10px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                            />
                          </td>

                          {/* 5. DETAIL */}
                          <td className="py-0.5 px-1.5 border-r border-black">
                            <input
                              type="text"
                              value={row.detail}
                              onChange={(e) => handleRowFieldChange(idx, 'detail', e.target.value.toUpperCase())}
                              className="w-full text-[10px] uppercase bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                            />
                          </td>

                          {/* 6. STYLE */}
                          <td className="py-0.5 px-1.5 border-r border-black">
                            <input
                              type="text"
                              value={row.style}
                              onChange={(e) => handleRowFieldChange(idx, 'style', e.target.value)}
                              className="w-full text-[10px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                            />
                          </td>

                          {/* 7. COLOR */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.color}
                              onChange={(e) => handleRowFieldChange(idx, 'color', e.target.value)}
                              className="w-full text-center text-[10px] uppercase bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                            />
                          </td>

                          {/* 8. SIZE */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.size}
                              onChange={(e) => handleRowFieldChange(idx, 'size', e.target.value.toUpperCase())}
                              className="w-full text-center text-[10px] uppercase font-bold bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                            />
                          </td>

                          {/* 9. AMOUNT (Input Qty with Stock Cap) */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={row.maxQty}
                                value={row.qty}
                                onChange={(e) => handleRowQtyChange(idx, e.target.value)}
                                className="w-12 text-center font-bold font-mono text-[11px] bg-amber-50 print:bg-transparent border border-amber-300 print:border-none rounded focus:outline-none focus:ring-1 focus:ring-amber-500 py-0.5"
                                title={`Stok tersedia di box: ${row.maxQty} PCS`}
                              />
                              <span className="text-[9px] text-[#86868b] no-print">/{row.maxQty}</span>
                            </div>
                          </td>

                          {/* 10. UNIT */}
                          <td className="py-1 px-1.5 border-r border-black text-center uppercase font-medium">
                            {row.unit}
                          </td>

                          {/* 11. UNIT PRICE */}
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            <div className="flex items-center justify-end font-mono">
                              <span className="text-slate-400 print:text-black">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={row.unitPrice}
                                onChange={(e) => handleRowFieldChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-12 text-right font-mono text-[10px] bg-transparent focus:outline-none focus:bg-amber-100/50 py-0.5"
                              />
                            </div>
                          </td>

                          {/* 12. TOTAL PRICE */}
                          <td className="py-1 px-2 text-right font-mono font-bold">
                            ${itemTotalPrice}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="border-b border-black font-bold bg-slate-50/50 print:bg-white">
                      <td colSpan={8} className="py-1.5 px-2 border-r border-black text-right uppercase tracking-wider text-[10px] text-slate-500 print:text-black">
                        Total Amount:
                      </td>
                      <td className="py-1.5 px-2 border-r border-black text-center font-bold font-mono text-xs text-[#0071e3] print:text-black">
                        {totalPcs}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black text-center">PCS</td>
                      <td className="py-1.5 px-2 border-r border-black text-right"></td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-xs">
                        ${totalPrice}
                      </td>
                    </tr>

                    {/* Gross & Net Weight Row */}
                    <tr className="border-b border-black font-bold">
                      <td colSpan={6} className="py-1 px-3 border-r border-black">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={grossWeight}
                            onChange={(e) => setGrossWeight(e.target.value)}
                            className="w-16 font-bold bg-transparent border-b border-dashed border-black/30 focus:outline-none focus:bg-amber-100/50 text-[11px]"
                          />
                          <span>KG (GROSS WEIGHT)</span>
                        </div>
                      </td>
                      <td colSpan={6} className="py-1 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            value={netWeight}
                            onChange={(e) => setNetWeight(e.target.value)}
                            className="w-16 text-right font-bold bg-transparent border-b border-dashed border-black/30 focus:outline-none focus:bg-amber-100/50 text-[11px]"
                          />
                          <span>KG (NET WEIGHT)</span>
                        </div>
                      </td>
                    </tr>

                    {/* Package Type (CARTON / BAG) & Dimension Adjustment Row */}
                    <tr className="border-b border-black">
                      <td colSpan={6} className="py-2 px-3 border-r border-black font-bold align-middle">
                        <div className="flex items-center justify-between gap-2">
                          {/* Print text */}
                          <span className="print:inline hidden font-bold text-xs uppercase">{packageType}</span>

                          {/* Screen interactive selector */}
                          <div className="no-print flex items-center gap-1 bg-black/[0.04] p-1 rounded-lg border border-black/[0.08]">
                            <span className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold mr-1">Kemasan:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPackageType('CARTON');
                                if (cartonSize.includes('20 x 5') || cartonSize.includes('18 x 3')) {
                                  setCartonSize('35 x 25 x 8 cm');
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                                packageType === 'CARTON'
                                  ? 'bg-[#1d1d1f] text-white shadow-2xs'
                                  : 'text-[#1d1d1f] hover:bg-white'
                              }`}
                            >
                              📦 CARTON
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPackageType('BAG');
                                if (cartonSize.includes('35 x 25 x 8') || cartonSize.includes('40 x 30 x 15')) {
                                  setCartonSize('30 x 20 x 5 cm');
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                                packageType === 'BAG'
                                  ? 'bg-[#1d1d1f] text-white shadow-2xs'
                                  : 'text-[#1d1d1f] hover:bg-white'
                              }`}
                            >
                              🛍️ BAG
                            </button>
                          </div>
                        </div>
                      </td>
                      <td colSpan={6} className="py-2 px-3 text-center align-middle">
                        <div className="font-bold text-[11px]">
                          ⬇ {packageType} SIZE ⬇
                        </div>
                        <div className="mt-0.5">
                          <input
                            type="text"
                            value={cartonSize}
                            onChange={(e) => setCartonSize(e.target.value)}
                            placeholder={packageType === 'CARTON' ? '35 x 25 x 8 cm' : '30 x 20 x 5 cm'}
                            className="font-semibold text-center w-full max-w-xs bg-transparent border-b border-dashed border-black/30 hover:border-black focus:border-black focus:outline-none focus:bg-amber-100/50 text-xs py-0.5 print:border-none"
                            title="Ketik dimensi ukuran kemasan (Panjang x Lebar x Tinggi)"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Samples of No Commercial Value Banner */}
                    <tr>
                      <td colSpan={12} className="py-1.5 px-3 font-bold text-xs uppercase text-center sm:text-left">
                        SAMPLES OF NO COMMERCIAL VALUE
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS (Apple Style - Hidden in Print)                    */}
        {/* ================================================================= */}
        <div className="px-6 py-3.5 bg-[#fbfbfd] border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="text-xs text-[#86868b] flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              PIC Pengirim: <strong className="text-[#1d1d1f] font-semibold">{currentUser?.name || singleItem?.picName || 'Royan'}</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              Stok Box #{singleItem?.boxNumber || '-'} akan otomatis berkurang sebanyak <strong>{totalPcs} PCS</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs transition cursor-pointer"
            >
              Batal
            </button>

            {/* Print Directly */}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Cetak format invoice & packing list ini ke printer / PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Cetak Dokumen Saja</span>
            </button>

            {/* Save & Print PDF */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 rounded-full bg-[#5856d6] hover:bg-[#4b49b8] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Simpan pengiriman ke sistem database dan langsung buka dialog cetak PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Kirim &amp; Cetak PDF</span>
            </button>

            {/* Confirm Dispatch Only */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, false)}
              className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Kirim Sampel'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchModal;
