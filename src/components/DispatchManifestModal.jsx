import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  Printer,
  FileText,
  SlidersHorizontal,
  Building2,
  User,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { decodeDispatchData, parseSendingInfoText, exportInvoiceToExcel } from '../utils/dispatchUtils';

export function DispatchManifestModal({ isOpen, onClose, items = [], initialConfig = null }) {
  const { items: allItems } = useInventory();
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

  // Document format toggle: 'invoice' (PDF Standar Image 2) vs 'surat-jalan' (Internal Domestic)
  const [docFormat, setDocFormat] = useState('invoice');
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields with smart defaults matching the PDF
  const [consigneeName, setConsigneeName] = useState(() => defaultBuyer || '');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [attn, setAttn] = useState(() => firstDispatch?.recipient || '');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');

  const [sendingInfoText, setSendingInfoText] = useState('');

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

  const midCode = 'IDGAGTAMBSEM';
  const defaultInvoiceNo = useMemo(() => {
    if (initialConfig?.invoiceNo) return initialConfig.invoiceNo;
    if (firstDispatch?.invoiceNo) return firstDispatch.invoiceNo;
    return '';
  }, [firstDispatch, initialConfig]);

  const [invoiceNo, setInvoiceNo] = useState(() => defaultInvoiceNo);
  const [docDate, setDocDate] = useState(() => defaultDate);
  const [shippingDate, setShippingDate] = useState(() => defaultDate);
  const fromLocation = 'SEMARANG, INDONESIA';
  const [orderNo, setOrderNo] = useState(() => defaultOrderNo);
  const [paymentBy, setPaymentBy] = useState('');
  const [courierName, setCourierName] = useState('');
  const [courierAccount, setCourierAccount] = useState('');
  const [shipmentBy, setShipmentBy] = useState('');
  const invoiceValue = 'USD';

  // Interactive Item Rows in Manifest Table
  const [manifestRows, setManifestRows] = useState(() => {
    return safeItems.map((it) => {
      const itemQty = Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1);
      const detailStr = it.category || it.tipe || it.namaBarang || 'SWATCHES MATERIAL';
      const styleStr = it.style || it.deskripsi || it.name || '-';
      const orderNameStr = it.sampleNo && it.sampleNo !== 'NA' ? it.sampleNo : (it.buyerNo || defaultOrderNo || '-');
      return {
        id: it.id,
        isManual: false,
        hsCode: it.hsCode || '',
        kode: it.kode || it.sku || '-',
        orderName: orderNameStr,
        detail: detailStr,
        style: styleStr,
        color: it.color || 'Multi Color',
        size: it.size || 'ONE SIZE',
        qty: itemQty,
        unit: it.satuan || 'PCS',
        unitPrice: 1.0,
      };
    });
  });

  useEffect(() => {
    if (safeItems.length > 0) {
      setManifestRows(
        safeItems.map((it) => {
          const itemQty = Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1);
          const detailStr = it.category || it.tipe || it.namaBarang || 'SWATCHES MATERIAL';
          const styleStr = it.style || it.deskripsi || it.name || '-';
          const orderNameStr = it.sampleNo && it.sampleNo !== 'NA' ? it.sampleNo : (it.buyerNo || defaultOrderNo || '-');
          return {
            id: it.id,
            isManual: false,
            hsCode: it.hsCode || '',
            kode: it.kode || it.sku || '-',
            orderName: orderNameStr,
            detail: detailStr,
            style: styleStr,
            color: it.color || 'Multi Color',
            size: it.size || 'ONE SIZE',
            qty: itemQty,
            unit: it.satuan || 'PCS',
            unitPrice: 1.0,
          };
        })
      );
    }
  }, [safeItems, defaultOrderNo]);

  // Unique list of items / samples from database for ITEM NO autocomplete & autofill
  const uniqueItemOptions = useMemo(() => {
    const list = [];
    const seenCodes = new Set();

    (allItems || []).forEach((it) => {
      if (!it) return;
      const k = String(it.kode || it.sku || '').trim().toUpperCase();
      const s = String(it.sampleNo || '').trim().toUpperCase();
      const style = it.style || it.deskripsi || it.name || '-';
      const color = it.color || it.warna || '';
      const box = it.boxNumber ? `BOX ${it.boxNumber}` : '';

      if (k && !seenCodes.has(k)) {
        seenCodes.add(k);
        const parts = [k];
        if (s && s !== 'NA' && s !== '-' && s !== k) parts.push(`(${s})`);
        if (style && style !== '-') parts.push(`- ${style}`);
        if (color) parts.push(`[${color}]`);
        if (box) parts.push(`• ${box}`);

        list.push({
          code: k,
          sampleNo: s,
          label: parts.join(' '),
          item: it,
        });
      }

      if (s && s !== 'NA' && s !== '-' && s !== k && !seenCodes.has(s)) {
        seenCodes.add(s);
        const parts = [s];
        if (k) parts.push(`(Kode: ${k})`);
        if (style && style !== '-') parts.push(`- ${style}`);
        if (color) parts.push(`[${color}]`);
        if (box) parts.push(`• ${box}`);

        list.push({
          code: s,
          sampleNo: s,
          label: parts.join(' '),
          item: it,
        });
      }
    });

    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [allItems]);

  // Unique list of Order Names from database for ORDER NAME autocomplete & autofill
  const uniqueManifestOrderOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    (allItems || []).forEach((it) => {
      if (!it) return;
      const order = String(
        it.sampleNo && it.sampleNo !== 'NA' && it.sampleNo !== '-' 
          ? it.sampleNo 
          : (it.buyerNo || it.orderName || '')
      ).trim();
      if (order && !seen.has(order.toUpperCase())) {
        seen.add(order.toUpperCase());
        const kode = it.kode || it.sku || '';
        const style = it.style || it.deskripsi || it.name || '';
        const box = it.boxNumber ? `BOX ${it.boxNumber}` : '';
        const parts = [order];
        if (kode && kode !== order) parts.push(`(${kode})`);
        if (style && style !== '-') parts.push(`- ${style}`);
        if (box) parts.push(`• ${box}`);
        list.push({
          value: order,
          label: parts.join(' '),
          item: it,
        });
      }
    });
    return list.sort((a, b) => a.value.localeCompare(b.value));
  }, [allItems]);

  // Unique list of Styles from database for STYLE autocomplete & autofill
  const uniqueManifestStyleOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    (allItems || []).forEach((it) => {
      if (!it) return;
      const style = String(it.style || it.deskripsi || it.name || '').trim();
      if (style && style !== '-' && !seen.has(style.toUpperCase())) {
        seen.add(style.toUpperCase());
        const kode = it.kode || it.sku || '';
        const order = it.sampleNo && it.sampleNo !== 'NA' ? it.sampleNo : (it.buyerNo || '');
        const box = it.boxNumber ? `BOX ${it.boxNumber}` : '';
        const parts = [style];
        if (order || kode) parts.push(`(${[order, kode].filter(Boolean).join(' / ')})`);
        if (box) parts.push(`• ${box}`);
        list.push({
          value: style,
          label: parts.join(' '),
          item: it,
        });
      }
    });
    return list.sort((a, b) => a.value.localeCompare(b.value));
  }, [allItems]);

  const handleRowQtyChange = (idx, value) => {
    setManifestRows((prev) => {
      const next = [...prev];
      const parsed = parseInt(value, 10);
      next[idx] = { ...next[idx], qty: Number.isNaN(parsed) || parsed < 1 ? 1 : parsed };
      return next;
    });
  };

  const handleRowFieldChange = (idx, field, value) => {
    setManifestRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // Reusable helper: apply matched database item to populate row fields
  const applyMatchedItemToManifestRow = (idx, matched, overrides = {}) => {
    if (!matched) return;
    const k = matched.kode || matched.sku || '';
    const s = matched.sampleNo && matched.sampleNo !== 'NA' && matched.sampleNo !== '-' ? matched.sampleNo : '';
    const b = matched.buyerNo || '';
    const orderNameVal = s || b || '';
    const styleVal = matched.style || matched.deskripsi || matched.name || '-';

    setManifestRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        isManual: false,
        kode: overrides.kode || k || next[idx].kode,
        hsCode: matched.hsCode || next[idx].hsCode || '',
        orderName: overrides.orderName || orderNameVal || next[idx].orderName || '',
        detail: matched.category || matched.tipe || matched.namaBarang || next[idx].detail || 'SAMPLE',
        style: overrides.style || styleVal,
        color: matched.color || matched.warna || next[idx].color || 'Multi Color',
        size: matched.size || matched.ukuran || next[idx].size || 'ONE SIZE',
        qty: 1,
        unit: matched.satuan || next[idx].unit || 'PCS',
        ...overrides,
      };
      return next;
    });
  };

  // Handler for ITEM NO change with database auto-lookup and autofill
  const handleItemCodeChange = (idx, value) => {
    const rawVal = String(value || '');
    const upperVal = rawVal.trim().toUpperCase();

    // Look for matching item in allItems by kode, sku, or sampleNo
    const matched = (allItems || []).find((it) => {
      if (!it) return false;
      const k = String(it.kode || it.sku || '').trim().toUpperCase();
      const s = String(it.sampleNo || '').trim().toUpperCase();
      return (k && k === upperVal) || (s && s === upperVal);
    });

    if (matched) {
      applyMatchedItemToManifestRow(idx, matched, { kode: upperVal });
    } else {
      setManifestRows((prev) => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          kode: upperVal,
        };
        return next;
      });
    }
  };

  // Handler for ORDER NAME change with database dropdown auto-lookup and autofill
  const handleOrderNameChange = (idx, value) => {
    const rawVal = String(value || '');
    const cleanVal = rawVal.trim().toUpperCase();

    // Look for matching item in allItems by sampleNo, buyerNo, orderName, or kode
    const matched = (allItems || []).find((it) => {
      if (!it) return false;
      const s = String(it.sampleNo || '').trim().toUpperCase();
      const b = String(it.buyerNo || '').trim().toUpperCase();
      const o = String(it.orderName || '').trim().toUpperCase();
      const k = String(it.kode || it.sku || '').trim().toUpperCase();
      return (s && s !== 'NA' && s !== '-' && s === cleanVal) ||
             (b && b === cleanVal) ||
             (o && o === cleanVal) ||
             (k && k === cleanVal);
    });

    if (matched) {
      applyMatchedItemToManifestRow(idx, matched, { orderName: rawVal });
    } else {
      handleRowFieldChange(idx, 'orderName', value);
    }
  };

  // Handler for STYLE change with database dropdown auto-lookup and autofill
  const handleStyleChange = (idx, value) => {
    const rawVal = String(value || '');
    const cleanVal = rawVal.trim().toLowerCase();

    // Look for matching item in allItems by style, deskripsi, or name
    const matched = (allItems || []).find((it) => {
      if (!it) return false;
      const st = String(it.style || '').trim().toLowerCase();
      const d = String(it.deskripsi || '').trim().toLowerCase();
      const n = String(it.name || '').trim().toLowerCase();
      return (st && st === cleanVal) || (d && d === cleanVal) || (n && n === cleanVal);
    });

    if (matched) {
      applyMatchedItemToManifestRow(idx, matched, { style: rawVal });
    } else {
      handleRowFieldChange(idx, 'style', value);
    }
  };

  const handleAddManualRow = () => {
    setManifestRows((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isManual: true,
        hsCode: '',
        kode: '',
        orderName: consigneeName ? `${consigneeName}` : '',
        detail: 'SAMPLE',
        style: '',
        color: '',
        size: 'ONE SIZE',
        qty: 1,
        unit: 'PCS',
        unitPrice: 1.0,
      },
    ]);
  };

  const handleRemoveRow = (idx) => {
    if (manifestRows.length <= 1) {
      alert('Invoice harus memiliki minimal 1 baris item.');
      return;
    }
    setManifestRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalPcs = useMemo(() => {
    return manifestRows.reduce((acc, it) => acc + Number(it.qty || 1), 0);
  }, [manifestRows]);

  const totalPrice = useMemo(() => {
    const sum = manifestRows.reduce((acc, it) => acc + (Number(it.qty || 1) * Number(it.unitPrice || 1)), 0);
    return sum.toFixed(2).replace('.', ',');
  }, [manifestRows]);

  useEffect(() => {
    if (firstDispatch?.invoiceNo) {
      setInvoiceNo(firstDispatch.invoiceNo);
    } else if (initialConfig?.invoiceNo) {
      setInvoiceNo(initialConfig.invoiceNo);
    } else {
      setInvoiceNo('');
    }
  }, [firstDispatch, initialConfig]);

  // Package Specifications
  const [packageType, setPackageType] = useState('CARTON'); // 'CARTON' | 'BAG'
  const [netWeight, setNetWeight] = useState(() => {
    const calculated = (Math.max(1, totalPcs) * 0.17).toFixed(2);
    return calculated.replace('.', ',');
  });
  const [grossWeight, setGrossWeight] = useState(() => {
    const calculated = ((Math.max(1, totalPcs) * 0.17) + 1).toFixed(2); // Untuk CARTON: GW = NW + 1
    return calculated.replace('.', ',');
  });
  const [cartonSize, setCartonSize] = useState('35 x 25 x 8 cm');
  const [unitPrice, setUnitPrice] = useState(1.0);

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

  const handlePrint = () => {
    if (!consigneeName.trim()) {
      alert('Wajib mengisi Company Name sebelum mencetak invoice.');
      return;
    }
    if (!consigneeAddress.trim()) {
      alert('Wajib mengisi Address sebelum mencetak invoice.');
      return;
    }
    if (!attn.trim()) {
      alert('Wajib mengisi ATTN Name sebelum mencetak invoice.');
      return;
    }
    if (!email.trim()) {
      alert('Wajib mengisi ATTN Email sebelum mencetak invoice.');
      return;
    }
    if (!paymentBy || !paymentBy.trim()) {
      alert('Wajib memilih PAYMENT BY (FREIGHT COLLECT atau SHIPPER PAY) sebelum mencetak invoice.');
      return;
    }
    if (!courierName.trim()) {
      alert('Wajib memilih Nama Kurir & Layanan sebelum mencetak invoice.');
      return;
    }
    if (!courierAccount.trim()) {
      alert('Wajib mengisi Account No kurir sebelum mencetak invoice.');
      return;
    }
    if (!packageType || !packageType.trim()) {
      alert('Wajib memilih jenis kemasan (CARTON atau BAG) sebelum mencetak invoice.');
      return;
    }
    if (!cartonSize.trim()) {
      alert(`Wajib mengisi ${packageType === 'CARTON' ? 'Carton' : 'Bag'} Dimension sebelum mencetak invoice.`);
      return;
    }
    const nwNum = parseFloat(String(netWeight).replace(',', '.'));
    if (!netWeight || !String(netWeight).trim() || isNaN(nwNum) || nwNum <= 0) {
      alert('Wajib mengisi Net Weight (NET WEIGHT) sebelum mencetak invoice.');
      return;
    }
    const gwNum = parseFloat(String(grossWeight).replace(',', '.'));
    if (!grossWeight || !String(grossWeight).trim() || isNaN(gwNum) || gwNum <= 0) {
      alert('Wajib mengisi Gross Weight (GROSS WEIGHT) sebelum mencetak invoice.');
      return;
    }
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      const itemRows = manifestRows.map((it) => ({
        hsCode: it.hsCode || '-',
        kode: it.kode || it.sku || '-',
        orderName: it.orderName || orderNo || '-',
        detail: it.detail || 'SWATCHES MATERIAL',
        style: it.style || '-',
        color: it.color || 'Multi Color',
        size: it.size || 'ONE SIZE',
        qty: Number(it.qty || 1),
        unit: it.unit || 'PCS',
        unitPrice: Number(it.unitPrice || 1),
      }));

      await exportInvoiceToExcel({
        invoiceNo,
        shippingDate: shippingDate,
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
        picName: firstDispatch?.pic || 'Royan',
      });
    } catch (err) {
      console.error('Export Excel error:', err);
      alert('Gagal mengunduh file Excel: ' + (err?.message || 'Terjadi kesalahan'));
    }
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

            {/* Export Excel Action */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
              title="Unduh Invoice & Packing List dalam format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh File Excel</span>
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
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">MID CODE (Static)</label>
                <input
                  type="text"
                  value={midCode}
                  disabled
                  readOnly
                  className="w-full px-2.5 py-1.5 bg-neutral-100 border border-black/[0.1] rounded-lg text-xs font-bold text-neutral-600 cursor-not-allowed select-all"
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
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">From Location (Static)</label>
                <input
                  type="text"
                  value={fromLocation}
                  disabled
                  readOnly
                  className="w-full px-2.5 py-1.5 bg-neutral-100 border border-black/[0.1] rounded-lg text-xs font-bold text-neutral-600 cursor-not-allowed select-all"
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
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Tipe Kemasan</label>
                <select
                  value={packageType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPackageType(val);
                    if (val === 'BAG' && cartonSize.includes('35 x 25 x 8')) {
                      setCartonSize('30 x 20 x 5 cm');
                    } else if (val === 'CARTON' && cartonSize.includes('20 x 5')) {
                      setCartonSize('35 x 25 x 8 cm');
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs text-[#1d1d1f] font-semibold"
                >
                  <option value="CARTON">📦 CARTON</option>
                  <option value="BAG">🛍️ BAG</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Dimensi Kemasan</label>
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
                <select
                  value={paymentBy}
                  onChange={(e) => setPaymentBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs font-semibold text-[#1d1d1f]"
                >
                  <option value="">-- Pilih Payment By --</option>
                  <option value="FREIGHT COLLECT (RECEIVER PAY)">FREIGHT COLLECT (RECEIVER PAY)</option>
                  <option value="SHIPPER PAY">SHIPPER PAY</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Kurir &amp; Layanan</label>
                <select
                  value={courierName}
                  onChange={(e) => {
                    setCourierName(e.target.value);
                    setShipmentBy(e.target.value);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs font-semibold text-[#1d1d1f]"
                >
                  <option value="">-- Pilih Kurir --</option>
                  <optgroup label="DHL">
                    <option value="DHL EXPRESS">DHL EXPRESS</option>
                    <option value="DHL ECONOMY">DHL ECONOMY</option>
                  </optgroup>
                  <optgroup label="FEDEX">
                    <option value="FEDEX EXPRESS">FEDEX EXPRESS</option>
                    <option value="FEDEX ECONOMY">FEDEX ECONOMY</option>
                  </optgroup>
                  <optgroup label="UPS">
                    <option value="UPS EXPRESS">UPS EXPRESS</option>
                    <option value="UPS ECONOMY">UPS ECONOMY</option>
                  </optgroup>
                  <optgroup label="SF EXPRESS">
                    <option value="SF EXPRESS">SF EXPRESS</option>
                    <option value="SF ECONOMY">SF ECONOMY</option>
                  </optgroup>
                  <optgroup label="TNT">
                    <option value="TNT EXPRESS">TNT EXPRESS</option>
                    <option value="TNT ECONOMY">TNT ECONOMY</option>
                  </optgroup>
                  <optgroup label="LAINNYA / AIR FREIGHT">
                    <option value="COURIER / AIR FREIGHT EXPRESS">COURIER / AIR FREIGHT EXPRESS</option>
                    <option value="COURIER / AIR FREIGHT ECONOMY">COURIER / AIR FREIGHT ECONOMY</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Account No</label>
                <input
                  type="text"
                  value={courierAccount}
                  onChange={(e) => setCourierAccount(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs font-semibold text-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#86868b] uppercase block">Invoice Value</label>
                <input
                  type="text"
                  value={invoiceValue}
                  onChange={(e) => setInvoiceValue(e.target.value)}
                  placeholder="USD"
                  className="w-full px-2.5 py-1.5 bg-white border border-black/[0.1] rounded-lg text-xs font-semibold text-[#1d1d1f]"
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
            <div 
              className="dispatch-invoice-sheet w-[280mm] max-w-full min-h-[195mm] bg-white text-black p-4 sm:p-6 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0 text-xs"
              style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
            >
              {/* Outer Border Box */}
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

                {/* Metadata Grid Table */}
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                                onChange={(e) => setConsigneeName(e.target.value.toUpperCase())}
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
                                onChange={(e) => setConsigneeAddress(e.target.value.toUpperCase())}
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                                onChange={(e) => setAttn(e.target.value.toUpperCase())}
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
                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
                          <div className="flex items-center justify-between">
                            <span>ORDER NO.</span>
                            <span>:</span>
                          </div>
                        </td>
                        <td className="p-0 text-left">
                          <input
                            type="text"
                            value={orderNo}
                            onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
                            placeholder="ORDER NO..."
                            className="w-full h-full block font-mono font-bold text-[10.5px] uppercase text-left bg-transparent py-1 px-3 border-none outline-none hover:bg-amber-100/40 focus:bg-amber-100/70 focus:ring-1 focus:ring-amber-400 print:focus:ring-0 print:hover:bg-transparent print:focus:bg-transparent tracking-tight cursor-text transition-colors"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                            onChange={(e) => setPaymentBy(e.target.value)}
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                                onChange={(e) => setCourierAccount(e.target.value.toUpperCase())}
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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
                        <td className="w-[30%] py-1 px-3 font-bold border-r border-black uppercase tracking-tight">
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

                {/* Table: 12 Columns Items List */}
                <div className="overflow-x-auto border-b border-black">
                  <datalist id="inventory-manifest-item-codes-list">
                    {uniqueItemOptions.map((opt, i) => (
                      <option key={`${opt.code}-${i}`} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </datalist>

                  <datalist id="inventory-manifest-order-names-list">
                    {uniqueManifestOrderOptions.map((opt, i) => (
                      <option key={`${opt.value}-${i}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </datalist>

                  <datalist id="inventory-manifest-styles-list">
                    {uniqueManifestStyleOptions.map((opt, i) => (
                      <option key={`${opt.value}-${i}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </datalist>
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
                      {manifestRows.map((it, idx) => {
                        const itemQty = Number(it.qty || 1);
                        const itemTotalPrice = (itemQty * Number(it.unitPrice || 1)).toFixed(2).replace('.', ',');

                        return (
                          <tr key={it.id || idx} className="border-b border-black hover:bg-amber-50/20 print:bg-white">
                            <td className="py-1 px-1 border-r border-black text-center font-bold text-neutral-700 print:text-black">{idx + 1}</td>
                            <td className="py-0.5 px-1 border-r border-black text-center">
                              <input
                                type="text"
                                value={it.hsCode}
                                onChange={(e) => handleRowFieldChange(idx, 'hsCode', e.target.value)}
                                placeholder="-"
                                className="w-full text-center font-mono text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                              />
                            </td>
                            <td className="py-0.5 px-1.5 border-r border-black font-mono font-bold text-center text-neutral-900 print:text-black">
                              <input
                                type="text"
                                list="inventory-manifest-item-codes-list"
                                value={it.kode === '-' ? '' : it.kode}
                                onChange={(e) => handleItemCodeChange(idx, e.target.value)}
                                placeholder="ITEM NO"
                                className="w-full text-center font-mono font-bold text-[9.5px] uppercase bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5 cursor-text"
                                title="Ketik atau pilih Kode / Sample dari database (data baris otomatis mengikuti)"
                              />
                            </td>
                            <td className="py-0.5 px-1.5 border-r border-black text-center">
                              <input
                                type="text"
                                list="inventory-manifest-order-names-list"
                                value={it.orderName}
                                onChange={(e) => handleOrderNameChange(idx, e.target.value)}
                                placeholder="ORDER NAME"
                                className="w-full text-center font-mono text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5 cursor-text"
                                title="Ketik atau pilih Order Name dari database (data baris otomatis mengikuti)"
                              />
                            </td>
                            <td className="py-0.5 px-1.5 border-r border-black">
                              <input
                                type="text"
                                value={it.detail}
                                onChange={(e) => handleRowFieldChange(idx, 'detail', e.target.value.toUpperCase())}
                                className="w-full text-[9.5px] uppercase bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5 px-1"
                              />
                            </td>
                            <td className="py-0.5 px-1.5 border-r border-black">
                              <input
                                type="text"
                                list="inventory-manifest-styles-list"
                                value={it.style}
                                onChange={(e) => handleStyleChange(idx, e.target.value)}
                                placeholder="STYLE"
                                className="w-full text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5 px-1 cursor-text"
                                title="Ketik atau pilih Style dari database (data baris otomatis mengikuti)"
                              />
                            </td>
                            <td className="py-0.5 px-1 border-r border-black text-center">
                              <input
                                type="text"
                                value={it.color}
                                onChange={(e) => handleRowFieldChange(idx, 'color', e.target.value)}
                                className="w-full text-center text-[9.5px] uppercase bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                              />
                            </td>
                            <td className="py-0.5 px-1 border-r border-black text-center">
                              <input
                                type="text"
                                value={it.size}
                                onChange={(e) => handleRowFieldChange(idx, 'size', e.target.value.toUpperCase())}
                                className="w-full text-center text-[9.5px] uppercase font-bold bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                              />
                            </td>
                            <td className="py-0.5 px-1 border-r border-black text-center">
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={itemQty}
                                  onChange={(e) => handleRowQtyChange(idx, e.target.value)}
                                  className="w-10 text-center font-bold font-mono text-[10.5px] bg-amber-50/80 hover:bg-amber-100 focus:bg-amber-100 print:bg-transparent border border-amber-200 print:border-none rounded-xs focus:outline-none focus:ring-1 focus:ring-amber-500 py-0.5"
                                />
                              </div>
                            </td>
                            <td className="py-0.5 px-1 border-r border-black text-center uppercase font-medium">
                              {it.isManual ? (
                                <input
                                  type="text"
                                  value={it.unit}
                                  onChange={(e) => handleRowFieldChange(idx, 'unit', e.target.value.toUpperCase())}
                                  placeholder="PCS"
                                  className="w-full text-center text-[9.5px] uppercase font-bold bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                                />
                              ) : (
                                it.unit || it.satuan || 'PCS'
                              )}
                            </td>
                            <td className="py-0.5 px-1 border-r border-black text-right">
                              <div className="flex items-center justify-end font-mono">
                                <span className="text-neutral-500 print:text-black mr-0.5">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.unitPrice}
                                  onChange={(e) => handleRowFieldChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-right font-mono text-[9.5px] bg-transparent hover:bg-amber-50 focus:bg-amber-100/60 focus:outline-none rounded-xs py-0.5"
                                />
                              </div>
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-[10px]">${itemTotalPrice}</td>
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
                        <td className="py-1 px-1 border-r border-black text-center font-bold font-mono text-[10.5px]">{totalPcs}</td>
                        <td className="py-1 px-1 border-r border-black text-center font-bold text-[10px]">PCS</td>
                        <td className="py-1 px-1 border-r border-black text-right"></td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-[10.5px]">${totalPrice}</td>
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
                      Tekan <span className="font-bold text-neutral-700">+ Tambah Baris Manual</span> untuk menambahkan sampel / item ekstra ke invoice.
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
