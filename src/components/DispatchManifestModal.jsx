import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  SlidersHorizontal,
  Building2,
  User,
} from 'lucide-react';
import { decodeDispatchData } from '../utils/dispatchUtils';

export function DispatchManifestModal({ isOpen, onClose, items = [], initialConfig = null }) {
  const safeItems = Array.isArray(items) ? items : [];
  const firstItem = safeItems[0] || null;
  const firstDispatch = useMemo(() => (firstItem ? decodeDispatchData(firstItem) : null), [firstItem]);

  // Extract initial values from web dispatch data
  const defaultBuyer = useMemo(() => {
    if (initialConfig?.buyerName) return initialConfig.buyerName;
    if (firstDispatch?.buyerName) return firstDispatch.buyerName;
    if (firstItem?.buyerNo && firstItem.buyerNo !== 'NA' && firstItem.buyerNo !== '-') {
      return String(firstItem.buyerNo).trim().toUpperCase();
    }
    const dest = firstDispatch?.destinationLabel || '';
    if (dest.includes('Buyer')) {
      const match = dest.match(/\(([^)]+)\)/);
      if (match) return match[1];
    }
    return dest && dest !== 'Lainnya' ? dest : 'FLINK PRODUCTION GMBH';
  }, [firstDispatch, firstItem, initialConfig]);

  const defaultDate = useMemo(() => {
    return initialConfig?.date || firstDispatch?.date || new Date().toISOString().split('T')[0];
  }, [firstDispatch, initialConfig]);

  const defaultOrderNo = useMemo(() => {
    return (
      safeItems
        .map((it) => it.sampleNo || it.buyerNo || it.orderName)
        .filter((n) => n && n !== 'NA' && n !== '-')
        .join(', ') || 'RSD-260022-1'
    );
  }, [safeItems]);

  const totalPcs = useMemo(() => {
    return safeItems.reduce((acc, it) => acc + Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1), 0);
  }, [safeItems]);

  // Document format toggle: 'invoice' (PDF Standar Image 2) vs 'surat-jalan' (Internal Domestic)
  const [docFormat, setDocFormat] = useState('invoice');
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields with smart defaults matching the PDF
  const [consigneeName, setConsigneeName] = useState(() => defaultBuyer);
  const [consigneeAddress, setConsigneeAddress] = useState(() => {
    if (String(defaultBuyer).toUpperCase().includes('FLINK')) {
      return 'OBERALPSTRASSE 16, CH-7000 CHUR, SWITZERLAND';
    }
    return 'Industrial Zone, Consignee Destination Area';
  });
  const [attn, setAttn] = useState(() => firstDispatch?.recipient || 'WAN LIN');
  const [tel, setTel] = useState(() => {
    if (String(defaultBuyer).toUpperCase().includes('FLINK')) return '+41 81 511 23 20';
    return '-';
  });
  const [midCode, setMidCode] = useState('IDGAGTAMBSEM');
  const [invoiceNo, setInvoiceNo] = useState(() => {
    const cleanDate = String(defaultDate).replace(/[-/]/g, '');
    return `INV-RND-${cleanDate}-${safeItems.length || 1}`;
  });
  const [docDate, setDocDate] = useState(() => defaultDate);
  const [shippingDate, setShippingDate] = useState(() => defaultDate);
  const [fromLocation, setFromLocation] = useState('Semarang,Indonesia');
  const [orderNo, setOrderNo] = useState(() => defaultOrderNo);
  const [paymentBy, setPaymentBy] = useState('SAMPLES OF NO COMMERCIAL VALUE');
  const [shipmentBy, setShipmentBy] = useState('COURIER / AIR FREIGHT');
  const [invoiceValue, setInvoiceValue] = useState('SAMPLES OF NO COMMERCIAL VALUE');

  // Package Specifications
  const [grossWeight, setGrossWeight] = useState(() => {
    const calculated = (Math.max(1, totalPcs) * 0.27).toFixed(2);
    return calculated.replace('.', ',');
  });
  const [netWeight, setNetWeight] = useState(() => {
    const calculated = (Math.max(1, totalPcs) * 0.17).toFixed(2);
    return calculated.replace('.', ',');
  });
  const [cartonSize, setCartonSize] = useState('35 x 25 x 8 cm');
  const [unitPrice, setUnitPrice] = useState(1.0);

  const totalPrice = useMemo(() => {
    return (totalPcs * Number(unitPrice || 1)).toFixed(2).replace('.', ',');
  }, [totalPcs, unitPrice]);

  const handlePrint = () => {
    window.print();
  };

  // Helper formatting date for display: DD/MM/YYYY
  const formatDateDisplay = (dStr) => {
    if (!dStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    }
    return dStr;
  };

  if (!isOpen || safeItems.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-apple">
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
        {/* HEADER TOOLBAR (Screen Only - Hidden in Print)                    */}
        {/* ================================================================= */}
        <div className="px-6 py-3.5 bg-[#161618] text-white flex items-center justify-between no-print shrink-0 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Invoice &amp; Packing List Ekspor / Sampel PT Gagaclo
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Standar PDF Resmi
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Sesuai template Sending Info Reference PT Gagaclo • {safeItems.length} item ({totalPcs} PCS)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher Pill */}
            <div className="bg-white/10 p-1 rounded-full flex items-center gap-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setDocFormat('invoice')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  docFormat === 'invoice'
                    ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Invoice &amp; Packing List
              </button>
              <button
                type="button"
                onClick={() => setDocFormat('surat-jalan')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  docFormat === 'surat-jalan'
                    ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Surat Jalan R&amp;D
              </button>
            </div>

            {/* Edit Controls Toggle */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                isEditing
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  : 'bg-white/10 hover:bg-white/15 text-white/90 border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Tutup Pengaturan' : 'Ubah Data Info'}</span>
            </button>

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print PDF</span>
            </button>

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
        {/* QUICK EDIT DRAWER (Screen Only)                                   */}
        {/* ================================================================= */}
        {isEditing && (
          <div className="bg-[#f5f5f7] border-b border-black/[0.08] p-4 text-xs no-print shrink-0 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1d1d1f]">Pengaturan Data Invoice &amp; Packing List:</span>
              <span className="text-[11px] text-[#86868b]">
                Perubahan langsung diterapkan pada tampilan cetak di bawah
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">No. Invoice</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Nama Buyer / Consignee</label>
                <input
                  type="text"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Alamat Buyer / Tujuan</label>
                <input
                  type="text"
                  value={consigneeAddress}
                  onChange={(e) => setConsigneeAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">ATTN (Penerima)</label>
                <input
                  type="text"
                  value={attn}
                  onChange={(e) => setAttn(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">TEL (Telepon)</label>
                <input
                  type="text"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">MID CODE</label>
                <input
                  type="text"
                  value={midCode}
                  onChange={(e) => setMidCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Tgl Dokumen</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Shipping Date</label>
                <input
                  type="date"
                  value={shippingDate}
                  onChange={(e) => setShippingDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">From Location</label>
                <input
                  type="text"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Gross Weight (KG)</label>
                <input
                  type="text"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Net Weight (KG)</label>
                <input
                  type="text"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Carton Size</label>
                <input
                  type="text"
                  value={cartonSize}
                  onChange={(e) => setCartonSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Payment By</label>
                <input
                  type="text"
                  value={paymentBy}
                  onChange={(e) => setPaymentBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Shipment By</label>
                <input
                  type="text"
                  value={shipmentBy}
                  onChange={(e) => setShipmentBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Invoice Value</label>
                <input
                  type="text"
                  value={invoiceValue}
                  onChange={(e) => setInvoiceValue(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Order No.</label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* DOCUMENT PREVIEW & PRINTABLE AREA                                 */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 printable-area flex justify-center">
          {docFormat === 'invoice' ? (
            /* =============================================================== */
            /* FORMAT 1: INVOICE & PACKING LIST (EXACT IMAGE 2 PDF LAYOUT)     */
            /* =============================================================== */
            <div className="dispatch-invoice-sheet w-[280mm] max-w-full min-h-[195mm] bg-white text-black p-5 sm:p-7 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0 font-sans text-xs">
              {/* Outer Border Box */}
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

                {/* Header 2: Consignee / Buyer Info */}
                <div className="text-center py-2 px-4 border-b border-black space-y-0.5">
                  <div className="font-bold uppercase text-xs">{consigneeName}</div>
                  <div className="text-[11px]">Address: {consigneeAddress}</div>
                  <div className="text-[11px] font-semibold">ATTN: {attn}</div>
                  <div className="text-[11px]">TEL: {tel}</div>
                </div>

                {/* Metadata Grid Table */}
                <div className="border-b border-black text-[11px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="w-[32%] py-1 px-3 font-bold border-r border-black uppercase">MID CODE :</td>
                        <td className="py-1 px-3 font-semibold uppercase">{midCode}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-1 px-3 font-bold border-r border-black">Invoice No :</td>
                        <td className="py-1 px-3">{invoiceNo}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-1 px-3 font-bold border-r border-black">Date :</td>
                        <td className="py-1 px-3">{formatDateDisplay(docDate)}</td>
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
                        <td className="py-1 px-3 font-mono">{orderNo}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-1 px-3 font-bold border-r border-black">Payment by :</td>
                        <td className="py-1 px-3 uppercase">{paymentBy}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-1 px-3 font-bold border-r border-black">Shipment by :</td>
                        <td className="py-1 px-3 uppercase">{shipmentBy}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-1 px-3 font-bold border-r border-black">Invoice value :</td>
                        <td className="py-1 px-3 uppercase font-medium">{invoiceValue}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="py-1 px-3 font-bold border-r border-black">Shipping Date :</td>
                        <td className="py-1 px-3">{formatDateDisplay(shippingDate)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-3 font-bold border-r border-black">From :</td>
                        <td className="py-1 px-3">{fromLocation}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table: 12 Columns Items List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                      <tr className="border-b border-black font-bold text-center">
                        <th className="py-1.5 px-2 border-r border-black w-8">No</th>
                        <th className="py-1.5 px-2 border-r border-black w-20">HS CODE</th>
                        <th className="py-1.5 px-2 border-r border-black">ITEM NO.</th>
                        <th className="py-1.5 px-2 border-r border-black">ORDER NAME</th>
                        <th className="py-1.5 px-2 border-r border-black">DETAIL</th>
                        <th className="py-1.5 px-2 border-r border-black">STYLE</th>
                        <th className="py-1.5 px-2 border-r border-black">COLOR</th>
                        <th className="py-1.5 px-2 border-r border-black">SIZE</th>
                        <th className="py-1.5 px-2 border-r border-black w-14">AMOUNT</th>
                        <th className="py-1.5 px-2 border-r border-black w-12">UNIT</th>
                        <th className="py-1.5 px-2 border-r border-black w-16">UNIT PRICE</th>
                        <th className="py-1.5 px-2 w-16">TOTAL PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeItems.map((it, idx) => {
                        const itemQty = Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1);
                        const itemTotalPrice = (itemQty * Number(unitPrice || 1)).toFixed(2).replace('.', ',');
                        const detailStr = it.category || it.tipe || it.namaBarang || 'SWATCHES MATERIAL';
                        const styleStr = it.style || it.deskripsi || it.name || '-';
                        const orderNameStr = it.sampleNo && it.sampleNo !== 'NA' ? it.sampleNo : (it.buyerNo || orderNo || '-');

                        return (
                          <tr key={it.id || idx} className="border-b border-black">
                            <td className="py-1 px-2 border-r border-black text-center">{idx + 1}</td>
                            <td className="py-1 px-2 border-r border-black text-center font-mono">{it.hsCode || ''}</td>
                            <td className="py-1 px-2 border-r border-black font-mono font-bold text-center">
                              {it.kode || it.sku || '-'}
                            </td>
                            <td className="py-1 px-2 border-r border-black font-mono text-center">{orderNameStr}</td>
                            <td className="py-1 px-2 border-r border-black uppercase">{detailStr}</td>
                            <td className="py-1 px-2 border-r border-black">{styleStr}</td>
                            <td className="py-1 px-2 border-r border-black text-center uppercase">{it.color || 'Multi Color'}</td>
                            <td className="py-1 px-2 border-r border-black text-center uppercase">{it.size || 'ONE SIZE'}</td>
                            <td className="py-1 px-2 border-r border-black text-center font-bold">{itemQty}</td>
                            <td className="py-1 px-2 border-r border-black text-center uppercase">{it.satuan || 'PCS'}</td>
                            <td className="py-1 px-2 border-r border-black text-right font-mono">${Number(unitPrice || 1).toFixed(2).replace('.', ',')}</td>
                            <td className="py-1 px-2 text-right font-mono">${itemTotalPrice}</td>
                          </tr>
                        );
                      })}

                      {/* Total Row */}
                      <tr className="border-b border-black font-bold">
                        <td colSpan={8} className="py-1.5 px-2 border-r border-black text-right"></td>
                        <td className="py-1.5 px-2 border-r border-black text-center">{totalPcs}</td>
                        <td className="py-1.5 px-2 border-r border-black text-center">PCS</td>
                        <td className="py-1.5 px-2 border-r border-black text-right"></td>
                        <td className="py-1.5 px-2 text-right font-mono">${totalPrice}</td>
                      </tr>

                      {/* Gross & Net Weight Row */}
                      <tr className="border-b border-black font-bold">
                        <td colSpan={6} className="py-1.5 px-3 border-r border-black">
                          {grossWeight} KG (GROSS WEIGHT)
                        </td>
                        <td colSpan={6} className="py-1.5 px-3 text-right">
                          {netWeight} KG (NET WEIGHT)
                        </td>
                      </tr>

                      {/* Carton Row */}
                      <tr className="border-b border-black">
                        <td colSpan={6} className="py-2 px-3 border-r border-black font-bold align-middle">
                          CARTON
                        </td>
                        <td colSpan={6} className="py-2 px-3 text-center align-middle">
                          <div className="font-bold">⬇ CARTON SIZE ⬇</div>
                          <div className="font-semibold text-xs mt-0.5">{cartonSize}</div>
                        </td>
                      </tr>

                      {/* Samples of No Commercial Value Banner */}
                      <tr>
                        <td colSpan={12} className="py-1.5 px-3 font-bold text-xs uppercase">
                          SAMPLES OF NO COMMERCIAL VALUE
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* FORMAT 2: SURAT JALAN & TANDA TERIMA R&D (DOMESTIK / INTERNAL)   */
            /* =============================================================== */
            <div className="w-full max-w-4xl bg-white text-slate-900 p-6 sm:p-8 space-y-6 border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0">
              {/* Header Surat */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-slate-900">
                      GAGACLO <span className="text-blue-600">R&amp;D</span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      Sample &amp; Material Studio
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    SURAT JALAN &amp; TANDA TERIMA PENGIRIMAN SAMPEL
                  </p>
                  <p className="text-xs text-slate-500">
                    Divisi Research &amp; Development (R&amp;D), PT. Gagaclo Internasional
                  </p>
                </div>

                <div className="text-left sm:text-right font-mono text-xs space-y-1">
                  <div>
                    <span className="text-slate-500">No. Surat: </span>
                    <strong className="text-slate-900">{invoiceNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Tanggal: </span>
                    <strong>{formatDateDisplay(docDate)}</strong>
                  </div>
                </div>
              </div>

              {/* Meta Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tujuan Pengiriman:</div>
                  <div className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{consigneeName}</span>
                  </div>
                  <div className="text-slate-600 pt-0.5">
                    Penerima / Referensi: <strong>{attn}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">PIC Pengirim (R&amp;D):</div>
                  <div className="text-base font-black text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>{firstDispatch?.pic || 'Royan'}</span>
                  </div>
                  <div className="text-slate-600 pt-0.5">
                    Total Muatan: <strong>{safeItems.length} Item ({totalPcs} PCS)</strong>
                  </div>
                </div>
              </div>

              {/* Table List of Items */}
              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-xs tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">Kode Sample</th>
                      <th className="py-2.5 px-3">Style / Deskripsi</th>
                      <th className="py-2.5 px-2 text-center">No. Sample</th>
                      <th className="py-2.5 px-2 text-center">Size</th>
                      <th className="py-2.5 px-2 text-center">Color</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-center">Sifat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {safeItems.map((it, idx) => {
                      const itDispatch = decodeDispatchData(it);
                      const isPermanent = itDispatch?.type === 'PERMANENT';
                      return (
                        <tr key={it.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{it.kode || it.sku || '-'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {it.style || it.name || it.deskripsi || '-'}
                            {itDispatch?.originBox && (
                              <span className="block text-xs font-normal text-slate-500">
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
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
                                isPermanent
                                  ? 'bg-slate-800 text-white'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {isPermanent ? 'Permanen' : 'Review'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-xs tracking-wider">
                        Total Keseluruhan Sampel:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-blue-800">
                        {totalPcs} PCS
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">({safeItems.length} item)</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Kolom Tanda Tangan */}
              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
                <div className="flex flex-col justify-between h-32 border border-slate-200 rounded-xl p-3 bg-white">
                  <span className="font-bold text-slate-700 text-xs">Yang Menyerahkan (R&amp;D)</span>
                  <div>
                    <div className="font-bold text-slate-900 border-b border-slate-400 mx-4 pb-1">
                      ( {firstDispatch?.pic || 'Royan'} )
                    </div>
                    <div className="text-xs text-slate-500 mt-1">PIC Sample Studio</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-32 border border-slate-200 rounded-xl p-3 bg-white">
                  <span className="font-bold text-slate-700 text-xs">Yang Membawa (Driver/Kurir)</span>
                  <div>
                    <div className="font-bold text-slate-900 border-b border-slate-400 mx-4 pb-1">
                      ( ..................................... )
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Ekspedisi / Internal</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-32 border border-slate-200 rounded-xl p-3 bg-white">
                  <span className="font-bold text-slate-700 text-xs">Yang Menerima ({consigneeName})</span>
                  <div>
                    <div className="font-bold text-slate-900 border-b border-slate-400 mx-4 pb-1">
                      ( {attn !== '-' ? attn : '.....................................'} )
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Nama Jelas &amp; Cap</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DispatchManifestModal;
