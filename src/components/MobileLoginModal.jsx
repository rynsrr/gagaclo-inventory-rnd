import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  X,
  AlertCircle,
  Lock,
  ArrowRight,
  Shield,
  Check
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

  // Seluruh 9 anggota tim resmi: Jasmine (Leader Inv) + 5 PPIC + 3 Support
  const allTeamUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    const managers = users.filter(u => isManager(u));
    const ppics = users
      .filter(u => !isHelper(u) && !isManager(u))
      .sort((a, b) => (Number(a.ppicNumber) || 99) - (Number(b.ppicNumber) || 99));
    const supports = users.filter(u => isHelper(u));
    
    return [...managers, ...ppics, ...supports];
  }, [users]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  // Inisial rapi 2 huruf
  const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Silakan pilih profil akun terlebih dahulu.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 font-apple overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-login-title"
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container Modal Bergaya Modern Behance / Apple Slate Minimalis */}
      <div className="relative z-10 w-full max-w-[380px] bg-[#0f172a] rounded-3xl p-6 shadow-2xl border border-slate-800 text-white space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Tombol Tutup */}
        {!isMandatory && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-800/60 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-slate-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Elegan & Profesional */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Gagaclo R&amp;D Inventory</span>
          </div>

          <h2
            id="mobile-login-title"
            className="text-xl font-bold tracking-tight text-white pt-1"
          >
            Masuk ke Sistem
          </h2>
          <p className="text-xs text-slate-400 font-normal">
            Pilih profil akun untuk memulai pendataan
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-medium flex items-center justify-center gap-2 text-center animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Grid 9 Personel Tim (3x3) - Desain Bersih & Elegan */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 px-1">
            <span>Pilih Profil Personel</span>
            <span className="text-slate-500">9 Akun</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {allTeamUsers.map((u) => {
              const isSelected = String(u.id) === String(selectedUserId);
              const isLeader = isManager(u);
              const isSup = isHelper(u);
              const roleLabel = isLeader ? 'Leader Inv' : isSup ? 'Support' : `PPIC #${u.ppicNumber || '1'}`;
              const initials = getInitials(u.name);

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(String(u.id));
                    setPassword('');
                    setError('');
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {/* Avatar Lingkaran Inisial Netral */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400'
                      : isLeader
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {initials}
                  </div>

                  <div className="w-full">
                    <div className="text-[11.5px] font-bold truncate max-w-full text-slate-100">
                      {u.name}
                    </div>
                    <div className={`text-[9.5px] font-medium truncate ${
                      isSelected 
                        ? 'text-blue-400' 
                        : isLeader 
                          ? 'text-amber-400/90' 
                          : isSup 
                            ? 'text-slate-400' 
                            : 'text-slate-400'
                    }`}>
                      {roleLabel}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5">
                      <Check className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Login: Password & Masuk */}
        <form onSubmit={handleLogin} className="space-y-3 pt-1">
          
          {/* Kolom Password Minimalis */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              id="mobile-password-input"
              aria-label="Password Akun"
              type={showPassword ? 'text' : 'password'}
              autoFocus
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder={selectedUser ? `Password untuk ${selectedUser.name}` : 'Masukkan password'}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 px-10 text-[13.5px] text-white text-center font-normal placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember me Checkbox */}
          <div className="flex items-center justify-center pt-0.5">
            <label className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-400 hover:text-slate-200 cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[3px] border-slate-700 bg-slate-900 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Ingat akun di perangkat ini</span>
            </label>
          </div>

          {/* Tombol Masuk Profesional (Gagaclo Blue) */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-[13.5px] tracking-wide transition shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

        {/* Security Footer Minimalis */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 text-center font-normal">
          <Shield className="w-3 h-3 text-slate-500" />
          <span>Enkripsi Sesi Aman &bull; 72 Box Database</span>
        </div>

      </div>
    </div>
  );
};
