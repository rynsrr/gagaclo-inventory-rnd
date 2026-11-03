import React, { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { RACKS_DATA, PPIC_MEMBERS, generateInitialBoxes, INITIAL_ITEMS, INITIAL_TRANSACTIONS } from '../data/initialData';

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

  // UI state
  const [selectedBoxNumber, setSelectedBoxNumber] = useState(null);
  const [itemModalConfig, setItemModalConfig] = useState({ isOpen: false, item: null, targetBoxNumber: null });
  const [qrModalBox, setQrModalBox] = useState(null);
  const [quickScannerOpen, setQuickScannerOpen] = useState(false);
  const [manifestPrintRackId, setManifestPrintRackId] = useState(null);
  const [transactionModalConfig, setTransactionModalConfig] = useState({ isOpen: false, item: null, type: 'IN' });

  // Filter state for general browsing
  const [activeTab, setActiveTab] = useState('racks'); // 'racks', 'items', 'ppic', 'transactions', 'manifests'
  const [selectedRackFilter, setSelectedRackFilter] = useState('ALL');
  const [selectedPpicFilter, setSelectedPpicFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_boxes', JSON.stringify(boxes));
      localStorage.setItem(STORAGE_KEY + '_items', JSON.stringify(items));
      localStorage.setItem(STORAGE_KEY + '_transactions', JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [boxes, items, transactions]);

  // Actions
  const addItem = (itemData) => {
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
    addTransaction({
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
    });

    return newItem;
  };

  const updateItem = (itemId, updatedData) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const oldBox = item.boxNumber;
          const newBox = Number(updatedData.boxNumber);
          const updated = { ...item, ...updatedData, qty: Number(updatedData.qty) || item.qty };

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
              qty: updated.qty,
              unit: updated.unit,
              picName: updated.picName,
              recipientOrSource: `Dipindah dari Box ${oldBox} (${oldBoxObj ? oldBoxObj.rackName : ''})`,
              notes: 'Relokasi penempatan box',
            });
          }

          return updated;
        }
        return item;
      })
    );
  };

  const deleteItem = (itemId) => {
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
  };

  const addTransaction = (trxData) => {
    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newTrx = {
      id: 'trx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: formattedDate,
      ...trxData,
    };
    setTransactions((prev) => [newTrx, ...prev]);
  };

  const updateBoxNotes = (boxNumber, notes) => {
    setBoxes((prev) =>
      prev.map((box) => (box.boxNumber === boxNumber ? { ...box, notes } : box))
    );
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
        'SKU': item.sku || '-',
        'Nama Barang / Sample': item.name,
        'Kategori': item.category,
        'Nomor Box': `BOX ${item.boxNumber}`,
        'Rak': box ? box.rackName : '',
        'Lokasi Rak': box ? box.location : '',
        'PIC PPIC': item.picName,
        'Qty': item.qty,
        'Satuan': item.unit || 'pcs',
        'Status': item.status,
        'Tanggal Masuk': item.dateIn,
        'Keterangan': item.description || '',
      };
    });
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Data Inventory Items');

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
    // Operations
    addItem,
    updateItem,
    deleteItem,
    addTransaction,
    updateBoxNotes,
    resetToInitialData,
    exportJsonBackup,
    importJsonBackup,
    exportToExcel,
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
