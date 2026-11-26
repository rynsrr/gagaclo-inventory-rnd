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
export const BoxLabel = ({ box, isPrintMode = false, fitA4Sheet = false }) => {
  if (!box) return null;

  const headerTitle = box.category === 'MATERIAL' ? 'MATERIAL BOX' : 'SAMPLE BOX';
  const displayNum = getBoxDisplayNumber(box);
  const locationText = `${box.rackName || ''}  |  ${box.rackDescription || box.location || ''}`;

  const printSizeClass = fitA4Sheet
    ? 'w-full max-w-[460px] aspect-[210/148] p-2.5 print:w-[210mm] print:h-[148mm] print:max-w-none print:p-[6mm] print:m-0 break-inside-avoid'
    : 'w-full max-w-[460px] aspect-[210/148] p-2.5 print:w-[210mm] print:h-[148mm] print:max-w-none print:p-[6mm] print:m-0 break-inside-avoid print-page-a5-landscape';

  return (
    <div
      className={`bg-white text-black font-sans box-border overflow-hidden ${
        isPrintMode
          ? printSizeClass
          : 'w-full max-w-[460px] aspect-[210/148] p-2.5 shadow-xl rounded-none'
      }`}
      style={{ boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Crisp Outer Black Rectangular Frame (exact 1:1 PDF layout) */}
      <div className="w-full h-full border-[3.5px] border-black flex flex-col items-center justify-between px-4 sm:px-6 print:px-[10mm] py-3 sm:py-4 print:py-[7mm] text-center box-border overflow-hidden">
        {/* 1. Header: SAMPLE BOX / MATERIAL BOX (Centered Bold) */}
        <div className="shrink-0">
          <h2 className="text-lg sm:text-[24px] print:text-[32pt] font-bold tracking-normal text-black uppercase leading-none">
            {headerTitle}
          </h2>
        </div>

        {/* 2. Giant Centered Box Number (1-72 or 1A-12J) — strictly contained without overlap */}
        <div className="flex-1 flex items-center justify-center min-h-0 w-full py-1 overflow-hidden">
          <span
            className={`${
              displayNum.length >= 3
                ? 'text-[64px] sm:text-[84px] print:text-[128pt]'
                : 'text-[76px] sm:text-[102px] print:text-[152pt]'
            } font-bold text-black leading-none block select-all`}
            style={{ letterSpacing: '-0.02em' }}
          >
            {displayNum}
          </span>
        </div>

        {/* 3. Inset Divider, Periwinkle PIC Bar, Rack/Lemari Location & Footer */}
        <div className="w-full shrink-0 flex flex-col items-center">
          {/* Horizontal Black Divider Line (inset matching PDF) */}
          <div className="w-full h-[3px] bg-black mb-1.5 print:mb-[2.5mm]" />

          {/* PIC Name on Soft Periwinkle/Lavender Bar (#ccd7ff) */}
          <div
            className="w-full py-1 sm:py-1.5 print:py-[2mm] px-3 text-center flex items-center justify-center min-h-[34px] sm:min-h-[42px] print:min-h-[19mm]"
            style={{ backgroundColor: '#ccd7ff' }}
          >
            <span className="text-xl sm:text-[30px] print:text-[38pt] font-normal text-black leading-tight block">
              {box.picName || '\u00A0'}
            </span>
          </div>

          {/* Location / Rack or Lemari Description */}
          <div className="pt-1 sm:pt-1.5 print:pt-[2.5mm] text-[11px] sm:text-[14px] print:text-[17pt] font-normal text-black leading-snug truncate max-w-full">
            {locationText}
          </div>

          {/* Footer: INVENTORY MANAGEMENT RND */}
          <div className="pt-0.5 sm:pt-1 print:pt-[2mm]">
            <p className="text-[10px] sm:text-[11px] print:text-[12.5pt] font-bold tracking-wide text-black uppercase leading-none">
              INVENTORY MANAGEMENT RND
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
