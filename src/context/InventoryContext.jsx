import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RACKS_DATA, PPIC_MEMBERS, generateInitialBoxes, INITIAL_ITEMS, INITIAL_TRANSACTIONS } from '../data/initialData';
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
import { resolveUniqueCode, getNextSampleCode, getNextMaterialCode, releaseCode } from '../utils/sequenceResolver';

const InventoryContext = createContext(null);

const STORAGE_KEY = 'gagaclo_inventory_data_v1';
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
    description: 'Tambahkan search bar langsung di atas tampilan gudang 3D dengan shortcut Ctrl+K untuk menemukan box dan sampel secara instan.',
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

export const InventoryProvider = ({ children }) => {
  // Racks and PPIC members are now stateful (editable at runtime)
  const [racks, setRacks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_racks');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load racks from localStorage', e);
    }
    return RACKS_DATA;
  });

  const [ppicMembers, setPpicMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_ppic');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load ppic from localStorage', e);
    }
    return PPIC_MEMBERS;
  });

  // Load state from localStorage or use initial data
  const [boxes, setBoxes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_boxes');
      if (saved) return JSON.parse(saved);
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
          return parsed.filter(i => (
            !deletedIds.has(String(i.id)) &&
            i.status !== 'DELETED' &&
            Number(i.boxNumber ?? i.box_number ?? 1) > 0
          ));
        }
      }
    } catch (e) {
      console.error('Failed to load items from localStorage', e);
    }
    return INITIAL_ITEMS;
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

  // Global floating notification state (for concurrency alerts, info messages)
  const [systemNotification, setSystemNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  const showNotification = useCallback((message, type = 'info', duration = 6000) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setSystemNotification({ id: Date.now(), message, type });
    if (duration > 0) {
      notificationTimerRef.current = setTimeout(() => {
        setSystemNotification(null);
      }, duration);
    }
  }, []);

  const updateTimerDeadline = async (newDeadline) => {
    const val = Number(newDeadline) || 0;
    setTimerDeadline(val);
    try {
      if (val > 0) {
        localStorage.setItem('gagaclo_inventory_timer_deadline', String(val));
      } else {
        localStorage.removeItem('gagaclo_inventory_timer_deadline');
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
          notes: JSON.stringify({ deadline: val, updatedAt: new Date().toISOString() }),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'box_number' });

        await supabase.from('items').upsert({
          id: 'SYSTEM_CONFIG_TIMER',
          sku: 'SYSTEM_TIMER',
          kode: 'SYSTEM_TIMER',
          name: 'SYSTEM TIMER CONFIG',
          description: String(val),
          box_number: 999999,
          rack_id: -1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('Failed to sync timer to Supabase:', err);
      }
    }
  };

  const resetTimerDeadline = async () => {
    await updateTimerDeadline(0);
  };

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

  // Persist to localStorage on change as safety cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_racks', JSON.stringify(racks));
      localStorage.setItem(STORAGE_KEY + '_ppic', JSON.stringify(ppicMembers));
      localStorage.setItem(STORAGE_KEY + '_boxes', JSON.stringify(boxes));
      localStorage.setItem(STORAGE_KEY + '_items', JSON.stringify(items));
      localStorage.setItem(STORAGE_KEY + '_transactions', JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [racks, ppicMembers, boxes, items, transactions]);

  // Sync from Supabase down to local state
  const syncFromSupabase = useCallback(async (clientInstance = supabase) => {
    const client = clientInstance || supabase;
    if (!client) {
      setSupabaseStatus(prev => ({ ...prev, isConnected: false, isSyncing: false }));
      return { success: false, message: 'Supabase client belum diinisialisasi' };
    }

    setSupabaseStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // 1. Fetch items
      const { data: dbItems, error: itemsErr } = await client
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (itemsErr) throw itemsErr;

      // 2. Fetch boxes
      const { data: dbBoxes, error: boxesErr } = await client
        .from('boxes')
        .select('*');

      if (boxesErr) throw boxesErr;

      // 3. Fetch transactions
      const { data: dbTrx, error: trxErr } = await client
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (trxErr) throw trxErr;

      // Check for remote timer config in boxes or items
      let remoteDeadline = null;
      if (dbBoxes && dbBoxes.length > 0) {
        const timerBox = dbBoxes.find(b => Number(b.box_number) === 999999 || b.code === 'SYSTEM_TIMER');
        if (timerBox?.notes) {
          try {
            const parsed = JSON.parse(timerBox.notes);
            if (typeof parsed?.deadline === 'number') {
              remoteDeadline = parsed.deadline;
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

      // Check for remote issues config in boxes
      if (dbBoxes && dbBoxes.length > 0) {
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
      }

      // Try fetching from dedicated issues table if available
      try {
        const { data: dbIssues } = await client
          .from('issues')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbIssues && dbIssues.length > 0) {
          setIssues(dbIssues.map(dbIssueToLocal));
        }
      } catch {}

      // Update local state if remote data is found (excluding system config rows and deleted items)
      if (dbItems && dbItems.length > 0) {
        const deletedIds = getDeletedItemIds();
        const userItems = dbItems.filter(i => (
          i.id !== 'SYSTEM_CONFIG_TIMER' &&
          Number(i.box_number) !== 999999 &&
          Number(i.box_number) > 0 &&
          i.status !== 'DELETED' &&
          i.status !== 'Trash' &&
          i.status !== 'Disposal' &&
          !deletedIds.has(String(i.id))
        ));
        setItems(userItems.map(dbItemToLocal));
      }

      if (dbBoxes && dbBoxes.length > 0) {
        const userDbBoxes = dbBoxes.filter(b => (
          Number(b.box_number) !== 999999 &&
          Number(b.box_number) !== 999998 &&
          Number(b.box_number) > 0 &&
          Number(b.box_number) < 900000 &&
          b.code !== 'DELETED' &&
          b.rack_name !== 'DELETED'
        ));
        setBoxes(prev => {
          const updated = prev.map(box => {
            const remoteBox = userDbBoxes.find(b => b.box_number === box.boxNumber);
            return remoteBox ? dbBoxToLocal(remoteBox, [box]) : box;
          });
          // Include boxes that exist remotely but not locally (added on another device)
          const knownNumbers = new Set(prev.map(b => b.boxNumber));
          const extra = userDbBoxes
            .filter(b => !knownNumbers.has(Number(b.box_number)))
            .map(b => dbBoxToLocal(b, []));
          return [...updated, ...extra].sort((a, b) => a.boxNumber - b.boxNumber);
        });
      }

      if (dbTrx && dbTrx.length > 0) {
        setTransactions(dbTrx.map(dbTrxToLocal));
      }

      const syncTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSupabaseStatus({
        isConnected: true,
        isSyncing: false,
        lastSync: syncTime,
        error: null,
      });

      return {
        success: true,
        itemCount: dbItems?.length || 0,
        boxCount: dbBoxes?.length || 0,
      };
    } catch (err) {
      console.error('Supabase sync error:', err);
      const errMsg = err.message || 'Gagal menyinkronkan data dengan Supabase';
      setSupabaseStatus({
        isConnected: false,
        isSyncing: false,
        lastSync: null,
        error: errMsg,
      });
      return { success: false, message: errMsg };
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
      syncFromSupabase();

      // Subscribe to Realtime Postgres Changes
      const channel = supabase
        .channel('gagaclo_inventory_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items' },
          (payload) => {
            // Realtime Sync for Global Timer
            if (payload.new?.id === 'SYSTEM_CONFIG_TIMER') {
              const d = Number(payload.new.description) || 0;
              setTimerDeadline(d);
              try {
                if (d > 0) localStorage.setItem('gagaclo_inventory_timer_deadline', String(d));
                else localStorage.removeItem('gagaclo_inventory_timer_deadline');
              } catch {}
              return;
            }
            if (payload.old?.id === 'SYSTEM_CONFIG_TIMER' || payload.new?.id === 'SYSTEM_CONFIG_TIMER') return;

            if (payload.eventType === 'INSERT') {
              const deletedIds = getDeletedItemIds();
              if (
                deletedIds.has(String(payload.new.id)) ||
                payload.new.status === 'DELETED' ||
                Number(payload.new.box_number) <= 0
              ) return;
              const newItem = dbItemToLocal(payload.new);
              setItems(prev => prev.some(i => String(i.id) === String(newItem.id)) ? prev : [newItem, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              const deletedIds = getDeletedItemIds();
              if (
                deletedIds.has(String(payload.new.id)) ||
                payload.new.status === 'DELETED' ||
                Number(payload.new.box_number) <= 0
              ) {
                setItems(prev => prev.filter(i => String(i.id) !== String(payload.new.id)));
                return;
              }
              const updated = dbItemToLocal(payload.new);
              setItems(prev => prev.map(i => String(i.id) === String(updated.id) ? updated : i));
            } else if (payload.eventType === 'DELETE') {
              setItems(prev => prev.filter(i => String(i.id) !== String(payload.old.id)));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'boxes' },
          (payload) => {
            // Realtime Sync for Global Timer
            if (Number(payload.new?.box_number) === 999999 || payload.new?.code === 'SYSTEM_TIMER') {
              try {
                const parsed = JSON.parse(payload.new.notes);
                if (typeof parsed?.deadline === 'number') {
                  setTimerDeadline(parsed.deadline);
                  try {
                    if (parsed.deadline > 0) localStorage.setItem('gagaclo_inventory_timer_deadline', String(parsed.deadline));
                    else localStorage.removeItem('gagaclo_inventory_timer_deadline');
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
            if (Number(payload.new?.box_number) >= 900000) return;

            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updatedBox = payload.new;
              if (updatedBox.code === 'DELETED' || updatedBox.rack_name === 'DELETED' || Number(updatedBox.box_number) <= 0) {
                setBoxes(prev => prev.filter(b => Number(b.boxNumber) !== Number(updatedBox.box_number)));
                return;
              }
              setBoxes(prev => {
                const exists = prev.some(b => Number(b.boxNumber) === Number(updatedBox.box_number));
                if (exists) {
                  return prev.map(b => Number(b.boxNumber) === Number(updatedBox.box_number) ? dbBoxToLocal(updatedBox, [b]) : b);
                }
                return [...prev, dbBoxToLocal(updatedBox, [])];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'issues' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newIss = dbIssueToLocal(payload.new);
              setIssues(prev => prev.some(i => i.id === newIss.id) ? prev : [newIss, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              const updated = dbIssueToLocal(payload.new);
              setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
            } else if (payload.eventType === 'DELETE') {
              setIssues(prev => prev.filter(i => i.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabaseConfigState.isConfigured, syncFromSupabase]);

  // Actions
  const addItem = async (itemData) => {
    // Automatically record and remember newly inputted data
    recordSuggestions(itemData);

    // Concurrency protection: verify that code is not already taken by another user
    const rawCode = itemData.kode || itemData.sku;
    const resolved = resolveUniqueCode(rawCode, items, null);
    const finalCode = resolved.finalCode;

    const newItem = {
      ...itemData,
      kode: finalCode,
      sku: finalCode,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      dateIn: itemData.dateIn || new Date().toISOString().split('T')[0],
      status: itemData.status || 'In Storage',
      qty: Number(itemData.qty) || 1,
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
    const targetBox = boxes.find(b => b.boxNumber === Number(newItem.boxNumber));
    const trxData = {
      type: 'IN',
      itemId: newItem.id,
      itemName: newItem.name,
      boxNumber: newItem.boxNumber,
      rackName: targetBox ? targetBox.rackName : 'RACK ?',
      qty: newItem.qty,
      unit: newItem.unit || 'pcs',
      picName: newItem.picName || (targetBox ? targetBox.picName : 'Royan'),
      recipientOrSource: 'Direct Entry / Masuk Baru',
      notes: newItem.description || 'Barang baru ditambahkan ke inventory',
    };
    addTransaction(trxData);

    // Sync to Supabase in background
    if (supabase) {
      try {
        await supabase.from('items').insert([localItemToDb(newItem)]);
      } catch (err) {
        console.error('Supabase insert item error:', err);
      }
    }

    return newItem;
  };

  const importInventoryItems = async (records) => {
    const client = supabase;
    if (client && !supabaseStatus.isConnected) {
      throw new Error('Hubungkan Supabase sebelum mengimpor.');
    }

    const now = new Date().toISOString();
    const newItems = records.map(record => ({
      ...record,
      id: `item-${crypto.randomUUID()}`,
      dateIn: record.dateIn || now.slice(0, 10),
      status: 'In Storage',
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
      notes: 'Impor Excel',
    }));
    if (client) {
      try {
        const { error } = await client.from('transactions').insert(entries.map(localTrxToDb));
        if (error) throw error;
      } catch {
        return 'Item sudah tersimpan, tetapi riwayat transaksi impor gagal dicatat.';
      }
    }
    setTransactions(prev => [...entries, ...prev]);
    return null;
  };

  const updateItem = async (itemId, updatedData) => {
    // Automatically record and remember newly inputted data
    recordSuggestions(updatedData);

    const oldItem = items.find((i) => String(i.id) === String(itemId));
    if (!oldItem) return null;

    // Concurrency protection on update
    let finalCode = updatedData.kode !== undefined ? updatedData.kode : (updatedData.sku !== undefined ? updatedData.sku : oldItem.kode);
    const resolved = resolveUniqueCode(finalCode, items, itemId);
    if (resolved.wasAdjusted) {
      finalCode = resolved.finalCode;
      showNotification(
        '⚠️ Kode sample otomatis disesuaikan agar tetap unik dan tidak bentrok.',
        'info',
        5000
      );
    }

    const oldBox = Number(oldItem.boxNumber);
    const newBox = updatedData.boxNumber !== undefined ? Number(updatedData.boxNumber) : oldBox;
    const finalQty = Number(updatedData.qty !== undefined ? updatedData.qty : (updatedData.jumlah !== undefined ? updatedData.jumlah : oldItem.qty)) || 1;
    const finalUnit = updatedData.unit || updatedData.satuan || oldItem.unit || 'PCS';

    const finalItem = {
      ...oldItem,
      ...updatedData,
      kode: finalCode,
      sku: finalCode,
      boxNumber: newBox,
      qty: finalQty,
      jumlah: finalQty,
      unit: finalUnit,
      satuan: finalUnit,
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

    return finalItem;
  };

  const deleteItem = async (itemId) => {
    if (!itemId) return;
    const idStr = String(itemId);
    const itemToDelete = items.find(i => String(i.id) === idStr);

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

    return true;
  };

  const deleteMultipleItems = async (itemIds) => {
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return 0;
    const idStrings = itemIds.map(id => String(id));
    const idSet = new Set(idStrings);

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

        const { error: delError } = await supabase.from('items').delete().neq('id', 'SYSTEM_CONFIG_TIMER');
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
          }).neq('id', 'SYSTEM_CONFIG_TIMER');
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
          }).neq('id', 'SYSTEM_CONFIG_TIMER');
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

    if (supabase) {
      const { error } = await supabase.from('boxes').upsert({
        box_number: boxNumber,
        is_full: isFull,
      }, { onConflict: 'box_number' });
      if (error) throw error;
    }

    setBoxes(previous => previous.map(entry =>
      entry.boxNumber === boxNumber ? { ...entry, isFull } : entry
    ));
  };

  const updateBoxNotes = async (boxNumber, notes) => {
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

    return updatedBox;
  };

  const deleteBox = async (boxNumber, options = { moveItemsToFloor: true }) => {
    const boxNum = Number(boxNumber);
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

  // Export full JSON
  const exportJsonBackup = () => {
    const data = {
      appName: 'GAGACLO - Storage Inventory Management RND',
      exportDate: new Date().toISOString(),
      racks: racks,
      ppicMembers: ppicMembers,
      boxes,
      items,
      transactions,
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `GAGACLO_INVENTORY_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const importJsonBackup = (fileContent) => {
    try {
      const parsed = JSON.parse(fileContent);
      if (parsed.boxes && parsed.items) {
        if (parsed.racks) setRacks(parsed.racks);
        if (parsed.ppicMembers) setPpicMembers(parsed.ppicMembers);
        setBoxes(parsed.boxes);
        setItems(parsed.items);
        if (parsed.transactions) setTransactions(parsed.transactions);
        alert('Data inventory berhasil diimpor!');
      } else {
        alert('Format file JSON tidak sesuai struktur GAGACLO Inventory.');
      }
    } catch (e) {
      alert('Gagal membaca file JSON: ' + e.message);
    }
  };

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
    return items.filter((item) => Number(item.boxNumber) === Number(boxNumber));
  };

  const getBoxDetails = (boxNumber) => {
    return boxes.find((b) => b.boxNumber === Number(boxNumber));
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
    updateItem,
    deleteItem,
    deleteMultipleItems,
    deleteAllItems,
    addTransaction,
    updateBoxNotes,
    setBoxFull,
    // Box Management
    addBox,
    updateBox,
    deleteBox,
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
    updateTimerDeadline,
    resetTimerDeadline,
    // Issues, Error Reports & Feature Proposals
    issues,
    addIssue,
    updateIssue,
    deleteIssue,
    // Global Floating Notifications
    systemNotification,
    showNotification,
    setSystemNotification,
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
