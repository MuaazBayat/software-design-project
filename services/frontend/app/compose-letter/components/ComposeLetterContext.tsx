import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Inlined and consolidated types
export type LineType = 'none' | 'straight' | 'dotted' | 'wavy' | 'zigzag' | 'swirls' | 'arc' | 'spiral' | 'floral';

export interface LineConfig {
  type: LineType;
  spacing: number;
  thickness: number;
  color: string;
  opacity: number;
  rotation: number;
}

export interface ComposeConfig {
  background: {
    color: string;
    filterKey: string;
    opacity: number;
  };
  pattern: {
    type: LineType; // Use LineType here
    params: any; 
  };
  patternBlendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  fontColor: string;
  fontOpacity: number;
}

export interface Preset {
  id: string;
  name: string;
  config: ComposeConfig;
  thumbnailDataUrl: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

// Local storage key
const PRESETS_STORAGE_KEY = 'compose-letter-presets';

// Helper functions for localStorage
const loadAllFromStorage = (): Preset[] => {
  try {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(PRESETS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load presets from localStorage", error);
    return [];
  }
};

const saveToStorage = (presets: Preset[]): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("Failed to save presets to localStorage", error);
  }
};

interface ComposeLetterContextProps {
  presets: Preset[];
  loadPresets: () => void;
  applyPreset: (presetId: string) => Preset | undefined;
  savePreset: (name: string, config: ComposeConfig) => Preset;
  deletePreset: (presetId: string) => void;
  toggleFavorite: (presetId: string) => void;
}

const ComposeLetterContext = createContext<ComposeLetterContextProps | undefined>(undefined);

export const ComposeLetterProvider = ({ children }: { children: ReactNode }) => {
  const [presets, setPresets] = useState<Preset[]>([]);

  const loadPresets = useCallback(() => {
    const all = loadAllFromStorage();
    setPresets(all);
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      // Move to top of recent
      const others = presets.filter(p => p.id !== presetId);
      const updated = [preset, ...others];
      setPresets(updated);
      saveToStorage(updated);
    }
    return preset;
  }, [presets]);

  const savePreset = useCallback((name: string, config: ComposeConfig) => {
    const newPreset: Preset = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
      name,
      config,
      thumbnailDataUrl: '',
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const currentPresets = loadAllFromStorage();
    const updatedPresets = [newPreset, ...currentPresets];
    saveToStorage(updatedPresets);
    setPresets(updatedPresets);
    return newPreset;
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    const currentPresets = loadAllFromStorage();
    const updatedPresets = currentPresets.filter(p => p.id !== presetId);
    saveToStorage(updatedPresets);
    setPresets(updatedPresets);
  }, []);

  const toggleFavorite = useCallback((presetId: string) => {
    const updated = presets.map(p => {
      if (p.id === presetId) {
        return { ...p, isFavorite: !p.isFavorite, updatedAt: Date.now() };
      }
      return p;
    });
    saveToStorage(updated);
    setPresets(updated);
  }, [presets]);

  return (
    <ComposeLetterContext.Provider value={{ presets, loadPresets, applyPreset, savePreset, deletePreset, toggleFavorite }}>
      {children}
    </ComposeLetterContext.Provider>
  );
};

export const useComposeLetter = (): ComposeLetterContextProps => {
  const context = useContext(ComposeLetterContext);
  if (!context) {
    throw new Error('useComposeLetter must be used within ComposeLetterProvider');
  }
  return context;
};
