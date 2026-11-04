import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, X, Sparkles, Clock } from 'lucide-react';

/**
 * Reusable Autocomplete & Suggestion Combobox Input
 * 
 * - Lets user type anything freely.
 * - Shows searchable suggestion list from past inputs.
 * - Automatically registers and saves new values when submitted.
 * - Allows 1-click removal of accidental typos.
 */
export const SuggestionInput = ({
  value = '',
  onChange,
  suggestions = [],
  placeholder = '',
  className = '',
  inputClassName = '',
  uppercase = false,
  title = '',
  onRemoveOption,
  disabled = false,
  error = false,
  showChevron = true,
  autoComplete = 'off',
  ...restProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxId = useId();

  const stringVal = String(value || '');

  // Filter suggestions based on current input text
  const filteredSuggestions = React.useMemo(() => {
    if (!Array.isArray(suggestions)) return [];
    const query = stringVal.trim().toLowerCase();
    if (!query) {
      return suggestions.slice(0, 16);
    }
    // Filter matching anywhere
    const matches = suggestions.filter(item => 
      String(item).toLowerCase().includes(query)
    );
    return matches.slice(0, 16);
  }, [suggestions, stringVal]);

  // Check if current value already exists exactly in suggestions
  const isExactMatch = React.useMemo(() => {
    const query = stringVal.trim().toLowerCase();
    if (!query) return false;
    return suggestions.some(item => String(item).trim().toLowerCase() === query);
  }, [suggestions, stringVal]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectOption = (option) => {
    if (onChange) {
      onChange(uppercase ? String(option).toUpperCase() : String(option));
    }
    inputRef.current?.focus();
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          e.preventDefault();
          handleSelectOption(filteredSuggestions[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
  };

  const handleInputChange = (e) => {
    let nextVal = e.target.value;
    if (uppercase) nextVal = nextVal.toUpperCase();
    if (onChange) onChange(nextVal);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(-1);
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full flex items-center ${isOpen ? 'z-40' : 'z-10'} ${className}`}
    >
      <input
        ref={inputRef}
        type="text"
        value={stringVal}
        onChange={handleInputChange}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full ${inputClassName}`}
        {...restProps}
      />

      {/* Interactive Toggle Chevron */}
      {showChevron && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
            if (!isOpen && inputRef.current) inputRef.current.focus();
          }}
          className="no-print shrink-0 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer select-none"
          title="Tampilkan daftar opsi tersimpan"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
      )}

      {/* FLOATING SUGGESTION DROPDOWN POPUP */}
      {isOpen && (
        <div 
          id={listboxId}
          role="listbox"
          className="no-print absolute top-full left-0 mt-1 min-w-[220px] w-full max-w-[340px] bg-white rounded-xl shadow-2xl border-2 border-blue-400 ring-4 ring-blue-100 overflow-hidden z-50 text-xs animate-fade-in"
          style={{ maxHeight: '240px' }}
        >
          {/* Header Info */}
          <div className="bg-slate-900 text-white px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase border-b border-slate-800">
            <span className="flex items-center gap-1 text-blue-300">
              <Clock className="w-3 h-3" />
              List Tersimpan ({filteredSuggestions.length})
            </span>
            <span className="text-slate-400 font-normal lowercase text-[9px]">
              klik utk pakai
            </span>
          </div>

          {/* New Value Indicator (if typing something not yet in suggestions) */}
          {stringVal.trim() && !isExactMatch && (
            <div className="p-1.5 bg-blue-50/80 border-b border-blue-100 text-[11px] flex items-center justify-between text-blue-900">
              <div className="flex items-center gap-1 min-w-0">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-semibold truncate">
                  Data Baru: <span className="font-mono font-bold text-blue-700 underline">"{stringVal.trim()}"</span>
                </span>
              </div>
              <span className="text-[9px] bg-blue-200 text-blue-900 font-bold px-1.5 py-0.5 rounded shrink-0 ml-1">
                + Auto Simpan
              </span>
            </div>
          )}

          {/* List of Options */}
          <div className="overflow-y-auto max-h-[160px] divide-y divide-slate-100">
            {filteredSuggestions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs italic">
                {stringVal ? 'Belum ada opsi mirip. Nilai ini akan otomatis disimpan saat submit.' : 'Belum ada riwayat data.'}
              </div>
            ) : (
              filteredSuggestions.map((opt, index) => {
                const optStr = String(opt);
                const isSelected = stringVal.trim().toLowerCase() === optStr.toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={`opt-${index}-${optStr}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectOption(optStr)}
                    className={`px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition select-none ${
                      isHighlighted 
                        ? 'bg-blue-600 text-white font-bold' 
                        : isSelected 
                          ? 'bg-blue-50 text-blue-900 font-bold' 
                          : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                      {isSelected ? (
                        <Check className={`w-3.5 h-3.5 shrink-0 ${isHighlighted ? 'text-white' : 'text-blue-600'}`} />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighlighted ? 'bg-white' : 'bg-slate-300'}`} />
                      )}
                      <span className="truncate font-mono font-medium">
                        {optStr}
                      </span>
                    </div>

                    {/* Delete typo button */}
                    {onRemoveOption && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveOption(optStr);
                        }}
                        className={`p-0.5 rounded transition ${
                          isHighlighted 
                            ? 'text-blue-200 hover:text-white hover:bg-blue-700' 
                            : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={`Hapus "${optStr}" dari daftar saran`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Helper Footer */}
          <div className="bg-slate-50 px-2 py-1 text-[9px] text-slate-500 border-t border-slate-200 flex items-center justify-between">
            <span>💡 Ketik baru = otomatis menambah ke list</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-1"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
