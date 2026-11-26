import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  RACKS_DATA,
  PPIC_MEMBERS,
  HELPER_MEMBERS,
  MANAGER_MEMBERS,
  ALL_INITIAL_USERS,
  generateInitialBoxes,
  INITIAL_ITEMS,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';
import {
  supabase,
  getSupabaseConfig,
  initSupabase,
  testSupabaseConnection,
  localItemToDb,
  dbItemToLocal,
  localBoxToDb,
  dbBoxToLocal,
  localTrxToDb,
  dbTrxToLocal,
  localIssueToDb,
  dbIssueToLocal,
} from '../lib/supabase';
import { getMergedSuggestions, recordInputtedData, removeSuggestionItem } from '../utils/suggestionStore';
import { collectHistoricalCodeRevisions, filterUnrecordedRevisions, revisionKey } from '../utils/codeRevisionHistory';
import { resolveUniqueCode, getNextSampleCode, getNextMaterialCode, allocateNextSequentialCode, allocateSequentialCodeBatch, normalizeSequentialCode, releaseCode } from '../utils/sequenceResolver';
import { isItemDispatched, encodeDispatchTags, decodeDispatchData } from '../utils/dispatchUtils';
import { isSuperuser, isHelper, isManager } from '../utils/authUtils';
import { getLocalTodayIso, formatToDDMMYYYY } from '../utils/dateUtils';
export { isSuperuser, isHelper, isManager };
import {
  checkAndTriggerDailyAutoBackup,
  createBackupPayload,
  downloadBackupFile,
  getLocalSnapshots,
  saveLocalSnapshot,
  getLastAutoBackupInfo,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
} from '../utils/autoBackupService';
import {
  fetchTargetFromCloudFast,
  applyCloudTargetPayload,
  saveDailyTargetForDate,
  getDailyTargetForDate,
  getTargetSetBy,
  getTargetNote,
  getTargetUpdatedAt,
  getDailyTargetsHistory,
} from '../utils/targetUtils';
import { getStoredGeminiKey, saveStoredGeminiKey } from '../utils/aiLabelScanner';

const InventoryContext = createContext(null);

export const DEFAULT_ANNOUNCEMENT = {
  id: 'announcement_rnd_multi_v2',
  title: 'Pengumuman Penting Operasional R&D',
  updatedAt: '2026-11-16T06:45:00.000Z',
  isActive: true,
  items: [
    {
      id: 'point-1',
      title: 'Standardisasi Kode Sampel untuk Tim IT',
      badge: 'POIN 1 • KODE SAMPEL IT',
      badgeType: 'amber',
      content: `Per hari ini, seluruh kode sampel yang berasal dari atau berhubungan dengan divisi IT WAJIB disinkronkan dan mengikuti struktur penomoran kode inventory R&D resmi.

Dilarang menggunakan format kode manual bebas atau format lama internal IT. Seluruh data sampel IT harus terintegrasi dengan kode master R&D agar tidak terjadi selisih stok fisik di lapangan.`,
      exampleCorrect: 'GGC-RND-2026-XXXX (Mengikuti kode master R&D resmi)',
      exampleWrong: 'Kode format manual bebas / format acak internal IT lama',
      exampleNotes: 'Koordinasikan dengan Leader jika sampel IT belum memiliki kode master R&D.',
      author: 'Supervisor / Leader R&D',
    },
    {
      id: 'point-2',
      title: 'Prioritas Asistensi & Support Style Alokasi Ami',
      badge: 'POIN 2 • PRIORITAS SUPPORT (AMI KELUAR)',
      badgeType: 'rose',
      content: `Sehubungan dengan Ami yang telah keluar dari tim, seluruh Tim Support (Sheva, Ade, Tri) dan rekan PPIC diinstruksikan untuk MENGUTAMAKAN support dan pendataan style sampel yang sebelumnya dipegang oleh Ami.

Mohon bantu percepat penataan fisik sampel, pengecekan kelengkapan, dan input data ke dalam box alokasi Ami agar target harian tim tercapai dan tidak ada sampel yang tertinggal atau terbengkalai.`,
      exampleCorrect: 'Tim Support mengutamakan asistensi pendataan & penataan box/style jatah Ami',
      exampleWrong: 'Membiarkan sampel jatah Ami menumpuk tanpa bantuan asistensi tim',
      exampleNotes: 'Segera koordinasikan dengan Leader (Jasmine) apabila ditemukan kendala fisik atau data sampel Ami.',
      author: 'Supervisor / Leader R&D',
    },
  ],
};

export const normalizeAnnouncement = (raw) => {
  if (!raw || !Array.isArray(raw.items) || raw.items.length < 2) {
    return DEFAULT_ANNOUNCEMENT;
  }
  return {
    ...raw,
    title: raw.title || raw.items[0]?.title || DEFAULT_ANNOUNCEMENT.title,
    isActive: raw.isActive !== false,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    items: raw.items.map((it, idx) => ({
      id: it.id || `point-${idx + 1}`,
      title: it.title || `Poin Pengumuman #${idx + 1}`,
      badge: it.badge || `POIN ${idx + 1}`,
      badgeType: it.badgeType || 'amber',
      content: it.content || '',
      exampleCorrect: it.exampleCorrect || '',
      exampleWrong: it.exampleWrong || '',
      exampleNotes: it.exampleNotes || '',
      author: it.author || raw.author || 'Leader / R&D',
    })),
  };
};

const STORAGE_KEY = 'gagaclo_inventory_data_v1';
const CODE_REVISIONS_KEY = STORAGE_KEY + '_code_revisions';
const CODE_REVISIONS_TOMBSTONES_KEY = STORAGE_KEY + '_code_revisions_deleted';
const CODE_REVISIONS_BOX_NUMBER = 999997;
const CODE_REVISIONS_LIMIT = 500;
const DELETED_IDS_KEY = 'gagaclo_deleted_item_ids_v1';

const getDeletedItemIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch {}
  return new Set();
};

const recordDeletedItemIds = (ids) => {
  try {
    const existing = getDeletedItemIds();
    ids.forEach(id => {
      if (id) existing.add(String(id));
    });
    const arr = Array.from(existing).slice(-2000);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(arr));
  } catch {}
};

// Fallback placement whenever a box has no rack (or its rack was removed).
const getFloorRack = (category = 'SAMPLE') => ({
  id: 0,
  name: 'LANTAI',
  category: category || 'SAMPLE',
  rackType: 'Lantai',
  location: 'Lantai (tanpa rak)',
  fullDescription: 'Lantai (tanpa rak)',
});

