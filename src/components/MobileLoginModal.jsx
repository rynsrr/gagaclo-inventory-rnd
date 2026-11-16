import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  ChevronDown, 
  X,
  AlertCircle 
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { isHelper, isManager } from '../utils/authUtils';

export const MobileLoginModal = ({
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const {
    users,
    currentUser,
    loginUser,
  } = useInventory();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('gagaclo_mobile_remember_me') !== 'false';
    } catch {
      return true;
    }
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && users?.length > 0) {
      setError('');
      setPassword('');
      setShowPassword(false);
      try {
        const savedRemember = localStorage.getItem('gagaclo_mobile_remember_me') !== 'false';
        setRememberMe(savedRemember);
        const savedUserId = localStorage.getItem('gagaclo_mobile_saved_user_id');
        if (savedRemember && savedUserId && users.some(u => String(u.id) === String(savedUserId))) {
          setSelectedUserId(String(savedUserId));
        } else if (currentUser?.id) {
          setSelectedUserId(String(currentUser.id));
        } else {
          setSelectedUserId('');
        }
      } catch {
        if (currentUser?.id) {
          setSelectedUserId(String(currentUser.id));
        } else {
          setSelectedUserId('');
        }
      }
    }
  }, [isOpen, currentUser, users]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Silakan pilih user akun terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = loginUser(selectedUser.name, password);
      if (res.success) {
        try {
          if (rememberMe) {
            localStorage.setItem('gagaclo_mobile_remember_me', 'true');
            localStorage.setItem('gagaclo_mobile_user_selected', 'true');
            localStorage.setItem('gagaclo_mobile_saved_user_id', String(selectedUser.id));
          } else {
            localStorage.setItem('gagaclo_mobile_remember_me', 'false');
            localStorage.removeItem('gagaclo_mobile_user_selected');
            localStorage.removeItem('gagaclo_mobile_saved_user_id');
            sessionStorage.setItem('gagaclo_mobile_user_selected', 'true');
          }
        } catch {}
        setPassword('');
        onClose();
      } else {
        setError(res.message || 'Password salah. Akses ditolak.');
      }
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan saat login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#011a14] animate-in fade-in duration-200 font-apple"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-login-title"
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[380px] bg-white rounded-[32px] p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-black/[0.06] text-[#111827] space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Tombol Tutup (Hanya jika bukan first-time gate wajib) */}
        {!isMandatory && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-5 right-5 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-500 hover:text-gray-800 transition flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header (Ref: Welcome back) */}
        <div className="text-center">
          <h2
            id="mobile-login-title"
            className="text-[28px] font-extrabold tracking-tight text-[#111827] leading-tight text-center"
          >
            Welcome back
          </h2>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 text-center animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* 1. Pilih User / Akun */}
          <div>
            <label
              htmlFor="mobile-user-select"
              className="sr-only"
            >
              User / Akun
            </label>
            <div className="relative">
              <select
                id="mobile-user-select"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setPassword('');
                  setError('');
                }}
                className={`w-full appearance-none rounded-xl border border-gray-300 bg-white py-3 px-10 text-[14px] text-center [text-align-last:center] ${
                  !selectedUserId ? 'text-gray-400 font-normal' : 'font-medium text-[#111827]'
                } focus:border-black focus:ring-1 focus:ring-black focus:outline-hidden transition cursor-pointer`}
              >
                <option value="" disabled>
                  User / Akun
                </option>
                <optgroup label="Inventory Leader">
                  {users.filter(u => isManager(u)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Leader)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tim Utama PPIC (5 PIC)">
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
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Password Input with Eye Toggle */}
          <div>
            <label
              htmlFor="mobile-password-input"
              className="sr-only"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="mobile-password-input"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Password"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 px-10 text-[14px] text-[#111827] text-center placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-hidden transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me Checkbox (Align Center) */}
          <div className="flex items-center justify-center pt-0.5">
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-black cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded-[4px] border-gray-300 text-black accent-black focus:ring-0 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* 3. Tombol Login (Ref: Sleek Black Pill Button) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-full bg-black hover:bg-gray-900 active:scale-98 text-white font-bold text-[14px] tracking-wide transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memproses...' : 'Log in'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
