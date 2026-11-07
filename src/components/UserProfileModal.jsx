import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  UserCheck,
  KeyRound,
  ShieldCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Boxes,
  Lock,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const UserProfileModal = ({ isOpen, onClose }) => {
  const {
    users,
    currentUser,
    loginUser,
    updateUserProfile,
    boxes,
    items,
  } = useInventory();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'switch'
  const [profileForm, setProfileForm] = useState({
    name: '',
    role: '',
    email: '',
    newPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'ok' | 'err', text: '' }

  // State for Switch User tab
  const [selectedUserToLogin, setSelectedUserToLogin] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sync profileForm when currentUser changes or modal opens
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        role: currentUser.role || '',
        email: currentUser.email || '',
        newPassword: '',
      });
    }
    setStatusMessage(null);
    setLoginError('');
    setSelectedUserToLogin(null);
    setLoginPassword('');
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const userBoxes = boxes.filter(b => b.picName === currentUser?.name);
  const userItems = items.filter(i => i.picName === currentUser?.name);

  // Handle Save Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setStatusMessage(null);
    if (!currentUser) return;

    try {
      const updates = {
        name: profileForm.name.trim(),
        role: profileForm.role.trim(),
        email: profileForm.email.trim(),
      };
      if (profileForm.newPassword.trim()) {
        updates.password = profileForm.newPassword.trim();
      }

      updateUserProfile(currentUser.id, updates);
      setStatusMessage({
        type: 'ok',
        text: 'Profil berhasil diperbarui! Perubahan nama dan data tersinkronisasi.',
      });
      setProfileForm(prev => ({ ...prev, newPassword: '' }));
    } catch (err) {
      setStatusMessage({
        type: 'err',
        text: err?.message || 'Gagal memperbarui profil.',
      });
    }
  };

  // Handle Switch / Login PIC
  const handleSwitchUser = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!selectedUserToLogin) return;

    const res = loginUser(selectedUserToLogin.name, loginPassword);
    if (res.success) {
      setStatusMessage({
        type: 'ok',
        text: `Berhasil login sebagai ${res.user.name}.`,
      });
      setSelectedUserToLogin(null);
      setLoginPassword('');
      setActiveTab('profile');
    } else {
      setLoginError(res.message || 'Password salah.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="user-profile-modal-title" className="text-sm sm:text-base font-black text-slate-900">
                Manajemen Akun &amp; Profil PIC
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                5 PIC: Royan • Cynara • Ami • Ryan • Hanami
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">Login sebagai:</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100/80 px-2 py-0.5 text-xs font-black text-blue-800">
              <span className={`inline-block h-2 w-2 rounded-full ${currentUser?.avatarBg || 'bg-blue-600'}`} />
              {currentUser?.name || 'Tamu'} (#{currentUser?.ppicNumber || 1})
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Satu user hanya bisa edit profil sendiri</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Edit Profil Saya</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('switch')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === 'switch'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Ganti User / Login PIC</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Notification Feedback */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2.5 rounded-xl p-3 text-xs font-semibold transition ${
                statusMessage.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'ok' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: EDIT PROFIL SAYA */}
          {activeTab === 'profile' && currentUser && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Profile Card Summary */}
              <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-black text-lg shadow-sm ${currentUser.avatarBg || 'bg-blue-600'}`}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 truncate">{currentUser.name}</h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      PIC #{currentUser.ppicNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{currentUser.role || 'PPIC Staff'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-xs font-black text-blue-700">{userBoxes.length} Box</span>
                  <span className="text-[10px] text-slate-400">{userItems.length} Item terdata</span>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="user-edit-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Nama PIC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="user-edit-name"
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label htmlFor="user-edit-role" className="block text-xs font-bold text-slate-700 mb-1">
                    Role / Jabatan
                  </label>
                  <input
                    id="user-edit-role"
                    type="text"
                    value={profileForm.role}
                    onChange={(e) => setProfileForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="PPIC Staff"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="user-edit-email" className="block text-xs font-bold text-slate-700 mb-1">
                  Email Internal Gagaclo
                </label>
                <input
                  id="user-edit-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="nama@gagaclo.internal"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Password Section */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <label htmlFor="user-edit-password" className="text-xs font-bold text-amber-900">
                    Ganti Password (Opsional)
                  </label>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Password awal Anda sama dengan nama PIC Anda (<code className="font-bold text-amber-950 px-1 py-0.2 rounded bg-amber-100">{currentUser.name}</code>). Masukkan password baru di bawah jika ingin menggantinya.
                </p>
                <div className="relative">
                  <input
                    id="user-edit-password"
                    type={showPassword ? 'text' : 'password'}
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Masukkan password baru (kosongkan jika tidak diubah)"
                    className="w-full rounded-xl border border-amber-300 bg-white py-2 pl-3 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:shadow-md cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Simpan Perubahan Profil</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SWITCH USER / LOGIN PIC LAIN */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50/60 border border-blue-200/80 p-3 text-xs text-blue-900 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  Pilih salah satu dari 5 akun PIC di bawah untuk beralih akun. Password default masing-masing user adalah <strong>sama dengan nama PIC</strong> (contoh: <code>Royan</code>, <code>Cynara</code>, <code>Ami</code>, <code>Ryan</code>, <code>Hanami</code>).
                </span>
              </div>

              {/* List of 5 PICs */}
              <div className="space-y-2">
                {users.map((u) => {
                  const isCurrent = currentUser && String(currentUser.id).toLowerCase() === String(u.id).toLowerCase();
                  const isSelected = selectedUserToLogin?.id === u.id;
                  const boxCount = boxes.filter(b => b.picName === u.name).length;

                  return (
                    <div
                      key={u.id}
                      className={`rounded-xl border p-3 transition ${
                        isCurrent
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : isSelected
                          ? 'border-blue-400 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black text-sm ${u.avatarBg || 'bg-blue-600'}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{u.name}</span>
                              <span className="text-[10px] font-bold text-slate-400">#{u.ppicNumber}</span>
                              {isCurrent && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                  <Check className="h-2.5 w-2.5" /> Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{u.role}</p>
                            <p className="text-[10px] text-slate-400">{boxCount} Box alokasi</p>
                          </div>
                        </div>

                        <div>
                          {isCurrent ? (
                            <span className="text-xs font-bold text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                              Sedang Digunakan
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserToLogin(u);
                                setLoginPassword('');
                                setLoginError('');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isSelected ? 'Sedang Dipilih' : 'Pilih Akun'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Login Password Prompt for Selected User */}
                      {isSelected && !isCurrent && (
                        <form onSubmit={handleSwitchUser} className="mt-3 pt-3 border-t border-blue-200/80 space-y-2">
                          {loginError && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{loginError}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showLoginPassword ? 'text' : 'password'}
                                autoFocus
                                required
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder={`Masukkan password ${u.name}...`}
                                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-10 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              />
                              <button
                                type="button"
                                onClick={() => setShowLoginPassword(p => !p)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-black text-white shadow-sm transition cursor-pointer"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              <span>Login</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Petunjuk: Password default sama dengan nama user (<strong className="text-slate-600">{u.name}</strong>).
                          </p>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Proteksi Akses: Satu user tidak dapat mengedit profil PIC lain.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