// Distinct badge colors for people added at runtime.
const PPIC_BADGE_PALETTES = [
  { color: 'blue', avatarBg: 'bg-blue-600', badgeClass: 'bg-blue-600 text-white', tagBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { color: 'indigo', avatarBg: 'bg-indigo-600', badgeClass: 'bg-indigo-600 text-white', tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { color: 'emerald', avatarBg: 'bg-emerald-600', badgeClass: 'bg-emerald-600 text-white', tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { color: 'amber', avatarBg: 'bg-amber-600', badgeClass: 'bg-amber-600 text-white', tagBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { color: 'rose', avatarBg: 'bg-rose-600', badgeClass: 'bg-rose-600 text-white', tagBg: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const DEFAULT_ISSUES = [
  {
    id: 'iss-sample-1',
    title: 'Penataan visual countdown timer di bagian atas layar',
    description: 'Timer hitung mundur pendataan dipindah ke bagian atas di bawah header agar langsung terlihat tanpa harus scroll ke bawah.',
    type: 'IMPROVEMENT',
    priority: 'HIGH',
    status: 'RESOLVED',
    reporterName: 'Royan',
    location: 'Halaman Depan / Header',
    notes: 'Sudah diselesaikan dan disinkronkan ke Supabase Cloud.',
    createdAt: '2026-11-05 08:15',
    updatedAt: '2026-11-05 08:20',
  },
  {
    id: 'iss-sample-2',
    title: 'Fitur pencarian cepat langsung di halaman 3D',
    description: 'Tambahkan search bar langsung di atas tampilan gudang 3D dengan shortcut Ctrl+F untuk menemukan box dan sampel secara instan.',
    type: 'FEATURE',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    reporterName: 'Cynara',
    location: 'Halaman 3D Warehouse',
    notes: 'Sudah selesai: search bar terintegrasi dengan highlight box otomatis di model 3D.',
    createdAt: '2026-11-05 08:10',
    updatedAt: '2026-11-05 08:18',
  },
  {
    id: 'iss-sample-3',
    title: 'Error saat edit dan pindah penempatan box',
    description: 'Ketika mengubah box pada kartu item, terjadi error state dan data tidak tersimpan ke cloud Supabase.',
    type: 'BUG',
    priority: 'URGENT',
    status: 'RESOLVED',
    reporterName: 'Royan',
    location: 'Detail Box & Edit Kartu',
    notes: 'Bug terselesaikan: relokasi transaksi diperbaiki, dropdown dinamis dari live boxes, dan ditambahkan tombol pindah box instan.',
    createdAt: '2026-11-05 08:25',
    updatedAt: '2026-11-05 08:35',
  },
  {
    id: 'iss-sample-4',
    title: 'Usulan cetak stiker QR massal per Rak',
    description: 'Perlu fitur untuk cetak label QR seluruh box dalam satu rak sekaligus agar proses penempelan stiker fisik lebih cepat.',
    type: 'FEATURE',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    reporterName: 'Ami',
    location: 'Dokumen Cetak / Label',
    notes: 'Sedang dirancang untuk format A4 multi-label per lembar.',
    createdAt: '2026-11-05 08:30',
    updatedAt: '2026-11-05 08:30',
  },
];

export function normalizeItemTextUppercase(item) {
  if (!item) return { item, changed: false };
  let changed = false;
  const upperObj = { ...item };
  const keys = ['style', 'sampleNo', 'buyerNo', 'track', 'size', 'color', 'deskripsi', 'description', 'name', 'kode', 'sku', 'jenisSample'];

  for (const k of keys) {
    if (typeof upperObj[k] === 'string' && upperObj[k].length > 0) {
      const up = upperObj[k].trim().toUpperCase();
      if (up !== upperObj[k]) {
        upperObj[k] = up;
        changed = true;
      }
    }
  }
  return { item: upperObj, changed };
}

export const InventoryProvider = ({ children }) => {
  // Racks and PPIC members are now stateful (editable at runtime)
  const [racks, setRacks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_racks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map(r => {
            if ([3, 4, 5].includes(Number(r.id)) && r.category === 'MATERIAL') {
              return { ...r, category: 'SAMPLE' };
            }
            if (Number(r.id) === 6) {
              return { ...r, boxRange: 'BOX 1A - 1J' };
            }
            return r;
          });
          // Auto-migration: pastikan LEMARI 1 (id: 6) selalu tersedia di daftar penyimpanan
          const lemariDefault = RACKS_DATA.find(r => Number(r.id) === 6);
          if (lemariDefault && !migrated.some(r => Number(r.id) === 6)) {
            migrated.push(lemariDefault);
          }
          return migrated;
        }
      }
    } catch (e) {
      console.error('Failed to load racks from localStorage', e);
    }
    return RACKS_DATA;
  });

  const [ppicMembers, setPpicMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_ppic');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(p => String(p.name).trim().toLowerCase() !== 'anzo');
        }
      }
    } catch (e) {
      console.error('Failed to load ppic from localStorage', e);
    }
    return PPIC_MEMBERS;
  });

  const ensureAllUsersIncluded = (list) => {
    // Migrate legacy 'Helper 1' -> 'Sheva', 'Helper 2' -> 'Ade', 'Helper 3' -> 'Tri'
    const migrated = (list || []).map(u => {
      const lower = String(u.name || '').trim().toLowerCase();
      if (lower === 'helper 1') {
        return { ...u, id: 'support-1', username: 'Sheva', name: 'Sheva', password: 'Sheva', role: 'Tim Support', isHelper: true, isSupport: true, ppicNumber: 'S1' };
      }
      if (lower === 'helper 2') {
        return { ...u, id: 'support-2', username: 'Ade', name: 'Ade', password: 'Ade', role: 'Tim Support', isHelper: true, isSupport: true, ppicNumber: 'S2' };
      }
      if (lower === 'helper 3') {
        return { ...u, id: 'support-3', username: 'Tri', name: 'Tri', password: 'Tri', role: 'Tim Support', isHelper: true, isSupport: true, ppicNumber: 'S3' };
      }
      return u;
    });

    const existing = new Set(migrated.map(u => String(u.name || '').trim().toLowerCase()));
    const missingHelper = HELPER_MEMBERS.filter(h => !existing.has(h.name.toLowerCase())).map(h => ({
      id: h.id,
      username: h.name,
      name: h.name,
      role: 'Tim Support',
      isHelper: true,
      isSupport: true,
      isSuperuser: false,
      isManager: false,
      email: h.email || '',
      password: h.name,
      ppicNumber: h.ppicNumber,
      color: h.color,
      tagBg: h.tagBg,
      badgeClass: h.badgeClass,
      avatarBg: h.avatarBg,
    }));
    const missingManager = (MANAGER_MEMBERS || []).filter(m => !existing.has(m.name.toLowerCase())).map(m => ({
      id: m.id,
      username: m.name,
      name: m.name,
      role: 'Inventory Leader',
      isHelper: false,
      isSupport: false,
      isSuperuser: true,
      isManager: true,
      email: m.email || '',
      password: m.name,
      ppicNumber: m.ppicNumber,
      color: m.color,
      tagBg: m.tagBg,
      badgeClass: m.badgeClass,
      avatarBg: m.avatarBg,
    }));
    return [...missingManager, ...migrated, ...missingHelper];
  };

  // 1 Manager (Jasmine) + 5 PPIC Users + 3 Support Users (Password default sama dengan nama user)
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed
            .filter(u => String(u.name).trim().toLowerCase() !== 'anzo')
            .map(u => {
              const isMgr = isManager(u);
              return {
                ...u,
                isManager: isMgr,
                isSuperuser: isMgr || isSuperuser(u),
                isHelper: isHelper(u),
                role: isMgr ? 'Inventory Leader' : (u.role && u.role.includes('Superuser') ? 'PPIC Specialist' : (u.role || (isHelper(u) ? 'Tim Support' : 'PPIC Staff'))),
              };
            });
          return ensureAllUsersIncluded(sanitized);
        }
      }
    } catch (e) {
      console.error('Failed to load users from localStorage', e);
    }
    return ALL_INITIAL_USERS.map(p => ({
      id: p.id,
      username: p.name,
      name: p.name,
      role: p.role || (p.isHelper ? 'Tim Support' : 'PPIC Staff'),
      isSuperuser: isSuperuser(p),
      isManager: isManager(p),
      isHelper: Boolean(p.isHelper),
      email: p.email || '',
      password: p.name,
      ppicNumber: p.ppicNumber,
      color: p.color,
      tagBg: p.tagBg,
      badgeClass: p.badgeClass,
      avatarBg: p.avatarBg,
    }));
  });

  // Current active logged-in PPIC / Support user (default: Royan / user #1)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserId = localStorage.getItem(STORAGE_KEY + '_current_user');
      const savedUsers = localStorage.getItem(STORAGE_KEY + '_users');
      const parsedUsers = savedUsers ? JSON.parse(savedUsers) : null;
      const rawList = Array.isArray(parsedUsers) && parsedUsers.length > 0
        ? parsedUsers
            .filter(u => String(u.name).trim().toLowerCase() !== 'anzo')
            .map(u => {
              const isMgr = isManager(u);
              return {
                ...u,
                isManager: isMgr,
                isSuperuser: isMgr || isSuperuser(u),
                isHelper: isHelper(u),
                role: isMgr ? 'Inventory Leader' : (u.role && u.role.includes('Superuser') ? 'PPIC Specialist' : (u.role || (isHelper(u) ? 'Tim Support' : 'PPIC Staff'))),
              };
            })
        : ALL_INITIAL_USERS.map(p => ({
            id: p.id,
            username: p.name,
            name: p.name,
            role: p.role || (p.isHelper ? 'Tim Support' : 'PPIC Staff'),
            isSuperuser: isSuperuser(p),
            isManager: isManager(p),
            isHelper: Boolean(p.isHelper),
            email: p.email || '',
            password: p.name,
            ppicNumber: p.ppicNumber,
            color: p.color,
            tagBg: p.tagBg,
            badgeClass: p.badgeClass,
            avatarBg: p.avatarBg,
          }));

      const list = ensureAllUsersIncluded(rawList);

      if (savedUserId) {
        const found = list.find(u =>
          String(u.id).toLowerCase() === String(savedUserId).toLowerCase() ||
          String(u.name).toLowerCase() === String(savedUserId).toLowerCase()
        );
        if (found) return found;
      }
      return list[0] || null;
    } catch (e) {
      console.error('Failed to load current user', e);
      return null;
    }
  });

  // Load state from localStorage or use initial data
  const [boxes, setBoxes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_boxes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(b => (
            Number(b.boxNumber) > 0 &&
            b.code !== 'DELETED' &&
            b.rackName !== 'DELETED' &&
            String(b.picName).trim().toLowerCase() !== 'anzo'
          )).map(b => {
            // Auto-migration: Racks 1-5 (boxes 1-72) dialokasikan penuh untuk SAMPLE
            if (Number(b.boxNumber) >= 1 && Number(b.boxNumber) <= 72 && b.category === 'MATERIAL') {
              return { ...b, category: 'SAMPLE' };
            }
            if (Number(b.rackId) === 6 || String(b.rackName || '').toUpperCase().includes('LEMARI')) {
              const bNum = Number(b.boxNumber);
              const disp = (bNum >= 73 && bNum <= 82) ? `1${String.fromCharCode(64 + (bNum - 72))}` : (b.displayNumber || String(bNum));
              return {
                ...b,
                boxType: 'CARTON',
                displayNumber: disp,
                code: (bNum >= 73 && bNum <= 82) ? `BOX-${disp}` : b.code,
                picName: '',
                ppicId: '',
                ppicNumber: 0,
              };
            }
            return b;
          });
          // Auto-migration: pastikan 10 box carton coklat di LEMARI 1 (Box 73 - 82) otomatis ditambahkan jika belum ada
          const defaultLemariBoxes = generateInitialBoxes().filter(b => Number(b.rackId) === 6);
          const existingNums = new Set(cleaned.map(b => Number(b.boxNumber)));
          const missingLemari = defaultLemariBoxes.filter(b => !existingNums.has(Number(b.boxNumber)));
          if (missingLemari.length > 0) {
            return [...cleaned, ...missingLemari].sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber));
          }
          return cleaned;
        }
      }
    } catch (e) {
      console.error('Failed to load boxes from localStorage', e);
    }
    return generateInitialBoxes();
  });

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedIds = getDeletedItemIds();
          let datesRepaired = false;
          const cleanItems = parsed
            .filter(i => (
              !deletedIds.has(String(i.id)) &&
              i.status !== 'DELETED' &&
              Number(i.boxNumber ?? i.box_number ?? 1) > 0 &&
              !String(i.id || '').startsWith('demo-achieve-')
            ))
            .map(item => {
              let updated = item;
              const rawDate = item.tanggal || item.dateIn;
              if (rawDate && rawDate !== 'NA' && rawDate !== '-') {
                const fixedDate = formatToDDMMYYYY(rawDate);
                if (fixedDate && (fixedDate !== item.tanggal || fixedDate !== item.dateIn)) {
                  datesRepaired = true;
                  updated = { ...updated, tanggal: fixedDate, dateIn: fixedDate };
                }
              }
              const u = String(updated.satuan || updated.unit || '').toUpperCase();
              if (u === 'PCS' || !u) {
                datesRepaired = true;
                updated = { ...updated, satuan: 'PCE', unit: 'PCE' };
              }
              const { item: upperItem, changed: upperChanged } = normalizeItemTextUppercase(updated);
              if (upperChanged) {
                datesRepaired = true;
                updated = upperItem;
              }
              return updated;
            });

          if (datesRepaired || cleanItems.length !== parsed.length) {
            try {
              localStorage.setItem(STORAGE_KEY + '_items', JSON.stringify(cleanItems));
              localStorage.removeItem('gagaclo_demo_all_achieved_active');
              sessionStorage.removeItem('gagaclo_pre_demo_items');
            } catch {}
          }
          return cleanItems;
        }
      }
    } catch (e) {
      console.error('Failed to load items from localStorage', e);
    }
    return INITIAL_ITEMS.map(item => {
      let updated = item;
      const rawDate = item.tanggal || item.dateIn;
      if (rawDate && rawDate !== 'NA' && rawDate !== '-') {
        const fixedDate = formatToDDMMYYYY(rawDate);
        if (fixedDate) updated = { ...updated, tanggal: fixedDate, dateIn: fixedDate };
      }
      const u = String(updated.satuan || updated.unit || '').toUpperCase();
      if (u === 'PCS' || !u) {
        updated = { ...updated, satuan: 'PCE', unit: 'PCE' };
      }
      const { item: upperItem } = normalizeItemTextUppercase(updated);
      return upperItem;
    });
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_transactions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load transactions from localStorage', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  // Dynamic Reusable Suggestions (Auto-learns all inputs)
  const [suggestions, setSuggestions] = useState(() => getMergedSuggestions(items));

  useEffect(() => {
    setSuggestions(getMergedSuggestions(items));
  }, [items]);

  const recordSuggestions = useCallback((newRecord) => {
    const updated = recordInputtedData(newRecord, items);
    setSuggestions(updated);
    return updated;
  }, [items]);

  const removeSuggestion = useCallback((field, valueToRemove) => {
    const updated = removeSuggestionItem(field, valueToRemove, items);
    setSuggestions(updated);
    return updated;
  }, [items]);

  // UI state
  const [selectedBoxNumber, setSelectedBoxNumber] = useState(null);
  const [itemModalConfig, setItemModalConfig] = useState({ isOpen: false, item: null, targetBoxNumber: null });
  const [qrModalBox, setQrModalBox] = useState(null);
  const [quickScannerOpen, setQuickScannerOpen] = useState(false);
  const [manifestPrintRackId, setManifestPrintRackId] = useState(null);
  const [transactionModalConfig, setTransactionModalConfig] = useState({ isOpen: false, item: null, type: 'IN' });

  // Supabase Cloud State
  const [supabaseConfigState, setSupabaseConfigState] = useState(getSupabaseConfig());
  const [supabaseStatus, setSupabaseStatus] = useState({
    isConnected: false,
    isSyncing: false,
    lastSync: null,
    error: null,
  });
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Filter state for general browsing
  const [activeTab, setActiveTab] = useState('racks');
  const [selectedRackFilter, setSelectedRackFilter] = useState('ALL');
  const [selectedPpicFilter, setSelectedPpicFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Global Countdown Timer State (Synced with Supabase Cloud & cached locally)
  // Default deadline matches the 7-day target set by the team (approx Nov 12, 2026)
  const [timerDeadline, setTimerDeadline] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_inventory_timer_deadline');
      if (saved && Number(saved) > 0) return Number(saved);
    } catch (e) {
      console.error('Failed to load timer from localStorage', e);
    }
    // Default fallback so every device sees the countdown immediately!
    return 1794444171613;
  });

  const [timerNote, setTimerNote] = useState(() => {
    try {
      return localStorage.getItem('gagaclo_inventory_timer_note') || 'Selesaikan seluruh pendataan sample & material R&D';
    } catch {
      return 'Selesaikan seluruh pendataan sample & material R&D';
    }
  });

  // Target Jasmine Real-Time Cloud Base State
  const [dailyTarget, setDailyTarget] = useState(() => getDailyTargetForDate(getLocalTodayIso()));
  const [targetSetBy, setTargetSetBy] = useState(() => getTargetSetBy());
  const [targetNote, setTargetNoteState] = useState(() => getTargetNote());
  const [targetUpdatedAt, setTargetUpdatedAt] = useState(() => getTargetUpdatedAt());

  useEffect(() => {
    const handleTargetUpdated = (e) => {
      if (e?.detail) {
        if (e.detail.target) setDailyTarget(e.detail.target);
        if (e.detail.setBy) setTargetSetBy(e.detail.setBy);
        if (e.detail.note !== undefined) setTargetNoteState(e.detail.note);
        if (e.detail.updatedAt) setTargetUpdatedAt(e.detail.updatedAt);
      } else {
        setDailyTarget(getDailyTargetForDate(getLocalTodayIso()));
        setTargetSetBy(getTargetSetBy());
        setTargetNoteState(getTargetNote());
        setTargetUpdatedAt(getTargetUpdatedAt());
      }
    };
    window.addEventListener('gagaclo_target_updated', handleTargetUpdated);
    return () => window.removeEventListener('gagaclo_target_updated', handleTargetUpdated);
  }, []);

  // Global floating notification state (for concurrency alerts, info messages)
  const [systemNotification, setSystemNotification] = useState(null);
  const notificationTimerRef = useRef(null);
  const realtimeChannelRef = useRef(null);
  const isSyncingRef = useRef(false);
  const saveTimeoutRef = useRef(null);

  const showNotification = useCallback((message, type = 'info', duration = 6000) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setSystemNotification({ id: Date.now(), message, type });
    if (duration > 0) {
      notificationTimerRef.current = setTimeout(() => {
        setSystemNotification(null);
      }, duration);
    }
  }, []);

  const broadcastChange = useCallback((action, payload = {}) => {
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'INVENTORY_CHANGED',
          payload: {
            action,
            source: currentUser?.name || 'User',
            timestamp: Date.now(),
            ...payload,
          },
        }).catch(err => {
          console.warn('Realtime broadcast error:', err);
        });
      } catch (err) {
        console.warn('Realtime broadcast failed:', err);
      }
    }
  }, [currentUser]);

  const updateDailyTarget = useCallback(async (dateIso, targetPcs, note, setBy = 'Jasmine') => {
    const num = saveDailyTargetForDate(dateIso, targetPcs, {
      supabase,
      note,
      setBy: setBy || 'Jasmine',
    });
    setDailyTarget(num);
    setTargetSetBy(setBy || 'Jasmine');
    if (note !== undefined) setTargetNoteState(note);
    setTargetUpdatedAt(new Date().toISOString());

    // Broadcast explicitly to realtime channel as well
    broadcastChange('TARGET_JASMINE_UPDATED', {
      dailyTarget: num,
      history: getDailyTargetsHistory(),
      setBy: setBy || 'Jasmine',
      note,
      updatedAt: new Date().toISOString(),
    });

    return num;
  }, [broadcastChange]);

  const updateTimerDeadline = async (newDeadline, newNote) => {
    const val = Number(newDeadline) || 0;
    setTimerDeadline(val);
    const noteVal = newNote !== undefined ? String(newNote).trim() : timerNote;
    if (newNote !== undefined) {
      setTimerNote(noteVal);
    }

    try {
      if (val > 0) {
        localStorage.setItem('gagaclo_inventory_timer_deadline', String(val));
      } else {
        localStorage.removeItem('gagaclo_inventory_timer_deadline');
      }
      if (noteVal) {
        localStorage.setItem('gagaclo_inventory_timer_note', noteVal);
      }
    } catch (e) {
      console.error('Failed to write timer to localStorage', e);
    }

    // Persist to Supabase Cloud so it is visible to everyone on all devices
    if (supabase) {
      try {
        await supabase.from('boxes').upsert({
          box_number: 999999,
          code: 'SYSTEM_TIMER',
          rack_id: -1,
          rack_name: 'SYSTEM',
          category: 'CONFIG',
          pic_name: 'SYSTEM',
          notes: JSON.stringify({ deadline: val, note: noteVal, updatedAt: new Date().toISOString() }),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'box_number' });

        await supabase.from('items').upsert({
          id: 'SYSTEM_CONFIG_TIMER',
          sku: 'SYSTEM_TIMER',
          kode: 'SYSTEM_TIMER',
          name: 'SYSTEM TIMER CONFIG',
          description: String(val),
          deskripsi: noteVal,
          box_number: 999999,
          rack_id: -1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // Instantly notify all connected devices via broadcast
        broadcastChange('TIMER_UPDATED', { deadline: val, note: noteVal });
      } catch (err) {
        console.error('Failed to sync timer to Supabase:', err);
      }
    }
  };

  const resetTimerDeadline = async () => {
    await updateTimerDeadline(0);
    broadcastChange('TIMER_UPDATED', { deadline: 0, note: '' });
  };

  // Dynamic Announcement State & Operations
  const [announcement, setAnnouncement] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_active_announcement_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.updatedAt && new Date(parsed.updatedAt) < new Date(DEFAULT_ANNOUNCEMENT.updatedAt)) {
            return DEFAULT_ANNOUNCEMENT;
          }
          return normalizeAnnouncement(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load announcement from localStorage', e);
    }
    return DEFAULT_ANNOUNCEMENT;
  });

  const updateAnnouncement = async (newAnnouncement) => {
    const normalized = normalizeAnnouncement(newAnnouncement);
    const updated = {
      ...normalized,
      updatedAt: new Date().toISOString(),
    };
    setAnnouncement(updated);
    try {
      localStorage.setItem('gagaclo_active_announcement_v2', JSON.stringify(updated));
    } catch {}

    if (supabase) {
      try {
        await supabase.from('items').upsert({
          id: 'SYSTEM_CONFIG_ANNOUNCEMENT',
          sku: 'SYSTEM_ANNOUNCEMENT',
          kode: 'SYSTEM_ANNOUNCEMENT',
          name: 'SYSTEM ANNOUNCEMENT CONFIG',
          description: updated.title,
          deskripsi: JSON.stringify(updated),
          box_number: 999999,
          rack_id: -1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        broadcastChange('ANNOUNCEMENT_UPDATED', { announcement: updated });
      } catch (err) {
        console.error('Failed to sync announcement to Supabase:', err);
      }
    }
    return updated;
  };

  // Google Gemini API Key Cloud State (Synchronized across all devices)
  const [cloudGeminiKey, setCloudGeminiKey] = useState(() => getStoredGeminiKey());

  const updateCloudGeminiKey = useCallback(async (newKey) => {
    const cleanKey = (newKey || '').trim();
    saveStoredGeminiKey(cleanKey);
    setCloudGeminiKey(cleanKey);

    if (supabase) {
      try {
        await supabase.from('items').upsert({
          id: 'SYSTEM_CONFIG_GEMINI_KEY',
          sku: 'SYSTEM_GEMINI_KEY',
          kode: 'SYSTEM_GEMINI_KEY',
          name: 'SYSTEM GEMINI KEY CONFIG',
          description: 'Google Gemini API Key Cloud Sync',
          deskripsi: JSON.stringify({
            apiKey: cleanKey,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Admin',
          }),
          box_number: 999999,
          rack_id: -1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        broadcastChange('GEMINI_KEY_UPDATED', { hasKey: Boolean(cleanKey) });
        showNotification('API Key berhasil disinkronkan ke Cloud untuk semua perangkat!', 'success');
      } catch (err) {
        console.error('Failed to sync Gemini Key to Supabase:', err);
      }
    }
  }, [currentUser, broadcastChange, showNotification]);

  // Issues, Errors & Feature Proposals State
  const [issues, setIssues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_issues');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load issues from localStorage', e);
    }
    return DEFAULT_ISSUES;
  });

  // Persist issues to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_issues', JSON.stringify(issues));
    } catch (e) {
      console.error('Failed to save issues to localStorage', e);
    }
  }, [issues]);

  const syncIssuesToRemote = async (issuesList) => {
    if (!supabase) return;
    try {
      // 1. Sync to backup system box row so all devices immediately see it
      await supabase.from('boxes').upsert({
        box_number: 999998,
        code: 'SYSTEM_ISSUES',
        rack_id: -1,
        rack_name: 'SYSTEM',
        category: 'CONFIG',
        pic_name: 'SYSTEM',
        notes: JSON.stringify(issuesList),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'box_number' });

      // 2. Also sync to dedicated issues table if it exists
      try {
        await supabase.from('issues').upsert(issuesList.map(localIssueToDb), { onConflict: 'id' });
      } catch {}

      // Broadcast issues update to other devices
      broadcastChange('ISSUES_UPDATED');
    } catch (err) {
      console.error('Failed to sync issues to Supabase:', err);
    }
  };

  const addIssue = async ({ title, description, type, priority, reporterName, location }) => {
    const newIss = {
      id: 'iss-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: (title || '').trim(),
      description: (description || '').trim(),
      type: type || 'BUG',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      reporterName: (reporterName || 'Tim R&D').trim(),
      location: (location || 'Umum').trim(),
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIssues((prev) => {
      const next = [newIss, ...prev];
      syncIssuesToRemote(next);
      return next;
    });
    return newIss;
  };

  const updateIssue = async (issueId, updates) => {
    setIssues((prev) => {
      const next = prev.map((iss) => (iss.id === issueId ? { ...iss, ...updates, updatedAt: new Date().toISOString() } : iss));
      syncIssuesToRemote(next);
      return next;
    });
  };

  const deleteIssue = async (issueId) => {
    if (!issueId) return;
    const idStr = String(issueId);
    setIssues((prev) => {
      const next = prev.filter((iss) => String(iss.id) !== idStr);
      syncIssuesToRemote(next);
      return next;
    });
    if (supabase) {
      try {
        await supabase.from('issues').delete().eq('id', idStr);
      } catch (err) {
        console.warn('Supabase delete issue error:', err);
      }
    }
  };

  // Code Revisions (audit trail: kode lama -> kode baru)
  const [codeRevisions, setCodeRevisions] = useState(() => {
    try {
      const saved = localStorage.getItem(CODE_REVISIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load code revisions from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CODE_REVISIONS_KEY, JSON.stringify(codeRevisions));
    } catch (e) {
      console.error('Failed to save code revisions', e);
    }
  }, [codeRevisions]);

  const syncCodeRevisionsToRemote = async (revisions) => {
    if (!supabase) return;
    try {
      await supabase.from('boxes').upsert({
        box_number: CODE_REVISIONS_BOX_NUMBER,
        code: 'SYSTEM_CODE_REVISIONS',
        rack_id: -1,
        rack_name: 'SYSTEM',
        category: 'CONFIG',
        pic_name: 'SYSTEM',
        notes: JSON.stringify(revisions),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'box_number' });
      broadcastChange('CODE_REVISIONS_UPDATED');
    } catch (err) {
      console.error('Failed to sync code revisions:', err);
    }
  };

  const recordCodeRevision = (entry) => {
    const oldCode = normalizeSequentialCode(entry?.oldCode || '');
    const newCode = normalizeSequentialCode(entry?.newCode || '');
    if (!oldCode || !newCode || oldCode === newCode) return null;

    const revision = {
      id: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      oldCode,
      newCode,
      itemId: entry.itemId ? String(entry.itemId) : null,
      itemName: entry.itemName || '',
      boxNumber: entry.boxNumber !== undefined ? Number(entry.boxNumber) : null,
      source: entry.source || 'EDIT',
      reason: entry.reason || '',
      actor: entry.actor || currentUser?.name || 'Royan',
      createdAt: new Date().toISOString(),
    };

    setCodeRevisions(prev => {
      const next = [revision, ...prev].slice(0, CODE_REVISIONS_LIMIT);
      syncCodeRevisionsToRemote(next);
      return next;
    });

    return revision;
  };

  const [codeRevisionTombstones, setCodeRevisionTombstones] = useState(() => {
    try {
      const saved = localStorage.getItem(CODE_REVISIONS_TOMBSTONES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
    } catch (e) {
      console.error('Failed to load code revision tombstones', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CODE_REVISIONS_TOMBSTONES_KEY, JSON.stringify(codeRevisionTombstones));
    } catch (e) {
      console.error('Failed to save code revision tombstones', e);
    }
  }, [codeRevisionTombstones]);

  const deleteCodeRevision = async (revisionId) => {
    if (!revisionId) return;
    const idStr = String(revisionId);
    setCodeRevisions(prev => {
      const target = prev.find(rev => String(rev.id) === idStr);
      if (target) {
        setCodeRevisionTombstones(tombstones => (
          tombstones.includes(revisionKey(target)) ? tombstones : [...tombstones, revisionKey(target)]
        ));
      }
      const next = prev.filter(rev => String(rev.id) !== idStr);
      syncCodeRevisionsToRemote(next);
      return next;
    });
  };

  const importHistoricalCodeRevisions = useCallback((itemList, trxList) => {
    if (!Array.isArray(itemList) || itemList.length === 0) return 0;

    const candidates = collectHistoricalCodeRevisions(itemList, trxList);
    if (candidates.length === 0) return 0;

    const now = Date.now();
    let importedCount = 0;

    setCodeRevisions(prev => {
      const missing = filterUnrecordedRevisions(candidates, prev, codeRevisionTombstones);
      if (missing.length === 0) return prev;

      importedCount = missing.length;
      const imported = missing.map((candidate, index) => ({
        id: `rev-hist-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        ...candidate,
        importedAt: new Date().toISOString(),
      }));

      const next = [...prev, ...imported]
        .sort((a, b) => String(b.createdAt || b.importedAt || '').localeCompare(String(a.createdAt || a.importedAt || '')))
        .slice(0, CODE_REVISIONS_LIMIT);

      syncCodeRevisionsToRemote(next);
      return next;
    });

    return importedCount;
  }, [codeRevisionTombstones]);

  // Auto-import rekam historis: perubahan kode yang sudah terjadi sebelum fitur ini ada
  useEffect(() => {
    if (!Array.isArray(items) || items.length === 0) return;
    importHistoricalCodeRevisions(items, transactions);
  }, [items, transactions, importHistoricalCodeRevisions]);

  // Persist to localStorage on change as safety cache (Debounced to prevent thread blocking)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY + '_racks', JSON.stringify(racks));
        localStorage.setItem(STORAGE_KEY + '_ppic', JSON.stringify(ppicMembers));
        localStorage.setItem(STORAGE_KEY + '_boxes', JSON.stringify(boxes));
        localStorage.setItem(STORAGE_KEY + '_items', JSON.stringify(items));
        localStorage.setItem(STORAGE_KEY + '_transactions', JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEY + '_users', JSON.stringify(users));
        if (currentUser) {
          localStorage.setItem(STORAGE_KEY + '_current_user', currentUser.id);
        } else {
          localStorage.removeItem(STORAGE_KEY + '_current_user');
        }
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [racks, ppicMembers, boxes, items, transactions, users, currentUser]);

  // Sync from Supabase down to local state
  const syncFromSupabase = useCallback(async (clientInstance = supabase, silent = false) => {
    const client = clientInstance || supabase;
    if (!client) {
      if (!silent) setSupabaseStatus(prev => ({ ...prev, isConnected: false, isSyncing: false }));
      return { success: false, message: 'Supabase client belum diinisialisasi' };
    }

    if (isSyncingRef.current) {
      return { success: true, message: 'Sinkronisasi sedang berjalan' };
    }
    isSyncingRef.current = true;

    if (!silent) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    }

    try {
      // 1. Fetch items. Supabase membatasi 1000 baris per request, jadi satu
      // query limit(10000) diam-diam memotong item terlama dan box-nya tampak kosong.
      const dbItems = [];
      const ITEMS_PAGE_SIZE = 1000;
      for (let from = 0; ; from += ITEMS_PAGE_SIZE) {
        const { data: pageRows, error: pageErr } = await client
          .from('items')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + ITEMS_PAGE_SIZE - 1);

        if (pageErr) throw pageErr;
        if (!pageRows || pageRows.length === 0) break;

        dbItems.push(...pageRows);
        if (pageRows.length < ITEMS_PAGE_SIZE) break;
      }

      // 2. Fetch boxes
      const { data: dbBoxes, error: boxesErr } = await client
        .from('boxes')
        .select('*');

      if (boxesErr) throw boxesErr;

      // 3. Fetch transactions (hemat bandwidth & egress: ambil 50 transaksi terbaru)
      const { data: dbTrx, error: trxErr } = await client
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (trxErr) throw trxErr;

      // Check for remote timer config in boxes or items
      let remoteDeadline = null;
      let remoteNote = null;
      if (dbBoxes && dbBoxes.length > 0) {
        const timerBox = dbBoxes.find(b => Number(b.box_number) === 999999 || b.code === 'SYSTEM_TIMER');
        if (timerBox?.notes) {
          try {
            const parsed = JSON.parse(timerBox.notes);
            if (typeof parsed?.deadline === 'number') {
              remoteDeadline = parsed.deadline;
            }
            if (typeof parsed?.note === 'string') {
              remoteNote = parsed.note;
            }
          } catch {}
        }
      }
      if (remoteDeadline === null && dbItems && dbItems.length > 0) {
        const timerItem = dbItems.find(i => i.id === 'SYSTEM_CONFIG_TIMER');
        if (timerItem?.description) {
          const num = Number(timerItem.description);
          if (!isNaN(num)) remoteDeadline = num;
        }
        if (timerItem?.deskripsi) {
          remoteNote = timerItem.deskripsi;
        }
      }

      if (remoteDeadline !== null) {
        setTimerDeadline(remoteDeadline);
        try {
          if (remoteDeadline > 0) {
            localStorage.setItem('gagaclo_inventory_timer_deadline', String(remoteDeadline));
          } else {
            localStorage.removeItem('gagaclo_inventory_timer_deadline');
          }
        } catch {}
      }

      if (remoteNote !== null) {
        setTimerNote(remoteNote);
        try {
          localStorage.setItem('gagaclo_inventory_timer_note', remoteNote);
        } catch {}
      }

      // Check for remote announcement config in items
      if (dbItems && dbItems.length > 0) {
        const announcementItem = dbItems.find(i => i.id === 'SYSTEM_CONFIG_ANNOUNCEMENT');
        if (announcementItem?.deskripsi) {
          try {
            const parsed = JSON.parse(announcementItem.deskripsi);
            if (parsed) {
              const norm = normalizeAnnouncement(parsed);
              setAnnouncement(norm);
              try {
                localStorage.setItem('gagaclo_active_announcement_v2', JSON.stringify(norm));
              } catch {}
            }
          } catch {}
        }

        // Check for remote target Jasmine config in items
        const targetItem = dbItems.find(i => i.id === 'SYSTEM_CONFIG_TARGET_JASMINE');
        if (targetItem?.deskripsi) {
          try {
            const parsed = JSON.parse(targetItem.deskripsi);
            if (parsed) {
              applyCloudTargetPayload({
                ...parsed,
                updatedAt: parsed.updatedAt || targetItem.updated_at,
              });
            }
          } catch {}
        }

        // Check for remote Gemini API Key config in items
        const geminiKeyItem = dbItems.find(i => i.id === 'SYSTEM_CONFIG_GEMINI_KEY');
        if (geminiKeyItem?.deskripsi) {
          try {
            const parsed = JSON.parse(geminiKeyItem.deskripsi);
            if (parsed?.apiKey) {
              saveStoredGeminiKey(parsed.apiKey);
              setCloudGeminiKey(parsed.apiKey);
            }
          } catch {}
        } else {
          // Auto-seed: jika di cloud belum ada tapi di local browser sudah ada API Key,
          // otomatis sinkronkan ke Supabase Cloud agar seluruh perangkat lain langsung dapat memakainya!
          const localKey = getStoredGeminiKey();
          if (localKey && client) {
            client.from('items').upsert({
              id: 'SYSTEM_CONFIG_GEMINI_KEY',
              sku: 'SYSTEM_GEMINI_KEY',
              kode: 'SYSTEM_GEMINI_KEY',
              name: 'SYSTEM GEMINI KEY CONFIG',
              description: 'Google Gemini API Key Cloud Sync',
              deskripsi: JSON.stringify({
                apiKey: localKey.trim(),
                updatedAt: new Date().toISOString(),
                updatedBy: 'Auto-Seed (Cloud Sync)',
              }),
              box_number: 999999,
              status: 'SYSTEM',
            }).then(() => {
              setCloudGeminiKey(localKey.trim());
            }).catch(() => {});
          }
        }
      }

      // Check for remote issues config in boxes
      if (dbBoxes && dbBoxes.length > 0) {
        const timerBox = dbBoxes.find(b => Number(b.box_number) === 999999 || b.code === 'SYSTEM_TIMER');
        if (timerBox?.notes) {
          try {
            const parsed = JSON.parse(timerBox.notes);
            if (parsed?.targetJasmine) {
              applyCloudTargetPayload(parsed.targetJasmine);
            }
          } catch {}
        }

        const issuesBox = dbBoxes.find(b => Number(b.box_number) === 999998 || b.code === 'SYSTEM_ISSUES');
        if (issuesBox?.notes) {
          try {
            const parsed = JSON.parse(issuesBox.notes);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setIssues(parsed);
              try {
                localStorage.setItem(STORAGE_KEY + '_issues', JSON.stringify(parsed));
              } catch {}
            }
          } catch {}
        }

        const revisionsBox = dbBoxes.find(b => Number(b.box_number) === CODE_REVISIONS_BOX_NUMBER || b.code === 'SYSTEM_CODE_REVISIONS');
        if (revisionsBox?.notes) {
          try {
            const parsed = JSON.parse(revisionsBox.notes);
            if (Array.isArray(parsed)) {
              setCodeRevisions(parsed);
              try {
                localStorage.setItem(CODE_REVISIONS_KEY, JSON.stringify(parsed));
              } catch {}
            }
          } catch {}
        }
      }

      // Try fetching from dedicated issues table if available
      try {
        const { data: dbIssues } = await client
          .from('issues')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbIssues && dbIssues.length > 0) {
          setIssues(prev => {
            const mapped = dbIssues.map(dbIssueToLocal);
            if (prev.length !== mapped.length) return mapped;
            const changed = mapped.some((m, idx) => {
              const p = prev[idx];
              return !p || p.id !== m.id || p.status !== m.status || p.updatedAt !== m.updatedAt;
            });
            return changed ? mapped : prev;
          });
        }
      } catch {}

      // Update local state if remote data is found (excluding system config rows and deleted items)
      if (dbItems && dbItems.length > 0) {
        const deletedIds = getDeletedItemIds();
        const userItems = dbItems.filter(i => (
          i.id !== 'SYSTEM_CONFIG_TIMER' &&
          i.id !== 'SYSTEM_CONFIG_ANNOUNCEMENT' &&
          i.id !== 'SYSTEM_CONFIG_TARGET_JASMINE' &&
          i.id !== 'SYSTEM_CONFIG_GEMINI_KEY' &&
          Number(i.box_number) !== 999999 &&
          Number(i.box_number) > 0 &&
          i.status !== 'DELETED' &&
          i.status !== 'Trash' &&
          i.status !== 'Disposal' &&
          !deletedIds.has(String(i.id))
        ));

        setItems(prev => {
          if (prev.length !== userItems.length) {
            return userItems.map(dbItemToLocal);
          }
          const mapped = userItems.map(dbItemToLocal);
          const prevMap = new Map(prev.map(item => [String(item.id), item]));
          let hasChange = false;
          for (const item of mapped) {
            const old = prevMap.get(String(item.id));
            if (!old) {
              hasChange = true;
              break;
            }
            if (
              old.quantity !== item.quantity ||
              old.boxNumber !== item.boxNumber ||
              old.kode !== item.kode ||
              old.picName !== item.picName ||
              old.recordDate !== item.recordDate ||
              old.storageDate !== item.storageDate ||
              old.style !== item.style ||
              old.sampleNo !== item.sampleNo ||
              old.size !== item.size ||
              old.color !== item.color ||
              old.buyerNo !== item.buyerNo ||
              old.jenisSample !== item.jenisSample ||
              old.status !== item.status ||
              old.description !== item.description
            ) {
              hasChange = true;
              break;
            }
          }
          return hasChange ? mapped : prev;
        });

        if (supabase) {
          const itemsNeedingRemoteUpdate = userItems.filter(db => {
            const up = (s) => (typeof s === 'string' ? s.trim().toUpperCase() : '');
            return (
              (db.style && db.style !== up(db.style)) ||
              (db.sample_no && db.sample_no !== up(db.sample_no)) ||
              (db.size && db.size !== up(db.size)) ||
              (db.color && db.color !== up(db.color)) ||
              (db.buyer_no && db.buyer_no !== up(db.buyer_no)) ||
              (db.track && db.track !== up(db.track)) ||
              (db.deskripsi && db.deskripsi !== up(db.deskripsi)) ||
              (db.name && db.name !== up(db.name)) ||
              (db.unit && String(db.unit).toUpperCase() === 'PCS') ||
              (db.satuan && String(db.satuan).toUpperCase() === 'PCS')
            );
          });

          if (itemsNeedingRemoteUpdate.length > 0) {
            (async () => {
              try {
                for (const it of itemsNeedingRemoteUpdate) {
                  const local = dbItemToLocal(it);
                  const payload = localItemToDb(local);
                  await supabase.from('items').update(payload).eq('id', it.id);
                }
              } catch (e) {
                console.warn('Background Supabase uppercase repair error:', e);
              }
            })();
          }
        }
      }

      if (dbBoxes && dbBoxes.length > 0) {
        const deletedBoxNumbers = new Set(
          dbBoxes
            .filter(b => (
              b.code === 'DELETED' ||
              b.rack_name === 'DELETED' ||
              b.pic_name === 'DELETED' ||
              String(b.pic_name || '').trim().toLowerCase() === 'anzo' ||
              Number(b.box_number) === CODE_REVISIONS_BOX_NUMBER
            ))
            .map(b => Number(b.box_number))
        );

        const userDbBoxes = dbBoxes.filter(b => (
          Number(b.box_number) !== 999999 &&
          Number(b.box_number) !== 999998 &&
          Number(b.box_number) !== CODE_REVISIONS_BOX_NUMBER &&
          Number(b.box_number) > 0 &&
          Number(b.box_number) < 900000 &&
          b.code !== 'DELETED' &&
          b.rack_name !== 'DELETED' &&
          b.pic_name !== 'DELETED' &&
          String(b.pic_name || '').trim().toLowerCase() !== 'anzo'
        ));

        const defaultLemariBoxes = generateInitialBoxes().filter(b => Number(b.rackId) === 6);
        const lemariBoxNums = new Set(defaultLemariBoxes.map(b => Number(b.boxNumber)));
        const validRemoteBoxNums = new Set(userDbBoxes.map(b => Number(b.box_number)));
        const missingRemoteLemari = defaultLemariBoxes.filter(b => !validRemoteBoxNums.has(Number(b.boxNumber)));

        if (supabase && missingRemoteLemari.length > 0) {
          supabase
            .from('boxes')
            .upsert(missingRemoteLemari.map(localBoxToDb), { onConflict: 'box_number' })
            .then(() => {})
            .catch(() => {});
        }

        // Auto-clear PIC pada box Lemari 1 (73-82) di Supabase jika sebelumnya terisi PIC default
        if (supabase) {
          const lemariWithPic = userDbBoxes.filter(b => Number(b.box_number) >= 73 && Number(b.box_number) <= 82 && b.pic_name);
          if (lemariWithPic.length > 0) {
            supabase
              .from('boxes')
              .update({ pic_name: '' })
              .in('box_number', lemariWithPic.map(b => Number(b.box_number)))
              .then(() => {})
              .catch(() => {});
          }
        }

        setBoxes(prev => {
          // Remove any deleted box (kecuali box Lemari 1 yang baru dimigrasi) atau box dengan PIC Anzo
          const cleanedPrev = prev.filter(b => (
            (!deletedBoxNumbers.has(Number(b.boxNumber)) || lemariBoxNums.has(Number(b.boxNumber))) &&
            String(b.picName).trim().toLowerCase() !== 'anzo'
          ));

          const updated = cleanedPrev.map(box => {
            const remoteBox = userDbBoxes.find(b => Number(b.box_number) === Number(box.boxNumber));
            const res = remoteBox ? dbBoxToLocal(remoteBox, [box]) : box;
            if (Number(res.boxNumber) >= 1 && Number(res.boxNumber) <= 72 && res.category === 'MATERIAL') {
              return { ...res, category: 'SAMPLE' };
            }
            return res;
          });
          // Include boxes that exist remotely but not locally (added on another device)
          const knownNumbers = new Set(updated.map(b => Number(b.boxNumber)));
          const extra = userDbBoxes
            .filter(b => !knownNumbers.has(Number(b.box_number)))
            .map(b => {
              const res = dbBoxToLocal(b, defaultLemariBoxes);
              if (Number(res.boxNumber) >= 1 && Number(res.boxNumber) <= 72 && res.category === 'MATERIAL') {
                return { ...res, category: 'SAMPLE' };
              }
              return res;
            });
          const mergedWithRemote = [...updated, ...extra];
          const mergedNums = new Set(mergedWithRemote.map(b => Number(b.boxNumber)));
          const missingLocalLemari = defaultLemariBoxes.filter(b => !mergedNums.has(Number(b.boxNumber)));
          const next = [...mergedWithRemote, ...missingLocalLemari].sort((a, b) => a.boxNumber - b.boxNumber);

          if (supabase) {
            const materialBoxesToMigrate = userDbBoxes.filter(b => Number(b.box_number) >= 1 && Number(b.box_number) <= 72 && b.category === 'MATERIAL');
            if (materialBoxesToMigrate.length > 0) {
              supabase
                .from('boxes')
                .update({ category: 'SAMPLE' })
                .in('box_number', materialBoxesToMigrate.map(b => Number(b.box_number)))
                .then(() => {})
                .catch(() => {});
            }
          }

          if (next.length !== prev.length) return next;
          const hasChange = next.some((b, idx) => {
            const p = prev[idx];
            return !p ||
              p.boxNumber !== b.boxNumber ||
              p.rackId !== b.rackId ||
              p.picName !== b.picName ||
              p.code !== b.code ||
              p.isFull !== b.isFull ||
              p.notes !== b.notes;
          });
          return hasChange ? next : prev;
        });
      }

      if (dbTrx && dbTrx.length > 0) {
        setTransactions(prev => {
          const mapped = dbTrx.map(dbTrxToLocal);
          if (prev.length !== mapped.length) return mapped;
          if (prev.length === 0) return prev;
          if (prev[0]?.id !== mapped[0]?.id || prev[prev.length - 1]?.id !== mapped[mapped.length - 1]?.id) {
            return mapped;
          }
          return prev;
        });
      }

      const syncTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSupabaseStatus(prev => {
        // If silent polling and already connected without error, avoid state updates to prevent re-rendering root App
        if (silent && prev.isConnected && !prev.error) {
          return prev;
        }
        return {
          isConnected: true,
          isSyncing: false,
          lastSync: syncTime,
          error: null,
        };
      });

      return {
        success: true,
        itemCount: dbItems?.length || 0,
        boxCount: dbBoxes?.length || 0,
      };
    } catch (err) {
      console.error('Supabase sync error:', err);
      const errMsg = err.message || 'Gagal menyinkronkan data dengan Supabase';
      if (!silent) {
        setSupabaseStatus({
          isConnected: false,
          isSyncing: false,
          lastSync: null,
          error: errMsg,
        });
      }
      return { success: false, message: errMsg };
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Upload/Migrate all local state to Supabase
  const pushLocalToSupabase = async () => {
    if (!supabase) {
      alert('Supabase belum terhubung. Silakan isi konfigurasi terlebih dahulu.');
      return { success: false, message: 'Supabase client tidak tersedia' };
    }

    setSupabaseStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // 1. Upload Boxes
      const dbBoxes = boxes.map(localBoxToDb);
      const { error: boxErr } = await supabase
        .from('boxes')
        .upsert(dbBoxes, { onConflict: 'box_number' });

      if (boxErr) throw boxErr;

      // 2. Upload Items
      const dbItems = items.map(localItemToDb);
      if (dbItems.length > 0) {
        const { error: itemErr } = await supabase
          .from('items')
          .upsert(dbItems, { onConflict: 'id' });

        if (itemErr) throw itemErr;
      }

      // 3. Upload Transactions
      const dbTrx = transactions.map(localTrxToDb);
      if (dbTrx.length > 0) {
        const { error: trxErr } = await supabase
          .from('transactions')
          .upsert(dbTrx, { onConflict: 'id' });

        if (trxErr) throw trxErr;
      }

      const syncTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSupabaseStatus({
        isConnected: true,
        isSyncing: false,
        lastSync: syncTime,
        error: null,
      });

      return { success: true, count: dbItems.length };
    } catch (err) {
      console.error('Supabase push error:', err);
      const errMsg = err.message || 'Gagal mengunggah data ke Supabase';
      setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: errMsg }));
      return { success: false, message: errMsg };
    }
  };

  // Configure Supabase credentials
  const saveSupabaseCredentials = async (url, anonKey) => {
    const client = initSupabase(url, anonKey);
    const newConfig = getSupabaseConfig();
    setSupabaseConfigState(newConfig);

    if (client) {
      const test = await testSupabaseConnection(url, anonKey);
      if (test.success) {
        await syncFromSupabase(client);
        return { success: true, message: 'Berhasil terhubung ke Supabase Corporate Gagaclo!' };
      } else {
        setSupabaseStatus(prev => ({ ...prev, isConnected: false, error: test.message }));
        return { success: false, message: test.message, code: test.code };
      }
    } else {
      setSupabaseStatus({ isConnected: false, isSyncing: false, lastSync: null, error: null });
      return { success: true, message: 'Koneksi Supabase dinonaktifkan (mode offline lokal aktif).' };
    }
  };

  // Initial mount sync & realtime subscriptions
  useEffect(() => {
    if (supabaseConfigState.isConfigured && supabase) {
      if (typeof window !== 'undefined') {
        window.__gagaclo_supabase = supabase;
      }

      // Fast fetch target from cloud immediately (low-latency ~50ms)
      fetchTargetFromCloudFast(supabase).catch(err => console.warn('Fast target fetch failed:', err));

      syncFromSupabase();

      // Subscribe to Realtime Postgres Changes & Broadcast Channel
      const channel = supabase
        .channel('gagaclo_inventory_realtime', {
          config: {
            broadcast: { ack: false },
          },
        })
        .on('broadcast', { event: 'INVENTORY_CHANGED' }, (msg) => {
          const data = msg?.payload;
          // If Jasmine's Target changed, update local state immediately
          if (data?.action === 'TARGET_JASMINE_UPDATED') {
            applyCloudTargetPayload(data);
          }
          // If timer changed, update local state immediately without waiting
          if (data?.action === 'TIMER_UPDATED') {
            if (typeof data.deadline === 'number') {
              setTimerDeadline(data.deadline);
              try {
                if (data.deadline > 0) localStorage.setItem('gagaclo_inventory_timer_deadline', String(data.deadline));
                else localStorage.removeItem('gagaclo_inventory_timer_deadline');
              } catch {}
            }
            if (typeof data.note === 'string') {
              setTimerNote(data.note);
              try {
                if (data.note) localStorage.setItem('gagaclo_inventory_timer_note', data.note);
              } catch {}
            }
          }
          // If announcement changed, update local state immediately
          if (data?.action === 'ANNOUNCEMENT_UPDATED' && data.announcement) {
            const norm = normalizeAnnouncement(data.announcement);
            setAnnouncement(norm);
            try {
              localStorage.setItem('gagaclo_active_announcement_v2', JSON.stringify(norm));
            } catch {}
            return;
          }
          if (data?.action === 'BOX_REASSIGNED' && data.boxNumber && data.newPic) {
            const ppicObj = ppicMembers.find(p => p.name.toLowerCase() === data.newPic.toLowerCase());
            setBoxes(prev => prev.map(b => Number(b.boxNumber) === Number(data.boxNumber) ? {
              ...b,
              picName: data.newPic,
              ppicId: ppicObj?.id || b.ppicId,
              ppicNumber: ppicObj?.ppicNumber ?? b.ppicNumber,
            } : b));
            setItems(prev => prev.map(i => Number(i.boxNumber) === Number(data.boxNumber) ? {
              ...i,
              picName: data.newPic,
              place: `BOX ${data.boxNumber} (${i.rackName || 'RACK'} - ${data.newPic})`,
            } : i));
            return;
          }
          if (data?.action === 'BOXES_BATCH_REASSIGNED' && Array.isArray(data.boxNumbers) && data.newPic) {
            const setNums = new Set(data.boxNumbers.map(Number));
            const ppicObj = ppicMembers.find(p => p.name.toLowerCase() === data.newPic.toLowerCase());
            setBoxes(prev => prev.map(b => setNums.has(Number(b.boxNumber)) ? {
              ...b,
              picName: data.newPic,
              ppicId: ppicObj?.id || b.ppicId,
              ppicNumber: ppicObj?.ppicNumber ?? b.ppicNumber,
            } : b));
            setItems(prev => prev.map(i => setNums.has(Number(i.boxNumber)) ? {
              ...i,
              picName: data.newPic,
              place: `BOX ${i.boxNumber} (${i.rackName || 'RACK'} - ${data.newPic})`,
            } : i));
            return;
          }
          if (data?.action === 'ISSUES_UPDATED') {
            supabase.from('issues').select('*').then(({ data: iData }) => {
              if (iData) setIssues(iData.map(dbIssueToLocal));
            });
            return;
          }
          if (data?.action === 'DATA_IMPORTED') {
            syncFromSupabase(supabase, true);
            return;
          }
          // Catatan: ITEM_ADDED, ITEM_UPDATED, ITEM_DELETED, BOX_UPDATED sudah
          // di-handle seketika secara efisien oleh postgres_changes (0 bytes REST egress).
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items' },
          (payload) => {
            // Realtime Sync for Target Jasmine
            if (payload.new?.id === 'SYSTEM_CONFIG_TARGET_JASMINE') {
              if (payload.new?.deskripsi) {
                try {
                  const parsed = JSON.parse(payload.new.deskripsi);
                  if (parsed) {
                    applyCloudTargetPayload({
                      ...parsed,
                      updatedAt: parsed.updatedAt || payload.new.updated_at,
                    });
                  }
                } catch {}
              }
              return;
            }
            if (payload.old?.id === 'SYSTEM_CONFIG_TARGET_JASMINE' || payload.new?.id === 'SYSTEM_CONFIG_TARGET_JASMINE') return;

            // Realtime Sync for Announcement
            if (payload.new?.id === 'SYSTEM_CONFIG_ANNOUNCEMENT') {
              if (payload.new?.deskripsi) {
                try {
                  const parsed = JSON.parse(payload.new.deskripsi);
                  if (parsed) {
                    const norm = normalizeAnnouncement(parsed);
                    setAnnouncement(norm);
                    try { localStorage.setItem('gagaclo_active_announcement_v2', JSON.stringify(norm)); } catch {}
                  }
                } catch {}
              }
              return;
            }
            if (payload.old?.id === 'SYSTEM_CONFIG_ANNOUNCEMENT' || payload.new?.id === 'SYSTEM_CONFIG_ANNOUNCEMENT') return;

            // Realtime Sync for Global Timer
            if (payload.new?.id === 'SYSTEM_CONFIG_TIMER') {
              const d = Number(payload.new.description) || 0;
              setTimerDeadline(d);
              if (payload.new?.deskripsi) {
                setTimerNote(payload.new.deskripsi);
                try { localStorage.setItem('gagaclo_inventory_timer_note', payload.new.deskripsi); } catch {}
              }
              try {
                if (d > 0) localStorage.setItem('gagaclo_inventory_timer_deadline', String(d));
                else localStorage.removeItem('gagaclo_inventory_timer_deadline');
              } catch {}
              return;
            }
            if (payload.old?.id === 'SYSTEM_CONFIG_TIMER' || payload.new?.id === 'SYSTEM_CONFIG_TIMER') return;

            // Realtime Sync for Cloud Gemini API Key
            if (payload.new?.id === 'SYSTEM_CONFIG_GEMINI_KEY') {
              if (payload.new?.deskripsi) {
                try {
                  const parsed = JSON.parse(payload.new.deskripsi);
                  if (parsed?.apiKey) {
                    saveStoredGeminiKey(parsed.apiKey);
                    setCloudGeminiKey(parsed.apiKey);
                  }
                } catch {}
              }
              return;
            }
            if (payload.old?.id === 'SYSTEM_CONFIG_GEMINI_KEY' || payload.new?.id === 'SYSTEM_CONFIG_GEMINI_KEY') return;

            // Efisien & Hemat Egress: Perbarui state item langsung dari payload WebSocket tanpa HTTP GET request
            const eventType = payload.eventType;
            if (eventType === 'DELETE') {
              const targetId = String(payload.old?.id || '');
              if (targetId) {
                setItems(prev => prev.filter(it => String(it.id) !== targetId));
              }
            } else if (payload.new && payload.new.id) {
              const localItem = dbItemToLocal(payload.new);
              if (localItem.status === 'DELETED' || Number(localItem.boxNumber) < 0) {
                setItems(prev => prev.filter(it => String(it.id) !== String(localItem.id)));
              } else {
                setItems(prev => {
                  const exists = prev.some(it => String(it.id) === String(localItem.id));
                  if (exists) {
                    return prev.map(it => String(it.id) === String(localItem.id) ? localItem : it);
                  }
                  return [localItem, ...prev];
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'boxes' },
          (payload) => {
            // Realtime Sync for Global Timer & Target Jasmine
            if (Number(payload.new?.box_number) === 999999 || payload.new?.code === 'SYSTEM_TIMER') {
              try {
                const parsed = JSON.parse(payload.new.notes);
                if (parsed?.targetJasmine) {
                  applyCloudTargetPayload(parsed.targetJasmine);
                }
                if (typeof parsed?.deadline === 'number') {
                  setTimerDeadline(parsed.deadline);
                  try {
                    if (parsed.deadline > 0) localStorage.setItem('gagaclo_inventory_timer_deadline', String(parsed.deadline));
                    else localStorage.removeItem('gagaclo_inventory_timer_deadline');
                  } catch {}
                }
                if (typeof parsed?.note === 'string') {
                  setTimerNote(parsed.note);
                  try {
                    if (parsed.note) localStorage.setItem('gagaclo_inventory_timer_note', parsed.note);
                  } catch {}
                }
              } catch {}
              return;
            }

            // Realtime Sync for Issues
            if (Number(payload.new?.box_number) === 999998 || payload.new?.code === 'SYSTEM_ISSUES') {
              try {
                const parsed = JSON.parse(payload.new.notes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setIssues(parsed);
                  try {
                    localStorage.setItem(STORAGE_KEY + '_issues', JSON.stringify(parsed));
                  } catch {}
                }
              } catch {}
              return;
            }

            // Realtime Sync for Code Revisions
            if (Number(payload.new?.box_number) === CODE_REVISIONS_BOX_NUMBER || payload.new?.code === 'SYSTEM_CODE_REVISIONS') {
              try {
                const parsed = JSON.parse(payload.new.notes);
                if (Array.isArray(parsed)) {
                  setCodeRevisions(parsed);
                  try {
                    localStorage.setItem(CODE_REVISIONS_KEY, JSON.stringify(parsed));
                  } catch {}
                }
              } catch {}
              return;
            }
            if (Number(payload.new?.box_number) >= 900000) return;

            // Efisien & Hemat Egress: Perbarui data box langsung dari payload WebSocket tanpa HTTP GET request
            if (payload.new && payload.new.box_number) {
              const localBox = dbBoxToLocal(payload.new);
              setBoxes(prev => prev.map(b => Number(b.boxNumber) === Number(localBox.boxNumber) ? localBox : b));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issues' },
          (payload) => {
            if (payload.eventType === 'DELETE' && payload.old?.id) {
              setIssues(prev => prev.filter(i => String(i.id) !== String(payload.old.id)));
            } else if (payload.new && payload.new.id) {
              const localIssue = dbIssueToLocal(payload.new);
              setIssues(prev => {
                const exists = prev.some(i => String(i.id) === String(localIssue.id));
                return exists
                  ? prev.map(i => String(i.id) === String(localIssue.id) ? localIssue : i)
                  : [localIssue, ...prev];
              });
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Realtime channel subscribed successfully');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('⚡ Realtime channel dropped/error:', status, err);
            syncFromSupabase(supabase, true);
          }
        });

      realtimeChannelRef.current = channel;

      return () => {
        realtimeChannelRef.current = null;
        supabase.removeChannel(channel);
      };
    }
  }, [supabaseConfigState.isConfigured, syncFromSupabase]);

  // Jaringan Kembali Online (Re-connect Resync): hemat bandwidth & egress maksimal
  useEffect(() => {
    if (!supabaseConfigState.isConfigured || !supabase) return;

    let lastOnlineSync = Date.now();
    const handleOnline = () => {
      const now = Date.now();
      // Hanya resync jika koneksi sempat offline minimal 60 detik
      if (now - lastOnlineSync > 60000) {
        lastOnlineSync = now;
        syncFromSupabase(supabase, true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [supabaseConfigState.isConfigured, syncFromSupabase]);

  // Actions
  const addItem = async (itemData) => {
    // PPIC Utama dan Support kini dapat membantu input data ke box mana pun (credit tetap tercatat ke penginput)
    const targetBox = boxes.find(b => Number(b.boxNumber) === Number(itemData.boxNumber));
    const boxOwner = targetBox?.picName || itemData.picName;

    // Automatically record and remember newly inputted data
    recordSuggestions(itemData);

    // Concurrency protection: verify that code is not already taken by another user
    let rawCode = itemData.kode || itemData.sku;
    if (!rawCode) {
      const isMat = itemData.category === 'MATERIAL' || (Number(itemData.boxNumber) <= 20 && boxes.find(b => b.boxNumber === itemData.boxNumber)?.category === 'MATERIAL');
      rawCode = await allocateNextSequentialCode(supabase, isMat ? 'MATERIAL' : 'SAMPLE', items);
    }

    const resolved = resolveUniqueCode(rawCode, items, null);
    const finalCode = resolved.finalCode;

    const nowIso = new Date().toISOString();
    const createdBy = itemData.inputtedBy || itemData.createdBy || currentUser?.name || 'Royan';
    const isByHelper = isHelper({ name: createdBy }) || ['sheva', 'ade', 'tri'].includes(String(createdBy).toLowerCase()) || isHelper(currentUser);

    const trackingTags = [
      `inputted_by:${encodeURIComponent(createdBy)}`,
      ...(isByHelper ? [`helper:${encodeURIComponent(createdBy)}`] : []),
    ];

    const { item: upperItemData } = normalizeItemTextUppercase(itemData);
    const newItem = {
      ...upperItemData,
      kode: finalCode,
      sku: finalCode,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      dateIn: itemData.dateIn || nowIso.split('T')[0],
      createdAt: nowIso,
      updatedAt: nowIso,
      status: itemData.status || 'In Storage',
      qty: Number(itemData.qty) || 1,
      unit: 'PCE',
      satuan: 'PCE',
      picName: boxOwner || (targetBox ? targetBox.picName : 'Royan'), // Ownership stays with PIC
      createdBy: createdBy,
      inputtedBy: createdBy,
      helperName: isByHelper ? createdBy : (itemData.helperName || null),
      tags: [
        ...(Array.isArray(itemData.tags) ? itemData.tags.filter(t => typeof t === 'string' && !t.startsWith('inputted_by:') && !t.startsWith('helper:')) : []),
        ...trackingTags,
      ],
    };

    if (resolved.wasAdjusted) {
      showNotification(
        '⚠️ Kode sample otomatis dibuat unik dan berurutan agar tidak bentrok antar pengguna.',
        'info',
        5000
      );
    }

    setItems((prev) => [newItem, ...prev]);

    // Record initial transaction
    const trxData = {
      type: 'IN',
      itemId: newItem.id,
      itemName: newItem.name || newItem.style || 'Sample',
      boxNumber: newItem.boxNumber,
      rackName: targetBox ? targetBox.rackName : 'RACK ?',
      qty: newItem.qty,
      unit: newItem.unit || 'PCE',
      picName: newItem.picName || (targetBox ? targetBox.picName : 'Royan'),
      actor: createdBy,
      recipientOrSource: isByHelper ? `Diinput oleh ${createdBy} (Tim Support)` : 'Direct Entry / Masuk Baru',
      notes: newItem.description || (isByHelper ? `Direkap oleh ${createdBy} untuk ${boxOwner || 'PIC'}` : 'Barang baru ditambahkan ke inventory'),
    };
    addTransaction(trxData);

    // Sync to Supabase in background with auto-retry on concurrency conflict
    if (supabase) {
      try {
        let dbPayload = localItemToDb(newItem);
        const { data: insertedData, error: insertError } = await supabase
          .from('items')
          .insert([dbPayload])
          .select('id, kode, sku')
          .maybeSingle();

        if (!insertError && insertedData) {
          if (insertedData.kode && insertedData.kode !== newItem.kode) {
            newItem.kode = insertedData.kode;
            newItem.sku = insertedData.kode;
            setItems(prev => prev.map(i => i.id === newItem.id ? { ...i, kode: insertedData.kode, sku: insertedData.kode } : i));
          }
        } else if (insertError) {
          // Auto-retry on collision (Error 23505 unique violation or duplicate error)
          if (
            insertError.code === '23505' || 
            insertError.message?.toLowerCase().includes('duplicate') || 
            insertError.message?.toLowerCase().includes('unique')
          ) {
            console.warn('⚠️ Supabase code collision detected. Auto-resolving next code...');
            const isMat = newItem.category === 'MATERIAL' || String(newItem.kode).startsWith('MAT-');
            const safeNextCode = await allocateNextSequentialCode(supabase, isMat ? 'MATERIAL' : 'SAMPLE', items);
            newItem.kode = safeNextCode;
            newItem.sku = safeNextCode;
            newItem.name = newItem.name.replace(finalCode, safeNextCode);
            dbPayload = localItemToDb(newItem);
            await supabase.from('items').insert([dbPayload]);
            setItems(prev => prev.map(i => i.id === newItem.id ? newItem : i));
          } else {
            console.error('Supabase insert item error:', insertError);
          }
        }
      } catch (err) {
        console.error('Supabase insert item error:', err);
      }
    }

    // Instantly broadcast to all other devices
    broadcastChange('ITEM_ADDED', { id: newItem.id, picName: newItem.picName, boxNumber: newItem.boxNumber });

    return newItem;
  };

  const importInventoryItems = async (records) => {
    const client = supabase;
    if (client && !supabaseStatus.isConnected) {
      throw new Error('Hubungkan Supabase sebelum mengimpor.');
    }

    const now = new Date().toISOString();
    const createdBy = currentUser?.name || 'Royan';
    const isByHelper = isHelper({ name: createdBy }) || ['sheva', 'ade', 'tri'].includes(String(createdBy).toLowerCase());
    const trackingTags = [
      `inputted_by:${encodeURIComponent(createdBy)}`,
      ...(isByHelper ? [`helper:${encodeURIComponent(createdBy)}`] : []),
    ];

    const takenItems = [...items];
    const codedRecords = [];
    const allocationQueue = {};

    const nextAllocatedCode = async (record) => {
      const isMaterial = String(record.category || '').trim().toUpperCase() === 'MATERIAL';
      const category = isMaterial ? 'MATERIAL' : 'SAMPLE';
      if (!allocationQueue[category]) {
        const remaining = records.filter(r => {
          const curCategory = String(r.category || '').trim().toUpperCase() === 'MATERIAL' ? 'MATERIAL' : 'SAMPLE';
          return curCategory === category && !String(r.kode || r.sku || '').trim();
        }).length;
        allocationQueue[category] = await allocateSequentialCodeBatch(client, category, remaining, takenItems);
      }
      return allocationQueue[category].shift();
    };

    const revisionsFromImport = [];
    for (const record of records) {
      const original = String(record.kode || record.sku || '').trim().toUpperCase();
      const requested = normalizeSequentialCode(record.kode || record.sku || '');
      const allocated = requested || await nextAllocatedCode(record);
      const { finalCode } = resolveUniqueCode(allocated, takenItems, null);
      const { item: upperRecord } = normalizeItemTextUppercase(record);
      const coded = { ...upperRecord, kode: finalCode, sku: finalCode };
      if (original && original !== String(finalCode).trim().toUpperCase()) {
        revisionsFromImport.push({ record: coded, oldCode: original, newCode: finalCode });
      }
      codedRecords.push(coded);
      takenItems.push(coded);
    }

    const newItems = codedRecords.map(record => ({
      ...record,
      id: `item-${crypto.randomUUID()}`,
      dateIn: record.dateIn || now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      status: 'In Storage',
      createdBy,
      inputtedBy: createdBy,
      helperName: isByHelper ? createdBy : null,
      tags: [
        ...(Array.isArray(record.tags) ? record.tags.filter(t => typeof t === 'string' && !t.startsWith('inputted_by:') && !t.startsWith('helper:')) : []),
        ...trackingTags,
      ],
    }));
    if (client) {
      const { error } = await client.from('items').insert(newItems.map(localItemToDb));
      if (error) throw new Error(`Gagal menyimpan item: ${error.message}`);
    }

    setItems(prev => {
      const importedIds = new Set(newItems.map(item => item.id));
      return [...newItems, ...prev.filter(item => !importedIds.has(item.id))];
    });

    const entries = newItems.map(item => ({
      id: `trx-${crypto.randomUUID()}`,
      date: now,
      type: 'IN',
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      boxNumber: item.boxNumber,
      qty: item.qty,
      unit: item.unit,
      picName: item.picName,
      actor: createdBy,
      recipientOrSource: `Impor Excel oleh ${createdBy}`,
      notes: 'Impor Excel',
    }));
    let warning = null;
    if (client) {
      try {
        const { error } = await client.from('transactions').insert(entries.map(localTrxToDb));
        if (error) throw error;
      } catch {
        warning = 'Item sudah tersimpan, tetapi riwayat transaksi impor gagal dicatat.';
      }
    }
    setTransactions(prev => [...entries, ...prev]);

    if (revisionsFromImport.length > 0) {
      const idByKey = new Map(newItems.map(item => [`${item.boxNumber}|${item.deskripsi}|${item.color}`, item.id]));
      revisionsFromImport.forEach(({ record, oldCode, newCode }) => {
        recordCodeRevision({
          oldCode,
          newCode,
          itemId: idByKey.get(`${record.boxNumber}|${record.deskripsi}|${record.color}`),
          itemName: record.description || record.name,
          boxNumber: record.boxNumber,
          source: 'IMPOR EXCEL',
          actor: createdBy,
        });
      });
    }

    broadcastChange('DATA_IMPORTED', { count: newItems.length });
    return { items: newItems, warning };
  };

  const updateItem = async (itemId, updatedData) => {
    const oldItem = items.find((i) => String(i.id) === String(itemId));
    if (!oldItem) return null;

    // ATURAN KEAMANAN: Dapat diedit oleh pemilik box, penginput item, Helper, atau Superuser
    const oldBoxObj = boxes.find(b => Number(b.boxNumber) === Number(oldItem.boxNumber));
    const oldOwner = oldBoxObj?.picName || oldItem.picName;
    const isInputter = currentUser && (
      (oldItem.inputtedBy && String(currentUser.name).trim().toLowerCase() === String(oldItem.inputtedBy).trim().toLowerCase()) ||
      (oldItem.createdBy && String(currentUser.name).trim().toLowerCase() === String(oldItem.createdBy).trim().toLowerCase())
    );
    const isBoxOwner = currentUser && oldOwner && String(currentUser.name).trim().toLowerCase() === String(oldOwner).trim().toLowerCase();
    const canModify = !currentUser || isSuperuser(currentUser) || isHelper(currentUser) || isBoxOwner || isInputter;

    if (!canModify) {
      const errMsg = `Akses ditolak: Data sampel ini berada di Box #${oldItem.boxNumber} milik PIC "${oldOwner}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat mengedit data user lain.`;
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }
    if (updatedData.boxNumber && Number(updatedData.boxNumber) !== Number(oldItem.boxNumber)) {
      const destBox = boxes.find(b => Number(b.boxNumber) === Number(updatedData.boxNumber));
      const destOwner = destBox?.picName;
      if (currentUser && !isSuperuser(currentUser) && !isHelper(currentUser) && destOwner && String(currentUser.name).trim().toLowerCase() !== String(destOwner).trim().toLowerCase()) {
        const errMsg = `Akses ditolak: Box tujuan #${updatedData.boxNumber} milik PIC "${destOwner}". Satu user tidak dapat memindahkan data ke box user lain.`;
        showNotification(errMsg, 'error', 6000);
        throw new Error(errMsg);
      }
    }

    // Automatically record and remember newly inputted data
    recordSuggestions(updatedData);

    // Concurrency protection on update
    let finalCode = updatedData.kode !== undefined ? updatedData.kode : (updatedData.sku !== undefined ? updatedData.sku : oldItem.kode);
    const requestedCode = String(finalCode || '').trim().toUpperCase();
    const resolved = resolveUniqueCode(finalCode, items, itemId);
    if (resolved.wasAdjusted) {
      finalCode = resolved.finalCode;
      showNotification(
        '⚠️ Kode sample otomatis disesuaikan agar tetap unik dan tidak bentrok.',
        'info',
        5000
      );
    }

    const previousCode = String(oldItem.kode || oldItem.sku || '').trim().toUpperCase();
    if (previousCode && String(finalCode || '').trim().toUpperCase() !== previousCode) {
      recordCodeRevision({
        oldCode: previousCode,
        newCode: finalCode,
        itemId: oldItem.id,
        itemName: updatedData.name || updatedData.description || oldItem.name || oldItem.description,
        boxNumber: oldItem.boxNumber,
        source: String(requestedCode) !== previousCode && resolved.wasAdjusted ? 'EDIT (bentrok disesuaikan)' : 'EDIT',
        actor: currentUser?.name || 'Royan',
      });
    }

    const oldBox = Number(oldItem.boxNumber);
    const newBox = updatedData.boxNumber !== undefined ? Number(updatedData.boxNumber) : oldBox;
    const finalQty = Number(updatedData.qty !== undefined ? updatedData.qty : (updatedData.jumlah !== undefined ? updatedData.jumlah : oldItem.qty)) || 1;
    const rawUnit = updatedData.unit || updatedData.satuan || oldItem.unit || 'PCE';
    const finalUnit = String(rawUnit).toUpperCase() === 'PCS' ? 'PCE' : rawUnit;
    const { item: upperUpdatedData } = normalizeItemTextUppercase(updatedData);

    const finalInputtedBy = updatedData.inputtedBy || oldItem.inputtedBy || oldItem.createdBy || currentUser?.name || 'Royan';
    const isSupportFinal = ['sheva', 'ade', 'tri'].includes(String(finalInputtedBy).toLowerCase());
    const trackingTags = [
      `inputted_by:${encodeURIComponent(finalInputtedBy)}`,
      ...(isSupportFinal ? [`helper:${encodeURIComponent(finalInputtedBy)}`] : []),
    ];
    const cleanExistingTags = (Array.isArray(updatedData.tags || oldItem.tags) ? (updatedData.tags || oldItem.tags) : [])
      .filter(t => typeof t === 'string' && !t.startsWith('inputted_by:') && !t.startsWith('helper:'));

    const finalItem = {
      ...oldItem,
      ...upperUpdatedData,
      kode: finalCode,
      sku: finalCode,
      boxNumber: newBox,
      qty: finalQty,
      jumlah: finalQty,
      unit: finalUnit,
      satuan: finalUnit,
      inputtedBy: finalInputtedBy,
      createdBy: oldItem.createdBy || finalInputtedBy,
      helperName: isSupportFinal ? finalInputtedBy : (updatedData.helperName || oldItem.helperName || null),
      tags: [...cleanExistingTags, ...trackingTags],
    };

    // Update local state cleanly
    setItems((prev) => prev.map((item) => (String(item.id) === String(itemId) ? finalItem : item)));

    // If box changed, log relocate transaction cleanly OUTSIDE of setItems
    if (!isNaN(oldBox) && !isNaN(newBox) && oldBox !== newBox) {
      const oldBoxObj = boxes.find((b) => Number(b.boxNumber) === oldBox);
      const newBoxObj = boxes.find((b) => Number(b.boxNumber) === newBox);
      addTransaction({
        type: 'RELOCATE',
        itemId: finalItem.id,
        itemName: finalItem.name || finalItem.style || finalItem.deskripsi || oldItem.name || 'Sample',
        sku: finalItem.sku || finalItem.kode || oldItem.sku || '',
        boxNumber: newBox,
        rackName: newBoxObj ? newBoxObj.rackName : 'RACK ?',
        qty: finalItem.qty,
        unit: finalItem.unit,
        picName: finalItem.picName || (newBoxObj ? newBoxObj.picName : 'Royan'),
        recipientOrSource: `Dipindah dari Box ${oldBox} (${oldBoxObj ? oldBoxObj.rackName : ''})`,
        notes: `Relokasi dari Box #${oldBox} ke Box #${newBox}`,
      });
    }

    // Sync to Supabase in background
    if (supabase) {
      try {
        await supabase.from('items').upsert([localItemToDb(finalItem)], { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase update item error:', err);
      }
    }

    broadcastChange('ITEM_UPDATED', { id: itemId });

    return finalItem;
  };

  const deleteItem = async (itemId) => {
    if (!itemId) return;
    const idStr = String(itemId);
    const itemToDelete = items.find(i => String(i.id) === idStr);

    if (isHelper(currentUser)) {
      const errMsg = 'Akses ditolak: Tim Support tidak memiliki izin menghapus item. Silakan hubungi PIC pemilik box.';
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    // ATURAN KEAMANAN: Satu user tidak dapat menghapus data user lain (Kecuali Superuser / Support)
    if (itemToDelete) {
      const box = boxes.find(b => Number(b.boxNumber) === Number(itemToDelete.boxNumber));
      const owner = box?.picName || itemToDelete.picName;
      if (currentUser && !isSuperuser(currentUser) && !isHelper(currentUser) && owner && String(currentUser.name).trim().toLowerCase() !== String(owner).trim().toLowerCase()) {
        const errMsg = `Akses ditolak: Data sampel ini milik PIC "${owner}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat menghapus data user lain.`;
        showNotification(errMsg, 'error', 6000);
        throw new Error(errMsg);
      }
    }

    // 1. Simpan ke blacklist deleted IDs di localStorage agar tidak pernah bangkit lagi saat refresh
    recordDeletedItemIds([idStr]);

    // 2. Catat riwayat transaksi keluar
    if (itemToDelete) {
      try {
        await addTransaction({
          type: 'OUT',
          itemId: null, // Jangan referensikan item_id agar tidak terikat FK constraint
          itemName: itemToDelete.name || itemToDelete.style || itemToDelete.deskripsi || 'Sample',
          boxNumber: itemToDelete.boxNumber ? Number(itemToDelete.boxNumber) : 0,
          rackName: itemToDelete.rackName || `Box ${itemToDelete.boxNumber || 0}`,
          qty: Number(itemToDelete.qty || itemToDelete.jumlah) || 1,
          unit: itemToDelete.unit || itemToDelete.satuan || 'PCS',
          picName: itemToDelete.picName || 'Royan',
          recipientOrSource: 'Dihapus dari Sistem / Disposal',
          notes: 'Item dikeluarkan/dihapus dari catatan box',
        });
      } catch (err) {
        console.warn('Gagal mencatat transaksi hapus:', err);
      }
    }

    // 3. Segera hapus dari state lokal (responsif seketika)
    setItems((prev) => prev.filter((item) => String(item.id) !== idStr));

    // 4. Sinkronisasi ke Supabase
    if (supabase) {
      try {
        // Lepas relasi item_id di tabel transactions terlebih dahulu
        try {
          await supabase.from('transactions').update({ item_id: null }).eq('item_id', idStr);
        } catch (fkErr) {
          console.warn('Update foreign key transaksi dilewati:', fkErr);
        }

        // Coba Hard Delete dari tabel items
        const { error: delError } = await supabase.from('items').delete().eq('id', idStr);

        // Jika hard delete ditolak oleh permission Supabase (error 42501),
        // jalankan Soft Delete via UPDATE status: 'DELETED' yang 100% diizinkan
        if (delError) {
          console.warn('Hard delete tidak diizinkan oleh Supabase, menjalankan status DELETED:', delError.message);
          await supabase.from('items').update({
            status: 'DELETED',
            box_number: -999999,
            rack_id: -999999,
            rack_name: 'DELETED',
            place: 'DELETED',
            qty: 0,
            jumlah: 0,
            updated_at: new Date().toISOString(),
          }).eq('id', idStr);
        }
      } catch (err) {
        console.error('Supabase delete item error:', err);
        try {
          await supabase.from('items').update({
            status: 'DELETED',
            box_number: -999999,
            rack_id: -999999,
            rack_name: 'DELETED',
            place: 'DELETED',
            qty: 0,
            jumlah: 0,
            updated_at: new Date().toISOString(),
          }).eq('id', idStr);
        } catch {}
      }
    }

    broadcastChange('ITEM_DELETED', { id: itemId });

    return true;
  };

  const deleteMultipleItems = async (itemIds) => {
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return 0;
    const idStrings = itemIds.map(id => String(id));
    const idSet = new Set(idStrings);

    if (isHelper(currentUser)) {
      const errMsg = 'Akses ditolak: Tim Support tidak memiliki izin menghapus item. Silakan hubungi PIC pemilik box.';
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    // ATURAN KEAMANAN: Satu user tidak dapat menghapus data user lain (Kecuali Superuser / Support)
    if (currentUser && !isSuperuser(currentUser) && !isHelper(currentUser)) {
      const forbidden = items.find(i => {
        if (!idSet.has(String(i.id))) return false;
        const box = boxes.find(b => Number(b.boxNumber) === Number(i.boxNumber));
        const owner = box?.picName || i.picName;
        return owner && String(currentUser.name).trim().toLowerCase() !== String(owner).trim().toLowerCase();
      });
      if (forbidden) {
        const box = boxes.find(b => Number(b.boxNumber) === Number(forbidden.boxNumber));
        const owner = box?.picName || forbidden.picName;
        const errMsg = `Akses ditolak: Sebagian data terpilih milik PIC "${owner}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat menghapus data user lain.`;
        showNotification(errMsg, 'error', 6000);
        throw new Error(errMsg);
      }
    }

    // 1. Simpan ke blacklist deleted IDs di localStorage
    recordDeletedItemIds(idStrings);

    // 2. Hapus dari state lokal seketika
    setItems((prev) => prev.filter((item) => !idSet.has(String(item.id))));

    // 3. Sinkronisasi ke Supabase
    if (supabase) {
      try {
        try {
          await supabase.from('transactions').update({ item_id: null }).in('item_id', idStrings);
        } catch {}

        const { error: delError } = await supabase.from('items').delete().in('id', idStrings);
        if (delError) {
          console.warn('Hard delete multiple dibatasi Supabase, update status DELETED:', delError.message);
          await supabase.from('items').update({
            status: 'DELETED',
            box_number: -999999,
            rack_id: -999999,
            rack_name: 'DELETED',
            place: 'DELETED',
            qty: 0,
            jumlah: 0,
            updated_at: new Date().toISOString(),
          }).in('id', idStrings);
        }
      } catch (err) {
        console.error('Supabase delete multiple items error:', err);
        try {
          await supabase.from('items').update({
            status: 'DELETED',
            box_number: -999999,
            rack_id: -999999,
            rack_name: 'DELETED',
            place: 'DELETED',
            qty: 0,
            jumlah: 0,
            updated_at: new Date().toISOString(),
          }).in('id', idStrings);
        } catch {}
      }
    }

    broadcastChange('ITEMS_DELETED', { count: idStrings.length });

    return idStrings.length;
  };

  const deleteAllItems = async () => {
    const allIds = items.map((i) => String(i.id));

    // Simpan semua ID ke blacklist
    recordDeletedItemIds(allIds);

    // Clear local state (localStorage is cleared by the persistence effect)
    setItems([]);

    // Bulk delete from Supabase
    if (supabase) {
      try {
        try {
          await supabase.from('transactions').update({ item_id: null }).neq('id', 'NONE');
        } catch {}

        const { error: delError } = await supabase.from('items').delete().neq('id', 'SYSTEM_CONFIG_TIMER').neq('id', 'SYSTEM_CONFIG_ANNOUNCEMENT').neq('id', 'SYSTEM_CONFIG_TARGET_JASMINE').neq('id', 'SYSTEM_CONFIG_GEMINI_KEY');
        if (delError) {
          console.warn('Hard delete all dibatasi, update status DELETED:', delError.message);
          await supabase.from('items').update({
            status: 'DELETED',
            box_number: -999999,
            rack_id: -999999,
            rack_name: 'DELETED',
            place: 'DELETED',
            qty: 0,
            jumlah: 0,
            updated_at: new Date().toISOString(),
          }).neq('id', 'SYSTEM_CONFIG_TIMER').neq('id', 'SYSTEM_CONFIG_ANNOUNCEMENT').neq('id', 'SYSTEM_CONFIG_TARGET_JASMINE').neq('id', 'SYSTEM_CONFIG_GEMINI_KEY');
        }
      } catch (err) {
        console.error('Supabase bulk delete items error:', err);
        try {
          await supabase.from('items').update({
            status: 'DELETED',
            box_number: -999999,
            rack_id: -999999,
            rack_name: 'DELETED',
            place: 'DELETED',
            qty: 0,
            jumlah: 0,
            updated_at: new Date().toISOString(),
          }).neq('id', 'SYSTEM_CONFIG_TIMER').neq('id', 'SYSTEM_CONFIG_ANNOUNCEMENT').neq('id', 'SYSTEM_CONFIG_TARGET_JASMINE').neq('id', 'SYSTEM_CONFIG_GEMINI_KEY');
        } catch {}
      }
    }

    return allIds.length;
  };

  const addTransaction = async (trxData) => {
    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newTrx = {
      id: 'trx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: formattedDate,
      ...trxData,
    };

    setTransactions((prev) => [newTrx, ...prev]);

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('transactions').insert([localTrxToDb(newTrx)]);
      } catch (err) {
        console.error('Supabase add transaction error:', err);
      }
    }
  };

  const setBoxFull = async (boxNumber, isFull) => {
    const box = boxes.find(entry => entry.boxNumber === boxNumber);
    if (!box) throw new Error('Box tidak ditemukan.');

    // ATURAN KEAMANAN: Satu user tidak dapat mengubah status box user lain (Kecuali Superuser atau Helper / Asisten Rekap)
    if (currentUser && !isSuperuser(currentUser) && !isHelper(currentUser) && box.picName && String(currentUser.name).trim().toLowerCase() !== String(box.picName).trim().toLowerCase()) {
      const errMsg = `Akses ditolak: Box #${boxNumber} adalah milik PIC "${box.picName}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat mengedit data user lain.`;
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    if (supabase) {
      // Kirim baris lengkap: upsert parsial pernah membuat baris box baru dengan
      // rack/PIC NULL sehingga box hilang dari raknya.
      const { error } = await supabase
        .from('boxes')
        .upsert([localBoxToDb({ ...box, isFull })], { onConflict: 'box_number' });
      if (error) throw error;
    }

    setBoxes(previous => previous.map(entry =>
      entry.boxNumber === boxNumber ? { ...entry, isFull } : entry
    ));
  };

  const updateBoxNotes = async (boxNumber, notes) => {
    const targetBox = boxes.find(b => Number(b.boxNumber) === Number(boxNumber));
    if (currentUser && !isSuperuser(currentUser) && !isHelper(currentUser) && targetBox?.picName && String(currentUser.name).trim().toLowerCase() !== String(targetBox.picName).trim().toLowerCase()) {
      const errMsg = `Akses ditolak: Box #${boxNumber} adalah milik PIC "${targetBox.picName}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat mengedit data user lain.`;
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    setBoxes((prev) =>
      prev.map((box) => (box.boxNumber === boxNumber ? { ...box, notes } : box))
    );

    // Sync to Supabase
    if (supabase) {
      try {
        const boxToUpdate = boxes.find(b => b.boxNumber === boxNumber);
        if (boxToUpdate) {
          await supabase.from('boxes').upsert([localBoxToDb({ ...boxToUpdate, notes })], { onConflict: 'box_number' });
        }
      } catch (err) {
        console.error('Supabase update box error:', err);
      }
    }
  };

  // --- Box Management ---

  const addBox = async ({ rackId, category, picName, notes }) => {
    // Auto-assign next box number (tolerate string / missing values, ignore system timer box)
    const maxBoxNum = boxes
      .filter(b => Number(b.boxNumber) < 900000)
      .reduce(
        (max, b) => Math.max(max, Number(b.boxNumber) || 0),
        0
      );
    const newBoxNumber = maxBoxNum + 1;

    // If no racks exist (or the requested rack is gone), place on "Lantai" (floor)
    const useRackId = rackId != null && rackId !== '' ? Number(rackId) : null;
    const targetRack = useRackId != null
      ? racks.find(r => Number(r.id) === useRackId)
      : null;
    const effectiveRack = targetRack || getFloorRack(category);
    const effectiveCategory = category || effectiveRack.category || 'SAMPLE';

    // Find PPIC member by name
    const ppicObj = ppicMembers.find(p => p.name === picName) || ppicMembers[0];

    const newBox = {
      boxNumber: newBoxNumber,
      code: `BOX-${String(newBoxNumber).padStart(2, '0')}`,
      rackId: effectiveRack.id,
      rackName: effectiveRack.name,
      category: effectiveCategory,
      location: effectiveRack.location || '',
      rackDescription: effectiveRack.fullDescription || effectiveRack.location || '',
      picName: ppicObj ? ppicObj.name : (picName || 'Royan'),
      ppicId: ppicObj ? ppicObj.id : '',
      ppicNumber: ppicObj ? ppicObj.ppicNumber : 0,
      capacityLimit: 20,
      notes: notes || '',
    };

    setBoxes(prev => [...prev, newBox]);

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('boxes').upsert([localBoxToDb(newBox)], { onConflict: 'box_number' });
      } catch (err) {
        console.error('Supabase add box error:', err);
      }
    }

    return newBox;
  };

  const updateBox = async (boxNumber, updates) => {
    const num = Number(boxNumber);
    const box = boxes.find(b => Number(b.boxNumber) === num);
    if (!box) throw new Error(`Box #${boxNumber} tidak ditemukan.`);

    // ATURAN KEAMANAN: Satu user tidak dapat mengedit box user lain (Kecuali Superuser / Support)
    if (currentUser && !isSuperuser(currentUser) && !isHelper(currentUser) && box.picName && String(currentUser.name).trim().toLowerCase() !== String(box.picName).trim().toLowerCase()) {
      const errMsg = `Akses ditolak: Box #${boxNumber} adalah milik PIC "${box.picName}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat mengedit data user lain.`;
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    // An empty PIC selection means "keep the current PIC", not "clear it".
    const cleanUpdates = { ...updates };
    if (!cleanUpdates.picName) delete cleanUpdates.picName;

    let updatedBox = { ...box, ...cleanUpdates };
    if (cleanUpdates.rackId !== undefined) {
      const rack = cleanUpdates.rackId !== null && cleanUpdates.rackId !== ''
        ? racks.find(r => Number(r.id) === Number(cleanUpdates.rackId))
        : null;
      const effectiveRack = rack || getFloorRack(cleanUpdates.category || box.category);
      updatedBox.rackId = effectiveRack.id;
      updatedBox.rackName = effectiveRack.name;
      updatedBox.location = effectiveRack.location || '';
      updatedBox.rackDescription = effectiveRack.fullDescription || effectiveRack.location || '';
      if (!cleanUpdates.category) {
        updatedBox.category = effectiveRack.category || updatedBox.category;
      }
    }

    // If picName changed, keep the denormalised PPIC id/number in sync
    if (cleanUpdates.picName !== undefined) {
      const ppicObj = ppicMembers.find(p => p.name === cleanUpdates.picName);
      if (ppicObj) {
        updatedBox.ppicId = ppicObj.id;
        updatedBox.ppicNumber = ppicObj.ppicNumber;
      }
    }

    setBoxes(prev => prev.map(b => Number(b.boxNumber) === num ? updatedBox : b));

    // Items store a denormalised copy of their box's rack/PIC. Keep it in sync
    // so the summary table, filters and printed labels stay consistent.
    const affectedItems = items.filter(i => Number(i.boxNumber) === num);
    if (affectedItems.length > 0) {
      const refreshedItems = affectedItems.map(i => ({
        ...i,
        rackId: updatedBox.rackId,
        rackName: updatedBox.rackName,
        picName: updatedBox.picName,
        category: updatedBox.category,
        place: `BOX ${updatedBox.boxNumber} (${updatedBox.rackName} - ${updatedBox.picName})`,
      }));
      setItems(prev => prev.map(i => (
        Number(i.boxNumber) === num
          ? {
              ...i,
              rackId: updatedBox.rackId,
              rackName: updatedBox.rackName,
              picName: updatedBox.picName,
              category: updatedBox.category,
              place: `BOX ${updatedBox.boxNumber} (${updatedBox.rackName} - ${updatedBox.picName})`,
            }
          : i
      )));

      if (supabase && refreshedItems.some(i => i.id)) {
        try {
          await supabase.from('items').upsert(
            refreshedItems.filter(i => i.id).map(localItemToDb),
            { onConflict: 'id' }
          );
        } catch (err) {
          console.error('Supabase sync items after box update error:', err);
        }
      }
    }

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('boxes').upsert([localBoxToDb(updatedBox)], { onConflict: 'box_number' });
      } catch (err) {
        console.error('Supabase update box error:', err);
      }
    }

    broadcastChange('BOX_UPDATED', { boxNumber: num });

    return updatedBox;
  };

  // === FITUR EDIT KEPEMILIKAN BOX (PENGALIHAN PIC BOX) ===
  const [isBoxOwnershipModalOpen, setIsBoxOwnershipModalOpen] = useState(false);

  const reassignBoxOwnership = async (boxNumber, newPicName, options = { syncItems: true }) => {
    const num = Number(boxNumber);
    const box = boxes.find(b => Number(b.boxNumber) === num);
    if (!box) throw new Error(`Box #${boxNumber} tidak ditemukan.`);

    const cleanNewPic = String(newPicName || '').trim();
    if (!cleanNewPic) throw new Error('Nama PIC baru wajib dipilih.');

    const oldPic = box.picName || 'Tidak Diketahui';
    if (cleanNewPic.toLowerCase() === oldPic.toLowerCase()) {
      return { success: false, message: `Box #${boxNumber} sudah dimiliki oleh ${cleanNewPic}.`, box };
    }

    const ppicObj = ppicMembers.find(p => p.name.toLowerCase() === cleanNewPic.toLowerCase()) || {
      id: cleanNewPic.toLowerCase().replace(/\s+/g, '-'),
      name: cleanNewPic,
      ppicNumber: 0,
    };

    const updatedBox = {
      ...box,
      picName: ppicObj.name,
      ppicId: ppicObj.id,
      ppicNumber: ppicObj.ppicNumber,
    };

    // 1. Update Box State
    setBoxes(prev => prev.map(b => Number(b.boxNumber) === num ? updatedBox : b));

    // 2. Update Contained Items if requested
    let affectedCount = 0;
    if (options.syncItems !== false) {
      const affectedItems = items.filter(i => Number(i.boxNumber) === num);
      affectedCount = affectedItems.length;

      if (affectedCount > 0) {
        const refreshedItems = affectedItems.map(i => ({
          ...i,
          picName: updatedBox.picName,
          place: `BOX ${updatedBox.boxNumber} (${updatedBox.rackName} - ${updatedBox.picName})`,
        }));

        setItems(prev => prev.map(i => (
          Number(i.boxNumber) === num
            ? {
                ...i,
                picName: updatedBox.picName,
                place: `BOX ${updatedBox.boxNumber} (${updatedBox.rackName} - ${updatedBox.picName})`,
              }
            : i
        )));

        if (supabase && refreshedItems.some(i => i.id)) {
          try {
            await supabase.from('items').upsert(
              refreshedItems.filter(i => i.id).map(localItemToDb),
              { onConflict: 'id' }
            );
          } catch (err) {
            console.error('Supabase sync items after box reassign error:', err);
          }
        }
      }
    }

    // 3. Sync Box to Supabase Cloud
    if (supabase) {
      try {
        await supabase.from('boxes').upsert([localBoxToDb(updatedBox)], { onConflict: 'box_number' });
      } catch (err) {
        console.error('Supabase update box ownership error:', err);
      }
    }

    // 4. Catat riwayat audit transaksi
    try {
      const now = new Date();
      const formattedDate = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const trxLog = {
        id: 'trx-reassign-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        date: formattedDate,
        type: 'RELOCATE',
        boxNumber: num,
        rackName: updatedBox.rackName,
        picName: updatedBox.picName,
        recipientOrSource: `Alih Kepemilikan: Dari ${oldPic} ke ${updatedBox.picName}`,
        notes: `Pengalihan kepemilikan Box #${num} (${affectedCount} item disinkronkan ke PIC baru)`,
        qty: affectedCount,
        unit: 'ITEMS',
      };
      setTransactions(prev => [trxLog, ...prev]);
      if (supabase) {
        supabase.from('transactions').insert([localTrxToDb(trxLog)]).then(() => {}).catch(() => {});
      }
    } catch {}

    broadcastChange('BOX_REASSIGNED', { boxNumber: num, oldPic, newPic: updatedBox.picName });

    const msg = `Kepemilikan Box #${num} berhasil dialihkan dari ${oldPic} ke ${updatedBox.picName} (${affectedCount} item diperbarui).`;
    if (showNotification) {
      showNotification(msg, 'success', 5000);
    }

    return { success: true, message: msg, box: updatedBox, affectedItemsCount: affectedCount };
  };

  const reassignMultipleBoxesOwnership = async (boxNumbers = [], newPicName, options = { syncItems: true }) => {
    if (!Array.isArray(boxNumbers) || boxNumbers.length === 0) {
      throw new Error('Pilih minimal satu box untuk dialihkan kepemilikannya.');
    }
    const cleanNewPic = String(newPicName || '').trim();
    if (!cleanNewPic) throw new Error('Nama PIC baru wajib dipilih.');

    const ppicObj = ppicMembers.find(p => p.name.toLowerCase() === cleanNewPic.toLowerCase()) || {
      id: cleanNewPic.toLowerCase().replace(/\s+/g, '-'),
      name: cleanNewPic,
      ppicNumber: 0,
    };

    const targetNums = new Set(boxNumbers.map(Number));
    const updatedBoxes = [];

    setBoxes(prev => prev.map(b => {
      if (targetNums.has(Number(b.boxNumber))) {
        const up = {
          ...b,
          picName: ppicObj.name,
          ppicId: ppicObj.id,
          ppicNumber: ppicObj.ppicNumber,
        };
        updatedBoxes.push(up);
        return up;
      }
      return b;
    }));

    let totalAffectedItems = 0;
    if (options.syncItems !== false) {
      const affected = items.filter(i => targetNums.has(Number(i.boxNumber)));
      totalAffectedItems = affected.length;

      if (totalAffectedItems > 0) {
        setItems(prev => prev.map(i => {
          if (targetNums.has(Number(i.boxNumber))) {
            const b = updatedBoxes.find(ub => Number(ub.boxNumber) === Number(i.boxNumber));
            const rackName = b?.rackName || i.rackName || 'RACK';
            return {
              ...i,
              picName: ppicObj.name,
              place: `BOX ${i.boxNumber} (${rackName} - ${ppicObj.name})`,
            };
          }
          return i;
        }));

        if (supabase) {
          const payloadItems = affected.map(i => {
            const b = updatedBoxes.find(ub => Number(ub.boxNumber) === Number(i.boxNumber));
            const rackName = b?.rackName || i.rackName || 'RACK';
            return localItemToDb({
              ...i,
              picName: ppicObj.name,
              place: `BOX ${i.boxNumber} (${rackName} - ${ppicObj.name})`,
            });
          });
          supabase.from('items').upsert(payloadItems, { onConflict: 'id' }).then(() => {}).catch(err => {
            console.error('Batch sync items after box reassign error:', err);
          });
        }
      }
    }

    if (supabase && updatedBoxes.length > 0) {
      supabase.from('boxes').upsert(updatedBoxes.map(localBoxToDb), { onConflict: 'box_number' }).then(() => {}).catch(err => {
        console.error('Batch update boxes error:', err);
      });
    }

    broadcastChange('BOXES_BATCH_REASSIGNED', { boxNumbers: Array.from(targetNums), newPic: ppicObj.name });

    const msg = `Berhasil mengalihkan kepemilikan ${updatedBoxes.length} box ke ${ppicObj.name} (${totalAffectedItems} item disinkronkan).`;
    if (showNotification) {
      showNotification(msg, 'success', 5000);
    }

    return { success: true, message: msg, updatedCount: updatedBoxes.length, totalAffectedItems };
  };

  const deleteBox = async (boxNumber, options = { moveItemsToFloor: true }) => {
    const boxNum = Number(boxNumber);
    const boxToDelete = boxes.find(b => Number(b.boxNumber) === boxNum);

    if (isHelper(currentUser)) {
      const errMsg = 'Akses ditolak: Tim Support tidak memiliki izin menghapus box.';
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    // ATURAN KEAMANAN: Satu user tidak dapat menghapus box user lain (Kecuali Superuser / Royan)
    if (currentUser && !isSuperuser(currentUser) && boxToDelete?.picName && String(currentUser.name).trim().toLowerCase() !== String(boxToDelete.picName).trim().toLowerCase()) {
      const errMsg = `Akses ditolak: Box #${boxNumber} adalah milik PIC "${boxToDelete.picName}". Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat menghapus box user lain.`;
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }

    // Don't crash if box has items: relocate items to LANTAI if allowed
    const itemsInBox = items.filter(i => Number(i.boxNumber) === boxNum);
    if (itemsInBox.length > 0) {
      if (options?.moveItemsToFloor !== false) {
        setItems(prev => prev.map(item => {
          if (Number(item.boxNumber) === boxNum) {
            return {
              ...item,
              boxNumber: 0,
              rackId: 0,
              rackName: 'LANTAI',
              place: 'LANTAI',
            };
          }
          return item;
        }));

        if (supabase) {
          try {
            await supabase
              .from('items')
              .update({ box_number: 0, rack_id: 0, rack_name: 'LANTAI', place: 'LANTAI' })
              .eq('box_number', boxNum);
          } catch (err) {
            console.error('Supabase move items to floor error:', err);
          }
        }
      } else {
        throw new Error(`Box #${boxNum} masih berisi ${itemsInBox.length} item. Kosongkan dulu sebelum dihapus.`);
      }
    }

    setBoxes(prev => prev.filter(b => Number(b.boxNumber) !== boxNum));

    // Sync to Supabase
    if (supabase) {
      try {
        const { error: delError } = await supabase.from('boxes').delete().eq('box_number', boxNum);
        if (delError) {
          console.warn('Hard delete box dibatasi, update status DELETED:', delError.message);
          await supabase.from('boxes').update({
            code: 'DELETED',
            rack_id: -999999,
            rack_name: 'DELETED',
            notes: JSON.stringify({ isDeleted: true, deletedAt: new Date().toISOString() })
          }).eq('box_number', boxNum);
        }
      } catch (err) {
        console.error('Supabase delete box error:', err);
        try {
          await supabase.from('boxes').update({
            code: 'DELETED',
            rack_id: -999999,
            rack_name: 'DELETED',
            notes: JSON.stringify({ isDeleted: true, deletedAt: new Date().toISOString() })
          }).eq('box_number', boxNum);
        } catch {}
      }
    }
  };

  // --- Rack Management ---

  const addRack = ({ name, category, location }) => {
    if (!name || !name.trim()) throw new Error('Nama rak wajib diisi.');
    const cleanName = name.trim().toUpperCase();
    if (racks.some(r => r.name.toUpperCase() === cleanName)) {
      throw new Error(`Rak ${cleanName} sudah ada.`);
    }
    const maxId = racks.length > 0 ? Math.max(...racks.map(r => Number(r.id) || 0)) : 0;
    const newRack = {
      id: maxId + 1,
      name: cleanName,
      category: category || 'SAMPLE',
      rackType: 'Rak',
      location: location?.trim() || 'Area gudang',
      fullDescription: location?.trim() || 'Area gudang',
      boxRange: '',
      boxStart: null,
      boxEnd: null,
      totalBoxes: 0,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      accentColor: 'blue',
    };
    setRacks(prev => [...prev, newRack]);
    return newRack;
  };

  const deleteRack = async (id, options = { moveBoxesToFloor: true }) => {
    if (isHelper(currentUser)) {
      const errMsg = 'Akses ditolak: Tim Support tidak memiliki izin menghapus rak.';
      showNotification(errMsg, 'error', 6000);
      throw new Error(errMsg);
    }
    const target = racks.find(r => r.id === id || Number(r.id) === Number(id));
    const targetId = Number(target?.id ?? id);
    const rackBoxes = boxes.filter(b => Number(b.rackId) === targetId);

    if (rackBoxes.length > 0) {
      if (options?.moveBoxesToFloor !== false) {
        setBoxes(prev => prev.map(b => {
          if (Number(b.rackId) === targetId) {
            return { ...b, rackId: 0, rackName: 'LANTAI' };
          }
          return b;
        }));

        if (supabase) {
          try {
            await supabase.from('boxes').update({ rack_id: 0, rack_name: 'LANTAI' }).eq('rack_id', targetId);
          } catch (err) {
            console.error('Supabase move boxes to floor error:', err);
          }
        }
      } else {
        throw new Error(`${rackBoxes.length} box masih ada di rak ini. Pindahkan ke rak lain / Lantai dulu.`);
      }
    }

    setRacks(prev => prev.filter(r => Number(r.id) !== targetId));
  };

  // --- PPIC Member Management ---

  const addPpicMember = (member) => {
    const name = String(member.name || '').trim();
    if (!name) throw new Error('Nama orang wajib diisi.');
    if (ppicMembers.some(p => String(p.name).trim().toLowerCase() === name.toLowerCase())) {
      throw new Error(`${name} sudah terdaftar sebagai PIC.`);
    }
    const maxNumber = ppicMembers.reduce((max, p) => Math.max(max, Number(p.ppicNumber) || 0), 0);
    const palette = PPIC_BADGE_PALETTES[ppicMembers.length % PPIC_BADGE_PALETTES.length];
    const newMember = {
      id: member.id || `ppic-${Date.now()}`,
      ppicNumber: maxNumber + 1,
      name,
      role: member.role || 'PPIC Staff',
      email: member.email || '',
      totalBoxes: 0,
      ...palette,
    };
    setPpicMembers(prev => [...prev, newMember]);
    return newMember;
  };

  const updatePpicMember = (id, updates) => {
    // ATURAN KEAMANAN: Satu user tidak bisa edit user lain! (Kecuali Superuser / Royan)
    if (currentUser && !isSuperuser(currentUser) && String(currentUser.id).toLowerCase() !== String(id).toLowerCase()) {
      throw new Error(`Akses ditolak: Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat mengedit data user lain.`);
    }

    const member = ppicMembers.find(p => String(p.id) === String(id));
    if (!member) throw new Error('Data orang tidak ditemukan.');

    const nextName = String(updates.name ?? member.name).trim();
    if (!nextName) throw new Error('Nama orang wajib diisi.');
    if (ppicMembers.some(p => String(p.id) !== String(member.id)
        && String(p.name).trim().toLowerCase() === nextName.toLowerCase())) {
      throw new Error(`Nama ${nextName} sudah digunakan orang lain.`);
    }

    setPpicMembers(prev => prev.map(p => (
      String(p.id) === String(member.id) ? { ...p, ...updates, name: nextName } : p
    )));

    // Synchronize with users & currentUser
    setUsers(prev => prev.map(u => (
      String(u.id).toLowerCase() === String(id).toLowerCase()
        ? { ...u, ...updates, name: nextName, username: nextName }
        : u
    )));
    if (currentUser && String(currentUser.id).toLowerCase() === String(id).toLowerCase()) {
      setCurrentUser(prev => ({ ...prev, ...updates, name: nextName, username: nextName }));
    }

    // A person's name is denormalised into boxes and items. Propagate a rename
    // so filters, the 3D warehouse, printed labels and the summary stay consistent.
    if (nextName === member.name) return;

    const matchesMember = (record) =>
      String(record.ppicId ?? '') === String(member.id) ||
      String(record.picName ?? '').trim().toLowerCase() === String(member.name).trim().toLowerCase();

    const renamedBoxes = boxes
      .filter(matchesMember)
      .map(b => ({ ...b, picName: nextName, ppicId: member.id }));
    if (renamedBoxes.length > 0) {
      setBoxes(prev => prev.map(b => (
        matchesMember(b) ? { ...b, picName: nextName, ppicId: member.id } : b
      )));
    }

    const renamedItems = items.filter(matchesMember).map(i => ({ ...i, picName: nextName }));
    if (renamedItems.length > 0) {
      setItems(prev => prev.map(i => (matchesMember(i) ? { ...i, picName: nextName } : i)));
    }

    if (supabase) {
      if (renamedBoxes.length > 0) {
        supabase.from('boxes').upsert(renamedBoxes.map(localBoxToDb), { onConflict: 'box_number' })
          .then(({ error }) => { if (error) console.error('Supabase rename boxes error:', error); });
      }
      const itemsWithIds = renamedItems.filter(i => i.id);
      if (itemsWithIds.length > 0) {
        supabase.from('items').upsert(itemsWithIds.map(localItemToDb), { onConflict: 'id' })
          .then(({ error }) => { if (error) console.error('Supabase rename items error:', error); });
      }
    }
  };

  const deletePpicMember = (id, options = { reassignToDefault: true }) => {
    if (isHelper(currentUser)) {
      throw new Error('Akses ditolak: Tim Support tidak memiliki izin menghapus akun.');
    }
    // ATURAN KEAMANAN: Satu user tidak bisa hapus user lain! (Kecuali Superuser / Royan)
    if (currentUser && !isSuperuser(currentUser) && String(currentUser.id).toLowerCase() !== String(id).toLowerCase()) {
      throw new Error(`Akses ditolak: Anda sedang login sebagai "${currentUser.name}". Satu user tidak dapat menghapus akun user lain.`);
    }

    const member = ppicMembers.find(p => String(p.id) === String(id));
    if (!member) throw new Error('Data orang tidak ditemukan.');
    const assignedBoxes = boxes.filter(b =>
      String(b.ppicId ?? '') === String(member.id) || b.picName === member.name
    );
    if (assignedBoxes.length > 0) {
      if (options?.reassignToDefault !== false) {
        const fallbackPic = ppicMembers.find(p => String(p.id) !== String(member.id)) || { id: 'ppic-1', ppicNumber: 1, name: 'Royan' };
        setBoxes(prev => prev.map(b => (
          (String(b.ppicId ?? '') === String(member.id) || b.picName === member.name)
            ? { ...b, picName: fallbackPic.name, ppicId: fallbackPic.id, ppicNumber: fallbackPic.ppicNumber }
            : b
        )));
        if (supabase) {
          try {
            supabase.from('boxes').update({ pic_name: fallbackPic.name }).eq('pic_name', member.name);
          } catch {}
        }
      } else {
        throw new Error(`${assignedBoxes.length} box masih ditugaskan ke orang ini. Reassign box dulu.`);
      }
    }
    setPpicMembers(prev => prev.filter(p => String(p.id) !== String(member.id)));
  };

  // User Authentication & Profiling for 5 PICs
  const loginUser = (username, password) => {
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const user = users.find(u =>
      u.username.toLowerCase() === cleanUser ||
      u.name.toLowerCase() === cleanUser ||
      String(u.id).toLowerCase() === cleanUser
    );

    if (!user) {
      return {
        success: false,
        message: 'Pengguna tidak ditemukan.',
      };
    }

    if (user.password !== cleanPass) {
      return {
        success: false,
        message: 'Password salah. Akses ditolak.',
      };
    }

    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY + '_current_user', user.id);
    } catch {}
    return { success: true, user };
  };

  const logoutUser = () => {
    if (users.length > 0) {
      setCurrentUser(users[0]);
    }
  };

  const updateUserProfile = (targetUserId, updates) => {
    if (!currentUser) {
      throw new Error('Anda belum login. Silakan login terlebih dahulu sebagai PIC.');
    }

    // ATURAN KEAMANAN: Satu user tidak bisa edit user lain! (Kecuali Superuser / Royan)
    if (!isSuperuser(currentUser) && String(currentUser.id).toLowerCase() !== String(targetUserId).toLowerCase()) {
      throw new Error(`Akses ditolak: Anda sedang login sebagai "${currentUser.name}". Hanya Superuser yang dapat mengedit profil user lain.`);
    }

    const user = users.find(u => String(u.id).toLowerCase() === String(targetUserId).toLowerCase());
    if (!user) {
      throw new Error('Data user tidak ditemukan.');
    }

    const newName = updates.name !== undefined ? String(updates.name).trim() : user.name;
    const newRole = updates.role !== undefined ? String(updates.role).trim() : user.role;
    const newEmail = updates.email !== undefined ? String(updates.email).trim() : user.email;
    const newPassword = updates.password !== undefined && String(updates.password).trim() !== ''
      ? String(updates.password).trim()
      : user.password;

    if (!newName) {
      throw new Error('Nama user wajib diisi.');
    }

    if (users.some(u => String(u.id).toLowerCase() !== String(targetUserId).toLowerCase() && u.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error(`Nama "${newName}" sudah digunakan oleh PIC lain.`);
    }

    const updatedUser = {
      ...user,
      name: newName,
      username: newName,
      role: newRole,
      email: newEmail,
      password: newPassword,
    };

    setUsers(prev => prev.map(u => String(u.id).toLowerCase() === String(targetUserId).toLowerCase() ? updatedUser : u));
    setCurrentUser(updatedUser);

    // Sync with ppicMembers
    setPpicMembers(prev => prev.map(p => {
      if (String(p.id).toLowerCase() === String(targetUserId).toLowerCase()) {
        return {
          ...p,
          name: newName,
          role: newRole,
          email: newEmail,
        };
      }
      return p;
    }));

    // If name changed, rename in boxes and items
    if (user.name !== newName) {
      setBoxes(prev => prev.map(b => (b.picName === user.name ? { ...b, picName: newName } : b)));
      setItems(prev => prev.map(i => (i.picName === user.name ? { ...i, picName: newName } : i)));
      if (supabase) {
        supabase.from('boxes').update({ pic_name: newName }).eq('pic_name', user.name)
          .then(({ error }) => { if (error) console.error('Supabase rename box PIC error:', error); });
        supabase.from('items').update({ pic_name: newName }).eq('pic_name', user.name)
          .then(({ error }) => { if (error) console.error('Supabase rename item PIC error:', error); });
      }
    }

    return { success: true, user: updatedUser };
  };

  const resetToInitialData = () => {
    if (window.confirm('Apakah Anda yakin ingin me-reset data inventory kembali ke konfigurasi awal sesuai dokumen? Semua perubahan manual akan dikembalikan.')) {
      setRacks(RACKS_DATA);
      setPpicMembers(PPIC_MEMBERS);
      setBoxes(generateInitialBoxes());
      setItems(INITIAL_ITEMS);
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEY + '_racks');
      localStorage.removeItem(STORAGE_KEY + '_ppic');
      localStorage.removeItem(STORAGE_KEY + '_boxes');
      localStorage.removeItem(STORAGE_KEY + '_items');
      localStorage.removeItem(STORAGE_KEY + '_transactions');
    }
  };

  // Export full JSON (Unduh file fisik + simpan snapshot lokal)
  const exportJsonBackup = () => {
    const payload = createBackupPayload({ racks, ppicMembers, boxes, items, transactions, users });
    saveLocalSnapshot(payload);
    return downloadBackupFile(payload);
  };

  // Import JSON
  const importJsonBackup = (fileContent) => {
    try {
      const parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
      if (parsed.boxes && parsed.items) {
        if (parsed.racks) setRacks(parsed.racks);
        if (parsed.ppicMembers) setPpicMembers(parsed.ppicMembers);
        setBoxes(parsed.boxes);
        setItems(parsed.items);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.targets?.dailyTargetTeam) {
          try {
            localStorage.setItem('gagaclo_daily_target_pcs', String(parsed.targets.dailyTargetTeam));
            window.dispatchEvent(new Event('gagaclo_target_updated'));
          } catch {}
        }
        if (parsed.targets?.individualTargets) {
          try {
            localStorage.setItem('gagaclo_individual_targets', JSON.stringify(parsed.targets.individualTargets));
          } catch {}
        }
        if (showNotification) {
          showNotification('Data inventory berhasil diimpor & dipulihkan!', 'success', 3500);
        } else {
          alert('Data inventory berhasil diimpor!');
        }
        return true;
      } else {
        alert('Format file JSON tidak sesuai struktur GAGACLO Inventory.');
        return false;
      }
    } catch (e) {
      alert('Gagal membaca file JSON: ' + (e?.message || e));
      return false;
    }
  };

  // Memicu backup manual seketika (file fisik + snapshot)
  const triggerManualBackup = () => {
    return checkAndTriggerDailyAutoBackup(
      { racks, ppicMembers, boxes, items, transactions, users },
      showNotification,
      true
    );
  };

  // Pulihkan dari snapshot lokal
  const restoreFromSnapshotPayload = (payload) => {
    if (!payload || !payload.boxes || !payload.items) return false;
    if (payload.racks) setRacks(payload.racks);
    if (payload.ppicMembers) setPpicMembers(payload.ppicMembers);
    setBoxes(payload.boxes);
    setItems(payload.items);
    if (payload.transactions) setTransactions(payload.transactions);
    if (payload.targets?.dailyTargetTeam) {
      try {
        localStorage.setItem('gagaclo_daily_target_pcs', String(payload.targets.dailyTargetTeam));
        window.dispatchEvent(new Event('gagaclo_target_updated'));
      } catch {}
    }
    if (payload.targets?.individualTargets) {
      try {
        localStorage.setItem('gagaclo_individual_targets', JSON.stringify(payload.targets.individualTargets));
      } catch {}
    }
    if (showNotification) {
      showNotification('Data inventory berhasil dipulihkan dari snapshot cadangan!', 'success', 4000);
    }
    return true;
  };

  // Auto-backup harian otomatis: memicu download dan snapshot 1x sehari
  const autoBackupDataRef = useRef({ racks, ppicMembers, boxes, items, transactions, users });
  useEffect(() => {
    autoBackupDataRef.current = { racks, ppicMembers, boxes, items, transactions, users };
  }, [racks, ppicMembers, boxes, items, transactions, users]);

  useEffect(() => {
    if (boxes && boxes.length > 0 && items && items.length > 0) {
      const timer = setTimeout(() => {
        checkAndTriggerDailyAutoBackup(
          autoBackupDataRef.current,
          showNotification,
          false
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [boxes.length, items.length, showNotification]);

  // Export to Excel (.xlsx) - Lazy loaded for ultra lightweight performance
  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // 1. Sheet Items
    const itemsData = items.map((item, index) => {
      const box = boxes.find(b => b.boxNumber === Number(item.boxNumber));
      return {
        'No': index + 1,
        'SKU / Kode': item.kode || item.sku || '-',
        'Buyer No': item.buyerNo || '-',
        'Jenis Sample': item.jenisSample || 'DEVELOP',
        'Style': item.style || '-',
        'Sample No': item.sampleNo || '-',
        'Size': item.size || '-',
        'Deskripsi': item.name || item.deskripsi || '-',
        'Warna': item.color || '-',
        'Qty': item.qty,
        'Satuan': item.unit || item.satuan || 'PCS',
        'Kategori': item.category,
        'Nomor Box': `BOX ${item.boxNumber}`,
        'Rak': box ? box.rackName : '',
        'Lokasi Rak': box ? box.location : '',
        'PIC PPIC': item.picName,
        'Status': item.status,
        'Tanggal Masuk': item.dateIn,
      };
    });
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Data Items & Sample');

    // 2. Sheet Box Master (72 Boxes)
    const boxesData = boxes.map((box) => {
      const boxItems = items.filter(i => Number(i.boxNumber) === box.boxNumber);
      const totalItemQty = boxItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
      return {
        'Nomor Box': box.boxNumber,
        'Kode Box': box.code,
        'Rak': box.rackName,
        'Kategori': box.category,
        'Tipe Rak & Lokasi': box.rackDescription,
        'PIC PPIC': box.picName,
        'Jumlah Jenis Item': boxItems.length,
        'Total Qty Fisik': totalItemQty,
        'Catatan Box': box.notes || '',
      };
    });
    const wsBoxes = XLSX.utils.json_to_sheet(boxesData);
    XLSX.utils.book_append_sheet(wb, wsBoxes, 'Master 72 Box');

    // 3. Sheet Racks Summary
    const racksSummary = racks.map((rack) => {
      const rackBoxes = boxes.filter(b => b.rackId === rack.id);
      const boxNumbers = rackBoxes.map(b => b.boxNumber);
      const rackItems = items.filter(i => boxNumbers.includes(Number(i.boxNumber)));
      return {
        'Rak': rack.name,
        'Kategori': rack.category,
        'Tipe Rak': rack.rackType,
        'Lokasi': rack.location,
        'Rentang Box': rack.boxRange,
        'Kapasitas Box': rack.totalBoxes,
        'Jumlah Item Tersimpan': rackItems.length,
      };
    });
    const wsRacks = XLSX.utils.json_to_sheet(racksSummary);
    XLSX.utils.book_append_sheet(wb, wsRacks, 'Rekap Rak');

    // 4. Sheet PPIC Allocation
    const ppicSummary = ppicMembers.map((ppic) => {
      const ppicBoxes = boxes.filter(b => b.picName.toLowerCase() === ppic.name.toLowerCase());
      const ppicItems = items.filter(i => i.picName.toLowerCase() === ppic.name.toLowerCase());
      const sampleBoxes = ppicBoxes.filter(b => b.category === 'SAMPLE').length;
      const materialBoxes = ppicBoxes.filter(b => b.category === 'MATERIAL').length;
      return {
        'No PPIC': ppic.ppicNumber,
        'Nama PIC': ppic.name,
        'Total Box Alokasi': ppicBoxes.length,
        'Box Sample': sampleBoxes,
        'Box Material': materialBoxes,
        'Total Item Tercatat': ppicItems.length,
        'Daftar Nomor Box': ppicBoxes.map(b => b.boxNumber).join(', '),
      };
    });
    const wsPPIC = XLSX.utils.json_to_sheet(ppicSummary);
    XLSX.utils.book_append_sheet(wb, wsPPIC, 'Rekap PPIC');

    // 5. Sheet Transactions Log
    const trxData = transactions.map((t, idx) => ({
      'No': idx + 1,
      'Waktu / Tanggal': t.date,
      'Tipe Mutasi': t.type,
      'Nama Barang': t.itemName,
      'Box': t.boxNumber,
      'Rak': t.rackName,
      'Qty': t.qty,
      'Satuan': t.unit,
      'PIC': t.picName,
      'Penerima / Sumber': t.recipientOrSource,
      'Catatan': t.notes,
    }));
    const wsTrx = XLSX.utils.json_to_sheet(trxData);
    XLSX.utils.book_append_sheet(wb, wsTrx, 'Log Mutasi');

    XLSX.writeFile(wb, `GAGACLO_INVENTORY_REPORT_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper selectors
  const getItemsInBox = (boxNumber) => {
    return items.filter((item) => Number(item.boxNumber) === Number(boxNumber) && !isItemDispatched(item));
  };

  const getBoxDetails = (boxNumber) => {
    return boxes.find((b) => b.boxNumber === Number(boxNumber));
  };

  // Dispatch / Outgoing sample operations (ke Buyer, Anzo, RDTW, RDC, ANZOTW)
  const dispatchItem = async (itemOrId, dispatchData) => {
    const item = typeof itemOrId === 'object' ? itemOrId : items.find(i => String(i.id) === String(itemOrId));
    if (!item) throw new Error('Item tidak ditemukan');

    const qtyToSend = Math.min(Number(dispatchData.qty) || Number(item.jumlah) || 1, Number(item.jumlah) || 1);
    const originBoxNumber = Number(item.boxNumber) || 1;
    const originRackName = item.rackName || 'RACK 1';
    const originPic = item.picName || 'Royan';
    const destName = dispatchData.destinationLabel || dispatchData.destinationId || 'Tujuan Luar';
    const isPermanent = dispatchData.type === 'PERMANENT';
    const statusText = `Dispatched: ${destName} (${isPermanent ? 'Permanen' : 'Review'})`;

    const invoiceNumber = dispatchData.invoiceNo || (dispatchData.notes?.match(/Invoice:\s*([^\s|]+)/i)?.[1] || '');
    const dispatchTags = encodeDispatchTags({
      destinationId: dispatchData.destinationId,
      destinationLabel: destName,
      type: dispatchData.type,
      date: dispatchData.date || new Date().toISOString().split('T')[0],
      originBox: originBoxNumber,
      pic: currentUser?.name || originPic,
      recipient: dispatchData.recipient || '',
      notes: dispatchData.notes || '',
      buyerName: dispatchData.buyerName || '',
      invoiceNo: invoiceNumber,
    }, item.tags);

    // If partial dispatch (e.g. sending 2 out of 5 PCS)
    if (qtyToSend < (Number(item.jumlah) || 1)) {
      const remainingQty = (Number(item.jumlah) || 1) - qtyToSend;
      // 1. Update existing item in box with reduced quantity
      await updateItem(item.id, {
        jumlah: remainingQty,
        qty: remainingQty,
      });

      // 2. Create new dispatched item record
      const newItemId = 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      const dispatchedRecord = {
        ...item,
        id: newItemId,
        jumlah: qtyToSend,
        qty: qtyToSend,
        status: statusText,
        tags: dispatchTags,
        place: `DIKIRIM: ${destName} (${isPermanent ? 'Permanen' : 'Review'}) • Asal BOX ${originBoxNumber}`,
      };
      await addItem(dispatchedRecord);
    } else {
      // Full dispatch of the item
      await updateItem(item.id, {
        status: statusText,
        tags: dispatchTags,
        place: `DIKIRIM: ${destName} (${isPermanent ? 'Permanen' : 'Review'}) • Asal BOX ${originBoxNumber}`,
      });
    }

    // Add mutation log transaction
    await addTransaction({
      itemId: item.id,
      itemName: `${item.style || item.name || item.kode} (${qtyToSend} PCS)`,
      sku: item.kode || item.sku || '',
      boxNumber: originBoxNumber,
      type: 'OUT',
      qty: qtyToSend,
      unit: item.satuan || 'PCS',
      picName: currentUser?.name || originPic,
      notes: `PENGIRIMAN KELUAR R&D ke ${destName} [${isPermanent ? 'Keluar Permanen' : 'Review Sementara'}]. Penerima/Catatan: ${dispatchData.recipient || dispatchData.notes || '-'}`,
    });

    showNotification?.(
      `📦 Sampel ${item.style || item.kode} (${qtyToSend} PCS) berhasil dicatat dikirim ke ${destName} [${isPermanent ? 'Permanen' : 'Review'}].`,
      'success',
      4500
    );
  };

  const returnDispatchedItem = async (itemOrId, returnData = {}) => {
    const item = typeof itemOrId === 'object' ? itemOrId : items.find(i => String(i.id) === String(itemOrId));
    if (!item) throw new Error('Item tidak ditemukan');

    const dispatchInfo = decodeDispatchData(item);
    const targetBoxNum = Number(returnData.targetBoxNumber || dispatchInfo?.originBox || item.boxNumber || 1);
    const targetBoxObj = boxes.find(b => Number(b.boxNumber) === targetBoxNum);
    const targetRack = targetBoxObj?.rackName || 'RACK 1';
    const targetPic = targetBoxObj?.picName || currentUser?.name || 'Royan';
    const returnDate = returnData.date || new Date().toISOString().split('T')[0];
    const fromDest = dispatchInfo?.destinationLabel || 'Review';

    // Clean dispatch tags and mark as returned
    const cleanTags = (Array.isArray(item.tags) ? item.tags : []).filter(
      t => !String(t).startsWith('dispatch') && !String(t).startsWith('dispatch_') && t !== 'DISPATCH'
    );
    cleanTags.push(`returned_from:${encodeURIComponent(fromDest)}`);
    cleanTags.push(`return_date:${returnDate}`);

    await updateItem(item.id, {
      status: 'In Storage',
      boxNumber: targetBoxNum,
      rackName: targetRack,
      picName: targetPic,
      place: `BOX ${targetBoxNum} (${targetRack} - ${targetPic})`,
      tags: cleanTags,
    });

    // Add incoming mutation transaction
    await addTransaction({
      itemId: item.id,
      itemName: `${item.style || item.name || item.kode} (${item.jumlah || 1} PCS)`,
      sku: item.kode || item.sku || '',
      boxNumber: targetBoxNum,
      type: 'IN',
      qty: Number(item.jumlah) || 1,
      unit: item.satuan || 'PCS',
      picName: currentUser?.name || targetPic,
      notes: `TERIMA KEMBALI dari review ${fromDest} ke BOX #${targetBoxNum}. Catatan: ${returnData.notes || 'Selesai review, kondisi baik.'}`,
    });

    showNotification?.(
      `📥 Sampel ${item.style || item.kode} berhasil diterima kembali dan disimpan di Box #${targetBoxNum}!`,
      'success',
      4500
    );
  };

  const cancelDispatch = async (itemOrId) => {
    const item = typeof itemOrId === 'object' ? itemOrId : items.find(i => String(i.id) === String(itemOrId));
    if (!item) throw new Error('Item tidak ditemukan');

    const dispatchInfo = decodeDispatchData(item);
    const originBoxNum = Number(dispatchInfo?.originBox || item.boxNumber || 1);
    const targetBoxObj = boxes.find(b => Number(b.boxNumber) === originBoxNum);
    const targetRack = targetBoxObj?.rackName || 'RACK 1';
    const targetPic = targetBoxObj?.picName || currentUser?.name || 'Royan';

    const cleanTags = (Array.isArray(item.tags) ? item.tags : []).filter(
      t => !String(t).startsWith('dispatch') && !String(t).startsWith('dispatch_') && t !== 'DISPATCH'
    );

    await updateItem(item.id, {
      status: 'In Storage',
      boxNumber: originBoxNum,
      rackName: targetRack,
      picName: targetPic,
      place: `BOX ${originBoxNum} (${targetRack} - ${targetPic})`,
      tags: cleanTags,
    });

    showNotification?.(`Pengiriman untuk ${item.style || item.kode} dibatalkan. Item kembali ke Box #${originBoxNum}.`, 'info', 3500);
  };

  // =========================================================================
  // DISPATCH CART (MODEL MARKETPLACE: MASUKKAN KE KERANJANG DULU)
  // =========================================================================
  const CART_STORAGE_KEY = 'gagaclo_dispatch_cart_v1';

  const [dispatchCart, setDispatchCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load dispatchCart from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dispatchCart));
    } catch {}
  }, [dispatchCart]);

  const addToDispatchCart = (item, qty = 1) => {
    if (!item) return;
    const available = Number(item.jumlah ?? item.qty ?? 1);
    setDispatchCart((prev) => {
      const existingIdx = prev.findIndex((c) => String(c.id) === String(item.id));
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = Math.min(available, updated[existingIdx].dispatchQty + Number(qty));
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...item,
          availableQty: available,
          dispatchQty: newQty,
        };
        showNotification?.(
          `Jumlah ${item.style || item.kode} di keranjang diperbarui: ${newQty} PCS.`,
          'success',
          2500
        );
        return updated;
      } else {
        const initialQty = Math.min(available, Math.max(1, Number(qty)));
        showNotification?.(
          `🛒 ${item.style || item.kode} dimasukkan ke Keranjang Pengiriman (${initialQty} PCS).`,
          'success',
          2500
        );
        return [
          ...prev,
          {
            ...item,
            availableQty: available,
            dispatchQty: initialQty,
          },
        ];
      }
    });
  };

  const addMultipleToDispatchCart = (itemsToAdd) => {
    if (!Array.isArray(itemsToAdd) || itemsToAdd.length === 0) return;
    setDispatchCart((prev) => {
      const map = new Map(prev.map(c => [String(c.id), { ...c }]));
      itemsToAdd.forEach((item) => {
        const available = Number(item.jumlah ?? item.qty ?? 1);
        if (map.has(String(item.id))) {
          const existing = map.get(String(item.id));
          map.set(String(item.id), {
            ...existing,
            ...item,
            availableQty: available,
            dispatchQty: Math.min(available, existing.dispatchQty + 1),
          });
        } else {
          map.set(String(item.id), {
            ...item,
            availableQty: available,
            dispatchQty: Math.min(available, Math.max(1, Number(item.jumlah ?? item.qty ?? 1))),
          });
        }
      });
      showNotification?.(
        `🛒 ${itemsToAdd.length} item berhasil dimasukkan ke Keranjang Pengiriman.`,
        'success',
        3000
      );
      return Array.from(map.values());
    });
  };

  const removeFromDispatchCart = (itemId) => {
    setDispatchCart((prev) => {
      const filtered = prev.filter((c) => String(c.id) !== String(itemId));
      showNotification?.('Item dikeluarkan dari keranjang pengiriman.', 'info', 2000);
      return filtered;
    });
  };

  const updateDispatchCartQty = (itemId, qty) => {
    setDispatchCart((prev) =>
      prev.map((c) => {
        if (String(c.id) === String(itemId)) {
          const available = Number(c.availableQty ?? c.jumlah ?? c.qty ?? 1);
          const safeQty = Math.min(available, Math.max(1, Number(qty) || 1));
          return { ...c, dispatchQty: safeQty };
        }
        return c;
      })
    );
  };

  const clearDispatchCart = () => {
    setDispatchCart([]);
  };

  const isItemInDispatchCart = (itemId) => {
    return dispatchCart.some((c) => String(c.id) === String(itemId));
  };

  const getStats = () => {
    const totalBoxes = boxes.length;
    const occupiedBoxesCount = boxes.filter((b) => getItemsInBox(b.boxNumber).length > 0).length;
    const emptyBoxesCount = totalBoxes - occupiedBoxesCount;
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const inStorageCount = items.filter((i) => i.status === 'In Storage').length;
    const borrowedCount = items.filter((i) => i.status === 'Borrowed').length;
    const inReviewCount = items.filter((i) => i.status === 'In Review').length;

    return {
      totalBoxes,
      occupiedBoxesCount,
      emptyBoxesCount,
      totalItems,
      totalQuantity,
      inStorageCount,
      borrowedCount,
      inReviewCount,
      sampleBoxesCount: boxes.filter(b => b.category === 'SAMPLE').length,
      materialBoxesCount: boxes.filter(b => b.category === 'MATERIAL').length,
    };
  };

  const value = {
    // Data
    racks: racks,
    ppicMembers: ppicMembers,
    boxes,
    items,
    transactions,
    // Reusable Suggestion Lists
    suggestions,
    recordSuggestions,
    removeSuggestion,
    // Operations
    addItem,
    importInventoryItems,
    codeRevisions,
    recordCodeRevision,
    deleteCodeRevision,
    importHistoricalCodeRevisions,
    updateItem,
    deleteItem,
    deleteMultipleItems,
    deleteAllItems,
    addTransaction,
    updateBoxNotes,
    setBoxFull,
    // Dispatch / Outgoing Sample Operations (Buyer, ANZO QC, ANZO TW, ANZO QC CHINA, RDTW, RDC)
    dispatchItem,
    returnDispatchedItem,
    cancelDispatch,
    // Dispatch Cart (Model Marketplace)
    dispatchCart,
    addToDispatchCart,
    addMultipleToDispatchCart,
    removeFromDispatchCart,
    updateDispatchCartQty,
    clearDispatchCart,
    isItemInDispatchCart,
    // Box Management
    addBox,
    updateBox,
    deleteBox,
    // Box Ownership Reassignment (Fitur Edit Kepemilikan Box)
    reassignBoxOwnership,
    reassignMultipleBoxesOwnership,
    isBoxOwnershipModalOpen,
    setIsBoxOwnershipModalOpen,
    // Rack Management
    addRack,
    deleteRack,
    // PPIC Member Management
    addPpicMember,
    updatePpicMember,
    deletePpicMember,
    resetToInitialData,
    exportJsonBackup,
    importJsonBackup,
    exportToExcel,
    triggerManualBackup,
    restoreFromSnapshotPayload,
    isBackupModalOpen,
    setIsBackupModalOpen,
    // User Authentication & Management (5 PIC)
    users,
    currentUser,
    setCurrentUser,
    loginUser,
    logoutUser,
    updateUserProfile,
    isSuperuser,
    isManager,
    isHelper,
    helpers: HELPER_MEMBERS,
    // Supabase Operations & State
    supabaseStatus,
    supabaseConfig: supabaseConfigState,
    isSupabaseModalOpen,
    setIsSupabaseModalOpen,
    syncFromSupabase,
    pushLocalToSupabase,
    saveSupabaseCredentials,
    // Helpers
    getItemsInBox,
    getBoxDetails,
    getStats,
    // UI state & Modals
    activeTab,
    setActiveTab,
    selectedBoxNumber,
    setSelectedBoxNumber,
    itemModalConfig,
    setItemModalConfig,
    qrModalBox,
    setQrModalBox,
    quickScannerOpen,
    setQuickScannerOpen,
    manifestPrintRackId,
    setManifestPrintRackId,
    transactionModalConfig,
    setTransactionModalConfig,
    // Filters
    selectedRackFilter,
    setSelectedRackFilter,
    selectedPpicFilter,
    setSelectedPpicFilter,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    searchQuery,
    setSearchQuery,
    // Global Timer State & Operations
    timerDeadline,
    timerNote,
    updateTimerDeadline,
    resetTimerDeadline,
    // Target Jasmine Real-Time Cloud Base State & Operations
    dailyTarget,
    targetSetBy,
    targetNote,
    targetUpdatedAt,
    updateDailyTarget,
    isTargetCloudSynced: Boolean(supabaseConfigState.isConfigured),
    // Issues, Error Reports & Feature Proposals
    issues,
    addIssue,
    updateIssue,
    deleteIssue,
    // Global Floating Notifications
    systemNotification,
    showNotification,
    setSystemNotification,
    // Dynamic Announcement State & Operations
    announcement,
    updateAnnouncement,
    // Google Gemini API Key Cloud State & Sync
    cloudGeminiKey,
    updateCloudGeminiKey,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
