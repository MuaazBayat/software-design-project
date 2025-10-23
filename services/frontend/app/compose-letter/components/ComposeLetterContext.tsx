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

// Default presets that are always available and favorited
const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'default-floral',
    name: 'Floral',
    config: {
      background: {
        color: '#FFC0CB', // pink
        filterKey: '',
        opacity: 0.7,
      },
      pattern: {
        type: 'floral',
        params: {
          color: '#008000', // green
          spacing: 170,
          thickness: 80,
          rotation: 15,
          opacity: 0.55,
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#000000',
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000007,
    updatedAt: 1700000000007,
  },
  {
    id: 'default-polka-dots',
    name: 'Polka Dots',
    config: {
      background: {
        color: '#FFFF00', // yellow
        filterKey: '',
        opacity: 0.7, // more transparent
      },
      pattern: {
        type: 'dotted',
        params: {
          color: '#FF1493', // hot pink without alpha
          spacing: 175,
          thickness: 29,
          rotation: 51,
          opacity: 0.8, // more visible
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#000000',
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000000, // arbitrary timestamp
    updatedAt: 1700000000000,
  },
  {
    id: 'default-spiral',
    name: 'Spiral',
    config: {
      background: {
        color: '#FF0000', // red
        filterKey: '',
        opacity: 0.8,
      },
      pattern: {
        type: 'spiral',
        params: {
          color: '#433333ff', // white
          spacing: 190,
          thickness: 53,
          rotation: 175,
          opacity: 0.9,
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#FFFFFF',
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000006,
    updatedAt: 1700000000006,
  },
  {
    id: 'default-zig-zag',
    name: 'Zig Zag',
    config: {
      background: {
        color: '#00FFFF', // cyan
        filterKey: '',
        opacity: 0.7,
      },
      pattern: {
        type: 'zigzag',
        params: {
          color: '#FFFFFF', // white for better contrast against cyan
          spacing: 121,
          thickness: 50,
          rotation: 271,
          opacity: 0.8,
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#000000', // black for contrast against cyan background and white patterns
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000001,
    updatedAt: 1700000000001,
    },
  {
    id: 'default-straight-lines',
    name: 'Straight Lines',
    config: {
      background: {
        color: '#0000FF', // blue
        filterKey: '',
        opacity: 0.8,
      },
      pattern: {
        type: 'straight',
        params: {
          color: '#FFFFFF', // white
          spacing: 35,
          thickness: 2,
          rotation: 0,
          opacity: 0.9,
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#FFFFFF',
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000002,
    updatedAt: 1700000000002,
  },
  {
    id: 'default-wavy-lines',
    name: 'Wavy Lines',
    config: {
      background: {
        color: '#00FF00', // green
        filterKey: '',
        opacity: 0.6,
      },
      pattern: {
        type: 'wavy',
        params: {
          color: '#FFFFFF', // white for better contrast against green
          spacing: 362,
          thickness: 67,
          rotation: 43,
          opacity: 0.9, // increased for better visibility
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#000000',
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000003,
    updatedAt: 1700000000003,
  },
  {
    id: 'default-swirls',
    name: 'Swirls',
    config: {
      background: {
        color: '#FFA500', // orange
        filterKey: '',
        opacity: 0.75,
      },
      pattern: {
        type: 'swirls',
        params: {
          color: '#FFFFFF', // white for better contrast against orange
          spacing: 66,
          thickness: 9,
          rotation: 45,
          opacity: 0.8,
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#000000', // black for contrast against orange background and white patterns
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000004,
    updatedAt: 1700000000004,
  },
  {
    id: 'default-arcs',
    name: 'Arcs',
    config: {
      background: {
        color: '#800080', // purple
        filterKey: '',
        opacity: 0.7,
      },
      pattern: {
        type: 'arc',
        params: {
          color: '#FFFFFF', // white for better contrast against purple
          spacing: 200,
          thickness: 94,
          rotation: 60,
          opacity: 0.8,
        },
      },
      patternBlendMode: 'normal',
      fontColor: '#000000', // black for contrast against purple background and white patterns
      fontOpacity: 1,
    },
    thumbnailDataUrl: '',
    isFavorite: true,
    createdAt: 1700000000005,
    updatedAt: 1700000000005,
  },
  // Add more default presets here as provided
];

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
    let all = loadAllFromStorage();
    
    // Ensure default presets are always present and up-to-date
    const existingIds = new Set(all.map(p => p.id));
    const missingDefaults = DEFAULT_PRESETS.filter(p => !existingIds.has(p.id));
    if (missingDefaults.length > 0) {
      all = [...missingDefaults, ...all];
    }
    
    // Update existing default presets if their config has changed
    all = all.map(preset => {
      const defaultPreset = DEFAULT_PRESETS.find(dp => dp.id === preset.id);
      if (defaultPreset && JSON.stringify(preset.config) !== JSON.stringify(defaultPreset.config)) {
        return { ...defaultPreset, updatedAt: Date.now() };
      }
      return preset;
    });
    
    saveToStorage(all);
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
    // Prevent deleting default presets
    if (DEFAULT_PRESETS.some(p => p.id === presetId)) {
      return;
    }
    
    const currentPresets = loadAllFromStorage();
    const updatedPresets = currentPresets.filter(p => p.id !== presetId);
    saveToStorage(updatedPresets);
    setPresets(updatedPresets);
  }, []);

  const toggleFavorite = useCallback((presetId: string) => {
    // Prevent unfavoriting default presets
    if (DEFAULT_PRESETS.some(p => p.id === presetId)) {
      return;
    }
    
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
