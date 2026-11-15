import { getLocalTodayIso } from './dateUtils';

const TARGET_HISTORY_KEY = 'gagaclo_daily_targets_history';
const LEGACY_TARGET_KEY = 'gagaclo_daily_target_pcs';
const DEFAULT_TARGET_PCS = 150;

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
 * Menyimpan target harian untuk tanggal tertentu
 *
 * @param {string} dateIso - Format "YYYY-MM-DD"
 * @param {number} targetPcs - Nilai target baru
 */
export function saveDailyTargetForDate(dateIso, targetPcs) {
  const dateKey = dateIso || getLocalTodayIso();
  const num = Math.max(1, parseInt(targetPcs, 10) || DEFAULT_TARGET_PCS);
  const history = getDailyTargetsHistory();

  history[dateKey] = num;

  try {
    localStorage.setItem(TARGET_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(LEGACY_TARGET_KEY, num.toString());
    window.dispatchEvent(new CustomEvent('gagaclo_target_updated', {
      detail: { date: dateKey, target: num }
    }));
  } catch (err) {
    console.warn('Gagal menyimpan target harian ke localStorage:', err);
  }

  return num;
}
