import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Crown,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { isHelper, isManager } from '../utils/authUtils';

export const UserProfileModal = ({ isOpen, onClose, initialSelectedUserName }) => {
  const {
    users,
    currentUser,
    loginUser,
    logoutUser,
    boxes,
  } = useInventory();

  const [selectedUserToLogin, setSelectedUserToLogin] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    setLoginError('');
    if (isOpen && initialSelectedUserName && users?.length > 0) {
      const target = users.find(
        (u) => u.name.toLowerCase() === String(initialSelectedUserName).toLowerCase()
      );
      if (target) {
        setSelectedUserToLogin(target);
        setLoginPassword('');
        return;
      }
    }
    // Default to currentUser if logged in, else first user
    if (isOpen && users?.length > 0) {
      const active = currentUser
        ? users.find((u) => String(u.id).toLowerCase() === String(currentUser.id).toLowerCase())
        : null;
      setSelectedUserToLogin(active || users[0]);
    } else {
      setSelectedUserToLogin(null);
    }
    setLoginPassword('');
  }, [currentUser, isOpen, initialSelectedUserName, users]);

  if (!isOpen) return null;

  // Handle Switch / Login PIC
  const handleSwitchUser = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!selectedUserToLogin) return;

    const res = loginUser(selectedUserToLogin.name, loginPassword);
    if (res.success) {
      // Langsung tutup modal seketika tanpa notifikasi
      setLoginPassword('');
      onClose();
    } else {
      setLoginError(res.message || 'Password salah.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (logoutUser) {
      logoutUser();
      setLoginPassword('');
      setLoginError('');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="font-apple relative w-full max-w-[420px] max-h-[90vh] flex flex-col rounded-[22px] bg-white shadow-[0_24px_50px_rgba(0,0,0,0.16)] border border-black/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Apple Style Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3.5 bg-[#fbfbfd]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 id="user-profile-modal-title" className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
                Ganti User / Login Akun
              </h3>
              <p className="text-[11px] font-normal text-[#86868b]">
                Kelola akun dan otentikasi pengguna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-4">
            {/* Pemilihan Akun (Apple Grouped Picker) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="user-account-select" className="text-[12px] font-semibold text-[#1d1d1f] tracking-tight">
                  Pilih Akun yang Ingin Digunakan:
                </label>
                <span className="text-[11px] text-[#86868b]">Total 9 Akun</span>
              </div>
              <select
                id="user-account-select"
                value={selectedUserToLogin?.id || ''}
                onChange={(e) => {
                  const found = users.find(u => String(u.id) === e.target.value);
                  setSelectedUserToLogin(found || null);
                  setLoginPassword('');
                  setLoginError('');
                }}
                className="w-full rounded-xl border border-black/[0.08] bg-[#f5f5f7] hover:bg-[#ebebee] focus:bg-white py-2.5 px-3 text-[13px] font-medium text-[#1d1d1f] focus:border-[#0071e3] focus:outline-hidden focus:ring-4 focus:ring-[#0071e3]/15 transition cursor-pointer"
              >
                <optgroup label="Manajemen & Pengawas">
                  {users.filter(u => isManager(u)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Manager Inventory)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tim Utama PPIC (5 PPIC)">
                  {users.filter(u => !isHelper(u) && !isManager(u)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (PPIC #{u.ppicNumber})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tim Support Data (3 Support)">
                  {users.filter(u => isHelper(u)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Tim Support)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Kartu Profil Akun Terpilih (Apple Card Style) */}
            {selectedUserToLogin && (() => {
              const isCurrent = currentUser && String(currentUser.id).toLowerCase() === String(selectedUserToLogin.id).toLowerCase();
              const isMgr = isManager(selectedUserToLogin);
              const isHlp = isHelper(selectedUserToLogin);
              const boxCount = boxes.filter(b => b.picName === selectedUserToLogin.name).length;

              const roleLabel = isMgr
                ? 'Manager Inventory'
                : isHlp
                ? 'Tim Support Data'
                : `PPIC #${selectedUserToLogin.ppicNumber}`;

              const avatarBg = isMgr
                ? 'bg-[#5856d6]'
                : isHlp
                ? 'bg-[#30b0c7]'
                : selectedUserToLogin.avatarBg || 'bg-[#0071e3]';

              return (
                <div className="rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-4 sm:p-4.5 space-y-3.5 transition">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-semibold text-base shadow-xs ${avatarBg}`}
                    >
                      {isMgr ? (
                        <Crown className="w-5 h-5 text-white" />
                      ) : (
                        selectedUserToLogin.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[16px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
                          {selectedUserToLogin.name}
                        </h4>
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-white text-[#1d1d1f] border border-black/[0.08] shadow-2xs">
                          {roleLabel}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#34c759]/12 text-[#248a3d] border border-[#34c759]/25 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]"></span>
                            Akun Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#86868b] mt-0.5 leading-normal">
                        {isMgr
                          ? 'Kontrol alokasi box, target input, dan audit data 72 box'
                          : isHlp
                          ? 'Bantuan input dan rekap ke 72 box milik 5 PIC'
                          : `${boxCount} Box alokasi di Rak 1–5`}
                      </p>
                    </div>
                  </div>

                  {/* KONDISI A: Akun Sedang Aktif */}
                  {isCurrent ? (
                    <div className="space-y-3 pt-3 border-t border-black/[0.06]">
                      <div className="rounded-xl bg-white p-3 border border-black/[0.06] space-y-1 shadow-2xs">
                        <p className="font-semibold text-[12px] text-[#1d1d1f] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#34c759] shrink-0" />
                          Anda sedang menggunakan akun ini
                        </p>
                        <p className="text-[11px] text-[#86868b] leading-relaxed">
                          Seluruh input sample, pergeseran status box, dan rekap harian tersimpan atas nama <strong className="text-[#1d1d1f]">{selectedUserToLogin.name}</strong>.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] shadow-xs cursor-pointer transition text-center"
                        >
                          Lanjut Bekerja
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-[13px] font-medium text-[#ff3b30] bg-[#ff3b30]/6 hover:bg-[#ff3b30]/12 border border-[#ff3b30]/15 active:scale-[0.99] cursor-pointer transition"
                          title="Keluar dari sesi akun ini"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* KONDISI B: Beralih Akun (Input Password) */
                    <form onSubmit={handleSwitchUser} className="space-y-3 pt-3 border-t border-black/[0.06]">
                      {loginError && (
                        <div className="flex items-center gap-2 text-[12px] font-medium text-[#ff3b30] bg-[#ff3b30]/8 p-2.5 rounded-xl border border-[#ff3b30]/20">
                          <AlertCircle className="h-4 w-4 shrink-0 text-[#ff3b30]" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label htmlFor="login-password-input" className="text-[12px] font-medium text-[#1d1d1f] block mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="login-password-input"
                            type={showLoginPassword ? 'text' : 'password'}
                            autoFocus
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Masukkan password..."
                            className="w-full rounded-xl border border-black/[0.12] bg-white py-2.5 pl-3.5 pr-10 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#0071e3] focus:outline-hidden focus:ring-4 focus:ring-[#0071e3]/15 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer transition-colors"
                            aria-label={showLoginPassword ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-[13px] font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] shadow-xs transition cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Masuk sebagai {selectedUserToLogin.name}</span>
                      </button>
                    </form>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Apple Style Footer */}
        <div className="border-t border-black/[0.06] bg-[#fbfbfd] px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#86868b]">
            <Lock className="h-3 w-3 text-[#86868b] shrink-0" />
            <span>Akses terenkripsi per akun PIC</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] px-3.5 py-1 text-[12px] font-medium text-[#1d1d1f] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
