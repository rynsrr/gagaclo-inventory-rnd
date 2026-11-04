import React from 'react';

/**
 * Exact replica of the official GAGACLO Box Label (A5 landscape):
 * 
 * +-----------------------------------------------+
 * |                  SAMPLE BOX                   |
 * |                                               |
 * |                       1                       |
 * |-----------------------------------------------|
 * | [lavender bar]      Royan                     |
 * |-----------------------------------------------|
 * |      RACK 1  |  Blue rack, sample warehouse   |
 * |           INVENTORY MANAGEMENT RND            |
 * +-----------------------------------------------+
 *
 * Printed at A5 landscape (210mm x 148mm). On screen it scales to fit.
 * Internal layout uses flex so the giant number fills the middle without
 * overflowing the border (footer/divider always stay inside).
 */
export const BoxLabel = ({ box, isPrintMode = false }) => {
  if (!box) return null;

  const headerTitle = box.category === 'SAMPLE' ? 'SAMPLE BOX' : 'MATERIAL BOX';

  return (
    <div 
      className={`bg-white text-black font-sans box-border text-center flex flex-col border-4 border-black ${
        isPrintMode 
          ? 'w-full max-w-[460px] aspect-[210/148] p-5 print:w-[210mm] print:h-[148mm] print:max-w-none print:p-8 print:m-0 break-inside-avoid'
          : 'w-full max-w-[460px] aspect-[210/148] p-5 shadow-xl rounded-none'
      }`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* 1. Header: SAMPLE BOX or MATERIAL BOX */}
      <div className="shrink-0 pt-1">
        <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-black uppercase font-sans">
          {headerTitle}
        </h2>
      </div>

      {/* 2. Giant Box Number (flexes to fill the middle, never overflows) */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-1">
        <span 
          className="text-7xl sm:text-8xl font-black text-black leading-none block font-sans select-all"
          style={{ letterSpacing: '-0.04em' }}
        >
          {box.boxNumber}
        </span>
      </div>

      {/* 3. Divider, PIC bar, Rack location & Footer */}
      <div className="w-full shrink-0 space-y-2">
        {/* Horizontal Divider Line above the PIC bar */}
        <div className="w-full h-1 bg-black mb-1" />

        {/* PIC Name on Lavender / Periwinkle background bar */}
        <div 
          className="w-full py-1.5 px-3 text-center"
          style={{ backgroundColor: '#c8d0ff' }}
        >
          <span className="text-2xl sm:text-3xl font-black text-black tracking-tight block">
            {box.picName}
          </span>
        </div>

        {/* Location / Rack description */}
        <div className="pt-1 text-xs sm:text-sm font-bold text-black flex items-center justify-center space-x-2 flex-wrap">
          <span>{box.rackName}</span>
          <span>|</span>
          <span className="font-semibold">{box.rackDescription || box.location}</span>
        </div>

        {/* Organization / Unit Footer */}
        <div className="pt-0.5 pb-0.5">
          <p className="text-[10px] sm:text-xs font-black tracking-widest text-black uppercase">
            INVENTORY MANAGEMENT RND
          </p>
        </div>
      </div>
    </div>
  );
};
