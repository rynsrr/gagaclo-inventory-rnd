import { getLocalTodayIso } from './dateUtils';
import { supabase } from '../lib/supabase';

const TARGET_HISTORY_KEY = 'gagaclo_daily_targets_history';
const LEGACY_TARGET_KEY = 'gagaclo_daily_target_pcs';
const TARGET_SET_BY_KEY = 'gagaclo_target_set_by';
const TARGET_NOTE_KEY = 'gagaclo_target_note';
const TARGET_UPDATED_AT_KEY = 'gagaclo_target_updated_at';

export const DEFAULT_TARGET_PCS = 150;
export const DEFAULT_TARGET_SET_BY = 'Jasmine';
export const DEFAULT_TARGET_NOTE = 'Target resmi R&D yang ditentukan oleh Jasmine';

/**
 * Mengambil seluruh riwayat target harian yang tersimpan
 * Format: { "YYYY-MM-DD": 150, ... }
 */
export function getDailyTargetsHistory() {
  try {
    const raw = localStorage.getItem(TARGET_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Mengambil siapa penentu target (default: 'Jasmine')
 */
export function getTargetSetBy() {
  try {
    return localStorage.getItem(TARGET_SET_BY_KEY) || DEFAULT_TARGET_SET_BY;
  } catch {
    return DEFAULT_TARGET_SET_BY;
  }
}

/**
 * Mengambil catatan / instruksi target dari Jasmine
 */
export function getTargetNote() {
  try {
    return localStorage.getItem(TARGET_NOTE_KEY) || DEFAULT_TARGET_NOTE;
  } catch {
    return DEFAULT_TARGET_NOTE;
  }
}

/**
 * Mengambil timestamp update terakhir target
 */
export function getTargetUpdatedAt() {
  try {
    return localStorage.getItem(TARGET_UPDATED_AT_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Mengambil target harian untuk tanggal tertentu.
 * Aturan bisnis:
 * 1. Jika tanggal tersebut punya target khusus yang telah diubah, gunakan nilai tersebut.
 * 2. Jika pada tanggal tersebut target TIDAK diubah, maka nilainya sama dengan hari sebelumnya
 *    (mencari tanggal tervalidasi terdekat sebelumnya).
 * 3. Jika tidak ada hari sebelumnya, gunakan fallback default (150 PCS).
 *
 * @param {string} [dateIso] - Format "YYYY-MM-DD" (default: hari ini)
 * @returns {number} Target PCS
 */
export function getDailyTargetForDate(dateIso) {
  const targetDate = dateIso || getLocalTodayIso();
  const history = getDailyTargetsHistory();

  // 1. Cek apakah tanggal ini punya target spesifik
  if (history[targetDate] && Number(history[targetDate]) > 0) {
    return Math.max(1, Number(history[targetDate]));
  }

  // 2. Jika tidak diubah pada tanggal ini, cari hari sebelumnya yang paling baru
  const recordedDates = Object.keys(history)
    .filter((d) => d <= targetDate && Number(history[d]) > 0)
    .sort((a, b) => b.localeCompare(a)); // Urutkan dari yang terbaru ke terlama

  if (recordedDates.length > 0) {
    const latestPrevDate = recordedDates[0];
    return Math.max(1, Number(history[latestPrevDate]));
  }

  // 3. Fallback ke legacy global target atau nilai default 150
  try {
    const legacy = localStorage.getItem(LEGACY_TARGET_KEY);
    if (legacy && Number(legacy) > 0) {
      return Math.max(1, Number(legacy));
    }
  } catch {}

  return DEFAULT_TARGET_PCS;
}

/**
 * Menerapkan payload target dari Cloud Supabase ke localStorage & memicu event pembaruan
 */
export function applyCloudTargetPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  try {
    const localHistory = getDailyTargetsHistory();
    const remoteHistory = (payload.history && typeof payload.history === 'object') ? payload.history : {};
    const mergedHistory = { ...localHistory, ...remoteHistory };

    const todayIso = getLocalTodayIso();
    const dailyTargetNum = Number(payload.dailyTarget) || Number(payload.qty) || Number(payload.targetPcs) || getDailyTargetForDate(todayIso);
    const setBy = payload.setBy || DEFAULT_TARGET_SET_BY;
    const note = payload.note !== undefined ? payload.note : (payload.deskripsi || getTargetNote());
    const updatedAt = payload.updatedAt || payload.updated_at || new Date().toISOString();

    // Pastikan hari ini memiliki target
    if (dailyTargetNum > 0 && !mergedHistory[todayIso]) {
      mergedHistory[todayIso] = dailyTargetNum;
    }

    localStorage.setItem(TARGET_HISTORY_KEY, JSON.stringify(mergedHistory));
    if (dailyTargetNum > 0) {
      localStorage.setItem(LEGACY_TARGET_KEY, String(dailyTargetNum));
    }
    localStorage.setItem(TARGET_SET_BY_KEY, setBy);
    if (note) localStorage.setItem(TARGET_NOTE_KEY, note);
    if (updatedAt) localStorage.setItem(TARGET_UPDATED_AT_KEY, updatedAt);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gagaclo_target_updated', {
        detail: {
          date: todayIso,
          target: dailyTargetNum,
          history: mergedHistory,
          setBy,
          note,
          updatedAt,
          source: 'cloud',
        }
      }));
    }

    return {
      dailyTarget: dailyTargetNum,
      history: mergedHistory,
      setBy,
      note,
      updatedAt,
    };
  } catch (err) {
    console.warn('Gagal memproses cloud target payload:', err);
    return null;
  }
}

/**
 * Menyinkronkan target ke Supabase Cloud (Dual storage: items SYSTEM_CONFIG_TARGET_JASMINE & boxes 999999)
 */
export async function syncTargetToCloud(client, targetData) {
  const sb = client || supabase || (typeof window !== 'undefined' ? window.__gagaclo_supabase : null);
  if (!sb) return null;

  const nowIso = new Date().toISOString();
  const todayIso = getLocalTodayIso();
  const num = Number(targetData.dailyTarget) || getDailyTargetForDate(todayIso);
  const history = targetData.history || getDailyTargetsHistory();
  const setBy = targetData.setBy || DEFAULT_TARGET_SET_BY;
  const note = targetData.note !== undefined ? targetData.note : getTargetNote();

  const payload = {
    dailyTarget: num,
    history,
    setBy,
    note,
    updatedAt: nowIso,
  };

  try {
    // 1. Simpan ke items table: SYSTEM_CONFIG_TARGET_JASMINE
    await sb.from('items').upsert({
      id: 'SYSTEM_CONFIG_TARGET_JASMINE',
      sku: 'TARGET_JASMINE',
      kode: 'TARGET_JASMINE',
      name: `TARGET JASMINE CONFIG`,
      description: String(num),
      deskripsi: JSON.stringify(payload),
      box_number: 999999,
      rack_id: -1,
      qty: num,
      updated_at: nowIso,
    }, { onConflict: 'id' });

    // 2. Simpan juga ke boxes row 999999 (SYSTEM_TIMER) sebagai cadangan redundant
    const boxNotes = JSON.stringify({
      targetJasmine: payload,
      deadline: Date.now() + 7 * 86400000,
      note,
      setBy,
      targetPcs: num,
      updatedAt: nowIso,
    });
    await sb.from('boxes').upsert({
      box_number: 999999,
      code: 'SYSTEM_TIMER',
      rack_id: -1,
      rack_name: 'SYSTEM',
      category: 'CONFIG',
      pic_name: setBy,
      notes: boxNotes,
      updated_at: nowIso,
    }, { onConflict: 'box_number' });

    // 3. Kirim broadcast realtime agar semua perangkat yang sedang online langsung update detik itu juga
    try {
      const channel = sb.channel('gagaclo_inventory_realtime');
      channel.send({
        type: 'broadcast',
        event: 'INVENTORY_CHANGED',
        payload: {
          action: 'TARGET_JASMINE_UPDATED',
          ...payload,
        },
      });
    } catch {}

    return payload;
  } catch (err) {
    console.warn('Gagal menyimpan target ke Supabase Cloud:', err);
    return null;
  }
}

/**
 * Fetch cepat target langsung dari Supabase saat aplikasi dibuka (latency rendah ~50ms)
 */
export async function fetchTargetFromCloudFast(client) {
  const sb = client || supabase || (typeof window !== 'undefined' ? window.__gagaclo_supabase : null);
  if (!sb) return null;

  try {
    // Coba ambil dari SYSTEM_CONFIG_TARGET_JASMINE
    const { data: itemData } = await sb
      .from('items')
      .select('deskripsi, description, qty, updated_at')
      .eq('id', 'SYSTEM_CONFIG_TARGET_JASMINE')
      .maybeSingle();

    if (itemData?.deskripsi) {
      try {
        const parsed = JSON.parse(itemData.deskripsi);
        if (parsed) {
          return applyCloudTargetPayload({
            ...parsed,
            updatedAt: parsed.updatedAt || itemData.updated_at,
          });
        }
      } catch {}
    }

    // Fallback ambil dari boxes row 999999
    const { data: boxData } = await sb
      .from('boxes')
      .select('notes, updated_at')
      .eq('box_number', 999999)
      .maybeSingle();

    if (boxData?.notes) {
      try {
        const parsed = JSON.parse(boxData.notes);
        if (parsed?.targetJasmine) {
          return applyCloudTargetPayload({
            ...parsed.targetJasmine,
            updatedAt: parsed.targetJasmine.updatedAt || boxData.updated_at,
          });
        }
        if (parsed?.deadline || parsed?.note) {
          return applyCloudTargetPayload({
            dailyTarget: Number(parsed.targetPcs) || 150,
            note: parsed.note || DEFAULT_TARGET_NOTE,
            setBy: parsed.setBy || DEFAULT_TARGET_SET_BY,
            updatedAt: parsed.updatedAt || boxData.updated_at,
          });
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Fast fetch target cloud gagal:', err);
  }
  return null;
}

/**
 * Menyimpan target harian untuk tanggal tertentu (LocalStorage + Supabase Cloud Sync)
 *
 * @param {string} dateIso - Format "YYYY-MM-DD"
 * @param {number} targetPcs - Nilai target baru
 * @param {object} [meta] - { setBy, note, supabase }
 */
export function saveDailyTargetForDate(dateIso, targetPcs, meta = {}) {
  const dateKey = dateIso || getLocalTodayIso();
  const num = Math.max(1, parseInt(targetPcs, 10) || DEFAULT_TARGET_PCS);
  const history = getDailyTargetsHistory();

  history[dateKey] = num;
  const nowIso = new Date().toISOString();
  const setBy = meta.setBy || DEFAULT_TARGET_SET_BY;
  const note = meta.note !== undefined ? meta.note : getTargetNote();

  try {
    localStorage.setItem(TARGET_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(LEGACY_TARGET_KEY, num.toString());
    localStorage.setItem(TARGET_SET_BY_KEY, setBy);
    localStorage.setItem(TARGET_UPDATED_AT_KEY, nowIso);
    if (note) localStorage.setItem(TARGET_NOTE_KEY, note);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gagaclo_target_updated', {
        detail: {
          date: dateKey,
          target: num,
          history,
          setBy,
          note,
          updatedAt: nowIso,
          source: 'local',
        }
      }));
    }
  } catch (err) {
    console.warn('Gagal menyimpan target harian ke localStorage:', err);
  }

  // Sync ke Supabase Cloud
  const sbClient = meta.supabase || supabase || (typeof window !== 'undefined' ? window.__gagaclo_supabase : null);
  if (sbClient) {
    syncTargetToCloud(sbClient, {
      dailyTarget: num,
      history,
      setBy,
      note,
      updatedAt: nowIso,
    });
  }

  return num;
}
