import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  X,
  AlertCircle,
  Lock,
  ArrowRight,
  Shield,
  Sparkles,
  Flame,
  Zap,
  CheckCircle2
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

  // Warna avatar energik per profil
  const getAvatarBadge = (u) => {
    if (isManager(u)) return { emoji: '👑', color: 'from-amber-400 to-amber-600', ring: 'border-amber-400/50' };
    if (isHelper(u)) return { emoji: '🤝', color: 'from-sky-400 to-indigo-500', ring: 'border-sky-400/50' };
    const num = Number(u.ppicNumber) || 1;
    const colors = [
      'from-cyan-400 to-blue-600',
      'from-emerald-400 to-teal-600',
      'from-rose-400 to-pink-600',
      'from-violet-400 to-purple-600',
      'from-amber-400 to-orange-600',
    ];
    return { emoji: '⚡', color: colors[(num - 1) % colors.length], ring: 'border-cyan-400/50' };
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Silakan pilih profil kamu terlebih dahulu.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-[#050b14]/95 backdrop-blur-xl animate-in fade-in duration-300 font-apple overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-login-title"
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Background Atmosphere: Electric Cyan & Emerald Pulsing Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/30 via-emerald-600/20 to-transparent blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-gradient-to-tl from-emerald-500/25 via-teal-700/20 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[440px] bg-emerald-400/10 rounded-full blur-[100px]" />
        <div 
          className="absolute inset-0 opacity-[0.06]" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.2px)', 
            backgroundSize: '22px 22px' 
          }} 
        />
      </div>

      {/* High-Energy Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-[390px] bg-[#0c1320]/90 backdrop-blur-2xl rounded-[32px] p-5 sm:p-6 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.18)] border border-emerald-500/20 text-white space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Tombol Tutup */}
        {!isMandatory && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Motivational Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-black tracking-wider uppercase shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
            <span>MISI 400 PCE • GASPOL HARI INI</span>
          </div>

          <h2
            id="mobile-login-title"
            className="text-[24px] font-black tracking-tight text-white leading-tight flex items-center justify-center gap-1.5"
          >
            <span>Siap Bergerak &amp; Input!</span>
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Pilih profilmu dan mulai kerja di gudang
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center justify-center gap-2 text-center animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* High-Energy 9-Operative Card Grid (3x3) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 px-1">
            <span className="flex items-center gap-1">
              <span>Pilih Operatif Lapangan</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">9 Tim</span>
            </span>
            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
              <Sparkles className="w-3 h-3 text-amber-300" /> 1-Tap Ready
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {allTeamUsers.map((u) => {
              const isSelected = String(u.id) === String(selectedUserId);
              const isLeader = isManager(u);
              const isSup = isHelper(u);
              const roleLabel = isLeader ? 'Leader Inv' : isSup ? 'Support' : `PPIC #${u.ppicNumber || '1'}`;
              const badge = getAvatarBadge(u);

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(String(u.id));
                    setPassword('');
                    setError('');
                  }}
                  className={`py-2 px-1.5 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-b from-emerald-500/30 via-teal-600/25 to-slate-900 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/60 scale-[1.02]'
                      : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                  }`}
                >
                  {/* Avatar Circle with Emoji */}
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${badge.color} text-slate-950 font-black text-xs flex items-center justify-center shadow-md border ${badge.ring}`}>
                    <span>{badge.emoji}</span>
                  </div>

                  <div className="w-full">
                    <div className="text-[12px] font-extrabold truncate max-w-full text-white leading-tight">
                      {u.name}
                    </div>
                    <div className={`text-[9.5px] font-semibold truncate ${
                      isSelected 
                        ? 'text-emerald-300' 
                        : isLeader 
                          ? 'text-amber-400' 
                          : isSup 
                            ? 'text-sky-400' 
                            : 'text-slate-400'
                    }`}>
                      {roleLabel}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-950" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected User Energy Banner (Replaces redundant dropdown) */}
        {selectedUser ? (
          <div className="py-2 px-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/10 border border-emerald-400/40 flex items-center justify-between text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                {selectedUser.name[0]}
              </div>
              <div>
                <div className="text-[12px] font-black text-white leading-tight">
                  {selectedUser.name} <span className="text-[10px] text-emerald-300 font-semibold">• {isManager(selectedUser) ? 'Leader Inv' : isHelper(selectedUser) ? 'Support' : `PPIC #${selectedUser.ppicNumber || '1'}`}</span>
                </div>
                <div className="text-[10px] text-emerald-300/90 font-medium">
                  ⚡ Siap bergerak &amp; kejar target!
                </div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
              SIAP
            </span>
          </div>
        ) : (
          <div className="py-2 px-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-[11px] text-slate-400 font-medium">
            Ketuk salah satu dari 9 nama di atas untuk mulai
          </div>
        )}

        {/* Form Login: Password & Action */}
        <form onSubmit={handleLogin} className="space-y-3 pt-0.5">
          
          {/* Password Input with Lock Icon & Eye Toggle */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
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
              placeholder="Masukkan password akun"
              className="w-full rounded-2xl border border-emerald-500/30 bg-slate-950/80 py-3 px-10 text-[14px] text-white text-center font-medium placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 focus:outline-hidden transition shadow-inner"
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
            <label className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-300 hover:text-white cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded-[4px] border-slate-700 bg-slate-950 text-emerald-500 accent-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>Remember me di smartphone ini</span>
            </label>
          </div>

          {/* High-Energy Action Button (Pulsing Gradient) */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 active:scale-98 text-slate-950 font-black text-[15px] tracking-wide transition shadow-[0_8px_30px_rgba(16,185,129,0.45)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'GASPOL, MULAI KERJA SEKARANG!'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

        </form>

        {/* Security Footer */}
        <div className="pt-0.5 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400 text-center font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sistem Pencatatan Fisik R&D Gagaclo • 72 Box</span>
        </div>

      </div>
    </div>
  );
};
