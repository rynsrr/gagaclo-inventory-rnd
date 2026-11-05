import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from .env or localStorage
export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('gagaclo_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('gagaclo_supabase_anon_key') || '' : '';

  const url = (envUrl || localUrl).trim();
  const anonKey = (envKey || localKey).trim();
  const isConfigured = Boolean(url && anonKey && url.includes('supabase.co'));

  return { url, anonKey, isConfigured, source: envUrl ? 'env' : (localUrl ? 'localStorage' : 'none') };
}

const config = getSupabaseConfig();
export let supabase = config.isConfigured
  ? createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/**
 * Initializes or switches Supabase client dynamically
 */
export function initSupabase(url, anonKey) {
  const cleanUrl = (url || '').trim();
  const cleanKey = (anonKey || '').trim();

  if (cleanUrl && cleanKey && cleanUrl.includes('supabase.co')) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gagaclo_supabase_url', cleanUrl);
      localStorage.setItem('gagaclo_supabase_anon_key', cleanKey);
    }
    supabase = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return supabase;
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gagaclo_supabase_url');
      localStorage.removeItem('gagaclo_supabase_anon_key');
    }
    supabase = null;
    return null;
  }
}

/**
 * Tests connection with specific or current credentials
 */
export async function testSupabaseConnection(url, anonKey) {
  try {
    const testClient = (url && anonKey) 
      ? createClient(url.trim(), anonKey.trim()) 
      : supabase;

    if (!testClient) {
      return { success: false, message: 'URL atau Anon Key Supabase belum diisi.' };
    }

    const { data, error } = await testClient.from('items').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          success: false,
          code: 'TABLE_NOT_FOUND',
          message: 'Tersambung ke Supabase, namun tabel "items" belum dibuat. Jalankan supabase_schema.sql di SQL Editor Supabase Anda.',
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Koneksi ke Supabase Corporate Gagaclo Berhasil!' };
  } catch (err) {
    return { success: false, message: err.message || 'Gagal menghubungi server Supabase.' };
  }
}

// -------------------------------------------------------------
// Data Converters between Frontend (camelCase) and Supabase DB
// -------------------------------------------------------------

export function localItemToDb(item) {
  return {
    id: String(item.id),
    sku: item.sku || item.kode || '',
    kode: item.kode || item.sku || '',
    buyer_no: item.buyerNo || item.buyer_no || '-',
    jenis_sample: item.jenisSample || item.jenis_sample || 'DEVELOP',
    style: item.style || '',
    sample_no: item.sampleNo ?? item.sample_no ?? '',
    size: item.size || '',
    name: item.name || item.deskripsi || '',
    description: item.description || item.deskripsi || '',
    deskripsi: item.deskripsi || item.description || '',
    color: item.color || '',
    qty: Number(item.qty || item.jumlah || 1),
    jumlah: Number(item.jumlah || item.qty || 1),
    unit: item.unit || item.satuan || 'PCS',
    satuan: item.satuan || item.unit || 'PCS',
    box_number: Number(item.boxNumber ?? item.box_number ?? 1),
    rack_id: Number(item.rackId ?? item.rack_id ?? 0),
    rack_name: item.rackName || item.rack_name || 'RACK 1',
    pic_name: item.picName || item.pic_name || 'Royan',
    category: item.category || 'SAMPLE',
    status: item.status || 'In Storage',
    track: item.track || '-',
    place: item.place || '',
    date_in: item.dateIn || item.date_in || new Date().toISOString().split('T')[0],
    tanggal: item.tanggal || item.dateIn || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    updated_at: new Date().toISOString(),
  };
}

export function dbItemToLocal(db) {
  return {
    id: db.id,
    sku: db.sku || db.kode || '',
    kode: db.kode || db.sku || '',
    buyerNo: db.buyer_no || db.buyerNo || '-',
    jenisSample: db.jenis_sample || db.jenisSample || 'DEVELOP',
    style: db.style || '',
    sampleNo: db.sample_no ?? db.sampleNo ?? '',
    size: db.size || '',
    name: db.name || db.deskripsi || '',
    description: db.description || db.deskripsi || '',
    deskripsi: db.deskripsi || db.description || '',
    color: db.color || '',
    qty: Number(db.qty ?? db.jumlah ?? 1),
    jumlah: Number(db.jumlah ?? db.qty ?? 1),
    unit: db.unit || db.satuan || 'PCS',
    satuan: db.satuan || db.unit || 'PCS',
    boxNumber: Number(db.box_number ?? db.boxNumber ?? 1),
    rackId: Number(db.rack_id ?? db.rackId ?? (db.rack_name === 'LANTAI' ? 0 : 1)),
    rackName: db.rack_name || db.rackName || 'RACK 1',
    picName: db.pic_name || db.picName || 'Royan',
    category: db.category || 'SAMPLE',
    status: db.status || 'In Storage',
    track: db.track || '-',
    place: db.place || '',
    dateIn: db.date_in || db.tanggal || '',
    tags: Array.isArray(db.tags) ? db.tags : [],
  };
}

