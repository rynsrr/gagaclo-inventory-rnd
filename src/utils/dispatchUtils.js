/**
 * Utility functions for R&D Sample Dispatch / Outgoing tracking.
 * Destinations: BUYER, ANZO_QC, ANZO_TW, ANZO_QC_CHINA, RDTW, RDC, or CUSTOM
 * Types: PERMANENT (Keluar Permanen), REVIEW (Review Sementara / Bisa Kembali)
 */

export const DISPATCH_DESTINATIONS = [
  { id: 'BUYER', label: 'Buyer', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'ANZO_QC', label: 'ANZO QC', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'ANZO_TW', label: 'ANZO TW', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'ANZO_QC_CHINA', label: 'ANZO QC CHINA', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'RDTW', label: 'RDTW', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'RDC', label: 'RDC', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
];

export const DISPATCH_TYPES = [
  {
    id: 'PERMANENT',
    label: 'Keluar Permanen',
    description: 'Diberikan ke Buyer/Anzo sehingga stok di R&D berkurang.',
    badge: 'bg-slate-900 text-white',
  },
  {
    id: 'REVIEW',
    label: 'Review Sementara',
    description: 'Kirim untuk review ke ANZO QC/TW/CHINA/RDC/RDTW, ditunggu kembali ke R&D.',
    badge: 'bg-amber-100 text-amber-900 border border-amber-300',
  },
];

/**
 * Checks if an item is currently dispatched / sent out of physical storage.
 */
export function isItemDispatched(item) {
  if (!item) return false;
  const status = String(item.status || '').toLowerCase();
  if (status.startsWith('dispatched') || status.startsWith('sent') || status === 'kirim') {
    return true;
  }
  if (Array.isArray(item.tags) && item.tags.some(t => t === 'DISPATCH' || t.startsWith('dispatch:'))) {
    return true;
  }
  return false;
}

/**
 * Extracts dispatch metadata from item tags and fields.
 */
export function decodeDispatchData(item) {
  if (!item) return null;

  const tags = Array.isArray(item.tags) ? item.tags : [];
  const getTagValue = (prefix) => {
    const match = tags.find(t => String(t).startsWith(prefix));
    return match ? decodeURIComponent(match.slice(prefix.length)) : null;
  };

  let destinationId = getTagValue('dispatch_dest:');
  if (destinationId === 'ANZO') destinationId = 'ANZO_QC';
  if (destinationId === 'ANZOTW') destinationId = 'ANZO_TW';

  if (!destinationId) {
    const s = String(item.status || '').toLowerCase();
    if (s.includes('buyer')) destinationId = 'BUYER';
    else if (s.includes('anzo qc china')) destinationId = 'ANZO_QC_CHINA';
    else if (s.includes('anzo qc')) destinationId = 'ANZO_QC';
    else if (s.includes('anzo tw') || s.includes('anzotw')) destinationId = 'ANZO_TW';
    else if (s.includes('anzo')) destinationId = 'ANZO_QC';
    else if (s.includes('rdtw')) destinationId = 'RDTW';
    else if (s.includes('rdc')) destinationId = 'RDC';
    else destinationId = 'LAINNYA';
  }

  const destinationLabel = getTagValue('dispatch_dest_name:') || (
    DISPATCH_DESTINATIONS.find(d => d.id === destinationId)?.label || destinationId || 'Lainnya'
  );

  const buyerName = getTagValue('dispatch_buyer:') || '';

  const type = getTagValue('dispatch_type:') || (
    String(item.status || '').toLowerCase().includes('permanent') ||
    String(item.status || '').toLowerCase().includes('permanen') ? 'PERMANENT' : 'REVIEW'
  );

  const date = getTagValue('dispatch_date:') || item.dateIn || item.tanggal || new Date().toISOString().split('T')[0];
  const originBox = Number(getTagValue('dispatch_origin_box:') || item.originBoxNumber || item.boxNumber || 1);
  const pic = getTagValue('dispatch_pic:') || item.picName || 'Royan';
  const recipient = getTagValue('dispatch_recipient:') || '';
  const notes = getTagValue('dispatch_notes:') || item.description || item.deskripsi || '';
  const invoiceNo = getTagValue('dispatch_invoice:') || (notes.match(/Invoice:\s*([^\s|]+)/i)?.[1] || '');

  return {
    destinationId,
    destinationLabel,
    buyerName,
    type, // 'PERMANENT' | 'REVIEW'
    date,
    originBox,
    pic,
    recipient,
    notes,
    invoiceNo,
  };
}

/**
 * Encodes dispatch metadata into an array of tags safe for Supabase storage.
 */
export function encodeDispatchTags({ destinationId, destinationLabel, type, date, originBox, pic, recipient, notes, buyerName, invoiceNo }, existingTags = []) {
  const cleanExisting = (Array.isArray(existingTags) ? existingTags : []).filter(
    t => !String(t).startsWith('dispatch') && !String(t).startsWith('dispatch_')
  );

  const tags = [
    ...cleanExisting,
    'DISPATCH',
    `dispatch_dest:${encodeURIComponent(destinationId || 'LAINNYA')}`,
    `dispatch_dest_name:${encodeURIComponent(destinationLabel || destinationId || 'Lainnya')}`,
    `dispatch_type:${encodeURIComponent(type || 'REVIEW')}`,
    `dispatch_date:${encodeURIComponent(date || new Date().toISOString().split('T')[0])}`,
    `dispatch_origin_box:${encodeURIComponent(String(originBox || 1))}`,
    `dispatch_pic:${encodeURIComponent(pic || '')}`,
    `dispatch_recipient:${encodeURIComponent(recipient || '')}`,
    `dispatch_notes:${encodeURIComponent(notes || '')}`,
  ];

  if (invoiceNo) {
    tags.push(`dispatch_invoice:${encodeURIComponent(invoiceNo)}`);
  }

  if (buyerName) {
    tags.push(`dispatch_buyer:${encodeURIComponent(buyerName)}`);
  }

  return tags;
}

/**
 * Gets color class for a destination.
 */
export function getDestinationColor(destId) {
  const cleanId = String(destId || '').toUpperCase();
  if (cleanId === 'ANZO') return 'bg-blue-100 text-blue-800 border-blue-300';
  if (cleanId === 'ANZOTW') return 'bg-amber-100 text-amber-800 border-amber-300';
  const found = DISPATCH_DESTINATIONS.find(d => d.id === cleanId);
  return found ? found.color : 'bg-slate-100 text-slate-800 border-slate-300';
}

/**
 * Smart parser for free-form multi-line sending info reference text.
 * Extracts buyer name, full address, ATTN, and TEL if present.
 */
export function parseSendingInfoText(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { name: '', address: '', attn: '', tel: '' };
  }

  let name = lines[0] || '';
  let address = '';
  let attn = '';
  let email = '';
  let tel = '';
  let courier = '';
  let accountNo = '';

  for (const line of lines) {
    // Check for Email
    const emailMatch = line.match(/(?:EMAIL\s*:\s*|mailto:)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      email = emailMatch[1].trim();
    }
    // Check for ATTN
    const attnMatch = line.match(/ATTN\s*:\s*([^EMAIL\nTEL]+)/i);
    if (attnMatch) {
      attn = attnMatch[1].trim();
    }
    // Check for TEL
    const telMatch = line.match(/TEL\s*:\s*([^\n]+)/i);
    if (telMatch) {
      tel = telMatch[1].trim();
    }
    // Check for Address
    const addrMatch = line.match(/Address\s*:\s*([^ATTN\n]+)/i);
    if (addrMatch) {
      address = addrMatch[1].trim();
    }
    // Check for Courier
    if (/DHL/i.test(line)) courier = 'DHL';
    else if (/FEDEX/i.test(line)) courier = 'FEDEX';
    else if (/UPS/i.test(line)) courier = 'UPS';
    else if (/SF\s*EXPRESS/i.test(line)) courier = 'SF EXPRESS';
    else if (/TNT/i.test(line)) courier = 'TNT';

    // Check for Account No
    const accMatch = line.match(/(?:A\/C|ACC(?:OUNT)?(?:\s*NO\.?)?)\s*:\s*([^\n|;]+)/i);
    if (accMatch) {
      accountNo = accMatch[1].trim();
    }
  }

  // If address wasn't prefixed with "Address:", take line 2 if available
  if (!address && lines.length > 1) {
    const line2 = lines[1];
    if (!line2.toUpperCase().startsWith('ATTN:') && !line2.toUpperCase().startsWith('TEL:') && !line2.toUpperCase().startsWith('EMAIL:')) {
      address = line2.replace(/^Address:\s*/i, '').trim();
    }
  }

  // Clean buyer name if line 1 has "BUYER:"
  if (name.toUpperCase().startsWith('BUYER:')) {
    name = name.replace(/^BUYER:\s*/i, '').trim();
  }

  return { name, address, attn, email, tel, courier, accountNo };
}

