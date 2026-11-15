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
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { DISPATCH_DESTINATIONS, parseSendingInfoText, exportInvoiceToExcel, encodeDispatchTags } from '../utils/dispatchUtils';

export function DispatchModal({ isOpen, onClose, item, preselectedItems = [] }) {
  const { dispatchItem, currentUser, suggestions, items: allItems, clearDispatchCart, addItem } = useInventory();

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
    return '';
  });

  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [attn, setAttn] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [sendingInfoText, setSendingInfoText] = useState('');

  const midCode = 'IDGAGTAMBSEM';
  const [invoiceNo, setInvoiceNo] = useState('');

  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shippingDate, setShippingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const fromLocation = 'SEMARANG, INDONESIA';
  const [paymentBy, setPaymentBy] = useState('');
  const [courierName, setCourierName] = useState('');
  const [courierAccount, setCourierAccount] = useState('');
  const [shipmentBy, setShipmentBy] = useState('');
  const invoiceValue = 'USD';

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

    if (itemsToDispatch.length > 0) {
      const first = itemsToDispatch[0];
      if (first?.buyerNo && first.buyerNo !== 'NA' && first.buyerNo !== '-') {
        setConsigneeName(String(first.buyerNo).trim().toUpperCase());
      }
    }
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
  const [packageType, setPackageType] = useState('CARTON'); // 'CARTON' | 'BAG'
  const [netWeight, setNetWeight] = useState('0,17');
  const [grossWeight, setGrossWeight] = useState('1,17'); // Untuk CARTON: GW = NW + 1
  const [cartonSize, setCartonSize] = useState('35 x 25 x 8 cm');

  const updateWeights = (nwVal, type = packageType) => {
    const rawStr = String(nwVal || '').replace(',', '.');
    const num = parseFloat(rawStr);
    if (!isNaN(num)) {
      if (type === 'CARTON') {
        const gw = (num + 1).toFixed(2).replace('.', ',');
        setGrossWeight(gw);
      } else {
        // BAG: NW dan GW sama
        setGrossWeight(String(nwVal));
      }
    }
  };

  const handleNetWeightChange = (val) => {
    setNetWeight(val);
    updateWeights(val, packageType);
  };

  const handlePackageTypeChange = (newType) => {
    setPackageType(newType);
    if (newType === 'CARTON') {
      if (cartonSize.includes('20 x 5') || cartonSize.includes('18 x 3') || cartonSize.includes('30 x 20')) {
        setCartonSize('35 x 25 x 8 cm');
      }
    } else {
      if (cartonSize.includes('35 x 25 x 8') || cartonSize.includes('40 x 30 x 15')) {
        setCartonSize('30 x 20 x 5 cm');
      }
    }
    updateWeights(netWeight, newType);
  };

  // Synchronize weight estimations whenever totalPcs changes
  // Rumus bisnis: Untuk CARTON: GW = NW + 1. Untuk BAG: GW = NW (sama).
  useEffect(() => {
    const count = Math.max(1, totalPcs);
    const nwNum = count * 0.17;
    const nwStr = nwNum.toFixed(2).replace('.', ',');
    setNetWeight(nwStr);
    if (packageType === 'CARTON') {
      setGrossWeight((nwNum + 1).toFixed(2).replace('.', ','));
    } else {
      setGrossWeight(nwStr);
    }
  }, [totalPcs, packageType]);

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
        const capped = Math.max(1, Math.min(parsed, next[idx].maxQty || 9999));
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

  const handleAddManualRow = () => {
    setItemRows((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isManual: true,
        hsCode: '',
        kode: '-',
        orderName: consigneeName ? `${consigneeName}` : 'RSD-MANUAL',
        detail: 'SAMPLE',
        style: '',
        color: 'Multi Color',
        size: 'ONE SIZE',
        qty: 1,
        maxQty: 9999,
        unit: 'PCS',
        unitPrice: 1.0,
      },
    ]);
  };

  const handleRemoveRow = (idx) => {
    if (itemRows.length <= 1) {
      setError('Invoice harus memiliki minimal 1 baris item.');
      return;
    }
    setItemRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handler for free-form multi-line sending info paste / edit
  const handleSendingInfoChange = (val) => {
    const upperVal = String(val || '').toUpperCase();
    setSendingInfoText(upperVal);
    const parsed = parseSendingInfoText(upperVal);
    if (parsed.name) setConsigneeName(parsed.name);
    if (parsed.address) setConsigneeAddress(parsed.address);
    if (parsed.attn) setAttn(parsed.attn);
    if (parsed.email) setEmail(parsed.email);
    if (parsed.tel) setTel(parsed.tel);
    if (parsed.courier) setCourierName(parsed.courier);
    if (parsed.accountNo) setCourierAccount(parsed.accountNo);
  };

  // Preset buyer selector helper
  const handleSelectBuyer = (name) => {
    setDestinationId('BUYER');
    setConsigneeName(name);
  };

  const handleSelectChannel = (channel) => {
    setDestinationId(channel.id);
    if (channel.id !== 'BUYER') {
      setConsigneeName(channel.label);
    }
  };

  // Helper to export current invoice data directly to Excel (.xlsx)
  const handleExportExcelOnly = async () => {
    try {
      await exportInvoiceToExcel({
        invoiceNo,
        shippingDate,
        fromLocation,
        consigneeName,
        consigneeAddress,
        attn,
        tel,
        email,
        paymentBy,
        courierName,
        courierAccount,
        packageType,
        cartonSize,
        netWeight,
        grossWeight,
        itemRows,
        totalPcs,
        totalPrice,
        picName: currentUser?.name || singleItem?.picName || 'Royan',
      });
    } catch (err) {
      console.error('Export Excel error:', err);
      setError('Gagal mengunduh file Excel: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  // Submit dispatch action
  const handleSubmit = async (e, shouldExportExcel = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (!consigneeName.trim()) {
      setError('Wajib mengisi Company Name (Nama Perusahaan / Buyer) pada invoice.');
      return;
    }

    if (!consigneeAddress.trim()) {
      setError('Wajib mengisi Address (Alamat Lengkap Pengiriman) pada invoice.');
      return;
    }

    if (!attn.trim()) {
      setError('Wajib mengisi ATTN Name (Nama Penerima) pada invoice.');
      return;
    }

    if (!email.trim()) {
      setError('Wajib mengisi ATTN Email pada invoice.');
      return;
    }

    if (!paymentBy.trim()) {
      setError('Wajib memilih PAYMENT BY (FREIGHT COLLECT atau SHIPPER PAY).');
      return;
    }

    if (!courierName.trim()) {
      setError('Wajib memilih Nama Kurir (Express / Economy) pada baris Shipment By.');
      return;
    }

    if (!courierAccount.trim()) {
      setError('Wajib mengisi Account No kurir pada baris Shipment By.');
      return;
    }

    if (!packageType || !packageType.trim()) {
      setError('Wajib memilih jenis kemasan (CARTON atau BAG).');
      return;
    }

    if (!cartonSize.trim()) {
      setError(`Wajib mengisi ${packageType === 'CARTON' ? 'Carton' : 'Bag'} Dimension (dimensi kemasan).`);
      return;
    }

    const nwNum = parseFloat(String(netWeight).replace(',', '.'));
    if (!netWeight || !String(netWeight).trim() || isNaN(nwNum) || nwNum <= 0) {
      setError('Wajib mengisi Net Weight (NET WEIGHT).');
      return;
    }

    const gwNum = parseFloat(String(grossWeight).replace(',', '.'));
    if (!grossWeight || !String(grossWeight).trim() || isNaN(gwNum) || gwNum <= 0) {
      setError('Wajib mengisi Gross Weight (GROSS WEIGHT).');
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

      const finalInvoiceNo = invoiceNo.trim();
      for (const row of itemRows) {
        if (row.originalItem) {
          await dispatchItem(row.originalItem, {
            destinationId,
            destinationLabel: destLabel,
            buyerName: consigneeName.trim(),
            type: dispatchType,
            date: shippingDate,
            qty: row.qty,
            recipient: attn.trim(),
            invoiceNo: finalInvoiceNo,
            notes: finalInvoiceNo
              ? `Invoice: ${finalInvoiceNo} | Style: ${row.style} | Detail: ${row.detail} | ${packageType}: ${cartonSize}`
              : `Style: ${row.style} | Detail: ${row.detail} | ${packageType}: ${cartonSize}`,
          });
        } else {
          // Manual item dispatch record
          const manualItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const isPermanent = dispatchType === 'PERMANENT';
          const statusText = `Dispatched: ${destLabel} (${isPermanent ? 'Permanen' : 'Review'})`;
          const dispatchTags = encodeDispatchTags({
            destinationId,
            destinationLabel: destLabel,
            type: dispatchType,
            date: shippingDate,
            originBox: 0,
            pic: currentUser?.name || 'R&D Staff',
            recipient: attn.trim(),
            notes: finalInvoiceNo
              ? `Invoice: ${finalInvoiceNo} | Style: ${row.style} | Detail: ${row.detail} | ${packageType}: ${cartonSize}`
              : `Style: ${row.style} | Detail: ${row.detail} | ${packageType}: ${cartonSize}`,
            buyerName: consigneeName.trim(),
            invoiceNo: finalInvoiceNo,
          }, []);

          const dispatchedRecord = {
            id: manualItemId,
            kode: row.kode || 'MANUAL',
            sampleNo: row.orderName || 'MANUAL',
            buyerNo: consigneeName.trim() || 'BUYER',
            category: row.detail || 'SAMPLE',
            tipe: row.detail || 'SAMPLE',
            style: row.style || 'MANUAL ITEM',
            name: row.style || 'MANUAL ITEM',
            deskripsi: row.style || 'MANUAL ITEM',
            color: row.color || 'Multi Color',
            warna: row.color || 'Multi Color',
            size: row.size || 'ONE SIZE',
            ukuran: row.size || 'ONE SIZE',
            jumlah: row.qty,
            qty: row.qty,
            satuan: row.unit || 'PCS',
            boxNumber: 0,
            rackName: 'DISPATCH',
            picName: currentUser?.name || 'R&D Staff',
            hsCode: row.hsCode || '-',
            status: statusText,
            tags: dispatchTags,
            place: `DIKIRIM: ${destLabel} (${isPermanent ? 'Permanen' : 'Review'}) • Item Manual`,
          };
          if (addItem) {
            await addItem(dispatchedRecord);
          }
        }
      }

      clearDispatchCart();

      if (shouldExportExcel) {
        await handleExportExcelOnly();
      }

      onClose();
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
          <div 
            className="dispatch-invoice-sheet w-[280mm] max-w-full min-h-[195mm] bg-white text-black p-4 sm:p-6 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0 text-xs"
            style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
          >
            {/* The Black Outer Box */}
            <div className="border border-black">
              {/* Header 1: Company Info */}
              <div className="text-center py-2 px-4 border-b border-black">
                <h1 className="text-[13px] font-bold tracking-wider uppercase">PT GAGACLO</h1>
                <p className="text-[10px] italic mt-0.5 text-neutral-800 leading-tight">
                  Jl. Tambak Aji Timur No 1 Ngaliyan Semarang Tel: 0062-24-8661188 Email : zuniarto@gagaclo.com
                </p>
                <h2 className="text-[11.5px] font-bold uppercase tracking-widest mt-1">INVOICE &amp; PACKING LIST</h2>
              </div>

              {/* Header 2: Consignee / Buyer Info (Free-form Paste Area) */}
              <div className="relative group text-center py-2 px-4 border-b border-black bg-amber-50/15 hover:bg-amber-50/30 print:bg-white transition">
                <textarea
                  value={sendingInfoText}
                  onChange={(e) => handleSendingInfoChange(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData?.getData('text') || '';
                    if (text) {
                      e.preventDefault();
                      handleSendingInfoChange(text);
                    }
                  }}
                  rows={Math.max(3, sendingInfoText.split('\n').length)}
                  placeholder="TEMPEL / PASTE INFO DI SINI..."
                  className="w-full text-center text-[10.5px] leading-relaxed font-bold uppercase bg-transparent hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 print:focus:ring-0 print:hover:bg-transparent print:focus:bg-transparent border-none outline-none resize-none transition cursor-text p-1 tracking-wide"
                  style={{ fontFamily: 'inherit' }}
                  title="Area untuk paste referensi info pengiriman / alamat tujuan (tekan Ctrl+V)"
                />
                <div className="no-print absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip && clip.trim()) {
                          handleSendingInfoChange(clip.trim());
                        }
                      } catch (err) {
                        console.error('Clipboard paste failed:', err);
                      }
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-[9.5px] font-bold flex items-center gap-1 shadow-sm cursor-pointer transition"
                    title="Paste dari clipboard (Ctrl+V)"
                  >
                    <span>📋 Paste Info</span>
                  </button>
                </div>
              </div>

              {/* Metadata Key-Value Table */}
              <div className="border-b border-black text-[10.5px]">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>MID CODE</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="py-1 px-3 text-left font-bold text-[10.5px] uppercase tracking-tight select-all">
                        {midCode}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>INVOICE NO</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="p-0 text-left">
                        <input
                          type="text"
                          value={invoiceNo}
                          onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
                          placeholder=""
                          className="w-full h-full block font-mono font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 print:focus:ring-0 print:hover:bg-transparent print:focus:bg-transparent tracking-tight cursor-text transition-colors"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>DATE</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="py-1 px-3 text-left">
                        <div className="flex items-center justify-start gap-2 text-left">
                          <span className="font-mono font-bold text-[10.5px] leading-none text-left">{formatDateDisplay(docDate)}</span>
                          <input
                            type="date"
                            value={docDate}
                            onChange={(e) => setDocDate(e.target.value)}
                            className="w-4 h-4 p-0 m-0 opacity-40 hover:opacity-100 cursor-pointer no-print border-none bg-transparent"
                            title="Pilih tanggal dokumen"
                          />
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            SHIP TO (COMPANY NAME, ADDRESS)
                            <span className="text-red-500 font-bold ml-1 no-print" title="Wajib diisi">*</span>
                          </span>
                          <span className="ml-2">:</span>
                        </div>
                      </td>
                      <td className="p-0 text-left">
                        {/* Screen: Dua input terpisah dalam baris yang sama */}
                        <div className="flex items-center w-full h-full divide-x divide-black no-print">
                          <div className="w-[35%] min-w-0 h-full">
                            <input
                              type="text"
                              value={consigneeName}
                              onChange={(e) => {
                                setConsigneeName(e.target.value.toUpperCase());
                                if (error) setError(null);
                              }}
                              placeholder="COMPANY NAME (WAJIB) *"
                              required
                              className={`w-full h-full block font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-text transition-colors ${
                                !consigneeName.trim() ? 'placeholder:text-rose-400' : ''
                              }`}
                              title="Company Name (Wajib diisi)"
                            />
                          </div>
                          <div className="w-[65%] min-w-0 h-full">
                            <input
                              type="text"
                              value={consigneeAddress}
                              onChange={(e) => {
                                setConsigneeAddress(e.target.value.toUpperCase());
                                if (error) setError(null);
                              }}
                              placeholder="ADDRESS (WAJIB) *"
                              required
                              className={`w-full h-full block font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-text transition-colors ${
                                !consigneeAddress.trim() ? 'placeholder:text-rose-400' : ''
                              }`}
                              title="Address (Wajib diisi)"
                            />
                          </div>
                        </div>
                        {/* Print: Teks resmi tersambung rapi tanpa terpotong */}
                        <div className="hidden print:block py-1 px-3 font-bold text-[10.5px] uppercase text-left">
                          {consigneeName ? `${consigneeName}. ${consigneeAddress}` : consigneeAddress}
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            ATTN
                            <span className="text-red-500 font-bold ml-1 no-print" title="Wajib diisi">*</span>
                          </span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="p-0 text-left">
                        {/* Screen: 3 input terpisah dalam satu baris (Name, Email, Phone Number) */}
                        <div className="flex items-center w-full h-full divide-x divide-black no-print">
                          {/* Name (Wajib) */}
                          <div className="w-[35%] min-w-0 h-full">
                            <input
                              type="text"
                              value={attn}
                              onChange={(e) => {
                                setAttn(e.target.value.toUpperCase());
                                if (error) setError(null);
                              }}
                              placeholder="NAME (WAJIB) *"
                              required
                              className={`w-full h-full block font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-text transition-colors ${
                                !attn.trim() ? 'placeholder:text-rose-400' : ''
                              }`}
                              title="ATTN Name (Wajib diisi)"
                            />
                          </div>
                          {/* Email (Wajib) */}
                          <div className="w-[40%] min-w-0 h-full">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value.toLowerCase());
                                if (error) setError(null);
                              }}
                              placeholder="EMAIL (WAJIB) *"
                              required
                              className={`w-full h-full block font-bold text-[10.5px] text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-text transition-colors ${
                                !email.trim() ? 'placeholder:text-rose-400' : ''
                              }`}
                              title="ATTN Email (Wajib diisi)"
                            />
                          </div>
                          {/* Phone Number / TEL (Opsional) */}
                          <div className="w-[25%] min-w-0 h-full">
                            <input
                              type="text"
                              value={tel}
                              onChange={(e) => setTel(e.target.value)}
                              placeholder="PHONE / TEL (OPSIONAL)"
                              className="w-full h-full block font-bold text-[10.5px] text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-text transition-colors"
                              title="Phone Number (Opsional)"
                            />
                          </div>
                        </div>
                        {/* Print: Teks resmi tersambung rapi */}
                        <div className="hidden print:block py-1 px-3 font-bold text-[10.5px] uppercase text-left">
                          <span>{attn}</span>
                          {email && <span className="ml-3 font-mono lowercase font-normal">EMAIL: {email}</span>}
                          {tel && tel !== '-' && <span className="ml-3 font-mono">TEL: {tel}</span>}
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>ORDER NO.</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="py-1 px-3 font-mono font-bold uppercase tracking-tight text-left">
                        {itemRows.map((r) => r.orderName).filter((n) => n && n !== '-').join(', ') || '-'}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            PAYMENT BY
                            <span className="text-red-500 font-bold ml-1 no-print" title="Wajib diisi">*</span>
                          </span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="p-0 text-left">
                        {/* Screen: Dropdown Opsi */}
                        <select
                          value={paymentBy}
                          onChange={(e) => {
                            setPaymentBy(e.target.value);
                            if (error) setError(null);
                          }}
                          required
                          className={`w-full h-full block font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 print:hidden tracking-tight cursor-pointer transition-colors ${
                            !paymentBy ? 'text-neutral-400 font-normal' : 'text-neutral-900 font-bold'
                          }`}
                          title="Pilih Payment By (Freight Collect atau Shipper Pay) - Wajib"
                        >
                          <option value="" disabled className="text-neutral-400">-- PILIH PAYMENT BY (WAJIB) --</option>
                          <option value="FREIGHT COLLECT (RECEIVER PAY)" className="text-neutral-900">FREIGHT COLLECT (RECEIVER PAY)</option>
                          <option value="SHIPPER PAY" className="text-neutral-900">SHIPPER PAY</option>
                        </select>
                        {/* Print: Teks resmi cetak */}
                        <div className="hidden print:block py-1 px-3 font-bold text-[10.5px] uppercase text-left">
                          {paymentBy || '-'}
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            SHIPMENT BY
                            <span className="text-red-500 font-bold ml-1 no-print" title="Wajib diisi">*</span>
                          </span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="p-0 text-left">
                        {/* Screen: Dua input terpisah dalam satu baris (Nama Kurir & Account No) */}
                        <div className="flex items-center w-full h-full divide-x divide-black no-print">
                          {/* Nama Kurir & Layanan (Wajib) */}
                          <div className="w-[45%] min-w-0 h-full">
                            <select
                              value={courierName}
                              onChange={(e) => {
                                setCourierName(e.target.value);
                                setShipmentBy(e.target.value);
                                if (error) setError(null);
                              }}
                              required
                              className={`w-full h-full block font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-2 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-pointer transition-colors ${
                                !courierName ? 'text-neutral-400 font-normal' : 'text-neutral-900 font-bold'
                              }`}
                              title="Pilih Kurir & Layanan Pengiriman (Wajib)"
                            >
                              <option value="" disabled className="text-neutral-400">-- PILIH KURIR &amp; LAYANAN (WAJIB) --</option>
                              <optgroup label="DHL">
                                <option value="DHL EXPRESS" className="text-neutral-900">DHL EXPRESS</option>
                                <option value="DHL ECONOMY" className="text-neutral-900">DHL ECONOMY</option>
                              </optgroup>
                              <optgroup label="FEDEX">
                                <option value="FEDEX EXPRESS" className="text-neutral-900">FEDEX EXPRESS</option>
                                <option value="FEDEX ECONOMY" className="text-neutral-900">FEDEX ECONOMY</option>
                              </optgroup>
                              <optgroup label="UPS">
                                <option value="UPS EXPRESS" className="text-neutral-900">UPS EXPRESS</option>
                                <option value="UPS ECONOMY" className="text-neutral-900">UPS ECONOMY</option>
                              </optgroup>
                              <optgroup label="SF EXPRESS">
                                <option value="SF EXPRESS" className="text-neutral-900">SF EXPRESS</option>
                                <option value="SF ECONOMY" className="text-neutral-900">SF ECONOMY</option>
                              </optgroup>
                              <optgroup label="TNT">
                                <option value="TNT EXPRESS" className="text-neutral-900">TNT EXPRESS</option>
                                <option value="TNT ECONOMY" className="text-neutral-900">TNT ECONOMY</option>
                              </optgroup>
                              <optgroup label="LAINNYA / AIR FREIGHT">
                                <option value="COURIER / AIR FREIGHT EXPRESS" className="text-neutral-900">COURIER / AIR FREIGHT EXPRESS</option>
                                <option value="COURIER / AIR FREIGHT ECONOMY" className="text-neutral-900">COURIER / AIR FREIGHT ECONOMY</option>
                              </optgroup>
                            </select>
                          </div>
                          {/* Account No (Wajib) */}
                          <div className="w-[55%] min-w-0 h-full">
                            <input
                              type="text"
                              value={courierAccount}
                              onChange={(e) => {
                                setCourierAccount(e.target.value.toUpperCase());
                                if (error) setError(null);
                              }}
                              placeholder="ACCOUNT NO (WAJIB) *"
                              required
                              className={`w-full h-full block font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 tracking-tight cursor-text transition-colors ${
                                !courierAccount.trim() ? 'placeholder:text-rose-400' : ''
                              }`}
                              title="Nomor Akun Kurir (Wajib diisi)"
                            />
                          </div>
                        </div>
                        {/* Print: Teks resmi cetak */}
                        <div className="hidden print:block py-1 px-3 font-bold text-[10.5px] uppercase text-left">
                          <span>{courierName || '-'}</span>
                          {courierAccount && <span className="ml-4 font-mono">ACC NO: {courierAccount}</span>}
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>INVOICE VALUE</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="py-1 px-3 text-left font-bold text-[10.5px] uppercase tracking-tight select-all">
                        {invoiceValue}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>SHIPPING DATE</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="py-1 px-3 text-left">
                        <div className="flex items-center justify-start gap-2 text-left">
                          <span className="font-mono font-bold text-[10.5px] leading-none text-left">{formatDateDisplay(shippingDate)}</span>
                          <input
                            type="date"
                            value={shippingDate}
                            onChange={(e) => setShippingDate(e.target.value)}
                            className="w-4 h-4 p-0 m-0 opacity-40 hover:opacity-100 cursor-pointer no-print border-none bg-transparent"
                            title="Pilih tanggal pengiriman"
                          />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                        <div className="flex items-center justify-between">
                          <span>FROM</span>
                          <span>:</span>
                        </div>
                      </td>
                      <td className="py-1 px-3 text-left font-bold text-[10.5px] uppercase tracking-tight select-all">
                        {fromLocation}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table: 12 Columns Items List (Direct Interactive Input Grid) */}
              <div className="overflow-x-auto border-b border-black">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black font-bold text-center bg-slate-50/60 print:bg-white text-[9.5px] leading-tight">
                      <th className="py-1 px-1 border-r border-black w-8">No</th>
                      <th className="py-1 px-1 border-r border-black w-20">HS CODE</th>
                      <th className="py-1 px-1.5 border-r border-black w-24">
                        <div>ITEM</div>
                        <div>NO.</div>
                      </th>
                      <th className="py-1 px-1.5 border-r border-black w-24">
                        <div>ORDER</div>
                        <div>NAME</div>
                      </th>
                      <th className="py-1 px-1.5 border-r border-black w-28">DETAIL</th>
                      <th className="py-1 px-2 border-r border-black">STYLE</th>
                      <th className="py-1 px-1.5 border-r border-black w-20">COLOR</th>
                      <th className="py-1 px-1 border-r border-black w-16">SIZE</th>
                      <th className="py-1 px-1 border-r border-black w-14">AMOUNT</th>
                      <th className="py-1 px-1 border-r border-black w-10">UNIT</th>
                      <th className="py-1 px-1.5 border-r border-black w-16">
                        <div>UNIT</div>
                        <div>PRICE</div>
                      </th>
                      <th className="py-1 px-2 w-16 border-r print:border-r-0 border-black">
                        <div>TOTAL</div>
                        <div>PRICE</div>
                      </th>
                      <th className="py-1 px-1 w-7 text-center no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((row, idx) => {
                      const itemTotalPrice = (row.qty * Number(row.unitPrice || 1)).toFixed(2).replace('.', ',');

                      return (
                        <tr key={row.id || idx} className="border-b border-black hover:bg-amber-50/20 print:bg-white">
                          {/* 1. No */}
                          <td className="py-1 px-1 border-r border-black text-center font-bold text-neutral-700 print:text-black">
                            {idx + 1}
                          </td>

                          {/* 2. HS CODE */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.hsCode}
                              onChange={(e) => handleRowFieldChange(idx, 'hsCode', e.target.value)}
                              placeholder="-"
                              className="w-full text-center font-mono text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                            />
                          </td>

                          {/* 3. ITEM NO. */}
                          <td className="py-0.5 px-1.5 border-r border-black font-mono font-bold text-center text-neutral-900 print:text-black">
                            {row.isManual ? (
                              <input
                                type="text"
                                value={row.kode === '-' ? '' : row.kode}
                                onChange={(e) => handleRowFieldChange(idx, 'kode', e.target.value.toUpperCase())}
                                placeholder="ITEM NO"
                                className="w-full text-center font-mono font-bold text-[9.5px] uppercase bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                              />
                            ) : (
                              row.kode
                            )}
                          </td>

                          {/* 4. ORDER NAME */}
                          <td className="py-0.5 px-1.5 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.orderName}
                              onChange={(e) => handleRowFieldChange(idx, 'orderName', e.target.value)}
                              className="w-full text-center font-mono text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                            />
                          </td>

                          {/* 5. DETAIL */}
                          <td className="py-0.5 px-1.5 border-r border-black">
                            <input
                              type="text"
                              value={row.detail}
                              onChange={(e) => handleRowFieldChange(idx, 'detail', e.target.value.toUpperCase())}
                              className="w-full text-[9.5px] uppercase bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5 px-1"
                            />
                          </td>

                          {/* 6. STYLE */}
                          <td className="py-0.5 px-1.5 border-r border-black">
                            <input
                              type="text"
                              value={row.style}
                              onChange={(e) => handleRowFieldChange(idx, 'style', e.target.value)}
                              className="w-full text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5 px-1"
                            />
                          </td>

                          {/* 7. COLOR */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.color}
                              onChange={(e) => handleRowFieldChange(idx, 'color', e.target.value)}
                              className="w-full text-center text-[9.5px] uppercase bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                            />
                          </td>

                          {/* 8. SIZE */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <input
                              type="text"
                              value={row.size}
                              onChange={(e) => handleRowFieldChange(idx, 'size', e.target.value.toUpperCase())}
                              className="w-full text-center text-[9.5px] uppercase font-bold bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                            />
                          </td>

                          {/* 9. AMOUNT (Input Qty with Stock Cap) */}
                          <td className="py-0.5 px-1 border-r border-black text-center">
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min={1}
                                max={row.maxQty || 9999}
                                value={row.qty}
                                onChange={(e) => handleRowQtyChange(idx, e.target.value)}
                                className="w-10 text-center font-bold font-mono text-[10.5px] bg-amber-50/80 hover:bg-amber-100 focus:bg-amber-100 print:bg-transparent border border-amber-200 print:border-none rounded-xs focus:outline-none focus:ring-1 focus:ring-amber-500 py-0.5"
                                title={row.isManual ? 'Jumlah manual' : `Stok tersedia di box: ${row.maxQty} PCS`}
                              />
                            </div>
                          </td>

                          {/* 10. UNIT */}
                          <td className="py-0.5 px-1 border-r border-black text-center uppercase font-medium">
                            {row.isManual ? (
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => handleRowFieldChange(idx, 'unit', e.target.value.toUpperCase())}
                                placeholder="PCS"
                                className="w-full text-center text-[9.5px] uppercase font-bold bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                              />
                            ) : (
                              row.unit
                            )}
                          </td>

                          {/* 11. UNIT PRICE */}
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            <div className="flex items-center justify-end font-mono">
                              <span className="text-neutral-500 print:text-black mr-0.5">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={row.unitPrice}
                                onChange={(e) => handleRowFieldChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-10 text-right font-mono text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                              />
                            </div>
                          </td>

                          {/* 12. TOTAL PRICE */}
                          <td className="py-1 px-2 text-right font-mono font-bold">
                            ${itemTotalPrice}
                          </td>

                          {/* Row Action (Delete) - Hidden in Print */}
                          <td className="py-0.5 px-1 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer mx-auto"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row (Direct Excel / PDF Alignment) */}
                    <tr className="border-b border-black font-bold bg-slate-50/30 print:bg-white">
                      <td colSpan={8} className="py-1 px-2 border-r border-black text-right"></td>
                      <td className="py-1 px-1 border-r border-black text-center font-bold font-mono text-[10.5px]">
                        {totalPcs}
                      </td>
                      <td className="py-1 px-1 border-r border-black text-center font-bold text-[10px]">PCS</td>
                      <td className="py-1 px-1 border-r border-black text-right"></td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-[10.5px]">
                        ${totalPrice}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tbody>
                </table>

                {/* Add Manual Item Button Bar (Directly below table, clean, no-print) */}
                <div className="py-1.5 px-3 bg-neutral-50/90 border-t border-black flex items-center justify-between no-print">
                  <button
                    type="button"
                    onClick={handleAddManualRow}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] rounded-md flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    title="Tambah baris sampel / barang secara manual ke invoice"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Baris Manual</span>
                  </button>
                  <span className="text-[10px] text-neutral-500 font-medium">
                    Tekan <span className="font-bold text-neutral-700">+ Tambah Baris Manual</span> untuk menambahkan sampel / item ekstra langsung ke invoice.
                  </span>
                </div>
              </div>

              {/* Footer Section: Weight, Packaging, and Samples Notice (Aligned with Metadata Column Ratio) */}
              <div className="text-[10px]">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Single Row: Package Type, Dimension, and Weights (Divided by borders, Centered Text) */}
                    <tr className="border-b border-black font-bold">
                      {/* Left Column (29%): Package Type Dropdown (Centered, No icons, Wajib Dipilih) */}
                      <td className="w-[29%] py-1.5 px-2.5 border-r border-black font-bold align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Print text */}
                          <span className="print:inline hidden text-[10px] uppercase font-bold">{packageType}</span>

                          {/* Screen interactive dropdown (Tanpa icon) */}
                          <div className="no-print">
                            <select
                              value={packageType}
                              onChange={(e) => handlePackageTypeChange(e.target.value)}
                              className="font-bold text-[10px] uppercase bg-white hover:bg-amber-100/40 focus:bg-amber-100/70 border border-neutral-300 rounded px-2.5 py-0.5 outline-none cursor-pointer shadow-2xs transition"
                              title="Pilih Kemasan (CARTON atau BAG) - Wajib Dipilih"
                              required
                            >
                              <option value="CARTON">CARTON</option>
                              <option value="BAG">BAG</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      {/* Right Column (71%): Dimension, NW, and GW separated by vertical dividers with centered text */}
                      <td className="w-[71%] p-0 font-bold align-middle">
                        <div className="flex items-stretch w-full h-full">
                          {/* 1. Dimension (Centered, Wajib Diisi) */}
                          <div className="flex-1 py-1.5 px-2 border-r border-black flex items-center justify-center gap-1.5 text-center">
                            <span className="text-[10px] uppercase tracking-tight font-bold shrink-0">
                              {packageType === 'CARTON' ? 'CARTON DIMENSION' : 'BAG DIMENSION'} :
                            </span>
                            <input
                              type="text"
                              value={cartonSize}
                              onChange={(e) => setCartonSize(e.target.value)}
                              placeholder={packageType === 'CARTON' ? '35 x 25 x 8 cm' : '30 x 20 x 5 cm'}
                              className="font-bold text-center w-28 bg-transparent hover:bg-amber-50 focus:bg-amber-100 focus:outline-none rounded-xs py-0.5 text-[10px]"
                              title={`Ketik ${packageType === 'CARTON' ? 'Carton' : 'Bag'} Dimension (Panjang x Lebar x Tinggi) - Wajib Diisi`}
                              required
                            />
                          </div>

                          {/* 2. Weight NW (Centered, Wajib Diisi) */}
                          <div className="w-[28%] py-1.5 px-2 border-r border-black flex items-center justify-center gap-1.5 text-center shrink-0">
                            <input
                              type="text"
                              value={netWeight}
                              onChange={(e) => handleNetWeightChange(e.target.value)}
                              className="w-12 font-bold text-center bg-transparent hover:bg-amber-50 focus:bg-amber-100 focus:outline-none rounded-xs py-0.5 text-[10px]"
                              title="Net Weight (NET WEIGHT) - Wajib Diisi"
                              required
                            />
                            <span className="text-[9.5px] whitespace-nowrap">KG (NET WEIGHT)</span>
                          </div>

                          {/* 3. Weight GW (Centered, Wajib Diisi) */}
                          <div className="w-[28%] py-1.5 px-2 flex items-center justify-center gap-1.5 text-center shrink-0">
                            <input
                              type="text"
                              value={grossWeight}
                              onChange={(e) => setGrossWeight(e.target.value)}
                              className="w-12 font-bold text-center bg-transparent hover:bg-amber-50 focus:bg-amber-100 focus:outline-none rounded-xs py-0.5 text-[10px]"
                              title="Gross Weight (GROSS WEIGHT: Untuk CARTON = NW + 1, Untuk BAG = NW) - Wajib Diisi"
                              required
                            />
                            <span className="text-[9.5px] whitespace-nowrap">KG (GROSS WEIGHT)</span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: Samples Notice */}
                    <tr>
                      <td colSpan={2} className="py-1 px-2.5 font-bold italic uppercase text-[10px] tracking-wide">
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

            {/* Download Excel Only (without dispatching) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleExportExcelOnly}
              className="px-3.5 py-2 rounded-full border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Unduh Invoice & Packing List dalam format Excel tanpa memotong stok"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh Excel Saja</span>
            </button>

            {/* Save & Export Excel */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Simpan pengiriman ke sistem database dan otomatis unduh file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Kirim &amp; Unduh Excel</span>
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
