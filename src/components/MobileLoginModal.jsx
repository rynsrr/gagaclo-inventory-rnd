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
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && users?.length > 0) {
      setError('');
      setPassword('');
      setShowPassword(false);
      // Default to currentUser if logged in, else first user
      if (currentUser?.id) {
        setSelectedUserId(String(currentUser.id));
      } else {
        setSelectedUserId(String(users[0]?.id || ''));
      }
    }
  }, [isOpen, currentUser, users]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId)) || users[0];

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
          localStorage.setItem('gagaclo_mobile_user_selected', 'true');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 font-apple"
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
        <div className="space-y-1">
          <h2
            id="mobile-login-title"
            className="text-[28px] font-extrabold tracking-tight text-[#111827] leading-tight"
          >
            Welcome back
          </h2>
          <p className="text-[13px] text-[#6b7280] font-normal leading-snug">
            Pilih user dan masukkan password untuk masuk ke akun Anda.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
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
              className="block text-xs font-semibold text-[#374151] mb-1.5"
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
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-3 pl-3.5 pr-10 text-[14px] font-medium text-[#111827] focus:border-black focus:ring-1 focus:ring-black focus:outline-hidden transition cursor-pointer"
              >
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
              className="block text-xs font-semibold text-[#374151] mb-1.5"
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
                placeholder="Masukkan password..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-3.5 pr-10 text-[14px] text-[#111827] placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-hidden transition"
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
            
            {/* Hint Password (Ref: Forgot password link position) */}
            <div className="flex justify-end pt-1.5">
              <span
                className="text-[11px] font-semibold text-gray-500 hover:text-black transition"
                title="Password bawaan sama dengan nama akun Anda"
              >
                Password default: <strong className="text-black">{selectedUser?.name || 'nama akun'}</strong>
              </span>
            </div>
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
