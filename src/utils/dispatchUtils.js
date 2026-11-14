/**
 * Utility functions for R&D Sample Dispatch / Outgoing tracking.
 * Destinations: BUYER, ANZO, RDTW, RDC, ANZOTW, or CUSTOM
 * Types: PERMANENT (Keluar Permanen), REVIEW (Review Sementara / Bisa Kembali)
 */

export const DISPATCH_DESTINATIONS = [
  { id: 'BUYER', label: 'Buyer', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'ANZO', label: 'Anzo', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'RDTW', label: 'RDTW', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'RDC', label: 'RDC', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'ANZOTW', label: 'ANZOTW', color: 'bg-amber-100 text-amber-800 border-amber-300' },
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
    description: 'Kirim untuk review ke RDC/RDTW/ANZOTW, ditunggu kembali ke R&D.',
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

  const destinationId = getTagValue('dispatch_dest:') || (
    String(item.status || '').toLowerCase().includes('buyer') ? 'BUYER' :
    String(item.status || '').toLowerCase().includes('anzotw') ? 'ANZOTW' :
    String(item.status || '').toLowerCase().includes('anzo') ? 'ANZO' :
    String(item.status || '').toLowerCase().includes('rdtw') ? 'RDTW' :
    String(item.status || '').toLowerCase().includes('rdc') ? 'RDC' : 'LAINNYA'
  );

  const destinationLabel = getTagValue('dispatch_dest_name:') || (
    DISPATCH_DESTINATIONS.find(d => d.id === destinationId)?.label || destinationId || 'Lainnya'
  );

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
export function encodeDispatchTags({ destinationId, destinationLabel, type, date, originBox, pic, recipient, notes }, existingTags = []) {
  const cleanExisting = (Array.isArray(existingTags) ? existingTags : []).filter(
    t => !String(t).startsWith('dispatch') && !String(t).startsWith('dispatch_')
  );

  return [
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
}

/**
 * Gets color class for a destination.
 */
export function getDestinationColor(destId) {
  const found = DISPATCH_DESTINATIONS.find(d => d.id === String(destId).toUpperCase());
  return found ? found.color : 'bg-slate-100 text-slate-800 border-slate-300';
}
