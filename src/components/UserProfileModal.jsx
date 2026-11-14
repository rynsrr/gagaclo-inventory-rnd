import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Info,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { isSuperuser, isHelper } from '../utils/authUtils';

export const UserProfileModal = ({ isOpen, onClose }) => {
  const {
    users,
    currentUser,
    loginUser,
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
    setSelectedUserToLogin(null);
    setLoginPassword('');
  }, [currentUser, isOpen]);

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
      setSelectedUserToLogin(null);
      setLoginPassword('');
      setTimeout(() => {
        onClose();
      }, 700);
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
                Ganti User / Login Akun
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                5 PIC (Royan, Cynara, Ami, Ryan, Hanami) • 3 Support (Sheva, Ade, Tri)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
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
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            <span>Akun Aktif</span>
          </div>
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
            <div className="rounded-xl bg-blue-50/60 border border-blue-200/80 p-3 text-xs text-blue-900 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                Pilih salah satu dari 5 akun PIC atau 3 Tim Support (Sheva, Ade, Tri) di bawah untuk beralih login. Masukkan password akun untuk otentikasi.
              </span>
            </div>

            {/* SEKSI 1: Tim Utama PPIC (5 PIC) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                  Tim Utama PPIC (5 PIC)
                </span>
                <span className="text-[10px] font-bold text-slate-400">Total 72 Box</span>
              </div>

              {users.filter(u => !isHelper(u)).map((u) => {
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{u.name}</span>
                            <span className="text-[10px] font-bold text-slate-400">#{u.ppicNumber}</span>
                            {isSuperuser(u) && (
                              <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black text-amber-900 flex items-center gap-0.5 shadow-2xs">
                                ⚡ Superuser
                              </span>
                            )}
                            {isCurrent && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" /> Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{boxCount} Box alokasi</p>
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
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              aria-label={showLoginPassword ? 'Sembunyikan password' : 'Lihat password'}
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
                      </form>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SEKSI 2: Tim Support Data (Sheva, Ade, Tri) */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                    Tim Support Data (Sheva, Ade, Tri)
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Membantu input &amp; rekap data ke 72 Box milik 5 PIC. Jumlah PCS yang di-input akan terkontrol secara terpisah (Dual-Tracking).
                  </p>
                </div>
              </div>

              {users.filter(u => isHelper(u)).map((u) => {
                const isCurrent = currentUser && String(currentUser.id).toLowerCase() === String(u.id).toLowerCase();
                const isSelected = selectedUserToLogin?.id === u.id;

                return (
                  <div
                    key={u.id}
                    className={`rounded-xl border p-3 transition ${
                      isCurrent
                        ? 'border-teal-400 bg-teal-50/50 shadow-xs'
                        : isSelected
                        ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-teal-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black text-sm ${u.avatarBg || 'bg-teal-600'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{u.name}</span>
                            <span className="rounded-full bg-teal-100 border border-teal-300 px-2 py-0.5 text-[9px] font-black text-teal-900 flex items-center gap-0.5">
                              🛠️ Tim Support
                            </span>
                            {isCurrent && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" /> Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-teal-700 mt-0.5">
                            Bantuan Input: Semua Box milik 5 PIC • (Password default: {u.name})
                          </p>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-xs font-bold text-teal-800 px-3 py-1.5 rounded-lg bg-teal-100/70 border border-teal-300">
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
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {isSelected ? 'Sedang Dipilih' : 'Pilih Akun'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Login Password Prompt for Helper */}
                    {isSelected && !isCurrent && (
                      <form onSubmit={handleSwitchUser} className="mt-3 pt-3 border-t border-teal-200 space-y-2">
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
                              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-10 text-xs text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(p => !p)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              aria-label={showLoginPassword ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-black text-white shadow-sm transition cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Login</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Hak Akses: Setiap PIC mengelola alokasi box dan sampel masing-masing.</span>
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