/**
 * Exports an Invoice & Packing List document into a formatted Excel (.xlsx) file.
 */
export async function exportInvoiceToExcel({
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
  picName,
}) {
  const XLSX = await import('xlsx');

  const fullAddress = [consigneeName, consigneeAddress].filter(Boolean).join('. ');
  const courierInfo = [courierName || 'COURIER / AIR FREIGHT', courierAccount ? `ACC NO: ${courierAccount}` : ''].filter(Boolean).join('    ');

  const aoa = [
    ['PT GAGACLO'],
    ['Jl. Tambak Aji Timur No 1 Ngaliyan Semarang Tel: 0062-24-8661188 Email : zuniarto@gagaclo.com'],
    ['INVOICE & PACKING LIST'],
    [],
    ['DATE', ':', shippingDate || new Date().toISOString().slice(0, 10), '', '', '', '', 'FROM', ':', fromLocation || 'SEMARANG, INDONESIA'],
    ['INVOICE NO', ':', invoiceNo || '-'],
    ['SHIP TO (COMPANY NAME, ADDRESS)', ':', fullAddress],
    ['ATTN', ':', attn || '-', '', 'TEL :', tel || '-', '', 'EMAIL :', email || '-'],
    ['PAYMENT BY', ':', paymentBy || 'FREIGHT COLLECT (RECEIVER PAY)'],
    ['SHIPMENT BY', ':', courierInfo],
    ['INVOICE VALUE', ':', 'USD'],
    [],
    [
      'NO',
      'HS CODE',
      'ITEM NO.',
      'ORDER NAME',
      'DETAIL',
      'STYLE',
      'COLOR',
      'SIZE',
      'AMOUNT',
      'UNIT',
      'UNIT PRICE (USD)',
      'TOTAL PRICE (USD)',
    ],
  ];

  (itemRows || []).forEach((row, idx) => {
    const qty = Number(row.qty || 1);
    const unitPrice = Number(row.unitPrice || 1);
    const rowTotal = (qty * unitPrice).toFixed(2);

    aoa.push([
      idx + 1,
      row.hsCode || '-',
      row.kode || row.sku || '-',
      row.orderName || row.sampleNo || '-',
      row.detail || row.category || row.namaBarang || '-',
      row.style || '-',
      row.color || 'Multi Color',
      row.size || 'ONE SIZE',
      qty,
      row.unit || 'PCS',
      unitPrice,
      parseFloat(rowTotal),
    ]);
  });

  // Total Row
  aoa.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(totalPcs || 0),
    'PCS',
    '',
    parseFloat(String(totalPrice || 0).replace(',', '.')),
  ]);

  aoa.push([]);

  // Specifications Footer: Package Type, Dimension, and Weights
  aoa.push([
    packageType || 'CARTON',
    '',
    `${packageType === 'CARTON' ? 'CARTON DIMENSION' : 'BAG DIMENSION'} :`,
    cartonSize || '35 x 25 x 8 cm',
    '',
    '',
    '',
    '',
    `${netWeight || '0,17'} KG (WEIGHT NW)`,
    '',
    `${grossWeight || '1,17'} KG (WEIGHT GW)`,
    '',
  ]);

  aoa.push(['SAMPLES OF NO COMMERCIAL VALUE']);
  aoa.push([]);

  // Signature Block
  aoa.push([
    'Yang Menyerahkan (R&D)',
    '',
    '',
    'Yang Membawa (Driver/Kurir)',
    '',
    '',
    `Yang Menerima (${consigneeName || 'Buyer'})`,
  ]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([
    `( ${picName || 'Royan'} )`,
    '',
    '',
    '( ..................................... )',
    '',
    '',
    `( ${attn || '.....................................'} )`,
  ]);
  aoa.push([
    'PIC Sample Studio',
    '',
    '',
    'Ekspedisi / Internal',
    '',
    '',
    'Nama Jelas & Cap',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 15 }, // HS CODE
    { wch: 16 }, // ITEM NO.
    { wch: 20 }, // ORDER NAME
    { wch: 24 }, // DETAIL
    { wch: 26 }, // STYLE
    { wch: 16 }, // COLOR
    { wch: 14 }, // SIZE
    { wch: 10 }, // AMOUNT
    { wch: 8 },  // UNIT
    { wch: 18 }, // UNIT PRICE
    { wch: 18 }, // TOTAL PRICE
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'INVOICE & PACKING LIST');

  const safeInv = String(invoiceNo || 'DRAFT').replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeBuyer = String(consigneeName || 'BUYER').replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `INVOICE_${safeInv}_${safeBuyer}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
