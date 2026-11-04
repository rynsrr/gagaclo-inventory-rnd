import React, { useState } from 'react';
import {
  X,
  Plus,
  Package,
  Users,
  Layers,
  Pencil,
  Trash2,
  Check,
  Info,
  MapPin,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const EMPTY_PERSON_FORM = { name: '', role: '', email: '' };
const EMPTY_RACK_FORM = { name: '', category: 'SAMPLE', location: '' };

// New boxes go onto the first available rack. When no rack exists at all,
// rackId stays '' and the context places the box on the LANTAI (floor).
const makeDefaultBoxForm = (racks, ppicMembers) => ({
  rackId: racks.length > 0 ? String(racks[0].id) : '',
  category: 'SAMPLE',
  picName: ppicMembers.length > 0 ? ppicMembers[0].name : '',
  notes: '',
});

export const BoxManageModal = ({ isOpen, onClose }) => {
  const {
    racks,
    ppicMembers,
    boxes,
    items,
    addBox,
    updateBox,
    deleteBox,
    addRack,
    deleteRack,
    addPpicMember,
    updatePpicMember,
    deletePpicMember,
  } = useInventory();

  const [tab, setTab] = useState('box');
  const [boxForm, setBoxForm] = useState(() => makeDefaultBoxForm(racks, ppicMembers));
  const [personForm, setPersonForm] = useState(EMPTY_PERSON_FORM);
  const [rackForm, setRackForm] = useState(EMPTY_RACK_FORM);
  const [editingBox, setEditingBox] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'err', text }

  if (!isOpen) return null;

  const hasRacks = racks.length > 0;
  const floorBoxes = boxes.filter((b) => Number(b.rackId) === 0);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const closeModal = () => {
    setEditingBox(null);
    setEditingPerson(null);
    setConfirmDelete(null);
    setMessage(null);
    setBoxForm(makeDefaultBoxForm(racks, ppicMembers));
    setPersonForm(EMPTY_PERSON_FORM);
    setRackForm(EMPTY_RACK_FORM);
    onClose();
  };

  // ---------- Box actions ----------
  const handleSaveBox = async () => {
    setBusy(true);
    try {
      if (editingBox) {
        await updateBox(editingBox.boxNumber, {
          rackId: boxForm.rackId === '' ? null : Number(boxForm.rackId),
          category: boxForm.category,
          picName: boxForm.picName,
          notes: boxForm.notes,
        });
        flash('ok', `Box #${editingBox.boxNumber} berhasil diperbarui.`);
      } else {
        const created = await addBox({
          rackId: boxForm.rackId === '' ? null : Number(boxForm.rackId),
          category: boxForm.category,
          picName: boxForm.picName,
          notes: boxForm.notes,
        });
        const placed = Number(created.rackId) === 0 ? 'LANTAI' : created.rackName;
        flash('ok', `Box #${created.boxNumber} berhasil ditambahkan ke ${placed}.`);
      }
      setEditingBox(null);
      setBoxForm(makeDefaultBoxForm(racks, ppicMembers));
    } catch (err) {
      flash('err', err?.message || 'Gagal menyimpan box.');
    } finally {
      setBusy(false);
    }
  };

  const startEditBox = (box) => {
    // If the box's rack no longer exists, fall back to the LANTAI option
    // instead of leaving an unmatched (blank-looking) select value.
    const rackExists = racks.some(r => String(r.id) === String(box.rackId));
    setEditingBox(box);
    setBoxForm({
      rackId: rackExists ? String(box.rackId) : '',
      category: box.category || 'SAMPLE',
      picName: box.picName || '',
      notes: box.notes || '',
    });
    setConfirmDelete(null);
  };

  // ---------- Person actions ----------
  const handleSavePerson = () => {
    const name = personForm.name.trim();
    if (!name) {
      flash('err', 'Nama orang wajib diisi.');
      return;
    }
    try {
      if (editingPerson) {
        updatePpicMember(editingPerson.id, {
          name,
          role: personForm.role.trim() || 'PPIC Staff',
          email: personForm.email.trim(),
        });
        flash('ok', `Data ${name} berhasil diperbarui.`);
      } else {
        addPpicMember({
          name,
          role: personForm.role.trim(),
          email: personForm.email.trim(),
        });
        flash('ok', `${name} berhasil ditambahkan sebagai PIC.`);
      }
      setEditingPerson(null);
      setPersonForm(EMPTY_PERSON_FORM);
    } catch (err) {
      flash('err', err?.message || 'Gagal menyimpan data orang.');
    }
  };

  const startEditPerson = (person) => {
    setEditingPerson(person);
    setPersonForm({ name: person.name, role: person.role || '', email: person.email || '' });
    setConfirmDelete(null);
  };

  // ---------- Rack actions ----------
  const handleSaveRack = () => {
    try {
      const created = addRack({
        name: rackForm.name,
        category: rackForm.category,
        location: rackForm.location,
      });
      setRackForm(EMPTY_RACK_FORM);
      flash('ok', `Rak ${created.name} berhasil ditambahkan.`);
    } catch (err) {
      flash('err', err?.message || 'Gagal menambah rak.');
    }
  };

  // ---------- Delete ----------
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      if (confirmDelete.type === 'box') {
        await deleteBox(confirmDelete.id);
        flash('ok', `Box #${confirmDelete.id} berhasil dihapus.`);
      } else if (confirmDelete.type === 'person') {
        deletePpicMember(confirmDelete.id);
        flash('ok', `${confirmDelete.label} berhasil dihapus.`);
      } else if (confirmDelete.type === 'rack') {
        deleteRack(confirmDelete.id);
        flash('ok', `${confirmDelete.label} berhasil dihapus.`);
      }
      setConfirmDelete(null);
    } catch (err) {
      flash('err', err?.message || 'Gagal menghapus.');
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: 'box', label: 'Box', icon: Package, count: boxes.length },
    { id: 'person', label: 'Orang (PIC)', icon: Users, count: ppicMembers.length },
    { id: 'rack', label: 'Rak', icon: Layers, count: racks.length },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="inventory-dialog-heading px-5 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
              Kelola Box, Rak &amp; Orang
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tambah box baru, atur penempatan rak/lantai, dan kelola data PIC.
            </p>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-200 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setConfirmDelete(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-bold transition ${
                  tab === t.id
                    ? 'bg-white text-blue-700 border border-b-0 border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

          {/* ============ BOX TAB ============ */}
          {tab === 'box' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  {editingBox ? `Edit Box #${editingBox.boxNumber}` : 'Tambah Box Baru'}
                </h4>

                {!hasRacks && !editingBox && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-[11px] text-amber-900">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Belum ada rak tersedia. Box baru otomatis akan ditempatkan di <strong>LANTAI</strong>.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Rack */}
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Penempatan</span>
                    <select
                      value={boxForm.rackId}
                      onChange={(e) => setBoxForm((f) => ({ ...f, rackId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">LANTAI (tanpa rak)</option>
                      {racks.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} — {r.location}</option>
                      ))}
                    </select>
                  </label>

                  {/* Category */}
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Kategori</span>
                    <select
                      value={boxForm.category}
                      onChange={(e) => setBoxForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="SAMPLE">SAMPLE</option>
                      <option value="MATERIAL">MATERIAL</option>
                    </select>
                  </label>

                  {/* PIC */}
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">PIC / Penanggung Jawab</span>
                    <select
                      value={boxForm.picName}
                      onChange={(e) => setBoxForm((f) => ({ ...f, picName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">— Pilih orang —</option>
                      {ppicMembers.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </label>

                  {/* Notes */}
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Catatan (opsional)</span>
                    <input
                      type="text"
                      value={boxForm.notes}
                      onChange={(e) => setBoxForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="mis. box cadangan"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveBox}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingBox ? 'Simpan Perubahan' : 'Tambah Box'}
                  </button>
                  {editingBox && (
                    <button
                      type="button"
                      onClick={() => { setEditingBox(null); setBoxForm(makeDefaultBoxForm(racks, ppicMembers)); }}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Floor boxes summary */}
              {floorBoxes.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>{floorBoxes.length} box</strong> berada di <strong>LANTAI</strong> (belum punya rak): {floorBoxes.map(b => `#${b.boxNumber}`).join(', ')}
                  </span>
                </div>
              )}

              {/* Box list */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase mb-2">Daftar Box ({boxes.length})</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-bold">Box</th>
                          <th className="px-3 py-2 font-bold">Lokasi</th>
                          <th className="px-3 py-2 font-bold">PIC</th>
                          <th className="px-3 py-2 font-bold">Isi</th>
                          <th className="px-3 py-2 font-bold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {boxes.map((box) => {
                          const count = items.filter(i => Number(i.boxNumber) === Number(box.boxNumber)).length;
                          const isFloor = Number(box.rackId) === 0;
                          return (
                            <tr key={box.boxNumber} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <span className="font-mono font-black text-slate-800">#{box.boxNumber}</span>
                                <span className="ml-1.5 text-[10px] text-slate-400">{box.category}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isFloor ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {box.rackName || 'LANTAI'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-semibold">{box.picName}</td>
                              <td className="px-3 py-2 text-slate-500">{count} item</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditBox(box)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                                    title="Edit box"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDelete({ type: 'box', id: box.boxNumber, label: `Box #${box.boxNumber}` })}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                    title="Hapus box"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ PERSON TAB ============ */}
          {tab === 'person' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  {editingPerson ? `Edit ${editingPerson.name}` : 'Tambah Orang (PIC)'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Nama *</span>
                    <input
                      type="text"
                      value={personForm.name}
                      onChange={(e) => setPersonForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nama orang"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Role / Jabatan</span>
                    <input
                      type="text"
                      value={personForm.role}
                      onChange={(e) => setPersonForm((f) => ({ ...f, role: e.target.value }))}
                      placeholder="PPIC Staff"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Email</span>
                    <input
                      type="text"
                      value={personForm.email}
                      onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="nama@gagaclo.internal"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSavePerson}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingPerson ? 'Simpan Perubahan' : 'Tambah Orang'}
                  </button>
                  {editingPerson && (
                    <button
                      type="button"
                      onClick={() => { setEditingPerson(null); setPersonForm(EMPTY_PERSON_FORM); }}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase mb-2">Daftar Orang ({ppicMembers.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ppicMembers.map((p) => {
                    const boxCount = boxes.filter(b => b.picName === p.name).length;
                    return (
                      <div key={p.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 truncate">{p.name}</span>
                            <span className="text-[10px] font-bold text-slate-400">#{p.ppicNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{p.role || 'PPIC Staff'}</div>
                          <div className="text-[10px] text-slate-400 truncate">{p.email || '—'} • {boxCount} box</div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => startEditPerson(p)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Edit orang"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ type: 'person', id: p.id, label: p.name })}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Hapus orang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ============ RACK TAB ============ */}
          {tab === 'rack' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Tambah Rak Baru
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Nama Rak *</span>
                    <input
                      type="text"
                      value={rackForm.name}
                      onChange={(e) => setRackForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="RACK 6"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Kategori</span>
                    <select
                      value={rackForm.category}
                      onChange={(e) => setRackForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="SAMPLE">SAMPLE</option>
                      <option value="MATERIAL">MATERIAL</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Lokasi</span>
                    <input
                      type="text"
                      value={rackForm.location}
                      onChange={(e) => setRackForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="Area gudang"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleSaveRack}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Tambah Rak
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Daftar Rak ({racks.length})
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Jika tidak ada rak, box baru otomatis ditempatkan di <strong>LANTAI</strong>. Rak yang masih memiliki box tidak bisa dihapus — pindahkan box-nya ke rak lain atau ke Lantai terlebih dahulu.
                </p>
                {racks.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-3 text-xs text-amber-900 font-semibold">
                    Belum ada rak. Semua box baru akan ditaruh di LANTAI.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {racks.map((r) => {
                      const boxCount = boxes.filter(b => Number(b.rackId) === Number(r.id)).length;
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-800">{r.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{r.location} • {r.category}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-600">{boxCount} box</span>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ type: 'rack', id: r.id, label: r.name })}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Hapus rak"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Delete confirm bar */}
        {confirmDelete && (
          <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 shrink-0">
            <span className="text-xs font-bold text-rose-800">
              Hapus {confirmDelete.label}?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold disabled:opacity-50"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {boxes.length} box • {racks.length} rak • {floorBoxes.length} di lantai
          </span>
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
