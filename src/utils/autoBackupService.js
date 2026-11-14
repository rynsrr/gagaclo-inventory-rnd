import { getLocalTodayIso } from './dateUtils';

const AUTO_BACKUP_ENABLED_KEY = 'gagaclo_auto_backup_enabled';
const LAST_BACKUP_DATE_KEY = 'gagaclo_last_auto_backup_date';
const LAST_BACKUP_TIME_KEY = 'gagaclo_last_auto_backup_time';
const SNAPSHOTS_KEY = 'gagaclo_daily_snapshots_v1';
const MAX_SNAPSHOTS = 7; // Simpan arsip riwayat snapshot 7 hari terakhir

/**
 * Cek apakah fitur auto-backup harian aktif (default: aktif / true)
 */
export function isAutoBackupEnabled() {
  try {
    const val = localStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Atur status aktif/nonaktif auto-backup harian
 */
export function setAutoBackupEnabled(enabled) {
  try {
    localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Mendapatkan informasi kapan backup otomatis terakhir dijalankan
 */
export function getLastAutoBackupInfo() {
  try {
    const lastDate = localStorage.getItem(LAST_BACKUP_DATE_KEY);
    const lastTime = localStorage.getItem(LAST_BACKUP_TIME_KEY);
    return {
      date: lastDate || null,
      timestamp: lastTime ? Number(lastTime) : null,
      isToday: lastDate === getLocalTodayIso(),
    };
  } catch {
    return { date: null, timestamp: null, isToday: false };
  }
}

/**
 * Membuat paket data lengkap untuk backup JSON
 */
export function createBackupPayload({
  racks = [],
  ppicMembers = [],
  boxes = [],
  items = [],
  transactions = [],
  users = [],
}) {
  let dailyTargetTeam = 150;
  let individualTargets = {};
  try {
    const t = localStorage.getItem('gagaclo_daily_target_pcs');
    if (t) dailyTargetTeam = Number(t);
    const it = localStorage.getItem('gagaclo_individual_targets');
    if (it) individualTargets = JSON.parse(it);
  } catch {}

  return {
    appName: 'GAGACLO - Storage Inventory Management RND',
    version: '2.0',
    exportDate: new Date().toISOString(),
    timestamp: Date.now(),
    dateFormatted: new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date()),
    summary: {
      totalBoxes: boxes.length,
      totalItems: items.length,
      totalTransactions: transactions.length,
      totalUsers: users.length,
      dailyTargetTeam,
    },
    racks,
    ppicMembers,
    boxes,
    items,
    transactions,
    users,
    targets: {
      dailyTargetTeam,
      individualTargets,
    },
  };
}

/**
 * Memicu pengunduhan file JSON fisik ke folder Downloads
 */
export function downloadBackupFile(payload, customFilename) {
  const todayIso = getLocalTodayIso();
  const filename = customFilename || `GAGACLO_AUTO_BACKUP_${todayIso}.json`;
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);

  return filename;
}

/**
 * Mengambil daftar riwayat snapshot cadangan lokal di peramban
 */
export function getLocalSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Menyimpan snapshot cadangan harian ke penyimpanan lokal internal (rotasi 7 hari)
 */
export function saveLocalSnapshot(payload) {
  try {
    const todayIso = getLocalTodayIso();
    const existing = getLocalSnapshots();

    // Hapus snapshot tanggal yang sama jika sudah ada (perbarui dengan yang terbaru)
    const filtered = existing.filter((s) => s.date !== todayIso);

    const newSnapshot = {
      id: `snapshot-${todayIso}`,
      date: todayIso,
      timestamp: Date.now(),
      formattedTime: new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
      summary: payload.summary,
      payload,
    };

    const updated = [newSnapshot, ...filtered].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    return newSnapshot;
  } catch (e) {
    console.error('Gagal menyimpan local backup snapshot:', e);
    return null;
  }
}

/**
 * Pemeriksa & Eksekutor Utama Auto-Backup Harian:
 * Otomatis mendownload file JSON dan menyimpan snapshot lokal 1x setiap hari baru.
 */
export function checkAndTriggerDailyAutoBackup(data, showNotification, force = false) {
  if (!isAutoBackupEnabled() && !force) return false;

  // Pastikan data telah dimuat minimal ada item atau box
  if (!data?.boxes || data.boxes.length === 0) return false;

  const todayIso = getLocalTodayIso();
  const lastInfo = getLastAutoBackupInfo();

  // Jika sudah dibackup hari ini dan bukan pemanggilan paksa, cukup perbarui snapshot diam-diam
  if (lastInfo.date === todayIso && !force) {
    return false;
  }

  try {
    const payload = createBackupPayload(data);

    // 1. Simpan snapshot lokal internal
    saveLocalSnapshot(payload);

    // 2. Unduh file fisik ke folder Downloads
    const filename = downloadBackupFile(payload, `GAGACLO_AUTO_BACKUP_${todayIso}.json`);

    // 3. Catat tanggal & waktu keberhasilan
    localStorage.setItem(LAST_BACKUP_DATE_KEY, todayIso);
    localStorage.setItem(LAST_BACKUP_TIME_KEY, String(Date.now()));

    // 4. Munculkan notifikasi yang menenangkan pengguna
    if (showNotification) {
      showNotification(
        `Backup otomatis harian berhasil disimpan & diunduh: ${filename}`,
        'success',
        5000
      );
    }

    return true;
  } catch (err) {
    console.error('Auto backup harian gagal dieksekusi:', err);
    return false;
  }
}
