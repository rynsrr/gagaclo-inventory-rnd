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
  };
}

/**
 * Encodes dispatch metadata into an array of tags safe for Supabase storage.
 */
export function encodeDispatchTags({ destinationId, destinationLabel, type, date, originBox, pic, recipient, notes, buyerName }, existingTags = []) {
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
