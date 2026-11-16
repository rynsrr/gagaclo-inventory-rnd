import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  ChevronDown, 
  X,
  AlertCircle,
  Lock,
  ArrowRight,
  Shield,
  Sparkles
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

  // Seluruh 9 anggota tim resmi: Jasmine (Leader) + 5 PPIC (Royan, Cynara, Ami, Ryan, Hanami) + 3 Support (Sheva, Ade, Tri)
  const allTeamUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    const managers = users.filter(u => isManager(u));
    const ppics = users
      .filter(u => !isHelper(u) && !isManager(u))
      .sort((a, b) => (Number(a.ppicNumber) || 99) - (Number(b.ppicNumber) || 99));
    const supports = users.filter(u => isHelper(u));
    
    // Gabungkan dengan urutan hierarki resmi: Leader -> PPIC 1-5 -> Support
    return [...managers, ...ppics, ...supports];
  }, [users]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Silakan pilih akun PIC terlebih dahulu.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050b14]/95 backdrop-blur-xl animate-in fade-in duration-300 font-apple overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-login-title"
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Background Atmosphere: Futuristic Ambient Mesh & Glowing Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Top-Left Glowing Cyan/Emerald Orb */}
        <div className="absolute -top-28 -left-28 w-88 h-88 rounded-full bg-gradient-to-br from-emerald-500/25 via-teal-600/15 to-transparent blur-3xl animate-pulse" />
        
        {/* Bottom-Right Deep Jade & Indigo Orb */}
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-gradient-to-tl from-cyan-600/20 via-emerald-800/15 to-transparent blur-3xl" />
        
        {/* Center Backlight Ambient Halo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[440px] bg-emerald-400/10 rounded-full blur-[100px]" />

        {/* Engineering Dot Matrix Grid */}
        <div 
          className="absolute inset-0 opacity-[0.06]" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.2px)', 
            backgroundSize: '22px 22px' 
          }} 
        />
      </div>

      {/* Modern Dark Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-[390px] bg-[#0c1320]/85 backdrop-blur-2xl rounded-[32px] p-6 sm:p-7 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(16,185,129,0.12)] border border-white/10 text-white space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Tombol Tutup (Hanya jika bukan first-time gate wajib) */}
        {!isMandatory && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Badge & Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>GAGACLO R&D INVENTORY</span>
          </div>

          <h2
            id="mobile-login-title"
            className="text-[26px] font-extrabold tracking-tight text-white leading-tight"
          >
            Welcome back
          </h2>
          <p className="text-xs text-slate-400 font-normal">
            Pilih akun PIC untuk akses sistem mobile
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 text-center animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tactile Quick PIC Selector (1-Tap Selection: All 9 Team Members) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span>Pilih Akun Tim ({allTeamUsers.length} Personel)</span>
            </span>
            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
              <Sparkles className="w-3 h-3" /> Quick Tap
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {allTeamUsers.map((u) => {
              const isSelected = String(u.id) === String(selectedUserId);
              const isLeader = isManager(u);
              const isSup = isHelper(u);
              const roleLabel = isLeader ? 'Leader' : isSup ? 'Support' : `PPIC #${u.ppicNumber || '1'}`;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(String(u.id));
                    setPassword('');
                    setError('');
                  }}
                  className={`py-2 px-2 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-emerald-500/25 to-teal-600/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50'
                      : isLeader
                        ? 'bg-emerald-950/25 border-emerald-500/25 hover:border-emerald-500/40 text-slate-200'
                        : isSup
                          ? 'bg-indigo-950/25 border-indigo-500/25 hover:border-indigo-500/40 text-slate-200'
                          : 'bg-white/[0.03] border-white/5 hover:border-white/15 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="text-[12px] font-bold truncate max-w-full">
                    {u.name}
                  </span>
                  <span className={`text-[10px] font-medium truncate ${
                    isSelected 
                      ? 'text-emerald-300 font-semibold' 
                      : isLeader 
                        ? 'text-emerald-400' 
                        : isSup 
                          ? 'text-indigo-400' 
                          : 'text-slate-400'
                  }`}>
                    {roleLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
          
          {/* 1. Atau Pilih dari Seluruh Daftar User (Dropdown) */}
          <div className="relative">
            <select
              id="mobile-user-select"
              aria-label="Pilih Akun PIC"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPassword('');
                setError('');
              }}
              className={`w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 py-3 px-10 text-[13.5px] text-center [text-align-last:center] ${
                !selectedUserId ? 'text-slate-500 font-normal' : 'font-semibold text-white'
              } focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition cursor-pointer`}
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Semua User / Akun ({users?.length || 0} Akun)
              </option>
              <optgroup label="Inventory Leader" className="bg-slate-900 text-white font-bold">
                {users.filter(u => isManager(u)).map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white py-1">
                    👑 {u.name} (Leader)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tim Utama PPIC (5 PIC)" className="bg-slate-900 text-white font-bold">
                {users.filter(u => !isHelper(u) && !isManager(u)).map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white py-1">
                    ⚡ {u.name} (PPIC #{u.ppicNumber})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tim Support Data (3 Support)" className="bg-slate-900 text-white font-bold">
                {users.filter(u => isHelper(u)).map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white py-1">
                    🤝 {u.name} (Tim Support)
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* 2. Password Input with Lock Icon & Eye Toggle */}
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
              placeholder="Password akun"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 px-10 text-[14px] text-white text-center placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember me Checkbox (Align Center) */}
          <div className="flex items-center justify-center pt-0.5">
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-slate-200 cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded-[4px] border-slate-700 bg-slate-950 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>Remember me di HP ini</span>
            </label>
          </div>

          {/* 3. Radiant Emerald Gradient Pill Button */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-98 text-slate-950 font-bold text-[14.5px] tracking-wide transition shadow-[0_6px_25px_-2px_rgba(16,185,129,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memverifikasi...' : 'Log in ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

        {/* Footer Security Note */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Sesi terenkripsi aman • R&D Storage Gagaclo</span>
        </div>

      </div>
    </div>
  );
};
