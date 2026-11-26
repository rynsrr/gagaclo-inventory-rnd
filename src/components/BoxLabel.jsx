import React from 'react';
import { getBoxDisplayNumber } from '../utils/boxDisplayUtils';

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

  const headerTitle = box.category === 'MATERIAL' ? 'MATERIAL BOX' : 'SAMPLE BOX';
  const displayNum = getBoxDisplayNumber(box);
  const locationText = `${box.rackName || ''}  |  ${box.rackDescription || box.location || ''}`;

  return (
    <div
      className={`bg-white text-black font-sans box-border ${
        isPrintMode
          ? 'w-full max-w-[460px] aspect-[210/148] p-2.5 print:w-[210mm] print:h-[148mm] print:max-w-none print:p-[6mm] print:m-0 break-inside-avoid print-page-a5-landscape'
          : 'w-full max-w-[460px] aspect-[210/148] p-2.5 shadow-xl rounded-none'
      }`}
      style={{ boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Crisp Outer Black Rectangular Frame (exact 1:1 PDF layout) */}
      <div className="w-full h-full border-[3.5px] border-black flex flex-col items-center justify-between px-5 sm:px-7 py-3.5 sm:py-5 text-center box-border">
        {/* 1. Header: SAMPLE BOX / MATERIAL BOX (Centered Bold) */}
        <div className="shrink-0 pt-0.5">
          <h2 className="text-xl sm:text-[26px] print:text-[32pt] font-bold tracking-normal text-black uppercase leading-tight">
            {headerTitle}
          </h2>
        </div>

        {/* 2. Giant Centered Box Number (1-72 or 1A-12J) */}
        <div className="flex-1 flex items-center justify-center min-h-0 w-full">
          <span
            className={`${
              displayNum.length >= 3
                ? 'text-[76px] sm:text-[104px] print:text-[130pt]'
                : 'text-[92px] sm:text-[124px] print:text-[155pt]'
            } font-bold text-black leading-none block select-all`}
            style={{ letterSpacing: '-0.02em' }}
          >
            {displayNum}
          </span>
        </div>

        {/* 3. Inset Divider, Periwinkle PIC Bar, Rack/Lemari Location & Footer */}
        <div className="w-full shrink-0 flex flex-col items-center">
          {/* Horizontal Black Divider Line (inset matching PDF) */}
          <div className="w-full h-[3px] bg-black mb-2" />

          {/* PIC Name on Soft Periwinkle/Lavender Bar (#ccd7ff) */}
          <div
            className="w-full py-1.5 sm:py-2 px-3 text-center flex items-center justify-center min-h-[38px] sm:min-h-[48px] print:min-h-[20mm]"
            style={{ backgroundColor: '#ccd7ff' }}
          >
            <span className="text-2xl sm:text-[34px] print:text-[38pt] font-normal text-black leading-tight block">
              {box.picName || '\u00A0'}
            </span>
          </div>

          {/* Location / Rack or Lemari Description */}
          <div className="pt-1.5 sm:pt-2 text-xs sm:text-[15px] print:text-[18pt] font-normal text-black leading-snug">
            {locationText}
          </div>

          {/* Footer: INVENTORY MANAGEMENT RND */}
          <div className="pt-1 sm:pt-1.5">
            <p className="text-[11px] sm:text-xs print:text-[13pt] font-bold tracking-wide text-black uppercase">
              INVENTORY MANAGEMENT RND
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
