import React from 'react';

/**
 * Exact replica of the official GAGACLO Box Label:
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
 */
export const BoxLabel = ({ box, isPrintMode = false }) => {
  if (!box) return null;

  const headerTitle = box.category === 'SAMPLE' ? 'SAMPLE BOX' : 'MATERIAL BOX';

  return (
    <div 
      className={`bg-white text-black font-sans box-border text-center flex flex-col justify-between border-4 border-black ${
        isPrintMode 
          ? 'w-[420px] h-[315px] p-6 m-2 break-inside-avoid print:w-[390px] print:h-[295px] print:p-5 print:m-1' 
          : 'w-full max-w-[420px] aspect-[4/3] p-6 shadow-xl rounded-none'
      }`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header: SAMPLE BOX or MATERIAL BOX */}
      <div className="pt-1">
        <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-black uppercase font-sans">
          {headerTitle}
        </h2>
      </div>

      {/* 2. Giant Box Number */}
      <div className="my-auto py-2">
        <span 
          className="text-8xl sm:text-9xl font-black text-black leading-none block font-sans select-all"
          style={{ letterSpacing: '-0.04em' }}
        >
          {box.boxNumber}
        </span>
      </div>

      {/* 3. Divider Line, PIC Lavender Bar, Subtitle & Footer */}
      <div className="w-full space-y-2">
        
        {/* Horizontal Divider Line above the PIC bar */}
        <div className="w-full h-1 bg-black mb-2" />

        {/* PIC Name on Lavender / Periwinkle background bar */}
        <div 
          className="w-full py-2 px-3 text-center"
          style={{ backgroundColor: '#c8d0ff' }}
        >
          <span className="text-3xl sm:text-4xl font-black text-black tracking-tight block">
            {box.picName}
          </span>
        </div>

        {/* Location / Rack description */}
        <div className="pt-1 text-sm sm:text-base font-bold text-black flex items-center justify-center space-x-2">
          <span>{box.rackName}</span>
          <span>|</span>
          <span className="font-semibold">{box.rackDescription || box.location}</span>
        </div>

        {/* Organization / Unit Footer */}
        <div className="pt-0.5 pb-1">
          <p className="text-[11px] sm:text-xs font-black tracking-widest text-black uppercase">
            INVENTORY MANAGEMENT RND
          </p>
        </div>

      </div>
    </div>
  );
};
