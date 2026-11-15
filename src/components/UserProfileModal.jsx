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

  const [statusMessage, setStatusMessage] = useState(null); // { type: 'ok' | 'err', text: '' }
  const [selectedUserToLogin, setSelectedUserToLogin] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    setStatusMessage(null);
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
      setStatusMessage({
        type: 'ok',
        text: `Berhasil login sebagai ${res.user.name}.`,
      });
      setLoginPassword('');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setLoginError(res.message || 'Password salah.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (logoutUser) {
      logoutUser();
      setStatusMessage({
        type: 'ok',
        text: 'Berhasil keluar dari akun.',
      });
      setLoginPassword('');
      setLoginError('');
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
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="user-profile-modal-title" className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Ganti User / Login Akun
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Kelola akun dan otentikasi pengguna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
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

          <div className="space-y-4">
            {/* Pemilihan Akun (Dropdown Ringkas & Bersih) */}
            <div className="space-y-1.5">
              <label htmlFor="user-account-select" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Pilih Akun yang Ingin Digunakan:</span>
                <span className="text-[11px] font-normal text-slate-400">Total 9 Akun</span>
              </label>
              <select
                id="user-account-select"
                value={selectedUserToLogin?.id || ''}
                onChange={(e) => {
                  const found = users.find(u => String(u.id) === e.target.value);
                  setSelectedUserToLogin(found || null);
                  setLoginPassword('');
                  setLoginError('');
                }}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
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

            {/* Kartu Tunggal Akun yang Dipilih (Fokus Login, Tanpa Melihat Akun Lain) */}
            {selectedUserToLogin && (() => {
              const isCurrent = currentUser && String(currentUser.id).toLowerCase() === String(selectedUserToLogin.id).toLowerCase();
              const isMgr = isManager(selectedUserToLogin);
              const isHlp = isHelper(selectedUserToLogin);
              const boxCount = boxes.filter(b => b.picName === selectedUserToLogin.name).length;

              const roleBadgeColor = isMgr
                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                : isHlp
                ? 'bg-teal-100 text-teal-900 border-teal-300'
                : 'bg-blue-100 text-blue-900 border-blue-300';

              const roleLabel = isMgr
                ? 'Manager Inventory'
                : isHlp
                ? 'Tim Support Data'
                : `PPIC #${selectedUserToLogin.ppicNumber}`;

              const avatarBgClass = isMgr
                ? 'bg-indigo-600'
                : isHlp
                ? 'bg-teal-600'
                : selectedUserToLogin.avatarBg || 'bg-blue-600';

              return (
                <div
                  className={`rounded-2xl border p-4 sm:p-5 transition space-y-4 ${
                    isCurrent
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : isMgr
                      ? 'border-indigo-200 bg-indigo-50/30'
                      : isHlp
                      ? 'border-teal-200 bg-teal-50/30'
                      : 'border-blue-200 bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-black text-base shadow-xs ${avatarBgClass}`}
                      >
                        {isMgr ? (
                          <Crown className="w-6 h-6 text-white" />
                        ) : (
                          selectedUserToLogin.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900">{selectedUserToLogin.name}</h4>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${roleBadgeColor}`}>
                            {roleLabel}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-black text-emerald-800 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Akun Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {isMgr
                            ? 'Kontrol alokasi box, target input, dan audit data 72 box'
                            : isHlp
                            ? 'Bantuan input dan rekap ke 72 box milik 5 PIC'
                            : `${boxCount} Box alokasi di Rak 1–5`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* KONDISI A: Akun Sedang Aktif (Tidak perlu input password lagi) */}
                  {isCurrent ? (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="rounded-xl bg-white/90 border border-emerald-200 p-3 text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Anda sedang menggunakan akun ini
                        </p>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Seluruh input sample, pergeseran status box, dan rekap harian tersimpan atas nama <strong>{selectedUserToLogin.name}</strong>.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 shadow-xs cursor-pointer transition text-center"
                        >
                          Lanjut Bekerja
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition"
                          title="Keluar dari sesi akun ini"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* KONDISI B: Hendak Beralih Akun (Input Password) */
                    <form onSubmit={handleSwitchUser} className="space-y-3 pt-3 border-t border-slate-200">
                      {loginError && (
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label htmlFor="login-password-input" className="text-xs font-bold text-slate-700 block mb-1">
                          Password {selectedUserToLogin.name}
                        </label>
                        <div className="relative">
                          <input
                            id="login-password-input"
                            type={showLoginPassword ? 'text' : 'password'}
                            autoFocus
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder={`Masukkan password ${selectedUserToLogin.name}...`}
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            aria-label={showLoginPassword ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-black text-white shadow-xs transition cursor-pointer ${
                          isMgr
                            ? 'bg-indigo-600 hover:bg-indigo-500'
                            : isHlp
                            ? 'bg-teal-600 hover:bg-teal-500'
                            : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        <Lock className="h-4 w-4" />
                        <span>Masuk sebagai {selectedUserToLogin.name}</span>
                      </button>
                    </form>
                  )}
                </div>
              );
            })()}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3 shrink-0" />
            <span>Akses terenkripsi per PIC</span>
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
