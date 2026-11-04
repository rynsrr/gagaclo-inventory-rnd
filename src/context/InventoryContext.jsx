import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
} from '../lib/supabase';
import { getMergedSuggestions, recordInputtedData, removeSuggestionItem } from '../utils/suggestionStore';

const InventoryContext = createContext(null);

const STORAGE_KEY = 'gagaclo_inventory_data_v1';

export const InventoryProvider = ({ children }) => {
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
      if (saved) return JSON.parse(saved);
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

  // Persist to localStorage on change as safety cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_boxes', JSON.stringify(boxes));
      localStorage.setItem(STORAGE_KEY + '_items', JSON.stringify(items));
      localStorage.setItem(STORAGE_KEY + '_transactions', JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [boxes, items, transactions]);

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

      // Update local state if remote data is found
      if (dbItems && dbItems.length > 0) {
        setItems(dbItems.map(dbItemToLocal));
      }

      if (dbBoxes && dbBoxes.length > 0) {
        setBoxes(prev => {
          return prev.map(box => {
            const remoteBox = dbBoxes.find(b => b.box_number === box.boxNumber);
            return remoteBox ? dbBoxToLocal(remoteBox, [box]) : box;
          });
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
            if (payload.eventType === 'INSERT') {
              const newItem = dbItemToLocal(payload.new);
              setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [newItem, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              const updated = dbItemToLocal(payload.new);
              setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
            } else if (payload.eventType === 'DELETE') {
              setItems(prev => prev.filter(i => i.id !== payload.old.id));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'boxes' },
          (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updatedBox = payload.new;
              setBoxes(prev => prev.map(b => b.boxNumber === updatedBox.box_number ? dbBoxToLocal(updatedBox, [b]) : b));
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

    const newItem = {
      ...itemData,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      dateIn: itemData.dateIn || new Date().toISOString().split('T')[0],
      status: itemData.status || 'In Storage',
      qty: Number(itemData.qty) || 1,
    };

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

    let finalItem = null;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const oldBox = item.boxNumber;
          const newBox = Number(updatedData.boxNumber);
          finalItem = { ...item, ...updatedData, qty: Number(updatedData.qty) || item.qty };

          // If box changed, log relocate transaction
          if (oldBox !== newBox) {
            const oldBoxObj = boxes.find(b => b.boxNumber === oldBox);
            const newBoxObj = boxes.find(b => b.boxNumber === newBox);
            addTransaction({
              type: 'RELOCATE',
              itemId: item.id,
              itemName: item.name,
              boxNumber: newBox,
              rackName: newBoxObj ? newBoxObj.rackName : 'RACK ?',
              qty: finalItem.qty,
              unit: finalItem.unit,
              picName: finalItem.picName,
              recipientOrSource: `Dipindah dari Box ${oldBox} (${oldBoxObj ? oldBoxObj.rackName : ''})`,
              notes: 'Relokasi penempatan box',
            });
          }

          return finalItem;
        }
        return item;
      })
    );

    // Sync to Supabase in background
    if (supabase && finalItem) {
      try {
        await supabase.from('items').upsert([localItemToDb(finalItem)], { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase update item error:', err);
      }
    }
  };

  const deleteItem = async (itemId) => {
    const itemToDelete = items.find(i => i.id === itemId);
    if (itemToDelete) {
      addTransaction({
        type: 'OUT',
        itemId: itemToDelete.id,
        itemName: itemToDelete.name,
        boxNumber: itemToDelete.boxNumber,
        rackName: `Box ${itemToDelete.boxNumber}`,
        qty: itemToDelete.qty,
        unit: itemToDelete.unit,
        picName: itemToDelete.picName,
        recipientOrSource: 'Dihapus dari Sistem / Disposal',
        notes: 'Item dikeluarkan/dihapus dari catatan box',
      });
    }

    setItems((prev) => prev.filter((item) => item.id !== itemId));

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('items').delete().eq('id', itemId);
      } catch (err) {
        console.error('Supabase delete item error:', err);
      }
    }
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

  const resetToInitialData = () => {
    if (window.confirm('Apakah Anda yakin ingin me-reset data inventory kembali ke konfigurasi awal sesuai dokumen? Semua perubahan manual akan dikembalikan.')) {
      setBoxes(generateInitialBoxes());
      setItems(INITIAL_ITEMS);
      setTransactions(INITIAL_TRANSACTIONS);
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
      racks: RACKS_DATA,
      ppicMembers: PPIC_MEMBERS,
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

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
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
    const racksSummary = RACKS_DATA.map((rack) => {
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
    const ppicSummary = PPIC_MEMBERS.map((ppic) => {
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
    racks: RACKS_DATA,
    ppicMembers: PPIC_MEMBERS,
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
    addTransaction,
    updateBoxNotes,
    setBoxFull,
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