export function localBoxToDb(box) {
  const bNum = Number(box.boxNumber ?? box.box_number ?? 1);
  return {
    box_number: bNum,
    code: box.code || `BOX-${String(bNum).padStart(2, '0')}`,
    rack_id: Number(box.rackId ?? box.rack_id ?? 0),
    rack_name: box.rackName || box.rack_name || (Number(box.rackId ?? box.rack_id) === 0 ? 'LANTAI' : 'RACK 1'),
    category: box.category || 'SAMPLE',
    pic_name: box.picName || box.pic_name || 'Royan',
    notes: box.notes ?? '',
    updated_at: new Date().toISOString(),
  };
}

export function dbBoxToLocal(db, defaultBoxes = []) {
  const defaultBox = defaultBoxes.find(b => Number(b.boxNumber) === Number(db.box_number)) || {};
  return {
    ...defaultBox,
    boxNumber: Number(db.box_number),
    code: db.code || defaultBox.code,
    // Use ?? so rackId 0 (LANTAI / floor) is preserved instead of falling back to 1
    rackId: Number(db.rack_id ?? defaultBox.rackId ?? (db.rack_name === 'LANTAI' ? 0 : 1)),
    rackName: db.rack_name || defaultBox.rackName || 'LANTAI',
    rackDescription: defaultBox.rackDescription || (db.rack_name === 'LANTAI' ? 'Lantai (tanpa rak)' : ''),
    location: defaultBox.location || (db.rack_name === 'LANTAI' ? 'Lantai (tanpa rak)' : ''),
    category: db.category || defaultBox.category || 'SAMPLE',
    picName: db.pic_name || defaultBox.picName || 'Royan',
    // Leave ppicId empty when unknown: guessing 'royan' here would make a
    // rename of that person incorrectly reassign unrelated remote boxes.
    ppicId: defaultBox.ppicId || '',
    ppicNumber: defaultBox.ppicNumber ?? 0,
    capacityLimit: defaultBox.capacityLimit ?? 20,
    notes: db.notes ?? defaultBox.notes ?? '',
    isFull: db.is_full === true,
  };
}

export function localTrxToDb(trx) {
  return {
    id: String(trx.id),
    item_id: trx.itemId ? String(trx.itemId) : null,
    item_name: trx.itemName || '',
    sku: trx.sku || trx.kode || '',
    box_number: trx.boxNumber ? Number(trx.boxNumber) : null,
    type: trx.type || 'IN',
    qty: Number(trx.qty) || 1,
    unit: trx.unit || 'PCS',
    pic_name: trx.picName || '',
    date: trx.date || new Date().toISOString(),
    notes: trx.notes || '',
  };
}

export function dbTrxToLocal(db) {
  return {
    id: db.id,
    itemId: db.item_id,
    itemName: db.item_name,
    sku: db.sku,
    boxNumber: db.box_number,
    type: db.type,
    qty: Number(db.qty) || 1,
    unit: db.unit,
    picName: db.pic_name,
    date: db.date,
    notes: db.notes,
  };
}

export function localIssueToDb(iss) {
  return {
    id: String(iss.id),
    title: iss.title || '',
    description: iss.description || '',
    type: iss.type || 'BUG',
    priority: iss.priority || 'MEDIUM',
    status: iss.status || 'OPEN',
    reporter_name: iss.reporterName || iss.reporter_name || 'Tim R&D',
    location: iss.location || 'Umum',
    notes: iss.notes || '',
    created_at: iss.createdAt || iss.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function dbIssueToLocal(db) {
  return {
    id: String(db.id),
    title: db.title || '',
    description: db.description || '',
    type: db.type || 'BUG',
    priority: db.priority || 'MEDIUM',
    status: db.status || 'OPEN',
    reporterName: db.reporter_name || db.reporterName || 'Tim R&D',
    location: db.location || 'Umum',
    notes: db.notes || '',
    createdAt: db.created_at || db.createdAt || new Date().toISOString(),
    updatedAt: db.updated_at || db.updatedAt || new Date().toISOString(),
  };
}
