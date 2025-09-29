import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import "./LineColorPopup.css";

interface LineColorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  position?: { x: number; y: number };
}

const LINE_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6',
  '#DC2626', '#EA580C', '#D97706', '#65A30D', '#059669', '#0891B2',
  '#2563EB', '#7C3AED', '#C026D3', '#DB2777', '#7C2D12', '#365314',
  '#0F172A', '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8'
];

export default function LineColorPopup({
  isOpen,
  onClose,
  currentColor,
  onColorChange,
  position
}: LineColorPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Delay hiding to allow exit animation
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Only close if clicking directly on backdrop, not on popup content
      const target = e.target as Element;
      if (isOpen && target.classList.contains('popup-backdrop')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    top: position?.y || '50%',
    left: position?.x || '50%',
    transform: position ? 'translate(-50%, -50%)' : 'translate(-50%, -50%)',
    zIndex: 9999,
    pointerEvents: 'auto'
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 popup-backdrop transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 9998 }}
        onClick={(e) => {
          // Only close if clicking directly on backdrop
          if ((e.target as Element).classList.contains('popup-backdrop')) {
            onClose();
          }
        }}
      />

      {/* Popup */}
      <div
        className={`line-color-popup bg-white rounded-lg shadow-xl border border-gray-200 p-4 transition-all duration-200 ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={popupStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-600" />
            Line Color
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            ×
          </Button>
        </div>

        {/* Color Picker */}
        <div className="space-y-3 mb-4">
          <label className="text-xs font-medium text-gray-700">Choose Line Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
              title="Select line color"
            />
            <div className="text-xs text-gray-500 font-mono">{currentColor}</div>
          </div>
        </div>

        {/* Current Color Display */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
          <div className="text-xs text-gray-600">Current:</div>
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-300 color-preview"
            style={{ backgroundColor: currentColor }}
          />
          <div className="text-xs font-mono text-gray-700">{currentColor}</div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </>
  );
}